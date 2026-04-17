import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.utils.storage import save_file

router = APIRouter()


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    allowed = {".pdf", ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp", ".docx"}
    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""

    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    file_id = str(uuid.uuid4())
    contents = await file.read()
    save_file(file_id, contents, ext)

    return {"file_id": file_id}
