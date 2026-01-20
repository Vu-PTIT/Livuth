"""
Comment Schemas - Request/Response schemas for comments API
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    """Schema for creating a comment"""
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[str] = None  # For replies


class CommentUpdate(BaseModel):
    """Schema for updating a comment"""
    content: str = Field(..., min_length=1, max_length=2000)


class CommentAuthor(BaseModel):
    """Author info for comment"""
    id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class CommentResponse(BaseModel):
    """Comment response schema"""
    id: str
    post_id: str
    author: CommentAuthor
    content: str
    like_count: int = 0
    is_liked: bool = False
    parent_id: Optional[str] = None
    reply_count: int = 0
    replies: List["CommentResponse"] = []  # Nested replies
    created_at: float
    updated_at: float


class CommentListResponse(BaseModel):
    """Response for list of comments"""
    comments: List[CommentResponse]
    total: int
    has_more: bool
