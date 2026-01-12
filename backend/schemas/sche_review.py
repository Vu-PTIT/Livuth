"""
Review Schemas for Request/Response
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from backend.schemas.sche_base import BaseModelResponse


class ReviewCreateRequest(BaseModel):
    """Review creation request"""
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    comment: Optional[str] = Field(None, max_length=1000, description="Review comment")


class ReviewUpdateRequest(BaseModel):
    """Review update request"""
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)


class ReviewResponse(BaseModelResponse):
    """Review response"""
    event_id: str
    user_id: str
    rating: int
    comment: Optional[str] = None
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None


class ReviewStats(BaseModel):
    """Review statistics for an event"""
    average_rating: float = 0.0
    total_reviews: int = 0
    rating_distribution: dict = Field(default_factory=lambda: {
        "5": 0, "4": 0, "3": 0, "2": 0, "1": 0
    })


class EventReviewsResponse(BaseModel):
    """Response containing reviews and stats for an event"""
    stats: ReviewStats
    reviews: List[ReviewResponse]
