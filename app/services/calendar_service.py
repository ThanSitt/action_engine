from pathlib import Path
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from app.models.schemas import ExtractedAction

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
TIMEZONE = "Asia/Yangon"

_BASE = Path(__file__).parent.parent  # app/
_CREDENTIALS_FILE = _BASE / "credentials.json"
_TOKEN_FILE = _BASE / "token.json"


def _get_service():
    creds = None

    if _TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(_TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(_CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        _TOKEN_FILE.write_text(creds.to_json())

    return build("calendar", "v3", credentials=creds)


def create_event(action: ExtractedAction) -> dict:
    service = _get_service()

    date_str = action.date or datetime.now(ZoneInfo(TIMEZONE)).strftime("%Y-%m-%d")
    time_str = action.time or "09:00"

    start_dt = datetime.fromisoformat(f"{date_str}T{time_str}:00")
    end_dt = start_dt + timedelta(hours=1)

    event = {
        "summary": action.title,
        "description": action.description,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": TIMEZONE},
        "end":   {"dateTime": end_dt.isoformat(),   "timeZone": TIMEZONE},
    }

    created = service.events().insert(calendarId="primary", body=event).execute()
    return {"event_id": created["id"], "link": created.get("htmlLink")}
