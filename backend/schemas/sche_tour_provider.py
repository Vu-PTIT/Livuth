"""
Tour Provider Listing Schemas for Request/Response
"""
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr
from backend.schemas.sche_base import BaseModelResponse


class TourProviderListingCreateRequest(BaseModel):
    """Tour Provider Listing creation request"""
    event_id: str
    company_name: str = Field(..., min_length=2, max_length=200)
    business_license: Optional[str] = None
    
    service_name: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    highlights: List[str] = Field(default_factory=list)
    
    price_range: str
    price_note: Optional[str] = None
    
    contact_name: str
    contact_phone: str
    contact_email: EmailStr
    contact_website: Optional[str] = None
    contact_facebook: Optional[str] = None
    contact_zalo: Optional[str] = None
    contact_address: Optional[str] = None
    
    logo_url: Optional[str] = None
    photos: List[str] = Field(default_factory=list)


class TourProviderListingUpdateRequest(BaseModel):
    """Tour Provider Listing update request"""
    company_name: Optional[str] = Field(None, min_length=2, max_length=200)
    business_license: Optional[str] = None
    
    service_name: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10)
    highlights: Optional[List[str]] = None
    
    price_range: Optional[str] = None
    price_note: Optional[str] = None
    
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_website: Optional[str] = None
    contact_facebook: Optional[str] = None
    contact_zalo: Optional[str] = None
    contact_address: Optional[str] = None
    
    logo_url: Optional[str] = None
    photos: Optional[List[str]] = None
    is_visible: Optional[bool] = None


class TourProviderListingResponse(BaseModelResponse):
    """Tour Provider Listing response"""
    event_id: str
    event_name: Optional[str] = None  # Populated from event
    provider_id: str
    provider_username: Optional[str] = None  # Populated from user
    
    company_name: str
    business_license: Optional[str] = None
    
    service_name: str
    description: str
    highlights: List[str]
    
    price_range: str
    price_note: Optional[str] = None
    
    # Contact info (always shown for approved listings)
    contact_name: str
    contact_phone: str
    contact_email: str
    contact_website: Optional[str] = None
    contact_facebook: Optional[str] = None
    contact_zalo: Optional[str] = None
    contact_address: Optional[str] = None
    
    # Status
    status: str
    verification_status: str
    rejection_reason: Optional[str] = None
    
    # Media
    logo_url: Optional[str] = None
    photos: List[str]
    
    # Analytics
    view_count: int
    
    # Visibility
    is_visible: bool = True
