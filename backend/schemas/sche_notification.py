"""
Notification Schemas - Pydantic request/response schemas for notification API
"""
from typing import Optional, List
from pydantic import BaseModel


class NotificationActor(BaseModel):
    """Actor info embedded in notification response"""
    id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class NotificationResponse(BaseModel):
    """Single notification response"""
    id: str
    user_id: str
    actor: NotificationActor
    type: str  # "like" | "comment"
    message: str
    post_id: Optional[str] = None
    comment_id: Optional[str] = None
    read: bool = False
    created_at: float


class NotificationListResponse(BaseModel):
    """Paginated notification list response"""
    notifications: List[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int
    has_more: bool
