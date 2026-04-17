import asyncio
from typing import Dict

_queues: Dict[str, asyncio.Queue] = {}


def create_queue(file_id: str) -> None:
    _queues[file_id] = asyncio.Queue()


def get_queue(file_id: str) -> asyncio.Queue:
    return _queues[file_id]


async def send_event(file_id: str, message: str, data: dict = None, final: bool = False) -> None:
    queue = _queues.get(file_id)
    if queue is None:
        return
    await queue.put({
        "type": "result" if final else "status",
        "data": data if final else message,
        "final": final,
    })
