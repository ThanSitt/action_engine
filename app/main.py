from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI
from app.routes import upload, stream

app = FastAPI(title="Document Intelligence Pipeline")

app.include_router(upload.router)
app.include_router(stream.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
