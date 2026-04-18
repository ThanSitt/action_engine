# Document Intelligence Pipeline

## Project Description

Upload a document — a PDF, scanned image, or Word file — and the app reads it, figures out what action it requires, and executes that action automatically. For example, upload an invoice with a due date and the app creates a Google Calendar event for it. The entire process streams live to the browser so you can watch each step happen in real time.

---

## Architecture Overview

```
Browser
  │
  ├── POST /upload  ──────────────────────────────▶ FastAPI
  │                                                    │
  └── GET  /stream/{id}  ◀── SSE events ───────────   │
                                                       │
                                              Orchestrator (pipeline.py)
                                                       │
                              ┌────────────────────────┼──────────────────────┐
                              ▼                        ▼                      ▼
                     Extraction Service          Gemini 2.5 Flash      Google Calendar API
                  (pdfplumber / pytesseract /    (action extraction     (event creation)
                   pypdfium2 / python-docx)       + confidence score)
```

**Flow:**

1. User uploads a document via the browser
2. FastAPI saves the file and returns a `file_id`
3. Browser opens an SSE connection using the `file_id`
4. The pipeline runs in the background:
   - **Extraction** — pulls raw text from the document
   - **LLM** — sends the text to Gemini, which returns a structured action (type, title, date, confidence)
   - **Decision** — checks confidence ≥ 70% and that the action type is supported
   - **Calendar** — creates a Google Calendar event if approved
5. Each step pushes a status event over SSE so the browser updates live

---

## Technical Choices

| Library                      | Purpose                          | Why                                                        |
| ---------------------------- | -------------------------------- | ---------------------------------------------------------- |
| **FastAPI**                  | Backend API + SSE                | Async-native, minimal boilerplate, built-in OpenAPI docs   |
| **pdfplumber**               | Digital PDF text extraction      | Reliable text-layer extraction with clean output           |
| **pypdfium2**                | Scanned PDF → image rendering    | Pure Python wheel — no system-level Poppler install needed |
| **pytesseract**              | OCR for images and scanned pages | Industry-standard Tesseract wrapper                        |
| **python-docx**              | DOCX extraction                  | Simple paragraph-level access, no Office install needed    |
| **google-genai**             | Gemini 2.5 Flash LLM calls       | Official Google SDK (new, non-deprecated version)          |
| **google-api-python-client** | Google Calendar API              | Official client, handles OAuth token lifecycle             |
| **python-dotenv**            | Environment variable loading     | Keeps secrets out of source code                           |

The decision service is intentionally kept as plain Python rules (no LangGraph or agent framework) because the approve/reject logic is simple enough that a graph would add complexity with no benefit at this stage.

---

## Setup and Running Instructions

### Prerequisites

- Python 3.11+
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) installed (Windows: run the UB Mannheim installer)
  - For macOS install with homebrew
- A Google Cloud project with:
  - **Google Calendar API** enabled
  - An **OAuth 2.0 Desktop app** credential downloaded as `app/credentials.json`
  - Your Google account added as a test user on the OAuth consent screen
- A [Google AI Studio](https://aistudio.google.com) API key for Gemini

### Google Cloud Console Setup

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project** → **New Project** → give it a name → **Create**
3. In the left sidebar go to **APIs & Services** → **Library**
4. Search for **Google Calendar API** → click it → click **Enable**

**Create OAuth credentials:**

5. Go to **APIs & Services** → **OAuth consent screen**
   - User type: **External** → **Create**
   - Fill in App name (e.g. `action_engine`) and your email for support and developer contact
   - Click **Save and Continue** through the remaining screens
6. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Desktop app**
   - Give it a name → **Create**
   - Click **Download JSON** on the created credential
   - Rename the downloaded file to `credentials.json` and place it at `app/credentials.json`

**Add yourself as a test user:**

7. Go back to **APIs & Services** → **OAuth consent screen**
8. Scroll down to **Test users** → **Add users**
9. Enter your Google account email → **Save**

> The browser authorization window will appear the first time a calendar event is created. After approving, `app/token.json` is saved and this step is skipped on future runs.

---

### Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd Capstone_project

# 2. Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create the environment file
cp app/.env.example app/.env
# Edit app/.env and add your Gemini API key:
# GEMINI_API_KEY=your-key-here

# 5. Place your Google OAuth credentials file at:
#    app/credentials.json

# 6. Start the backend
uvicorn app.main:app --reload

# 7. In a separate terminal, set up and start the frontend
cd frontend
npm install
npm run dev
```

The API is now running at `http://localhost:8000`.
Interactive API docs are available at `http://localhost:8000/docs`.
The frontend is available at `http://localhost:5173`.

### First Calendar Authorization

The first time a calendar event is created, a browser window will open asking you to authorize the app with your Google account. After approving, a `token.json` file is saved and future runs skip this step.

---

## Known Limitations

- **Single action per document** — the LLM extracts one action per upload. Documents with multiple actions (e.g., an email thread with several meeting requests) will only produce one calendar event.
- **Calendar only** — the pipeline supports `create_calendar_event` and `set_reminder` action types. `send_email` is identified but not executed.
- **Hardcoded timezone** — the timezone is set to `Asia/Yangon` in `calendar_service.py`. This would need to be user-configurable in production.
- **In-memory storage** — uploaded files and SSE queues are stored in memory. Restarting the server loses all state. A production version would use a database and object storage.
- **No authentication** — the API has no user authentication. Anyone with the server URL can upload files and trigger calendar events.
- **OCR accuracy** — pytesseract accuracy depends on image quality. Low-resolution or handwritten documents may produce poor extractions.
- **OAuth flow blocks the server** — the Google OAuth browser flow runs synchronously on first use, which would block other requests in a multi-user scenario.

---

## AI Tools Used

- **Claude (Anthropic)** — used throughout development as the primary coding assistant. Helped design the overall pipeline architecture, implement the SSE streaming pattern, write the extraction service routing logic, and debug the Google OAuth redirect URI mismatch.
- **ChatGPT (OpenAI)** — used for frontend development. Helped support React components, styling, and the SSE event listener logic.
- **Gemini 2.5 Flash (Google)** — used at runtime as the LLM that extracts actions from document text. Not used for writing code.
