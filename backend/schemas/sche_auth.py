from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Any
from backend.core.config import settings
import re


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    dob: Optional[float] = None
    gender: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    identity_card: Optional[str] = None
    identity_card_date: Optional[float] = None
    identity_card_place: Optional[str] = None
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        """
        Username must:
        - Be 3-30 characters long
        - Contain only letters, numbers, and underscores
        - Start with a letter
        """
        if not v:
            raise ValueError('Username is required')
        
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        
        if len(v) > 30:
            raise ValueError('Username must not exceed 30 characters')
        
        if not re.match(r'^[a-zA-Z][a-zA-Z0-9_]*$', v):
            raise ValueError('Username must start with a letter and contain only letters, numbers, and underscores')
        
        return v.lower()  # Normalize to lowercase
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """
        Password must:
        - Be at least 8 characters long
        - Contain at least one uppercase letter
        - Contain at least one lowercase letter
        - Contain at least one number
        """
        if not v:
            raise ValueError('Password is required')
        
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenRequest(BaseModel):
    exp: float
    auth_time: float
    sub: str
    typ: Optional[str] = "Bearer"
    email: Optional[EmailStr] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None  # Refresh token for obtaining new access tokens
    expires_in: Optional[float] = 900  # 15 minutes for access token
    refresh_expires_in: Optional[float] = 604800  # 7 days for refresh token
    token_type: Optional[str] = "Bearer"
    user: Optional[Any] = None  # User info returned on login


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class GoogleLoginRequest(BaseModel):
    id_token: str


class FacebookLoginRequest(BaseModel):
    access_token: str

