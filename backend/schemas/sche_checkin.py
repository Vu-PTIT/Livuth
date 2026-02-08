"""
CheckIn Schemas - Request/Response schemas for check-in API
"""
from typing import Optional, List
from pydantic import BaseModel


class CheckInCreateRequest(BaseModel):
    """Request to record a check-in after NFT minting"""
    wallet_address: str
    nft_object_id: str
    tx_digest: str


class CheckInResponse(BaseModel):
    """Check-in record response"""
    id: str
    user_id: str
    event_id: str
    wallet_address: str
    nft_object_id: str
    tx_digest: str
    checked_in_at: float
    created_at: float
    
    # Populated fields
    event_name: Optional[str] = None
    event_image: Optional[str] = None
    user_name: Optional[str] = None


class CheckInVerifyResponse(BaseModel):
    """Response for verify check-in endpoint"""
    has_checked_in: bool
    checkin: Optional[CheckInResponse] = None


class CheckInListResponse(BaseModel):
    """List of check-ins with pagination"""
    checkins: List[CheckInResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
