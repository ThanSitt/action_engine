import json
import os
from google import genai
from app.models.schemas import ExtractedAction

_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

_SYSTEM = """
You are a document analysis assistant. Given the text of a document, extract the primary action it requires.

Respond with a single JSON object — no markdown, no explanation — with these fields:
{
  "action_type": "create_calendar_event" | "send_email" | "set_reminder" | "unknown",
  "title": "<short label>",
  "description": "<full detail>",
  "date": "<YYYY-MM-DD or null>",
  "time": "<HH:MM or null>",
  "confidence": <0.0 to 1.0>
}
""".strip()


def extract_action(text: str) -> ExtractedAction:
    response = _client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"{_SYSTEM}\n\nDocument text:\n\n{text}",
    )
    raw = response.text.strip()

    # Strip markdown code fences if the model wraps the JSON
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    data = json.loads(raw)
    return ExtractedAction(**data)
