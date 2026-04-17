import asyncio
from app.utils.sse_manager import send_event
from app.utils.storage import get_file_path
from app.services import extraction_service, llm_service, decision_service, calendar_service


async def run_pipeline(file_id: str) -> None:
    try:
        file_path = get_file_path(file_id)

        await send_event(file_id, "Extraction started")
        text = await asyncio.get_event_loop().run_in_executor(
            None, extraction_service.extract_text, file_path
        )
        await send_event(file_id, "Extraction completed")

        await send_event(file_id, "Analysing document...")
        action = await asyncio.get_event_loop().run_in_executor(
            None, llm_service.extract_action, text
        )
        await send_event(file_id, f"Action identified: {action.title}")

        decision = decision_service.evaluate(action)
        await send_event(file_id, f"Decision: {decision['reason']}")

        if not decision["execute"]:
            await send_event(file_id, "Action not executed", data={
                "action": action.model_dump(),
                "decision": decision,
            }, final=True)
            return

        await send_event(file_id, "Creating calendar event...")
        result = await asyncio.get_event_loop().run_in_executor(
            None, calendar_service.create_event, action
        )
        await send_event(file_id, "Event created", data={
            "action": action.model_dump(),
            "decision": decision,
            "result": result,
        }, final=True)

    except Exception as e:
        await send_event(file_id, f"Error: {e}", data={"error": str(e)}, final=True)
