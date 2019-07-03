define([
    'jquery',
    'base/js/utils',
    'base/js/namespace',
    'base/js/dialog'
], function ($, utils, Jupyter, dialog) {
    'use strict';
    var treePage = function () {
        $("head").append("<link>");
        var css = $("head").children(":last");
        css.attr({
            rel: "stylesheet",
            type: "text/css",
            href: utils.get_body_data('baseUrl') + 'nbextensions/nbtrash/tree.css'
        });
    };

    //回收站
    var show_recycle_bin = function () {
        var tab_id = 'recycle_bin';
        $('<div><div/>')
            .attr('id', tab_id)
            .addClass('tab-pane')
            .append('<div id="recycle_bin_toolbar" class="row list_toolbar">\
            <div class="col-sm-8 no-padding">\
              <div class="recycle-bin-instructions"><span style="color:#337ab7"><b>Recycle Bin</b></span></div>\
              <div class="recycle-bin-buttons" style="padding-top: 0px; display: none;">\
                  <button title="还原" aria-label="还原" class=" btn btn-default btn-xs" id="recovery">还原</button>\
                  <button title="彻底删除" aria-label="彻底删除" class="btn btn-default btn-xs btn-warning" id="delete-forver">彻底删除</button>\
              </div>\
            </div>\
            <div class="col-sm-4 no-padding tree-buttons">\
              <div class="pull-right">\
                <div class="btn-group">\
                    <button id="drop_all_trash"  class="btn btn-default btn-xs btn-danger">清空回收站</button>\
                </div>\
                <div class="btn-group">\
                    <button id="refresh_recycle_bin_list" title="刷新回收站列表" aria-label="刷新回收站列表" class="btn btn-default btn-xs"><i class="fa fa-refresh"></i></button>\
                </div>\
              </div>\
            </div>\
          </div>')
            .append('<div id="trash_list" class="list_container" >\
                <div id="trash_list_header" class="row list_header">\
                  <div class="btn-group dropdown" id="trash-tree-selector">\
                    <button title="全选/取消选中" aria-label="全选/取消选中" type="button" class="btn btn-default btn-xs" id="trash-button-select-all">\
                      <input type="checkbox" class="pull-left tree-selector" id="trash-select-all" style="margin-left: 7px;">\
                      <span id="trash-counter-select-all">0</span>\
                    </button>\
                    <button title="选择..." class="btn btn-default btn-xs dropdown-toggle" type="button" id="trash-tree-selector-btn" data-toggle="dropdown" aria-expanded="true">\
                      <span class="caret"></span>\
                      <span class="sr-only">Toggle Dropdown</span>\
                    </button>\
                    <ul id="selector-menu" class="dropdown-menu" role="menu" aria-labelledby="tree-selector-btn">\
                      <li role="presentation"><a id="trash-select-folders" role="menuitem" tabindex="-1" href="#" title="选择所有文件夹"><i class="menu_icon folder_icon icon-fixed-width"></i>文件夹</a></li>\
                      <li role="presentation"><a id="trash-select-notebooks" role="menuitem" tabindex="-1" href="#" title="选择所有notebook"><i class="menu_icon notebook_icon icon-fixed-width"></i>所有notebook</a></li>\
                      <li role="presentation"><a id="trash-select-files" role="menuitem" tabindex="-1" href="#" title="选择所有文件"><i class="menu_icon file_icon icon-fixed-width"></i>文件</a></li>\
                    </ul>\
                  </div>\
                  <div id="delete-date" class="pull-right sort_button">\
                      <span class="btn btn-xs btn-default sort-action" >\
                          删除日期\
                          <i class="fa fa-arrow-down" id = "trash-sort-mark"></i>\
                      </span>\
                  </div>\
                </div>\
                <div class="list_item row" id="transh_list_empty"  style="display: none padding: 7px;">\
                    <div class="col-md-12">\
                        <div style="margin:auto;text-align:center;color:grey">回收站空空如也</div>\
                    </div>\
                </div>\
            </div>')
            .appendTo('.tab-content');
        $(".delete-button").before('<button title="移入回收站" aria-label="移入回收站" class="delete-button trash-button btn btn-default btn-xs btn-warning" style="display: none;margin-right: 5px"><i class="fa fa-recycle"></i></button>');


    };

    var recycle_bin_handler = function () {

        var get_current_checked = function () {
            var current_checked = [];
            $('.trash_list_item :checked').each(function (index, item) {
                var name = $(item).parent().parent().find($(".item_name")).text();
                current_checked.push({ Name: name });
            });
            return current_checked;
        };

        var selection_changed = function () {
            // Use a JQuery selector to find each row with a checked checkbox.  If
            // we decide to add more checkboxes in the future, this code will need
            // to be changed to distinguish which checkbox is the row selector.
            var checked = 0;
            $('.trash_list_item :checked').each(function (index, item) {
                var parent = $(item).parent().parent();

                // If the item doesn't have an upload button, isn't the
                // breadcrumbs and isn't the parent folder '..', then it can be selected.
                // Breadcrumbs path == ''.
                if (parent.data('path') !== '') {
                    checked++;
                }
            });

            // Delete and recovery is visible if one or more items are selected.
            if (checked > 0) {
                $('.recycle-bin-buttons').show();
            } else {
                $('.recycle-bin-buttons').hide();
            }

            // If all of the items are selected, show the selector as checked.  If
            // some of the items are selected, show it as checked.  Otherwise,
            // uncheck it.
            var total = 0;
            $('.trash_list_item input[type=checkbox]').each(function (index, item) {
                var parent = $(item).parent().parent();
                // If the item doesn't have an upload button and it's not the
                // breadcrumbs, it can be selected.  Breadcrumbs path == ''.
                if (parent.data('path') !== '') {
                    total++;
                }
            });

            var select_all = $("#trash-select-all");
            if (checked === 0) {
                select_all.prop('checked', false);
                select_all.prop('indeterminate', false);
                select_all.data('indeterminate', false);
            } else if (checked === total) {
                select_all.prop('checked', true);
                select_all.prop('indeterminate', false);
                select_all.data('indeterminate', false);
            } else {
                select_all.prop('checked', false);
                select_all.prop('indeterminate', true);
                select_all.data('indeterminate', true);
            }
            // Update total counter
            $('#trash-counter-select-all').html(checked === 0 ? '&nbsp;' : checked);

            // If at aleast on item is selected, hide the selection instructions.
            if (checked > 0) {
                $('.recycle-bin-instructions').hide();
            }
            else {
                $('.recycle-bin-instructions').show();
            }
        };

        var refresh_trash_list = function () {
            var transh_selected_before = get_current_checked();
            var base_url = utils.get_body_data("baseUrl");
            var x_args_ = { "v": Math.round(new Date().getTime()) };
            var url = utils.url_join_encode(base_url, '/trash');
            utils.ajax(url, {
                type: "GET",
                async: true,
                dataType: "json",
                timeout: 5000,
                data: x_args_,
                success: function (data, status, xhr) {
                    var trash_item = "";
                    var item_template = '<div class="trash_list_item row trash_select" item_type = "{type}">\
                        <div class="col-md-12">\
                            <input type="checkbox" class = "trash-cb" style="float: left">\
                            <div class="exceptcb" title="{path}">\
                                <i class="item_icon {icon_type} icon-fixed-width"></i>\
                                <span class="item_name" style="color: #555555">{name}</span>\
                                <span class="pull-right" style="color:#000">{deletion_date}</span>\
                            </div>\
                        </div>\
                    </div>';
                    if (status === "success") {
                        $(".trash_select").remove();
                        var trash_sort_mark = $("#trash-sort-mark").hasClass("fa-arrow-down");
                        data.sort(function (a, b) {
                            var mark = trash_sort_mark ? (a["DeletionDate"] > b["DeletionDate"]) :
                                (a["DeletionDate"] <= b["DeletionDate"]);
                            if (mark) {
                                return 1;
                            }
                            else {
                                return -1;
                            }
                        });
                        if (data.length === 0) {
                            $("#transh_list_empty").show();
                        }
                        else {
                            $("#transh_list_empty").hide();
                        }
                        for (var i = 0; i < data.length; i++) {
                            trash_item = item_template;
                            trash_item = trash_item.replace("{type}", data[i].Type);
                            if (data[i].Type === "directory") {
                                data[i].Type = "folder";
                            }
                            var icon_type = data[i].Type + "_icon";
                            trash_item = trash_item.replace("{icon_type}", icon_type);
                            trash_item = trash_item.replace("{name}", data[i].Name);
                            trash_item = trash_item.replace("{path}", data[i].Path);
                            trash_item = trash_item.replace("{deletion_date}", data[i].DeletionDate);
                            $("#transh_list_empty").after(trash_item);
                        }
                        $(".trash-cb").change(selection_changed);
                        $(".exceptcb").click(function (event) {
                            $(event.currentTarget).prev().click();
                        });
                        transh_selected_before.forEach(function (item) {
                            var trash_list_items = $('.trash_list_item');
                            for (var i = 0; i < trash_list_items.length; i++) {
                                var tlist_item = $(trash_list_items[i]);
                                if (tlist_item.find($(".item_name")).text() === item.Name) {
                                    tlist_item.find('input[type=checkbox]').prop('checked', true);
                                    break;
                                }
                            }
                        });
                        selection_changed();

                    }
                    else {
                        console.log(status);
                    }
                },
                error: function (xhr, status, error) {
                    console.log(error);
                }
            });


        };

        var tab_text = '回收站';
        var tab_id = 'recycle_bin';
        var tab_link = $('<a></a>')
            .text(tab_text)
            .attr('href', '#' + tab_id)
            .attr('data-toggle', 'tab')
            .on('click', function (evt) {
                window.history.pushState(null, null, '#' + tab_id);
                refresh_trash_list();
            });

        $('<li>')
            .append(tab_link)
            .appendTo('#tabs');
        // select tab if hash is set appropriately
        if (window.location.hash === '#' + tab_id) {
            tab_link.click();
        }


        var trash_select = function (selection_type) {
            $('.trash_list_item').each(function (index, item) {
                var item_type = $(item).attr('item_type');
                var state = false;
                state = state || (selection_type === "select-all");
                state = state || (selection_type === "select-folders" && item_type === 'directory');
                state = state || (selection_type === "select-notebooks" && item_type === 'notebook');
                state = state || (selection_type === "select-files" && item_type === 'file');
                $(item).find('input[type=checkbox]').prop('checked', state);
            });
            selection_changed();
        };

        var select_all_trash_handler = function (e) {
            // toggle checkbox if the click doesn't come from the checkbox already
            var select_all = $('#trash-select-all');
            if (!$(e.target).is('input[type=checkbox]')) {
                if (select_all.prop('checked') || select_all.data('indeterminate')) {
                    trash_select('select-none');
                } else {
                    trash_select('select-all');
                }
            }
            else {
                if (select_all.prop('checked')) {
                    trash_select('select-all');
                } else {
                    trash_select('select-none');
                }
            }
        };

        //send file to trash/recycle
        var send_to_trash_handler = function () {
            var that = Jupyter.notebook_list;
            var selected = that.selected.slice();
            var trash_message = ("移动选中的{selected}个文件或文件夹到回收站？".replace("{selected}", selected.length));
            dialog.modal({
                title: "移入回收站",
                body: trash_message,
                default_button: "Cancel",
                buttons: {
                    Cancel: {},
                    确定: {
                        class: "btn-warning",
                        click: function () {
                            // Shutdown any/all selected notebooks before deleting
                            // the files.
                            that.shutdown_selected();

                            // Delete selected.
                            var transh_list = [];
                            selected.forEach(function (item) {
                                transh_list.push(item.path);
                            });
                            var base_url = utils.get_body_data("baseUrl");
                            var url = utils.url_join_encode(base_url, '/trash');
                            utils.ajax(url, {
                                type: "POST",
                                async: true,
                                data: JSON.stringify(transh_list),
                                dataType: "json",
                                timeout: 5000,
                                success: function (data, status, xhr) {
                                    if (status === "success") {
                                        if (data.status === 403) {
                                            dialog.modal({
                                                title: "失败",
                                                body: "文件移入回收站失败",  // FIXME: 增加失败原因
                                                default_button: "Cancel",
                                                buttons: {
                                                    确认: {}
                                                }
                                            });
                                        }
                                        that.load_list();
                                        that._selection_changed();
                                    }
                                    else {
                                        console.log(status);
                                    }
                                },
                                error: function (xhr, status, error) {
                                    console.log(error);
                                }
                            });
                        }
                    }
                }
            });

        };

        // recover trash
        var recover_trash_handler = function () {
            var trash_list = get_current_checked();
            var base_url = utils.get_body_data("baseUrl");
            var url = utils.url_join_encode(base_url, '/trash');
            utils.ajax(url, {
                type: "PUT",
                async: true,
                data: JSON.stringify(trash_list),
                dataType: "json",
                timeout: 5000,
                success: function (data, status, xhr) {
                    var trash_item = "";
                    if (status === "success") {
                        if (data.status === 403) {
                            dialog.modal({
                                title: "恢复文件失败",
                                body: "恢复文件或文件夹失败，可能是原文件位置已存在同名文件或回收站文件丢失",
                                default_button: "确认",
                                buttons: {
                                    确认: {}
                                }
                            });
                        }
                        refresh_trash_list();
                        selection_changed();
                        // refresh tree page
                        Jupyter.notebook_list.load_list();
                    }
                    else {
                        console.log(status);
                    }
                },
                error: function (xhr, status, error) {
                    console.log(error);
                }
            });
        };

        // delete trash
        var delete_trash_forver_handler = function () {
            var trash_list = get_current_checked();
            var base_url = utils.get_body_data("baseUrl");
            var url = utils.url_join_encode(base_url, '/trash');
            utils.ajax(url, {
                type: "DELETE",
                async: true,
                data: JSON.stringify(trash_list),
                dataType: "json",
                timeout: 5000,
                success: function (data, status, xhr) {
                    var trash_item = "";
                    if (status === "success") {
                        refresh_trash_list();
                        selection_changed();
                    }
                    else {
                        console.log(status);
                    }
                },
                error: function (xhr, status, error) {
                    console.log(error);
                }
            });
        };

        // rearrange trash list
        var rearrange_trash_list_handler = function () {
            var trash_sort_mark = $("#trash-sort-mark").hasClass("fa-arrow-down");
            if (trash_sort_mark === true) {
                $("#trash-sort-mark").removeClass();
                $("#trash-sort-mark").addClass("fa").addClass("fa-arrow-up");
            }
            else {
                $("#trash-sort-mark").removeClass();
                $("#trash-sort-mark").addClass("fa").addClass("fa-arrow-down");
            }
            refresh_trash_list();
        };

        // clear recycle
        var clear_recycle_handler = function () {
            dialog.modal({
                title: "清空回收站",
                body: "清空回收站将永久删除回收站中的所有文件与文件夹，确认清空吗？",
                default_button: "Cancel",
                buttons: {
                    Cancel: {},
                    Delete: {
                        class: "btn-danger",
                        click: function () {
                            var base_url = utils.get_body_data("baseUrl");
                            var url = utils.url_join_encode(base_url, '/trash');
                            utils.ajax(url, {
                                type: "DELETE",
                                async: true,
                                data: JSON.stringify([]),
                                dataType: "json",
                                timeout: 5000,
                                success: function (data, status, xhr) {
                                    var trash_item = "";
                                    if (status === "success") {
                                        refresh_trash_list();
                                        selection_changed();
                                    }
                                    else {
                                        console.log(status);
                                    }
                                },
                                error: function (xhr, status, error) {
                                    console.log(error);
                                }
                            });
                        }
                    }
                }
            });
        };

        // bind event
        $('#delete-date').click(rearrange_trash_list_handler);
        //$('#trash-select-all').click(select_all_trash_handler);
        $("#trash-button-select-all").click(select_all_trash_handler);
        $('#trash-select-notebooks').click(function (event) {
            trash_select('select-notebooks');
        });
        $('#trash-select-folders').click(function (event) {
            trash_select('select-folders');
        });
        $('#trash-select-files').click(function (event) {
            trash_select('select-files');
        });
        $('#refresh_recycle_bin_list').click(refresh_trash_list);
        $('#recovery').click(recover_trash_handler);
        $('#delete-forver').click(delete_trash_forver_handler);
        $(".trash-button").click(send_to_trash_handler);
        $('#drop_all_trash').click(clear_recycle_handler);

        var trash_interval_id = 0;
        function disable_autorefresh_trash() {
            clearInterval(trash_interval_id);
            trash_interval_id = 0;
        }

        function enable_autorefresh_trash() {
            refresh_trash_list();
            trash_interval_id = setInterval(refresh_trash_list, 1000 * 30);
        }

        // stop autorefresh when page lose focus
        $(window).blur(function () {
            disable_autorefresh_trash();
        });

        //re-enable when page get focus back
        $(window).focus(function () {
            enable_autorefresh_trash();
        });
        enable_autorefresh_trash()

    };

    // 插件加载入口
    var load_ipython_extension = function () {
        treePage();
        show_recycle_bin();
        recycle_bin_handler();
    };

    return {
        load_ipython_extension: load_ipython_extension
    };

});
