from typing import Tuple, Any

from fastapi import Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
import bcrypt

from backend.core.config import settings
from backend.utils.exception_handler import CustomException, ExceptionType
from backend.utils import time_utils
from backend.schemas.sche_auth import TokenRequest
from backend.utils.enums import UserRole

ALGORITHM = "HS256"


def create_access_token(
    payload: TokenRequest, expires_seconds: int = None
) -> Tuple[str, float]:
    if expires_seconds:
        expire = time_utils.timestamp_after_now(seconds=expires_seconds)
    else:
        expire = time_utils.timestamp_after_now(
            seconds=settings.ACCESS_TOKEN_EXPIRE_SECONDS
        )
    encoded_jwt = jwt.encode(
        payload.model_dump(), settings.SECRET_KEY, algorithm=ALGORITHM
    )
    return encoded_jwt, expire


def create_refresh_token(user_id: str, expires_seconds: int = 3600) -> Tuple[str, float]:
    """
    Create a refresh token with longer expiry (default 7 days).
    Uses a different secret to prevent access/refresh token confusion.
    """
    expire = time_utils.timestamp_after_now(seconds=expires_seconds)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh"
    }
    # Use a different secret for refresh tokens
    refresh_secret = settings.SECRET_KEY + "_refresh"
    encoded_jwt = jwt.encode(payload, refresh_secret, algorithm=ALGORITHM)
    return encoded_jwt, expire


def decode_refresh_token(token: str) -> dict[str, Any]:
    """Decode and validate a refresh token"""
    try:
        refresh_secret = settings.SECRET_KEY + "_refresh"
        decoded_token = jwt.decode(token, refresh_secret, algorithms=ALGORITHM)
        
        # Verify it's a refresh token
        if decoded_token.get("type") != "refresh":
            return None
        
        # Check expiration
        if decoded_token["exp"] >= time_utils.timestamp_now():
            return decoded_token
        return None
    except Exception:
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hashed password using bcrypt"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def decode_jwt(token: str) -> dict[str, Any]:
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=ALGORITHM)
        if decoded_token["exp"] >= time_utils.timestamp_now():
            return decoded_token
        return None
    except Exception as e:
        return None


class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super(
            JWTBearer, self
        ).__call__(request)
        if credentials is None:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        if not credentials.credentials:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        if not credentials.scheme == "Bearer":
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        if not self.verify_jwt(credentials.credentials):
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        return credentials.credentials

    def verify_jwt(self, jwt_token: str) -> bool:
        is_token_valid: bool = False
        try:
            payload = decode_jwt(jwt_token)
        except Exception as e:
            payload = None
        if payload:
            is_token_valid = True
        return is_token_valid


class AdminRequired(JWTBearer):
    """Require admin role for access"""
    
    async def __call__(self, request: Request):
        # First verify JWT token
        token = await super().__call__(request)
        
        # Decode token and get user ID
        payload = decode_jwt(token)
        if not payload:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        user_id = payload.get("sub")
        
        # Get user from database
        from backend.services.srv_user_mongo import UserMongoService
        user_service = UserMongoService()
        
        try:
            user = await user_service.get_by_id(user_id)
        except:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        # Check if user has admin role
        if UserRole.ADMIN.value not in user.roles:
            raise CustomException(exception=ExceptionType.FORBIDDEN)
        
        return token


class EventProviderOrAdmin(JWTBearer):
    """Require Event Provider or Admin role for event creation"""
    
    async def __call__(self, request: Request):
        token = await super().__call__(request)
        
        payload = decode_jwt(token)
        if not payload:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        user_id = payload.get("sub")
        
        from backend.services.srv_user_mongo import UserMongoService
        user_service = UserMongoService()
        
        try:
            user = await user_service.get_by_id(user_id)
        except:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        # Allow Administrator or Event Provider
        allowed_roles = [UserRole.ADMIN.value, UserRole.EVENT_PROVIDER.value]
        if not any(role in user.roles for role in allowed_roles):
            raise CustomException(exception=ExceptionType.FORBIDDEN)
        
        return token


class EventOwnerOrAdmin(JWTBearer):
    """Require event owner or admin for event modification"""
    
    async def __call__(self, request: Request):
        token = await super().__call__(request)
        
        payload = decode_jwt(token)
        if not payload:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        user_id = payload.get("sub")
        event_id = request.path_params.get("event_id")
        
        from backend.services.srv_user_mongo import UserMongoService
        from backend.services.srv_event_mongo import EventMongoService
        
        user_service = UserMongoService()
        event_service = EventMongoService()
        
        try:
            user = await user_service.get_by_id(user_id)
        except:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        # Admin can modify any event
        if UserRole.ADMIN.value in user.roles:
            return token
        
        # Event Provider must own the event
        if UserRole.EVENT_PROVIDER.value in user.roles:
            try:
                event = await event_service.get_by_id(event_id)
                # Check ownership
                if event.creator_id and str(event.creator_id) == user_id:
                    return token
            except:
                raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        raise CustomException(exception=ExceptionType.FORBIDDEN)


class TourProviderOrAdmin(JWTBearer):
    """Require Tour Provider or Admin role for tour provider operations"""
    
    async def __call__(self, request: Request):
        token = await super().__call__(request)
        
        payload = decode_jwt(token)
        if not payload:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        user_id = payload.get("sub")
        
        from backend.services.srv_user_mongo import UserMongoService
        user_service = UserMongoService()
        
        try:
            user = await user_service.get_by_id(user_id)
        except:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        # Allow Administrator or Tour Provider
        allowed_roles = [UserRole.ADMIN.value, UserRole.TOUR_PROVIDER.value]
        if not any(role in user.roles for role in allowed_roles):
            raise CustomException(exception=ExceptionType.FORBIDDEN)
        
        return token
