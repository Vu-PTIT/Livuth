"""
MongoDB Comment Model - Pydantic schemas for comments on posts
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from backend.models.mongo_user import PyObjectId


class CommentMongo(BaseModel):
    """Comment MongoDB Document Model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    
    # References
    post_id: PyObjectId
    author_id: PyObjectId
    
    # Content
    content: str = Field(..., min_length=1, max_length=2000)
    
    # Interactions
    like_count: int = 0
    liked_by: List[PyObjectId] = Field(default_factory=list)
    
    # Reply support (nested comments)
    parent_id: Optional[PyObjectId] = None
    reply_count: int = 0
    
    # Timestamps
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    updated_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "post_id": "507f1f77bcf86cd799439011",
                "author_id": "507f1f77bcf86cd799439012",
                "content": "Đẹp quá! Lần sau cho mình đi cùng với nhé 😍",
            }
        }
    }
