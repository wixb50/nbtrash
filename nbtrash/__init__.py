import os
import sys
import json
import shutil
import urllib

from tornado import web
from notebook.utils import url_path_join
from notebook.base.handlers import APIHandler
from send2trash import send2trash


def to_os_path(path, root=''):
    """Convert an API path to a filesystem path

    If given, root will be prepended to the path.
    root must be a filesystem path already.
    """
    parts = path.strip('/').split('/')
    parts = [p for p in parts if p != '']
    # remove duplicate splits
    path = os.path.join(root, *parts)
    return path


class TrashHandler(APIHandler):
    """回收站处理接口"""
    # 默认工作目录
    root_dir = "/home/jovyan/work"
    # 回收站目录，环境变量设置，必须保证和工作目录属于同一device
    trash_dir = os.path.join("/home/jovyan/work", ".Trash-%s" % os.getuid())

    trash_info_dir = os.path.join(trash_dir, "info")
    trash_file_dir = os.path.join(trash_dir, "files")
    ok_status = {"status": 200, "message": "ok"}
    forbidden_status = {"status": 403, "message": "forbidden"}

    def _get_os_path(self, path):
        """Given an API path, return its file system path.

        Parameters
        ----------
        path : string
            The relative API path to the named file.

        Returns
        -------
        path : string
            Native, absolute OS path to for a file.

        Raises
        ------
        404: if path is outside root
        """
        root = TrashHandler.root_dir
        os_path = to_os_path(path, root)
        if not (os.path.abspath(os_path) + os.path.sep).startswith(root):
            raise web.HTTPError(404, "%s is outside root contents directory" % path)
        return os_path

    @web.authenticated
    def post(self):
        # 将文件放入回收站
        send_tanshs = json.loads(self.request.body.decode("utf-8"))

        def _check_trash(os_path):
            if sys.platform in {'win32', 'darwin'}:
                return True

            # It's a bit more nuanced than this, but until we can better
            # distinguish errors from send2trash, assume that we can only trash
            # files on the same partition as the home directory.
            file_dev = os.stat(os_path).st_dev
            trash_dev = os.stat(self.trash_dir).st_dev
            return file_dev == trash_dev

        for path in send_tanshs:
            path = path.strip('/')
            os_path = self._get_os_path(path)
            if not os.path.exists(os_path):
                raise web.HTTPError(404, u'File or directory does not exist: %s' % os_path)

            if _check_trash(os_path):
                self.log.info("Sending %s to trash", os_path)
                # Looking at the code in send2trash, I don't think the errors it
                # raises let us distinguish permission errors from other errors in
                # code. So for now, just let them all get logged as server errors.
                send2trash(os_path)
            else:
                self.log.warning("Skipping trash for %s, on different device "
                                 "to trash directory", os_path)
        self.write(json.dumps(TrashHandler.ok_status))

    @web.authenticated
    def delete(self):
        # 删除回收站中的文件
        delete_tanshs = json.loads(self.request.body.decode("utf-8"))
        analysised_delete_tanshs = []
        if not delete_tanshs:
            for info_file in os.listdir(TrashHandler.trash_info_dir):
                if info_file.endswith(".trashinfo"):
                    item = TrashHandler._parse_trashinfo(os.path.join(TrashHandler.trash_info_dir, info_file),
                                                         os.path.join(TrashHandler.trash_file_dir, info_file[:-10]))
                    if item:
                        item['Name'] = info_file[:-10]
                        analysised_delete_tanshs.append(item)
        else:
            for itm in delete_tanshs:
                itm_info_dir = os.path.join(TrashHandler.trash_info_dir, itm['Name'] + ".trashinfo")
                itm_file_dir = os.path.join(TrashHandler.trash_file_dir, itm['Name'])
                if not (os.path.exists(itm_file_dir) and os.path.exists(itm_info_dir)):
                    continue
                itm_status = TrashHandler._parse_trashinfo(itm_info_dir, itm_file_dir)
                itm_status['Name'] = itm['Name']
                if itm_status:
                    analysised_delete_tanshs.append(itm_status)
        for itm in analysised_delete_tanshs:
            itm_info_dir = os.path.join(TrashHandler.trash_info_dir, itm['Name'] + ".trashinfo")
            itm_file_dir = os.path.join(TrashHandler.trash_file_dir, itm['Name'])
            self.log.info("rm trash file %s" % itm['Name'])
            os.remove(itm_info_dir)
            if itm["Type"] == "directory":
                shutil.rmtree(itm_file_dir)
            elif itm["Type"] == "file":
                os.remove(itm_file_dir)
            else:
                pass
        self.write(json.dumps(TrashHandler.ok_status))

    @web.authenticated
    def put(self):
        # 恢复回收站中的文件
        recover_tanshs = json.loads(self.request.body.decode("utf-8"))
        for itm in recover_tanshs:
            rec_status = 1
            itm_info_dir = os.path.join(TrashHandler.trash_info_dir, itm['Name'] + ".trashinfo")
            itm_file_dir = os.path.join(TrashHandler.trash_file_dir, itm['Name'])
            if not (os.path.exists(itm_file_dir) and os.path.exists(itm_info_dir)):
                self.write(json.dumps(TrashHandler.forbidden_status))
                self.finish()
                return
            itm_status = TrashHandler._parse_trashinfo(itm_info_dir, itm_file_dir)
            if itm_status:
                if os.path.exists(itm_status["Path"]):
                    self.log.warning("file already existed at {}".format(itm_status["Path"]))
                    rec_status = 0
                else:
                    self.log.info("recovery file {}".format(itm_status["Path"]))
                    shutil.move(itm_file_dir, itm_status["Path"])
                    os.remove(itm_info_dir)
            else:
                self.log.warning("trash file or trash info file lost")
                rec_status = 0
            if rec_status == 0:
                self.write(json.dumps(TrashHandler.forbidden_status))
                self.finish()
                return
        self.write(json.dumps(TrashHandler.ok_status))

    @web.authenticated
    def get(self):
        # 获取回收站列表
        trashs = []
        if not os.path.isdir(TrashHandler.trash_info_dir):
            self.write(json.dumps(trashs))
            self.finish()
            return
        for info_file in os.listdir(TrashHandler.trash_info_dir):
            if info_file.endswith(".trashinfo"):
                item = TrashHandler._parse_trashinfo(os.path.join(TrashHandler.trash_info_dir, info_file),
                                                     os.path.join(TrashHandler.trash_file_dir, info_file[:-10]))
                if item:
                    item['Name'] = info_file[:-10]
                    if item['Name'].endswith(".ipynb"):
                        item['Type'] = 'notebook'
                    trashs.append(item)
        self.write(json.dumps(trashs))
        self.finish()

    @staticmethod
    def _parse_trashinfo(info_file_path, file_path):
        if not os.path.exists(file_path):
            return {}
        trash_info = {}
        trash_info["Type"] = "file"
        if os.path.isdir(file_path):
            trash_info["Type"] = "directory"
        with open(info_file_path) as f:
            read_temp = f.readline().strip()
            if not read_temp == "[Trash Info]":
                return {}
            for i in range(2):
                temp_ = f.readline().strip().split("=")
                if not temp_ or len(temp_) < 2:
                    return {}
                trash_info[temp_[0]] = urllib.parse.unquote(temp_[1])
        return trash_info


def _jupyter_server_extension_paths():
    """
    Set up the server extension for collecting metrics
    """
    return [{
        'module': 'nbtrash',
    }]


def _jupyter_nbextension_paths():
    """
    Set up the notebook extension for displaying metrics
    """
    return [{
        "section": "tree",
        "dest": "nbtrash",
        "src": "static",
        "require": "nbtrash/main"
    }]


def load_jupyter_server_extension(nbapp):
    """
    Called during notebook start
    """
    TrashHandler.root_dir = nbapp.contents_manager.root_dir
    os.makedirs(TrashHandler.trash_dir, 0o700, exist_ok=True)

    route_pattern = url_path_join(nbapp.web_app.settings['base_url'], '/trash')
    nbapp.web_app.add_handlers('.*', [(route_pattern, TrashHandler)])
