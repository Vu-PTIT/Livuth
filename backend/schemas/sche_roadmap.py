"""
Roadmap Schemas for Request/Response
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from backend.schemas.sche_base import BaseModelResponse


class RoadmapCreateRequest(BaseModel):
    """Roadmap creation request"""
    title: str = Field(..., min_length=1, max_length=200, description="Title of the roadmap")
    duration: str = Field(..., description="Duration string e.g., '2 Ngày 1 Đêm'")
    tags: List[str] = Field(default_factory=list, description="List of category tags")
    content: str = Field(..., description="Markdown or rich text content of the roadmap")


class RoadmapUpdateRequest(BaseModel):
    """Roadmap update request"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    duration: Optional[str] = Field(None)
    tags: Optional[List[str]] = Field(None)
    content: Optional[str] = Field(None)


class RoadmapResponse(BaseModelResponse):
    """Roadmap response"""
    event_id: str
    user_id: str
    title: str
    duration: str
    tags: List[str]
    content: str
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    like_count: int = 0
    likes: List[str] = Field(default_factory=list)


class EventRoadmapsResponse(BaseModel):
    """Response containing multiple roadmaps for an event"""
    roadmaps: List[RoadmapResponse]
