from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import upload, stream

app = FastAPI(title="Document Intelligence Pipeline")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175"],  # Vite default port
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(stream.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
