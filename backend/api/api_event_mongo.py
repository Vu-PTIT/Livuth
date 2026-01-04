"""
Event API Routes
"""
from typing import Any, List, Optional
from fastapi import APIRouter, status, Query, Depends
from backend.utils.exception_handler import CustomException
from backend.schemas.sche_response import DataResponse
from backend.schemas.sche_event import (
    EventCreateRequest,
    EventUpdateRequest,
    EventBaseResponse,
)
from backend.services.srv_event_mongo import EventMongoService
from backend.services.srv_user_mongo import UserMongoService
from backend.core.security import JWTBearer, AdminRequired, EventProviderOrAdmin, EventOwnerOrAdmin, decode_jwt

router = APIRouter(prefix="/events")

event_service = EventMongoService()
user_service = UserMongoService()


@router.get(
    "/all",
    response_model=DataResponse[List[EventBaseResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_all(
    limit: Optional[int] = None,
    token: str = Depends(JWTBearer())
) -> Any:
    """Get all events (requires login)"""
    try:
        data, metadata = await event_service.get_all(limit=limit)
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/recommendations/{user_id}",
    response_model=DataResponse[List[EventBaseResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_recommendations(
    user_id: str,
    limit: int = Query(default=10, ge=1, le=50),
    token: str = Depends(JWTBearer())
) -> Any:
    """Get personalized event recommendations based on user's hobbies (requires login)"""
    try:
        # Get user's hobbies
        user = await user_service.get_by_id(user_id)
        user_hobbies = user.hobbies or []
        
        if not user_hobbies:
            # If user has no hobbies, return all events
            data, metadata = await event_service.get_all(limit=limit)
        else:
            # Get recommended events
            data, metadata = await event_service.get_recommended_events(
                user_hobbies=user_hobbies,
                limit=limit,
                include_score=True
            )
        
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/nearby",
    response_model=DataResponse[List[EventBaseResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_nearby(
    lat: float = Query(..., description="Latitude of center point"),
    lng: float = Query(..., description="Longitude of center point"),
    radius_km: float = Query(default=10.0, ge=0.1, le=500, description="Search radius in kilometers"),
    limit: int = Query(default=20, ge=1, le=100),
    token: str = Depends(JWTBearer())
) -> Any:
    """Get events within a specified radius from a location (requires login)"""
    try:
        data, metadata = await event_service.get_nearby_events(
            lat=lat,
            lng=lng,
            radius_km=radius_km,
            limit=limit
        )
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/search",
    response_model=DataResponse[List[EventBaseResponse]],
    status_code=status.HTTP_200_OK,
)
async def search_events(
    q: Optional[str] = Query(None, description="Search query"),
    city: Optional[str] = Query(None, description="Filter by city"),
    province: Optional[str] = Query(None, description="Filter by province"),
    categories: Optional[str] = Query(None, description="Comma-separated list of categories"),
    limit: int = Query(default=20, ge=1, le=100),
    token: str = Depends(JWTBearer())
) -> Any:
    """Search and filter events (requires login)"""
    try:
        # Parse categories
        category_list = None
        if categories:
            category_list = [c.strip() for c in categories.split(",")]
        
        data, metadata = await event_service.search_events(
            query=q,
            city=city,
            province=province,
            categories=category_list,
            limit=limit
        )
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/category/{category}",
    response_model=DataResponse[List[EventBaseResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_by_category(
    category: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Get all events in a specific category (requires login)"""
    try:
        data, metadata = await event_service.get_by_category(category=category)
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/{event_id}",
    response_model=DataResponse[EventBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def get_by_id(
    event_id: str,
    include_tours: bool = Query(default=True, description="Include tour provider listings"),
    token: str = Depends(JWTBearer())
) -> Any:
    """Get event by ID with optional tour providers (requires login)"""
    try:
        event = await event_service.get_by_id(event_id=event_id, include_tours=include_tours)
        return DataResponse(http_code=status.HTTP_200_OK, data=event)
    except Exception as e:
        raise CustomException(exception=e)


@router.post(
    "",
    response_model=DataResponse[EventBaseResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create(
    event_data: EventCreateRequest,
    token: str = Depends(EventProviderOrAdmin())
) -> Any:
    """Create new event (Admin or Event Provider)"""
    try:
        # Extract user_id from token to set as creator
        payload = decode_jwt(token)
        user_id = payload.get("sub")
        
        new_event = await event_service.create(data=event_data, creator_id=user_id)
        return DataResponse(http_code=status.HTTP_201_CREATED, data=new_event)
    except Exception as e:
        print(f"========== Event Create Error ==========")
        print(f"Error type: {type(e).__name__}")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise CustomException(exception=e)


@router.put(
    "/{event_id}",
    response_model=DataResponse[EventBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def update_by_id(
    event_id: str,
    event_data: EventUpdateRequest,
    token: str = Depends(EventOwnerOrAdmin())
) -> Any:
    """Update event by ID (Owner or Admin only)"""
    try:
        updated_event = await event_service.update_by_id(event_id=event_id, data=event_data)
        return DataResponse(http_code=status.HTTP_200_OK, data=updated_event)
    except Exception as e:
        raise CustomException(exception=e)


@router.patch(
    "/{event_id}",
    response_model=DataResponse[EventBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def partial_update_by_id(
    event_id: str,
    event_data: EventUpdateRequest,
    token: str = Depends(EventOwnerOrAdmin())
) -> Any:
    """Partially update event by ID (Owner or Admin only)"""
    try:
        updated_event = await event_service.update_by_id(event_id=event_id, data=event_data)
        return DataResponse(http_code=status.HTTP_200_OK, data=updated_event)
    except Exception as e:
        raise CustomException(exception=e)


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_by_id(
    event_id: str,
    token: str = Depends(EventOwnerOrAdmin())
) -> None:
    """Delete event by ID (Owner or Admin only)"""
    try:
        await event_service.delete_by_id(event_id=event_id)
    except Exception as e:
        raise CustomException(exception=e)

