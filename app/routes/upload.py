import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.utils.storage import save_file, get_history, delete_file

router = APIRouter()

_filenames: dict = {}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    allowed = {".pdf", ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp", ".docx"}
    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""

    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    file_id = str(uuid.uuid4())
    contents = await file.read()
    save_file(file_id, contents, ext)
    _filenames[file_id] = file.filename

    return {"file_id": file_id, "filename": file.filename}


@router.get("/history")
async def history():
    return get_history()

@router.delete("/history/{file_id}")
async def delete_history(file_id: str):
    if not delete_file(file_id):
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

def get_filename(file_id: str) -> str:
    return _filenames.get(file_id, "unknown")