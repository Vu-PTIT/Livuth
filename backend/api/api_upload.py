from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import shutil
import os
import uuid
from typing import List
from backend.core.config import settings

router = APIRouter(prefix="/upload")

UPLOAD_DIR = "backend/static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=dict)
async def upload_file(file: UploadFile = File(...)):
    try:
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return URL
        # Assuming the backend is served at root or via proxy
        # We'll return a relative URL or absolute based on config
        # For now, return relative path that frontend can prepend API_URL or STATIC_URL to
        # Or better, return full URL if we know the domain.
        # Let's return the static path which we will mount.
        
        url = f"/static/uploads/{unique_filename}"
        
        return {
            "success": True,
            "data": {
                "url": url,
                "filename": unique_filename,
                "content_type": file.content_type
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/multiple", response_model=dict)
async def upload_multiple_files(files: List[UploadFile] = File(...)):
    uploaded_files = []
    try:
        for file in files:
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            uploaded_files.append({
                "url": f"/static/uploads/{unique_filename}",
                "filename": unique_filename,
                "content_type": file.content_type
            })
            
        return {
            "success": True,
            "data": uploaded_files
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
