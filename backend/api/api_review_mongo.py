"""
Review API Routes
"""
from typing import Any
from fastapi import APIRouter, status, Depends
from backend.utils.exception_handler import CustomException, ExceptionType
from backend.schemas.sche_response import DataResponse
from backend.schemas.sche_review import (
    ReviewCreateRequest, 
    ReviewUpdateRequest,
    EventReviewsResponse
)
from backend.services.srv_review_mongo import ReviewMongoService
from backend.services.srv_user_mongo import UserMongoService
from backend.core.security import JWTBearer, decode_jwt

router = APIRouter(prefix="/reviews")

review_service = ReviewMongoService()
user_service = UserMongoService()


@router.get("/event/{event_id}", response_model=DataResponse)
async def get_event_reviews(
    event_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Get all reviews for an event with statistics (requires login)"""
    result = await review_service.get_event_reviews(event_id)
    return DataResponse(data=result)


@router.get("/event/{event_id}/my-review", response_model=DataResponse)
async def get_my_review(
    event_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Get current user's review for an event (if exists)"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    review = await review_service.get_user_review_for_event(event_id, user_id)
    return DataResponse(data=review)


@router.post("/event/{event_id}", response_model=DataResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    event_id: str,
    review_data: ReviewCreateRequest,
    token: str = Depends(JWTBearer())
) -> Any:
    """Create a review for an event (requires login)"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    # Get user info for denormalization
    user = await user_service.get_by_id(user_id)
    
    user_name = getattr(user, 'full_name', None) or getattr(user, 'username', 'Anonymous')
    user_avatar = getattr(user, 'avatar_url', None)
    
    review = await review_service.create_review(
        event_id=event_id,
        user_id=user_id,
        user_name=user_name,
        user_avatar=user_avatar,
        data=review_data
    )
    
    return DataResponse(data=review, message="Đánh giá thành công!")


@router.put("/{review_id}", response_model=DataResponse)
async def update_review(
    review_id: str,
    review_data: ReviewUpdateRequest,
    token: str = Depends(JWTBearer())
) -> Any:
    """Update a review (only owner can update)"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    review = await review_service.update_review(
        review_id=review_id,
        user_id=user_id,
        data=review_data
    )
    
    return DataResponse(data=review, message="Cập nhật đánh giá thành công!")


@router.delete("/{review_id}", response_model=DataResponse)
async def delete_review(
    review_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Delete a review (owner or admin)"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    role = payload.get("role", "")
    is_admin = role.upper() == "ADMIN"
    
    await review_service.delete_review(
        review_id=review_id,
        user_id=user_id,
        is_admin=is_admin
    )
    
    return DataResponse(data=None, message="Xóa đánh giá thành công!")


@router.get("/event/{event_id}/stats", response_model=DataResponse)
async def get_event_rating_stats(
    event_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Get rating statistics for an event (for event cards)"""
    stats = await review_service.get_event_average_rating(event_id)
    return DataResponse(data=stats)
