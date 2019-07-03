from glob import glob
import setuptools

setuptools.setup(
    name="nbtrash",
    version='0.1.0',
    url="https://github.com/wixb50/nbtrash",
    author="wixb50",
    description="Add Recycle bin to your jupyter notebook.",
    packages=setuptools.find_packages(),
    install_requires=[
        'send2trash',
        'notebook',
    ],
    data_files=[
        ('share/jupyter/nbextensions/nbtrash', glob('nbtrash/static/*')),
        ('etc/jupyter/jupyter_notebook_config.d', ['nbtrash/etc/server_trash.json']),
        ('etc/jupyter/nbconfig/notebook.d', ['nbtrash/etc/nbext_trash.json'])
    ],
    zip_safe=False,
    include_package_data=True
)
