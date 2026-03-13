"""
Vibe Snap API Routes - Short-lived map stories
"""
from typing import Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, status, Depends, Query, UploadFile, File, Form, HTTPException
from bson import ObjectId

from backend.core.database import db
from backend.utils.exception_handler import CustomException, ExceptionType
from backend.schemas.sche_response import DataResponse
from backend.schemas.sche_vibe_snap import VibeSnapCreateRequest, VibeSnapResponse
from backend.services.srv_user_mongo import UserMongoService
from backend.core.security import JWTBearer, decode_jwt
from backend.api.api_upload import upload_to_cloudinary

router = APIRouter(prefix="/vibe-snaps")
user_service = UserMongoService()

def get_snaps_collection():
    return db.get_collection("vibe_snaps")

async def get_user_info(user_id: str) -> dict:
    """Get user info for embedding in snap"""
    try:
        user = await user_service.get_by_id(user_id)
        return {
            "id": str(user_id),
            "username": user.username,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url
        }
    except:
        return {
            "id": str(user_id),
            "username": "Unknown",
            "full_name": None,
            "avatar_url": None
        }

async def format_snap_response(snap: dict) -> dict:
    """Format snap for response with author info"""
    author_info = await get_user_info(str(snap.get("user_id")))
    
    # Format coordinates from GeoJSON
    coords = snap.get("location", {}).get("coordinates", [0, 0])
    location = {"lat": coords[1], "lng": coords[0]}
    
    return {
        "id": str(snap["_id"]),
        "user": author_info,
        "media_url": snap.get("media_url", ""),
        "type": snap.get("type", "image"),
        "location": location,
        "event_id": str(snap.get("event_id")) if snap.get("event_id") else None,
        "created_at": snap.get("created_at", 0),
        "expires_at": snap.get("expires_at").timestamp() if isinstance(snap.get("expires_at"), datetime) else 0
    }


# ==================== VIBE SNAP CRUD ====================

@router.post("", response_model=DataResponse, status_code=status.HTTP_201_CREATED)
async def create_vibe_snap(
    file: UploadFile = File(...),
    lat: float = Form(...),
    lng: float = Form(...),
    event_id: Optional[str] = Form(None),
    token: str = Depends(JWTBearer())
) -> Any:
    """Create a new Vibe Snap (with file upload)"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    # 1. Upload file to Cloudinary
    try:
        upload_data = upload_to_cloudinary(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải lên tệp: {str(e)}")
        
    media_url = upload_data.get("url")
    content_type = upload_data.get("content_type", "")
    media_type = "video" if content_type.startswith("video") else "image"
    
    # 2. Setup MongoDB Document
    now = datetime.now()
    expires = now + timedelta(hours=24)
    
    event_oid = None
    if event_id and event_id != "undefined" and event_id != "null":
        try:
            event_oid = ObjectId(event_id)
        except:
            pass

    snap_doc = {
        "user_id": ObjectId(user_id),
        "media_url": media_url,
        "type": media_type,
        "location": {
            "type": "Point",
            "coordinates": [lng, lat]
        },
        "event_id": event_oid,
        "created_at": now.timestamp(),
        "expires_at": expires 
    }
    
    # 3. Insert to DB
    result = await get_snaps_collection().insert_one(snap_doc)
    snap_doc["_id"] = result.inserted_id
    
    # 4. Format response
    response = await format_snap_response(snap_doc)
    return DataResponse(data=response, message="Đã chia sẻ Vibe Snap!")


@router.get("/nearby", response_model=DataResponse)
async def get_nearby_snaps(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(10, description="Radius in km"),
    limit: int = Query(100, description="Max snaps to return")
) -> Any:
    """Get unexpired Vibe Snaps near a location"""
    # Expiration is inherently handled by MongoDB TTL index, but we can query it just in case
    # to be safe if TTL hasn't fired yet.
    now = datetime.utcnow()
    
    # Geospatial query
    query = {
        "location": {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [lng, lat]
                },
                "$maxDistance": radius * 1000  # meters
            }
        },
        "expires_at": {"$gt": now}
    }
    
    cursor = get_snaps_collection().find(query).limit(limit)
    snaps = await cursor.to_list(length=limit)
    
    # Format responses
    formatted_snaps = []
    for snap in snaps:
        formatted = await format_snap_response(snap)
        formatted_snaps.append(formatted)
        
    return DataResponse(data=formatted_snaps)
