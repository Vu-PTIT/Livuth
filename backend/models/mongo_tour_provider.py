"""
MongoDB Tour Provider Listing Model
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from backend.models.mongo_user import PyObjectId


class TourProviderListing(BaseModel):
    """Tour Provider Listing MongoDB Document Model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    event_id: PyObjectId  # Link to event
    provider_id: PyObjectId  # Link to user (tour provider)
    
    # Business Information
    company_name: str = Field(..., min_length=2, max_length=200)
    business_license: Optional[str] = None
    
    # Service Description  
    service_name: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    highlights: List[str] = Field(default_factory=list)
    
    # Pricing Info (indicative only, no booking)
    price_range: str  # "500,000 - 1,000,000 VND"
    price_note: Optional[str] = None
    
    # Contact Information (PRIMARY PURPOSE)
    contact_name: str
    contact_phone: str
    contact_email: str
    contact_website: Optional[str] = None
    contact_facebook: Optional[str] = None
    contact_zalo: Optional[str] = None
    contact_address: Optional[str] = None
    
    # Listing Status
    status: str = "pending"  # "pending", "approved", "rejected"
    verification_status: str = "unverified"  # "unverified", "verified"
    rejection_reason: Optional[str] = None
    
    # Media
    logo_url: Optional[str] = None
    photos: List[str] = Field(default_factory=list)
    
    # Analytics
    view_count: int = 0
    
    # Timestamps
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    updated_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "company_name": "Du Lịch Việt Express",
                "service_name": "Tour Chùa Hương VIP",
                "description": "Chuyên cung cấp tour Chùa Hương với dịch vụ chuyên nghiệp",
                "highlights": ["Xe riêng", "HDV chuyên nghiệp", "Bữa ăn buffet"],
                "price_range": "700,000 - 1,500,000 VND",
                "contact_name": "Nguyễn Văn An",
                "contact_phone": "0901234567",
                "contact_email": "info@viettravel.vn",
                "status": "pending",
                "verification_status": "unverified"
            }
        }
    }
