from typing import Optional, List
from pydantic import BaseModel, EmailStr
from backend.utils.enums import UserRole
from backend.schemas.sche_base import BaseModelResponse


class UserBaseRequest(BaseModel):
    password: Optional[str] = None
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
    hobbies: Optional[List[str]] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    participated_events: Optional[List[str]] = None


class UserCreateRequest(UserBaseRequest):
    username: Optional[str]
    email: EmailStr
    password: Optional[str] = None
    is_active: Optional[bool] = True
    roles: List[str] = [
        UserRole.USER.value,
    ]
    sso_sub: Optional[str] = None
    auth_provider: Optional[str] = "email"


class UserUpdateRequest(UserBaseRequest):
    is_active: Optional[bool] = True
    roles: Optional[List[str]] = None
    # Role upgrade fields
    pending_role_upgrade: Optional[str] = None
    upgrade_request_reason: Optional[str] = None
    upgrade_request_date: Optional[float] = None
    upgrade_rejection_reason: Optional[str] = None


class UserUpdateMeRequest(UserBaseRequest):
    pass


class UserBaseResponse(BaseModelResponse):
    sso_key: Optional[str] = None
    username: Optional[str] = None
    email: EmailStr
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
    hobbies: Optional[List[str]] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    participated_events: Optional[List[str]] = None
    is_active: Optional[bool] = None
    last_login: Optional[float] = None
    roles: List[str]
    # Role upgrade fields
    pending_role_upgrade: Optional[str] = None
    upgrade_request_reason: Optional[str] = None
    upgrade_request_date: Optional[float] = None
    upgrade_rejection_reason: Optional[str] = None
    
    # Social - READ ONLY (computed)
    followers_count: Optional[int] = 0
    following_count: Optional[int] = 0
    is_following: Optional[bool] = None  # To check if current user is following this user
