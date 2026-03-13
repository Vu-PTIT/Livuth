"""
Roadmap Schemas for Request/Response
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from backend.schemas.sche_base import BaseModelResponse
from backend.models.mongo_roadmap import RoadmapDay


class RoadmapCreateRequest(BaseModel):
    """Roadmap creation request"""
    title: str = Field(..., min_length=1, max_length=200, description="Title of the roadmap")
    duration: str = Field(..., description="Duration string e.g., '2 Ngày 1 Đêm'")
    tags: List[str] = Field(default_factory=list, description="List of category tags")
    content: Optional[str] = Field(None, description="Markdown or rich text content (legacy or generated)")
    days: List[RoadmapDay] = Field(default_factory=list, description="Structured roadmap days")


class RoadmapGenerateRequest(BaseModel):
    """Request schema for AI roadmap generation"""
    location: str = Field(..., min_length=1, description="Địa điểm hoặc tên sự kiện")
    duration_days: int = Field(..., ge=1, le=10, description="Thời lượng chuyến đi theo ngày")
    interests: str = Field(..., description="Sở thích hoặc phong cách du lịch")
    event_id: Optional[str] = Field(None, description="Event ID if related to an event")


class RoadmapUpdateRequest(BaseModel):
    """Roadmap update request"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    duration: Optional[str] = Field(None)
    tags: Optional[List[str]] = Field(None)
    content: Optional[str] = Field(None)
    days: Optional[List[RoadmapDay]] = Field(None)


class RoadmapResponse(BaseModelResponse):
    """Roadmap response"""
    event_id: str
    user_id: str
    title: str
    duration: str
    tags: List[str]
    content: Optional[str] = None
    days: List[RoadmapDay] = Field(default_factory=list)
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    like_count: int = 0
    likes: List[str] = Field(default_factory=list)


class EventRoadmapsResponse(BaseModel):
    """Response containing multiple roadmaps for an event"""
    roadmaps: List[RoadmapResponse]
