"""
MongoDB Event Model - Pydantic schemas for MongoDB event documents
"""
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from backend.models.mongo_user import PyObjectId


class TimeInfo(BaseModel):
    """Time information for event"""
    lunar: Optional[str] = None
    next_occurrence: Optional[str] = None
    
    model_config = {
        "populate_by_name": True
    }


class ContentInfo(BaseModel):
    """Content information for event"""
    intro: Optional[str] = None
    history: Optional[str] = None
    activities: List[str] = Field(default_factory=list)
    
    model_config = {
        "populate_by_name": True
    }


class MediaItem(BaseModel):
    """Media item for event"""
    url: str
    caption: Optional[str] = None
    type: Optional[str] = None
    
    model_config = {
        "populate_by_name": True
    }


class LocationInfo(BaseModel):
    """Location information for event"""
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    coordinates: Optional[Dict] = None  # GeoJSON Point format: {type: "Point", coordinates: [lng, lat]}
    
    model_config = {
        "populate_by_name": True
    }


class EventInfo(BaseModel):
    """Additional event information"""
    is_free: bool = True
    ticket_price: Optional[float] = None
    note: Optional[str] = None
    
    model_config = {
        "populate_by_name": True
    }


class EventMongo(BaseModel):
    """Event MongoDB Document Model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    event_id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=200)
    
    # Event ownership
    creator_id: Optional[PyObjectId] = None
    
    time: Optional[TimeInfo] = None
    content: Optional[ContentInfo] = None
    media: List[MediaItem] = Field(default_factory=list)
    info: Optional[EventInfo] = None
    location: Optional[LocationInfo] = None
    categories: List[str] = Field(default_factory=list)  # For matching with user hobbies
    tags: List[str] = Field(default_factory=list)  # Additional searchable keywords
    
    # Visibility
    is_visible: bool = True  # False = hidden from public, only owner/admin can see
    
    # Timestamps
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    updated_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "event_id": 101,
                "name": "Lễ hội Chùa Hương",
                "time": {
                    "lunar": "Mùng 6 tháng Giêng đến hết tháng 3 Âm lịch",
                    "next_occurrence": "2025-02-03"
                },
                "content": {
                    "intro": "Lễ hội kéo dài nhất Việt Nam...",
                    "history": "Chùa Hương được xây dựng từ thế kỷ 17...",
                    "activities": ["Lễ khai sơn", "Đi thuyền trên suối Yến"]
                }
            }
        }
    }
