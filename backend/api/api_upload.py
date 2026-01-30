from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import cloudinary
import cloudinary.uploader
from backend.core.config import settings

router = APIRouter(prefix="/upload")

# Configure Cloudinary
if settings.CLOUDINARY_CLOUD_NAME:
    cloudinary.config( 
        cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
        api_key = settings.CLOUDINARY_API_KEY, 
        api_secret = settings.CLOUDINARY_API_SECRET,
        secure = True
    )

def upload_to_cloudinary(file: UploadFile):
    """Upload a file to Cloudinary, using chunked upload for videos."""
    is_video = file.content_type and file.content_type.startswith("video")
    resource_type = "video" if is_video else "image"
    
    upload_options = {
        "resource_type": resource_type,
        "folder": "livuth_uploads",
        "timeout": 300,  # 5 minutes timeout
    }
    
    # Use chunked upload for videos (handles large files better)
    if is_video:
        result = cloudinary.uploader.upload_large(
            file.file,
            chunk_size=6000000,  # 6MB chunks
            **upload_options
        )
    else:
        result = cloudinary.uploader.upload(
            file.file,
            **upload_options
        )
    
    return {
        "url": result.get("secure_url"),
        "filename": result.get("public_id"),
        "content_type": file.content_type,
        "width": result.get("width"),
        "height": result.get("height"),
        "duration": result.get("duration"),  # For videos
    }

@router.post("/", response_model=dict)
async def upload_file(file: UploadFile = File(...)):
    try:
        data = upload_to_cloudinary(file)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {str(e)}")

@router.post("/multiple", response_model=dict)
async def upload_multiple_files(files: List[UploadFile] = File(...)):
    uploaded_files = []
    try:
        for file in files:
            data = upload_to_cloudinary(file)
            uploaded_files.append(data)
        return {"success": True, "data": uploaded_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {str(e)}")

