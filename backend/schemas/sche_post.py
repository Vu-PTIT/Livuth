"""
Post Schemas - Request/Response schemas for posts API
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class MediaItemSchema(BaseModel):
    """Media item schema"""
    url: str
    caption: Optional[str] = None
    type: Optional[str] = None  # image, video


class LocationSchema(BaseModel):
    """Location schema"""
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    coordinates: Optional[dict] = None


class PostCreate(BaseModel):
    """Schema for creating a new post"""
    content: str = Field(..., min_length=1, max_length=5000)
    media: List[MediaItemSchema] = Field(default_factory=list)
    location: Optional[LocationSchema] = None
    tags: List[str] = Field(default_factory=list, max_length=10)
    visibility: str = Field(default="public", pattern="^(public|friends|private)$")


class PostUpdate(BaseModel):
    """Schema for updating a post"""
    content: Optional[str] = Field(None, min_length=1, max_length=5000)
    media: Optional[List[MediaItemSchema]] = None
    location: Optional[LocationSchema] = None
    tags: Optional[List[str]] = None
    visibility: Optional[str] = Field(None, pattern="^(public|friends|private)$")


class AuthorInfo(BaseModel):
    """Author information embedded in post response"""
    id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class PostResponse(BaseModel):
    """Post response schema"""
    id: str
    author: AuthorInfo
    content: str
    media: List[MediaItemSchema] = []
    location: Optional[LocationSchema] = None
    tags: List[str] = []
    like_count: int = 0
    comment_count: int = 0
    share_count: int = 0
    is_liked: bool = False  # Whether current user has liked
    visibility: str = "public"
    created_at: float
    updated_at: float


class PostListResponse(BaseModel):
    """Response for list of posts with pagination"""
    posts: List[PostResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
