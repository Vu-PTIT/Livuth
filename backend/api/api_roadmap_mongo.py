"""
Roadmap API Routes
"""
from typing import Any
from fastapi import APIRouter, status, Depends
from backend.utils.exception_handler import CustomException, ExceptionType
from backend.schemas.sche_response import DataResponse
from backend.schemas.sche_roadmap import (
    RoadmapCreateRequest, 
    RoadmapUpdateRequest,
    EventRoadmapsResponse
)
from backend.services.srv_roadmap_mongo import RoadmapMongoService
from backend.services.srv_user_mongo import UserMongoService
from backend.core.security import JWTBearer, decode_jwt

router = APIRouter(prefix="/roadmaps")

roadmap_service = RoadmapMongoService()
user_service = UserMongoService()


@router.get("/event/{event_id}", response_model=DataResponse)
async def get_event_roadmaps(
    event_id: str,
    # token: str = Depends(JWTBearer()) # Optional auth for viewing roadmaps, uncomment if needed
) -> Any:
    """Get all roadmaps for an event"""
    result = await roadmap_service.get_event_roadmaps(event_id)
    return DataResponse(data={"roadmaps": result})


@router.get("/{roadmap_id}", response_model=DataResponse)
async def get_roadmap_detail(
    roadmap_id: str,
) -> Any:
    """Get roadmap details by ID"""
    roadmap = await roadmap_service.get_roadmap_by_id(roadmap_id)
    if not roadmap:
        raise CustomException(
            exception_type=ExceptionType.NOT_FOUND,
            message="Không tìm thấy lộ trình"
        )
    return DataResponse(data=roadmap)


@router.post("/event/{event_id}", response_model=DataResponse, status_code=status.HTTP_201_CREATED)
async def create_roadmap(
    event_id: str,
    roadmap_data: RoadmapCreateRequest,
    token: str = Depends(JWTBearer())
) -> Any:
    """Create a roadmap for an event (requires login)"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    # Get user info for denormalization
    user = await user_service.get_by_id(user_id)
    
    user_name = getattr(user, 'full_name', None) or getattr(user, 'username', 'Anonymous')
    user_avatar = getattr(user, 'avatar_url', None)
    
    roadmap = await roadmap_service.create_roadmap(
        event_id=event_id,
        user_id=user_id,
        user_name=user_name,
        user_avatar=user_avatar,
        data=roadmap_data
    )
    
    return DataResponse(data=roadmap, message="Tạo lộ trình thành công!")


@router.put("/{roadmap_id}", response_model=DataResponse)
async def update_roadmap(
    roadmap_id: str,
    roadmap_data: RoadmapUpdateRequest,
    token: str = Depends(JWTBearer())
) -> Any:
    """Update a roadmap (only owner can update)"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    roadmap = await roadmap_service.update_roadmap(
        roadmap_id=roadmap_id,
        user_id=user_id,
        data=roadmap_data
    )
    
    return DataResponse(data=roadmap, message="Cập nhật lộ trình thành công!")


@router.delete("/{roadmap_id}", response_model=DataResponse)
async def delete_roadmap(
    roadmap_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Delete a roadmap (owner or admin)"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    role = payload.get("role", "")
    is_admin = role.upper() == "ADMIN"
    
    await roadmap_service.delete_roadmap(
        roadmap_id=roadmap_id,
        user_id=user_id,
        is_admin=is_admin
    )
    
    return DataResponse(data=None, message="Xóa lộ trình thành công!")


@router.post("/{roadmap_id}/like", response_model=DataResponse)
async def toggle_like_roadmap(
    roadmap_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Like or unlike a roadmap"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    result = await roadmap_service.toggle_like(
        roadmap_id=roadmap_id,
        user_id=user_id
    )
    
    return DataResponse(data=result)
