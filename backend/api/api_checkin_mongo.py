"""
CheckIn API Routes - Endpoints for check-in NFT operations
"""
from typing import Any
from fastapi import APIRouter, status, Query, Depends
from backend.utils.exception_handler import CustomException
from backend.schemas.sche_response import DataResponse
from backend.schemas.sche_checkin import (
    CheckInCreateRequest,
    CheckInResponse,
    CheckInVerifyResponse,
    CheckInListResponse,
)
from backend.services.srv_checkin_mongo import CheckInService
from backend.core.security import JWTBearer, decode_jwt

router = APIRouter(prefix="/checkin")

checkin_service = CheckInService()


@router.post(
    "/{event_id}",
    response_model=DataResponse[CheckInResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_checkin(
    event_id: str,
    data: CheckInCreateRequest,
    token: str = Depends(JWTBearer())
) -> Any:
    """Record a check-in after NFT has been minted on Sui"""
    try:
        payload = decode_jwt(token)
        user_id = payload.get("sub")
        
        checkin = await checkin_service.create_checkin(
            user_id=user_id,
            event_id=event_id,
            data=data
        )
        return DataResponse(http_code=status.HTTP_201_CREATED, data=checkin)
    except ValueError as e:
        raise CustomException(http_code=status.HTTP_400_BAD_REQUEST, message=str(e))
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/my",
    response_model=DataResponse[CheckInListResponse],
    status_code=status.HTTP_200_OK,
)
async def get_my_checkins(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    token: str = Depends(JWTBearer())
) -> Any:
    """Get current user's check-ins"""
    try:
        payload = decode_jwt(token)
        user_id = payload.get("sub")
        
        checkins, metadata = await checkin_service.get_user_checkins(
            user_id=user_id,
            page=page,
            page_size=page_size
        )
        
        return DataResponse(
            http_code=status.HTTP_200_OK,
            data=CheckInListResponse(
                checkins=checkins,
                total=metadata["total"],
                page=metadata["page"],
                page_size=metadata["page_size"],
                has_more=metadata["has_more"]
            )
        )
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/event/{event_id}",
    response_model=DataResponse[CheckInListResponse],
    status_code=status.HTTP_200_OK,
)
async def get_event_checkins(
    event_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    token: str = Depends(JWTBearer())
) -> Any:
    """Get all check-ins for an event"""
    try:
        checkins, metadata = await checkin_service.get_event_checkins(
            event_id=event_id,
            page=page,
            page_size=page_size
        )
        
        return DataResponse(
            http_code=status.HTTP_200_OK,
            data=CheckInListResponse(
                checkins=checkins,
                total=metadata["total"],
                page=metadata["page"],
                page_size=metadata["page_size"],
                has_more=metadata["has_more"]
            )
        )
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/verify/{event_id}",
    response_model=DataResponse[CheckInVerifyResponse],
    status_code=status.HTTP_200_OK,
)
async def verify_checkin(
    event_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Check if current user has checked in to an event"""
    try:
        payload = decode_jwt(token)
        user_id = payload.get("sub")
        
        has_checked_in, checkin = await checkin_service.verify_checkin(
            user_id=user_id,
            event_id=event_id
        )
        
        return DataResponse(
            http_code=status.HTTP_200_OK,
            data=CheckInVerifyResponse(
                has_checked_in=has_checked_in,
                checkin=checkin
            )
        )
    except Exception as e:
        raise CustomException(exception=e)
