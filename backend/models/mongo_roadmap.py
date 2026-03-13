"""
MongoDB Roadmap Model - Pydantic schemas for event roadmaps
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from backend.models.mongo_user import PyObjectId

class Location(BaseModel):
    name: str = Field(..., description="Name of the location")
    address: Optional[str] = Field(None, description="Physical address")
    lat: Optional[float] = Field(None, description="Latitude")
    lng: Optional[float] = Field(None, description="Longitude")

class Waypoint(BaseModel):
    id: str = Field(..., description="Unique ID for the waypoint (usually generated on frontend)")
    location: Location
    time: Optional[str] = Field(None, description="Time of the visit (e.g., '08:00', 'Sáng')")
    description: Optional[str] = Field(None, description="Details or notes about this stop")
    activity_type: Optional[str] = Field(None, description="Type of activity (e.g., 'Food', 'Sightseeing')")

class RoadmapDay(BaseModel):
    day: int = Field(..., description="Day number (1, 2, 3...)")
    title: Optional[str] = Field(None, description="Title for the day (e.g., 'Khám phá thành phố')")
    waypoints: List[Waypoint] = Field(default_factory=list, description="Stops for this day")



class RoadmapMongo(BaseModel):
    """Roadmap MongoDB Document Model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    event_id: PyObjectId  # Reference to event
    user_id: PyObjectId   # Reference to user who wrote the roadmap
    
    title: str = Field(..., min_length=1, max_length=200)
    duration: str = Field(..., description="e.g., '2 Ngày 1 Đêm', '1 Ngày'")
    tags: List[str] = Field(default_factory=list)
    content: Optional[str] = Field(None, description="Markdown or rich text content (legacy or generated)")
    days: List[RoadmapDay] = Field(default_factory=list, description="Structured itinerary by days")
    
    # User info (denormalized for display)
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    
    # Social Stats
    likes: List[PyObjectId] = Field(default_factory=list)  # List of user IDs who liked
    like_count: int = 0
    
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
                "title": "Khám phá trọn vẹn 2 ngày 1 đêm",
                "duration": "2 Ngày",
                "tags": ["Gia đình", "Nhẹ nhàng"],
                "content": "Ngày 1: Tham quan... \nNgày 2: Trải nghiệm...",
                "days": [
                    {
                        "day": 1,
                        "title": "Khám phá thành phố",
                        "waypoints": [
                            {
                                "id": "wp1",
                                "location": {"name": "Chợ Bến Thành", "lat": 10.7725, "lng": 106.6981},
                                "time": "08:00",
                                "description": "Ăn sáng và mua sắm"
                            }
                        ]
                    }
                ],
                "user_name": "Nguyễn Văn A"
            }
        }
    }
