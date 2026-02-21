"""
MongoDB User Model - Pydantic schemas for MongoDB documents
"""
from typing import Optional, List, Any
from pydantic import BaseModel, Field, EmailStr, GetCoreSchemaHandler
from pydantic_core import core_schema
from datetime import datetime
from bson import ObjectId
from backend.utils.enums import UserRole


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic v2"""
    
    @classmethod
    def __get_pydantic_core_schema__(
        cls, 
        source_type: Any, 
        handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.union_schema([
            core_schema.is_instance_schema(ObjectId),
            core_schema.chain_schema([
                core_schema.str_schema(),
                core_schema.no_info_plain_validator_function(cls.validate),
            ])
        ],
        serialization=core_schema.plain_serializer_function_ser_schema(
            lambda x: str(x)
        ))
    
    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)


class UserMongo(BaseModel):
    """User MongoDB Document Model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    hashed_password: str
    
    # Personal Information
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    nickname: Optional[str] = None
    dob: Optional[float] = None  # timestamp
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    
    # Identity Card Info
    identity_card: Optional[str] = None
    identity_card_date: Optional[float] = None
    identity_card_place: Optional[str] = None
    
    # Profile Information
    hobbies: List[str] = Field(default_factory=list)
    bio: Optional[str] = None
    avatar_url: Optional[str] = None  # Profile picture URL
    cover_url: Optional[str] = None  # Profile cover photo URL
    participated_events: List[PyObjectId] = Field(default_factory=list)
    
    # Social
    following: List[PyObjectId] = Field(default_factory=list)
    followers: List[PyObjectId] = Field(default_factory=list)
    following_count: int = 0
    followers_count: int = 0
    
    # Account Status
    is_active: bool = True
    roles: List[str] = Field(default_factory=lambda: [UserRole.USER.value])
    
    # Role Upgrade Request
    pending_role_upgrade: Optional[str] = None  # The role being requested (e.g., "Tour Provider", "Event Provider")
    upgrade_request_reason: Optional[str] = None  # Reason for the upgrade request
    upgrade_request_date: Optional[float] = None  # Timestamp when request was made
    upgrade_rejection_reason: Optional[str] = None  # Reason if request was rejected
    
    # SSO
    sso_sub: Optional[str] = None
    auth_provider: str = Field(default="email") # email, google, facebook
    
    # Timestamps
    last_login: Optional[float] = None
    created_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    updated_at: float = Field(default_factory=lambda: datetime.now().timestamp())
    
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "username": "john_doe",
                "email": "john@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "full_name": "John Doe",
                "is_active": True,
                "roles": [UserRole.USER.value]
            }
        }
    }
