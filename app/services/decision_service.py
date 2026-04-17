from app.models.schemas import ExtractedAction

CONFIDENCE_THRESHOLD = 0.7
EXECUTABLE_ACTIONS = {"create_calendar_event", "set_reminder"}


def evaluate(action: ExtractedAction) -> dict:
    if action.action_type not in EXECUTABLE_ACTIONS:
        return {"execute": False, "reason": f"Action type '{action.action_type}' is not supported"}

    if action.confidence < CONFIDENCE_THRESHOLD:
        return {"execute": False, "reason": f"Confidence too low ({action.confidence:.0%})"}

    if action.action_type == "create_calendar_event" and not action.date:
        return {"execute": False, "reason": "No date found for calendar event"}

    return {"execute": True, "reason": "Approved"}
