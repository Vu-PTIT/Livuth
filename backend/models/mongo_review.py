"""
MongoDB Review Model - Pydantic schemas for event reviews
"""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from backend.models.mongo_user import PyObjectId


class ReviewMongo(BaseModel):
    """Review MongoDB Document Model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    event_id: PyObjectId  # Reference to event
    user_id: PyObjectId   # Reference to user who wrote the review
    
    # Review content
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    comment: Optional[str] = Field(None, max_length=1000)
    
    # User info (denormalized for display)
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    
    # Timestamps
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    updated_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "event_id": "507f1f77bcf86cd799439011",
                "user_id": "507f1f77bcf86cd799439012",
                "rating": 5,
                "comment": "Lễ hội rất tuyệt vời, đông vui và nhiều hoạt động thú vị!",
                "user_name": "Nguyễn Văn A"
            }
        }
    }
