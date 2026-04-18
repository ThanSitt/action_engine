import os
import tempfile
from typing import Dict, Tuple, List
from datetime import datetime

_store: Dict[str, Tuple[str, str]] = {}
_history: List[dict] = []


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
    # remove file from disk
    entry = _store.pop(file_id, None)
    if entry:
        os.unlink(entry[0])

    global _history
    _history = [item for item in _history if item["file_id"] != file_id]


def add_history(file_id: str, filename: str, result: dict) -> None:
    _history.append({
        "file_id": file_id,
        "filename": filename,
        "processed_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "result": result,
    })


def get_history() -> List[dict]:
    return list(reversed(_history))