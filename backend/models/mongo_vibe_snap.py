from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from bson import ObjectId
from backend.models.mongo_user import PyObjectId
from backend.models.mongo_event import LocationInfo

class VibeSnapMongo(BaseModel):
    """Vibe Snap MongoDB Document Model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    
    # Author info
    user_id: PyObjectId
    
    # Content
    media_url: str = Field(..., max_length=1000)
    type: str = Field(..., pattern="^(image|video)$") # either 'image' or 'video'
    
    # Context
    location: LocationInfo # Geospatial point required
    event_id: Optional[PyObjectId] = None # Tied to an event if uploaded nearby
    
    # Timestamps & Expiration
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    # Expiration is strictly 24 hours. The database will use this TTL index to clean up.
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=24))
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "media_url": "https://example.com/vibe.mp4",
                "type": "video",
                "location": {
                    "type": "Point",
                    "coordinates": [105.8, 21.03]
                },
                "event_id": "507f1f77bcf86cd799439012"
            }
        }
    }
