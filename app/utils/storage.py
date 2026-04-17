import os
import tempfile
from typing import Dict, Tuple

# Maps file_id → (tmp_file_path, extension)
_store: Dict[str, Tuple[str, str]] = {}


def save_file(file_id: str, contents: bytes, ext: str) -> str:
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    tmp.write(contents)
    tmp.close()
    _store[file_id] = (tmp.name, ext)
    return tmp.name


def get_file_path(file_id: str) -> str:
    entry = _store.get(file_id)
    if entry is None:
        raise KeyError(f"No file for file_id: {file_id}")
    return entry[0]


def file_exists(file_id: str) -> bool:
    return file_id in _store


def delete_file(file_id: str) -> None:
    entry = _store.pop(file_id, None)
    if entry:
        os.unlink(entry[0])
