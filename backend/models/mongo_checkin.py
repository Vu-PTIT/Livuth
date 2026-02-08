"""
MongoDB CheckIn Model - Pydantic schemas for check-in NFT records
"""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from backend.models.mongo_user import PyObjectId


class CheckInMongo(BaseModel):
    """CheckIn MongoDB Document Model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    
    # References
    user_id: PyObjectId  # User who checked in
    event_id: PyObjectId  # Event that was checked into
    
    # Sui blockchain data
    wallet_address: str  # Sui wallet address
    nft_object_id: str  # Object ID of the minted NFT on Sui
    tx_digest: str  # Transaction digest/hash
    
    # Timestamps
    checked_in_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "user_id": "60a7b2c3d4e5f6789012345a",
                "event_id": "60a7b2c3d4e5f6789012345b",
                "wallet_address": "0x1234567890abcdef...",
                "nft_object_id": "0xabcdef1234567890...",
                "tx_digest": "ABC123XYZ...",
            }
        }
    }
