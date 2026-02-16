from typing import Any, List
from fastapi import APIRouter, status, Depends
from backend.utils.exception_handler import CustomException, ExceptionType
from backend.schemas.sche_response import DataResponse
from backend.schemas.sche_user import (
    UserCreateRequest,
    UserUpdateRequest,
    UserUpdateMeRequest,
    UserBaseResponse,
)
from backend.services.srv_user_mongo import UserMongoService
from backend.core.security import JWTBearer, AdminRequired, decode_jwt
from backend.utils.enums import UserRole
from datetime import datetime
from pydantic import BaseModel, Field

router = APIRouter(prefix="/users")

user_service = UserMongoService()


# Schema for role upgrade request
class RoleUpgradeRequest(BaseModel):
    requested_role: str = Field(..., description="The role to upgrade to (e.g., 'Tour Provider', 'Event Provider')")
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for the upgrade request")


@router.get(
    "/all",
    response_model=DataResponse[List[UserBaseResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_all(token: str = Depends(AdminRequired())) -> Any:
    """Get all users (Admin only)"""
    try:
        data, metadata = await user_service.get_all()
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/{user_id}",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def get_by_id(user_id: str, token: str = Depends(JWTBearer())) -> Any:
    """Get user by ID (Admin only)"""
    try:
        user = await user_service.get_by_id(user_id=user_id)
        return DataResponse(http_code=status.HTTP_200_OK, data=user)
    except Exception as e:
        raise CustomException(exception=e)


@router.post(
    "",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create(user_data: UserCreateRequest, token: str = Depends(AdminRequired())) -> Any:
    """Create new user (Admin only - use /auth/register for self-registration)"""
    try:
        new_user = await user_service.create(data=user_data)
        return DataResponse(http_code=status.HTTP_201_CREATED, data=new_user)
    except Exception as e:
        raise CustomException(exception=e)


@router.put(
    "/{user_id}",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def update_by_id(user_id: str, user_data: UserUpdateRequest, token: str = Depends(AdminRequired())) -> Any:
    """Update user by ID (Admin only)"""
    try:
        updated_user = await user_service.update_by_id(user_id=user_id, data=user_data)
        return DataResponse(http_code=status.HTTP_200_OK, data=updated_user)
    except Exception as e:
        raise CustomException(exception=e)


@router.patch(
    "/{user_id}",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def partial_update_by_id(user_id: str, user_data: UserUpdateRequest, token: str = Depends(AdminRequired())) -> Any:
    """Partially update user by ID (Admin only)"""
    try:
        updated_user = await user_service.update_by_id(user_id=user_id, data=user_data)
        return DataResponse(http_code=status.HTTP_200_OK, data=updated_user)
    except Exception as e:
        raise CustomException(exception=e)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_by_id(user_id: str, token: str = Depends(AdminRequired())) -> None:
    """Delete user by ID (Admin only)"""
    try:
        await user_service.delete_by_id(user_id=user_id)
    except Exception as e:
        raise CustomException(exception=e)


# Self Profile Update Endpoint

@router.put(
    "/me/profile",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def update_my_profile(user_data: UserUpdateMeRequest, token: str = Depends(JWTBearer())) -> Any:
    """Update current user's own profile (authenticated users only)"""
    try:
        # Get user from token
        payload = decode_jwt(token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise CustomException(exception=ExceptionType.FORBIDDEN)
        
        # Convert to UserUpdateRequest for service
        # Convert to UserUpdateRequest for service
        # Use exclude_unset=True to avoid overwriting existing fields with None
        update_data = UserUpdateRequest(**user_data.model_dump(exclude_unset=True))
        
        updated_user = await user_service.update_by_id(user_id=user_id, data=update_data)
        return DataResponse(http_code=status.HTTP_200_OK, data=updated_user)
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=e)


# Profile Management Endpoints

@router.post(
    "/{user_id}/hobbies",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def add_hobby(user_id: str, hobby: str, token: str = Depends(JWTBearer())) -> Any:
    """Add a hobby to user's profile (user can only modify their own)"""
    try:
        # Verify user is modifying their own profile
        payload = decode_jwt(token)
        token_user_id = payload.get("sub")
        if token_user_id != user_id:
            raise CustomException(exception=ExceptionType.FORBIDDEN)
        
        user = await user_service.get_by_id(user_id=user_id)
        current_hobbies = user.hobbies or []
        
        # Avoid duplicates
        if hobby not in current_hobbies:
            current_hobbies.append(hobby)
            update_data = UserUpdateRequest(hobbies=current_hobbies)
            updated_user = await user_service.update_by_id(user_id=user_id, data=update_data)
            return DataResponse(http_code=status.HTTP_200_OK, data=updated_user)
        
        return DataResponse(http_code=status.HTTP_200_OK, data=user)
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=e)


@router.delete(
    "/{user_id}/hobbies/{hobby}",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def remove_hobby(user_id: str, hobby: str, token: str = Depends(JWTBearer())) -> Any:
    """Remove a hobby from user's profile (user can only modify their own)"""
    try:
        # Verify user is modifying their own profile
        payload = decode_jwt(token)
        token_user_id = payload.get("sub")
        if token_user_id != user_id:
            raise CustomException(exception=ExceptionType.FORBIDDEN)
        
        user = await user_service.get_by_id(user_id=user_id)
        current_hobbies = user.hobbies or []
        
        if hobby in current_hobbies:
            current_hobbies.remove(hobby)
            update_data = UserUpdateRequest(hobbies=current_hobbies)
            updated_user = await user_service.update_by_id(user_id=user_id, data=update_data)
            return DataResponse(http_code=status.HTTP_200_OK, data=updated_user)
        
        return DataResponse(http_code=status.HTTP_200_OK, data=user)
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=e)


@router.post(
    "/{user_id}/events/{event_id}",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def add_participated_event(user_id: str, event_id: str, token: str = Depends(JWTBearer())) -> Any:
    """Add an event to user's participated events list (user can only modify their own)"""
    try:
        # Verify user is modifying their own profile
        payload = decode_jwt(token)
        token_user_id = payload.get("sub")
        if token_user_id != user_id:
            raise CustomException(exception=ExceptionType.FORBIDDEN)
        
        user = await user_service.get_by_id(user_id=user_id)
        current_events = user.participated_events or []
        
        # Avoid duplicates
        if event_id not in current_events:
            current_events.append(event_id)
            update_data = UserUpdateRequest(participated_events=current_events)
            updated_user = await user_service.update_by_id(user_id=user_id, data=update_data)
            
            # Create check-in success notification
            from backend.api.api_notification_mongo import create_event_notification
            from backend.services.srv_event_mongo import EventMongoService
            try:
                event_service = EventMongoService()
                event = await event_service.get_by_id(event_id)
                await create_event_notification(
                    user_id=user_id,
                    notification_type="checkin",
                    event_id=event_id,
                    event_name=event.name
                )
            except Exception:
                pass  # Don't fail check-in if notification fails
            
            return DataResponse(http_code=status.HTTP_200_OK, data=updated_user)
        
        return DataResponse(http_code=status.HTTP_200_OK, data=user)
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=e)


@router.delete(
    "/{user_id}/events/{event_id}",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def remove_participated_event(user_id: str, event_id: str, token: str = Depends(JWTBearer())) -> Any:
    """Remove an event from user's participated events list (user can only modify their own)"""
    try:
        # Verify user is modifying their own profile
        payload = decode_jwt(token)
        token_user_id = payload.get("sub")
        if token_user_id != user_id:
            raise CustomException(exception=ExceptionType.FORBIDDEN)
        
        user = await user_service.get_by_id(user_id=user_id)
        current_events = user.participated_events or []
        
        if event_id in current_events:
            current_events.remove(event_id)
            update_data = UserUpdateRequest(participated_events=current_events)
            updated_user = await user_service.update_by_id(user_id=user_id, data=update_data)
            return DataResponse(http_code=status.HTTP_200_OK, data=updated_user)
        
        return DataResponse(http_code=status.HTTP_200_OK, data=user)
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=e)


# Role Upgrade Endpoints

@router.post(
    "/me/request-upgrade",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def request_role_upgrade(
    request_data: RoleUpgradeRequest,
    token: str = Depends(JWTBearer())
) -> Any:
    """Request a role upgrade (e.g., to Tour Provider or Event Provider)"""
    try:
        # Get user from token
        payload = decode_jwt(token)
        user_id = payload.get("sub")
        
        # Validate requested role
        valid_upgrade_roles = [UserRole.TOUR_PROVIDER.value, UserRole.EVENT_PROVIDER.value]
        if request_data.requested_role not in valid_upgrade_roles:
            raise CustomException(
                http_code=400, 
                message=f"Invalid role. Must be one of: {valid_upgrade_roles}"
            )
        
        # Check if user already has the role
        user = await user_service.get_by_id(user_id=user_id)
        if request_data.requested_role in user.roles:
            raise CustomException(
                http_code=400,
                message="You already have this role"
            )
        
        # Check if there's already a pending request
        user_dict = await user_service.get_by_username(user.username)
        if user_dict and user_dict.get("pending_role_upgrade"):
            raise CustomException(
                http_code=400,
                message="You already have a pending upgrade request"
            )
        
        # Create upgrade request
        update_data = UserUpdateRequest(
            pending_role_upgrade=request_data.requested_role,
            upgrade_request_reason=request_data.reason,
            upgrade_request_date=datetime.now().timestamp(),
            upgrade_rejection_reason=None
        )
        
        updated_user = await user_service.update_by_id(user_id=user_id, data=update_data)
        return DataResponse(http_code=status.HTTP_200_OK, data=updated_user)
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/admin/pending-upgrades",
    response_model=DataResponse[List[UserBaseResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_pending_upgrade_requests(token: str = Depends(AdminRequired())) -> Any:
    """Get all pending role upgrade requests (admin only)"""
    try:
        pending_users = await user_service.get_pending_upgrades()
        return DataResponse(http_code=status.HTTP_200_OK, data=pending_users)
    except Exception as e:
        raise CustomException(exception=e)


@router.patch(
    "/admin/{user_id}/approve-upgrade",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def approve_role_upgrade(user_id: str, token: str = Depends(AdminRequired())) -> Any:
    """Approve a user's role upgrade request (admin only)"""
    try:
        # Get user
        user = await user_service.get_by_id(user_id=user_id)
        user_dict = await user_service.get_by_username(user.username)
        
        pending_role = user_dict.get("pending_role_upgrade") if user_dict else None
        if not pending_role:
            raise CustomException(
                http_code=400,
                message="No pending upgrade request for this user"
            )
        
        # Add the new role and clear the request
        current_roles = user.roles.copy()
        if pending_role not in current_roles:
            current_roles.append(pending_role)
        
        update_data = UserUpdateRequest(
            roles=current_roles,
            pending_role_upgrade=None,
            upgrade_request_reason=None,
            upgrade_request_date=None,
            upgrade_rejection_reason=None
        )
        
        updated_user = await user_service.update_by_id(user_id=user_id, data=update_data)
        return DataResponse(http_code=status.HTTP_200_OK, data=updated_user)
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=e)


@router.patch(
    "/admin/{user_id}/reject-upgrade",
    response_model=DataResponse[UserBaseResponse],
    status_code=status.HTTP_200_OK,
)
async def reject_role_upgrade(
    user_id: str,
    reason: str,
    token: str = Depends(AdminRequired())
) -> Any:
    """Reject a user's role upgrade request (admin only)"""
    try:
        # Get user
        user = await user_service.get_by_id(user_id=user_id)
        user_dict = await user_service.get_by_username(user.username)
        
        pending_role = user_dict.get("pending_role_upgrade") if user_dict else None
        if not pending_role:
            raise CustomException(
                http_code=400,
                message="No pending upgrade request for this user"
            )
        
        # Clear the request and set rejection reason
        update_data = UserUpdateRequest(
            pending_role_upgrade=None,
            upgrade_request_reason=None,
            upgrade_request_date=None,
            upgrade_rejection_reason=reason
        )
        
        updated_user = await user_service.update_by_id(user_id=user_id, data=update_data)
        return DataResponse(http_code=status.HTTP_200_OK, data=updated_user)
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=e)


# Follow Feature Endpoints

@router.post(
    "/{user_id}/follow",
    response_model=DataResponse[dict],
    status_code=status.HTTP_200_OK,
)
async def follow_user(user_id: str, token: str = Depends(JWTBearer())) -> Any:
    """Follow a user"""
    try:
        payload = decode_jwt(token)
        current_user_id = payload.get("sub")
        
        success = await user_service.follow_user(current_user_id=current_user_id, target_user_id=user_id)
        
        message = "Followed successfully" if success else "Already following"
        return DataResponse(http_code=status.HTTP_200_OK, message=message, data={"success": success})
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=e)


@router.delete(
    "/{user_id}/follow",
    response_model=DataResponse[dict],
    status_code=status.HTTP_200_OK,
)
async def unfollow_user(user_id: str, token: str = Depends(JWTBearer())) -> Any:
    """Unfollow a user"""
    try:
        payload = decode_jwt(token)
        current_user_id = payload.get("sub")
        
        success = await user_service.unfollow_user(current_user_id=current_user_id, target_user_id=user_id)
        
        message = "Unfollowed successfully" if success else "Not following"
        return DataResponse(http_code=status.HTTP_200_OK, message=message, data={"success": success})
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/{user_id}/followers",
    response_model=DataResponse[List[UserBaseResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_followers(
    user_id: str,
    page: int = 1,
    page_size: int = 20,
    token: str = Depends(JWTBearer())  # Optional? Usually public info
) -> Any:
    """Get user's followers"""
    try:
        data, total = await user_service.get_followers(user_id=user_id, page=page, page_size=page_size)
        
        metadata = {
            "total": total,
            "page": page,
            "page_size": page_size
        }
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/{user_id}/following",
    response_model=DataResponse[List[UserBaseResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_following(
    user_id: str,
    page: int = 1,
    page_size: int = 20,
    token: str = Depends(JWTBearer())
) -> Any:
    """Get user's following list"""
    try:
        data, total = await user_service.get_following(user_id=user_id, page=page, page_size=page_size)
        
        metadata = {
            "total": total,
            "page": page,
            "page_size": page_size
        }
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/{user_id}/is-following",
    response_model=DataResponse[dict],
    status_code=status.HTTP_200_OK,
)
async def check_is_following(user_id: str, token: str = Depends(JWTBearer())) -> Any:
    """Check if current user is following target user"""
    try:
        payload = decode_jwt(token)
        current_user_id = payload.get("sub")
        
        is_following = await user_service.is_following(current_user_id=current_user_id, target_user_id=user_id)
        
        return DataResponse(http_code=status.HTTP_200_OK, data={"is_following": is_following})
    except CustomException as e:
        raise e
    except Exception as e:
        raise CustomException(exception=e)
