"""
MongoDB Notification Model - Pydantic schemas for user notifications
"""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from backend.models.mongo_user import PyObjectId


class NotificationMongo(BaseModel):
    """Notification MongoDB Document Model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    
    # Recipient - who receives this notification
    user_id: PyObjectId
    
    # Actor - who triggered this notification
    actor_id: PyObjectId
    
    # Notification type: "like", "comment", "checkin", or "proximity"
    type: str = Field(..., pattern="^(like|comment|checkin|proximity)$")
    
    # Message content
    message: str
    
    # Reference IDs
    post_id: Optional[PyObjectId] = None
    comment_id: Optional[PyObjectId] = None
    event_id: Optional[PyObjectId] = None
    
    # Status
    read: bool = False
    
    # Timestamps
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "actor_id": "507f1f77bcf86cd799439012",
                "type": "like",
                "message": "đã thích bài viết của bạn",
                "post_id": "507f1f77bcf86cd799439013",
                "read": False
            }
        }
    }
