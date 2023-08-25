import os
import zipfile
from typing import List

def remove_leading_dir(dir: str, fname: str) -> str:
    if dir not in fname:
        print(dir, fname)
        raise Exception("dir not in fname")
    return fname[len(dir):]

def should_ignore_file(fpath: str, files_to_ignore: List[str]) -> bool:
    for f in files_to_ignore:
        if f == fpath:
            return True
    return False

def zip_files(zip_filename: str, dir_to_zip: str, files_to_ignore: List[str]) -> None:
    if os.path.exists(zip_filename):
        os.remove(zip_filename)

    files_to_zip = []
    for root, directories, files in os.walk(dir_to_zip):
        print(root)
        print(files)
        files = [os.path.join(root, x) for x in files]
        print(files)
        files = [x for x in files if not should_ignore_file(x, files_to_ignore)]
        print(files)
        files_to_zip.extend(files)

    with zipfile.ZipFile(zip_filename, 'w') as zipf:
        for file in files_to_zip:
            zipf.write(
                filename=file,
                arcname=remove_leading_dir(dir_to_zip, file),
            )

if __name__ == "__main__":
    dir_to_zip = "Release\\"
    zip_name = dir_to_zip.replace('\\', '')
    zip_files(
        zip_filename=zip_name + ".zip",
        dir_to_zip=dir_to_zip,
        files_to_ignore=[
            os.path.join(dir_to_zip, ".gitattributes"),
            os.path.join(dir_to_zip, ".gitignore"),
            os.path.join(dir_to_zip, "LICENSE"),
        ]
    )
