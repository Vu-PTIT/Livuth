"""
Event Schemas for Request/Response
"""
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from backend.schemas.sche_base import BaseModelResponse


class TimeInfoSchema(BaseModel):
    """Time information schema"""
    lunar: Optional[str] = None
    next_occurrence: Optional[str] = None


class ContentInfoSchema(BaseModel):
    """Content information schema"""
    intro: Optional[str] = None
    history: Optional[str] = None
    activities: List[str] = Field(default_factory=list)


class MediaItemSchema(BaseModel):
    """Media item schema"""
    url: str
    caption: Optional[str] = None
    type: Optional[str] = None


class LocationInfoSchema(BaseModel):
    """Location information schema"""
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    coordinates: Optional[dict] = None  # GeoJSON Point: {type: "Point", coordinates: [lng, lat]}


class EventInfoSchema(BaseModel):
    """Event info schema"""
    is_free: bool = True
    ticket_price: Optional[float] = None
    note: Optional[str] = None


class EventCreateRequest(BaseModel):
    """Event creation request"""
    event_id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=200)
    time: Optional[TimeInfoSchema] = None
    content: Optional[ContentInfoSchema] = None
    media: List[MediaItemSchema] = Field(default_factory=list)
    info: Optional[EventInfoSchema] = None
    location: Optional[LocationInfoSchema] = None
    categories: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)


class EventUpdateRequest(BaseModel):
    """Event update request"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    time: Optional[TimeInfoSchema] = None
    content: Optional[ContentInfoSchema] = None
    media: Optional[List[MediaItemSchema]] = None
    info: Optional[EventInfoSchema] = None
    location: Optional[LocationInfoSchema] = None
    categories: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    is_visible: Optional[bool] = None


class EventBaseResponse(BaseModelResponse):
    """Event response"""
    event_id: Optional[int] = None
    name: str
    creator_id: Optional[str] = None
    time: Optional[TimeInfoSchema] = None
    content: Optional[ContentInfoSchema] = None
    media: List[MediaItemSchema] = Field(default_factory=list)
    info: Optional[EventInfoSchema] = None
    location: Optional[LocationInfoSchema] = None
    categories: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    is_visible: bool = True
    average_rating: float = 0.0
    review_count: int = 0
    participant_count: int = 0  # Number of users who participated
    interested_count: int = 0   # FOMO: Number of users interested/checking in
    like_count: int = 0
    is_liked: bool = False
    
    # Tour providers (populated when include_tours=True)
    tour_providers: Optional[List[Any]] = None

