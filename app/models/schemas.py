from pydantic import BaseModel
from typing import Optional


class ExtractedAction(BaseModel):
    action_type: str           # e.g. "create_calendar_event", "send_email", "unknown"
    title: Optional[str] = "Untitled"                 # short human-readable label
    description: Optional[str] = "No description available"          # full detail extracted from the document
    date: Optional[str] = "None" # ISO date string if found, e.g. "2026-04-20"
    time: Optional[str] = None # e.g. "14:00"
    confidence: float          # 0.0 – 1.0
