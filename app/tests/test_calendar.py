from app.services.calendar_service import create_event
from app.models.schemas import ExtractedAction

action = ExtractedAction(
    action_type="create_calendar_event",
    title="Test Meeting",
    description="Testing calendar integration",
    date="2026-04-20",
    time="10:00",
    confidence=0.95
)

print(create_event(action))