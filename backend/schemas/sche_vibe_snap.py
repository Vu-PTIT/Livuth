from typing import Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime

class LocationInput(BaseModel):
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")

class VibeSnapCreateRequest(BaseModel):
    """Schema for creating a new Vibe Snap"""
    type: str = Field(..., pattern="^(image|video)$")
    lat: float
    lng: float
    event_id: Optional[str] = None

class UserInfoResponse(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    
    model_config = {
        "from_attributes": True
    }

class LocationResponse(BaseModel):
    lat: float
    lng: float

class VibeSnapResponse(BaseModel):
    """Schema for returning Vibe Snap details"""
    id: str
    user: UserInfoResponse
    media_url: str
    type: str
    location: LocationResponse
    event_id: Optional[str] = None
    created_at: float
    expires_at: float
    
    model_config = {
        "from_attributes": True
    }
