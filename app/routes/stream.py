import asyncio
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.utils.sse_manager import get_queue, create_queue
from app.utils.storage import file_exists
from app.orchestrator.pipeline import run_pipeline

router = APIRouter()


@router.get("/stream/{file_id}")
async def stream(file_id: str):
    if not file_exists(file_id):
        raise HTTPException(status_code=404, detail="file_id not found")

    create_queue(file_id)

    async def event_generator():
        asyncio.create_task(run_pipeline(file_id))
        queue = get_queue(file_id)

        while True:
            event = await queue.get()
            yield f"event: {event['type']}\ndata: {json.dumps(event['data'])}\n\n"

            if event.get("final"):
                break

    return StreamingResponse(event_generator(), media_type="text/event-stream")
