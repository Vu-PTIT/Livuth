from typing import Any
from fastapi import APIRouter, Depends, status
from backend.schemas.sche_auth import LoginRequest, RegisterRequest, TokenResponse, RefreshTokenRequest
from backend.schemas.sche_user import UserCreateRequest, UserBaseResponse
from backend.schemas.sche_response import DataResponse
from backend.services.srv_user_mongo import UserMongoService
from backend.services.srv_chat_mongo import ChatService
from backend.core.security import verify_password, create_access_token, create_refresh_token, decode_refresh_token, JWTBearer
from backend.schemas.sche_auth import TokenRequest
from backend.utils.exception_handler import CustomException, ExceptionType
from backend.utils import time_utils

router = APIRouter(prefix="/auth")

user_service = UserMongoService()
chat_service = ChatService()


@router.post(
    "/register",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_201_CREATED,
)
async def register(register_data: RegisterRequest) -> Any:
    """Register a new user"""
    try:
        # Convert RegisterRequest to UserCreateRequest
        user_data = UserCreateRequest(
            username=register_data.username,
            email=register_data.email,
            password=register_data.password,
            dob=register_data.dob,
            gender=register_data.gender,
            first_name=register_data.first_name,
            last_name=register_data.last_name,
            full_name=register_data.full_name,
            phone=register_data.phone,
            address=register_data.address,
            identity_card=register_data.identity_card,
            identity_card_date=register_data.identity_card_date,
            identity_card_place=register_data.identity_card_place,
        )
        
        new_user = await user_service.create(data=user_data)
        return DataResponse(http_code=status.HTTP_201_CREATED, data=new_user)
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=ExceptionType.INTERNAL_SERVER_ERROR)


@router.post(
    "/login",
    response_model=DataResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
)
async def login(login_data: LoginRequest) -> Any:
    """Login with username and password"""
    try:
        # Find user by username
        user = await user_service.get_by_username(login_data.username)
        
        if not user:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        # Verify password
        if not verify_password(login_data.password, user["hashed_password"]):
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        # Check if user is active
        if not user.get("is_active", True):
            raise CustomException(exception=ExceptionType.FORBIDDEN)
        
        # Update last login
        await user_service.update_last_login(str(user["_id"]))
        
        # Create a new conversation if user has no active conversations
        # (keeps old chat history, just doesn't auto-load them)
        await chat_service.ensure_active_conversation(str(user["_id"]))
        
        # Create access token
        token_payload = TokenRequest(
            exp=time_utils.timestamp_after_now(seconds=900),  # 15 minutes
            auth_time=time_utils.timestamp_now(),
            sub=str(user["_id"]),
            email=user.get("email", ""),
        )
        
        access_token, expires_in = create_access_token(payload=token_payload)
        
        # Create refresh token
        refresh_token, refresh_expires = create_refresh_token(user_id=str(user["_id"]))
        
        # Prepare user data for response
        user["id"] = str(user["_id"])
        user_response = UserBaseResponse(**user)
        
        token_response = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
            refresh_expires_in=refresh_expires,
            token_type="Bearer",
            user=user_response.model_dump(),
        )
        
        return DataResponse(http_code=status.HTTP_200_OK, data=token_response)
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=ExceptionType.INTERNAL_SERVER_ERROR)


@router.post(
    "/refresh",
    response_model=DataResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
)
async def refresh_token(refresh_data: RefreshTokenRequest) -> Any:
    """Get new access token using refresh token"""
    try:
        # Decode and validate refresh token
        payload = decode_refresh_token(refresh_data.refresh_token)
        
        if not payload:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        user_id = payload.get("sub")
        
        # Verify user still exists and is active
        user = await user_service.get_by_id(user_id=user_id)
        if not user:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        # Create new access token
        token_payload = TokenRequest(
            exp=time_utils.timestamp_after_now(seconds=900),  # 15 minutes
            auth_time=time_utils.timestamp_now(),
            sub=user_id,
            email=user.email or "",
        )
        
        access_token, expires_in = create_access_token(payload=token_payload)
        
        # Return new access token (keep same refresh token)
        token_response = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_data.refresh_token,  # Return same refresh token
            expires_in=expires_in,
            token_type="Bearer",
        )
        
        return DataResponse(http_code=status.HTTP_200_OK, data=token_response)
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=ExceptionType.UNAUTHORIZED)


@router.get(
    "/me",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def get_current_user(token: str = Depends(JWTBearer())) -> Any:
    """Get current authenticated user"""
    try:
        user = await user_service.get_me(access_token=token)
        return DataResponse(http_code=status.HTTP_200_OK, data=user)
    except Exception as e:
        raise CustomException(exception=ExceptionType.UNAUTHORIZED)
