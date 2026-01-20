"""
MongoDB Post Model - Pydantic schemas for travel posts (social media feature)
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from backend.models.mongo_user import PyObjectId
from backend.models.mongo_event import MediaItem, LocationInfo


class PostMongo(BaseModel):
    """Travel Post MongoDB Document Model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    
    # Author info
    author_id: PyObjectId
    
    # Content
    content: str = Field(..., min_length=1, max_length=5000)
    media: List[MediaItem] = Field(default_factory=list)
    location: Optional[LocationInfo] = None
    tags: List[str] = Field(default_factory=list)
    
    # Interactions
    like_count: int = 0
    comment_count: int = 0
    share_count: int = 0
    liked_by: List[PyObjectId] = Field(default_factory=list)
    
    # Visibility: public, friends, private
    visibility: str = "public"
    
    # Timestamps
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    updated_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "author_id": "507f1f77bcf86cd799439011",
                "content": "Chuyến đi Đà Lạt tuyệt vời! 🌸",
                "media": [{"url": "https://example.com/photo.jpg", "type": "image"}],
                "location": {"city": "Đà Lạt", "province": "Lâm Đồng"},
                "tags": ["dalat", "travel", "vietnam"],
                "visibility": "public"
            }
        }
    }
