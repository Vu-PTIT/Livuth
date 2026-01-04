"""
Chat Schemas for Request/Response
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from backend.schemas.sche_base import BaseModelResponse


class ChatMessageRequest(BaseModel):
    """Send message request"""
    content: str = Field(..., min_length=1, max_length=2000)


class ChatConversationCreateRequest(BaseModel):
    """Create conversation request"""
    title: Optional[str] = Field(default="New Conversation", max_length=200)


class ChatMessageResponse(BaseModelResponse):
    """Chat message response"""
    conversation_id: str
    role: str  # "user" | "assistant" | "system"
    content: str
    

class ChatConversationResponse(BaseModelResponse):
    """Chat conversation response"""
    user_id: str
    title: str


class ChatHistoryResponse(BaseModelResponse):
    """Full conversation with messages"""
    user_id: str
    title: str
    messages: List[ChatMessageResponse] = Field(default_factory=list)
