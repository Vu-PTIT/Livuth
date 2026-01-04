"""
MongoDB Chat Models - Pydantic schemas for chat conversations and messages
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from backend.models.mongo_user import PyObjectId


class ChatConversation(BaseModel):
    """Chat Conversation MongoDB Document Model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId  # Link to user
    title: str = Field(default="New Conversation", max_length=200)
    
    # Timestamps
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    updated_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "title": "Conversation về lễ hội",
                "user_id": "676c5f8a1234567890abcdef"
            }
        }
    }


class ChatMessage(BaseModel):
    """Chat Message MongoDB Document Model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    conversation_id: PyObjectId  # Link to conversation
    role: str = Field(..., pattern="^(user|assistant|system)$")  # Message role
    content: str = Field(..., min_length=1)  # Message content
    
    # Timestamps
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "conversation_id": "676d123abc456def78901234",
                "role": "user",
                "content": "Hôm nay có lễ hội gì?"
            }
        }
    }
