"""
Tour Provider API Routes
"""
from typing import Any, List, Optional
from fastapi import APIRouter, status, Query, Depends
from backend.utils.exception_handler import CustomException
from backend.schemas.sche_response import DataResponse
from backend.schemas.sche_tour_provider import (
    TourProviderListingCreateRequest,
    TourProviderListingUpdateRequest,
    TourProviderListingResponse,
)
from backend.services.srv_tour_provider_mongo import TourProviderService
from backend.core.security import JWTBearer, decode_jwt, TourProviderOrAdmin, AdminRequired
from backend.utils.exception_handler import ExceptionType

router = APIRouter(prefix="/tour-providers")

tour_provider_service = TourProviderService()


# Public endpoints

@router.get(
    "/event/{event_id}",
    response_model=DataResponse[List[TourProviderListingResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_by_event(
    event_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Get all approved tour provider listings for an event (requires login)"""
    try:
        data, metadata = await tour_provider_service.get_by_event(event_id, approved_only=True)
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/search",
    response_model=DataResponse[List[TourProviderListingResponse]],
    status_code=status.HTTP_200_OK,
)
async def search_listings(
    q: Optional[str] = Query(None, description="Search query"),
    event_id: Optional[str] = Query(None, description="Filter by event"),
    limit: int = Query(default=20, ge=1, le=100),
    token: str = Depends(JWTBearer())
) -> Any:
    """Search approved tour provider listings (requires login)"""
    try:
        data, metadata = await tour_provider_service.search_listings(
            query=q,
            event_id=event_id,
            limit=limit
        )
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except Exception as e:
        raise CustomException(exception=e)


# Provider endpoints (require authentication)

@router.get(
    "/my-listings",
    response_model=DataResponse[List[TourProviderListingResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_my_listings(token: str = Depends(JWTBearer())) -> Any:
    """Get all my tour provider listings (any status)"""
    try:
        # Get provider ID from token
        payload = decode_jwt(token)
        provider_id = payload.get("sub")
        
        if not provider_id:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        data, metadata = await tour_provider_service.get_my_listings(provider_id)
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/{listing_id}",
    response_model=DataResponse[TourProviderListingResponse],
    status_code=status.HTTP_200_OK,
)
async def get_by_id(
    listing_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Get tour provider listing details (requires login, increments view count)"""
    try:
        listing = await tour_provider_service.get_by_id(listing_id, increment_view=True)
        return DataResponse(http_code=status.HTTP_200_OK, data=listing)
    except Exception as e:
        raise CustomException(exception=e)


@router.post(
    "",
    response_model=DataResponse[TourProviderListingResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_listing(
    listing_data: TourProviderListingCreateRequest,
    token: str = Depends(TourProviderOrAdmin())
) -> Any:
    """Create new tour provider listing (requires TOUR_PROVIDER or ADMIN role)"""
    try:
        # Get provider ID from token
        payload = decode_jwt(token)
        provider_id = payload.get("sub")
        
        if not provider_id:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        new_listing = await tour_provider_service.create(data=listing_data, provider_id=provider_id)
        return DataResponse(http_code=status.HTTP_201_CREATED, data=new_listing)
    except Exception as e:
        raise CustomException(exception=e)


@router.put(
    "/{listing_id}",
    response_model=DataResponse[TourProviderListingResponse],
    status_code=status.HTTP_200_OK,
)
async def update_listing(
    listing_id: str,
    listing_data: TourProviderListingUpdateRequest,
    token: str = Depends(JWTBearer())
) -> Any:
    """Update my tour provider listing"""
    try:
        # Get provider ID from token
        payload = decode_jwt(token)
        provider_id = payload.get("sub")
        
        if not provider_id:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        updated_listing = await tour_provider_service.update_by_id(
            listing_id=listing_id,
            data=listing_data,
            provider_id=provider_id
        )
        return DataResponse(http_code=status.HTTP_200_OK, data=updated_listing)
    except Exception as e:
        raise CustomException(exception=e)


@router.delete(
    "/{listing_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_listing(
    listing_id: str,
    token: str = Depends(JWTBearer())
) -> None:
    """Delete my tour provider listing"""
    try:
        # Get provider ID from token
        payload = decode_jwt(token)
        provider_id = payload.get("sub")
        
        if not provider_id:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        await tour_provider_service.delete_by_id(listing_id=listing_id, provider_id=provider_id)
    except Exception as e:
        raise CustomException(exception=e)


# Admin endpoints (require admin role)

@router.get(
    "/admin/pending",
    response_model=DataResponse[List[TourProviderListingResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_pending_listings(token: str = Depends(AdminRequired())) -> Any:
    """Get all pending listings for review (admin only)"""
    try:
        data, metadata = await tour_provider_service.get_pending_listings()
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except Exception as e:
        raise CustomException(exception=e)


@router.patch(
    "/{listing_id}/approve",
    response_model=DataResponse[TourProviderListingResponse],
    status_code=status.HTTP_200_OK,
)
async def approve_listing(
    listing_id: str,
    token: str = Depends(AdminRequired())
) -> Any:
    """Approve a tour provider listing (admin only)"""
    try:
        approved_listing = await tour_provider_service.approve_listing(listing_id)
        return DataResponse(http_code=status.HTTP_200_OK, data=approved_listing)
    except Exception as e:
        raise CustomException(exception=e)


@router.patch(
    "/{listing_id}/reject",
    response_model=DataResponse[TourProviderListingResponse],
    status_code=status.HTTP_200_OK,
)
async def reject_listing(
    listing_id: str,
    reason: str = Query(..., description="Rejection reason"),
    token: str = Depends(AdminRequired())
) -> Any:
    """Reject a tour provider listing (admin only)"""
    try:
        rejected_listing = await tour_provider_service.reject_listing(listing_id, reason)
        return DataResponse(http_code=status.HTTP_200_OK, data=rejected_listing)
    except Exception as e:
        raise CustomException(exception=e)


@router.patch(
    "/{listing_id}/verify",
    response_model=DataResponse[TourProviderListingResponse],
    status_code=status.HTTP_200_OK,
)
async def verify_provider(
    listing_id: str,
    token: str = Depends(AdminRequired())
) -> Any:
    """Mark tour provider as verified (admin only)"""
    try:
        verified_listing = await tour_provider_service.verify_provider(listing_id)
        return DataResponse(http_code=status.HTTP_200_OK, data=verified_listing)
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/admin/all",
    response_model=DataResponse[List[TourProviderListingResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_all_listings(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    token: str = Depends(AdminRequired())
) -> Any:
    """Get all tour provider listings (admin only)"""
    try:
        data, metadata = await tour_provider_service.get_all_listings(status=status_filter)
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except Exception as e:
        raise CustomException(exception=e)


@router.patch(
    "/{listing_id}/visibility",
    response_model=DataResponse[TourProviderListingResponse],
    status_code=status.HTTP_200_OK,
)
async def toggle_visibility(
    listing_id: str,
    is_visible: bool = Query(..., description="Set visibility status"),
    token: str = Depends(JWTBearer())
) -> Any:
    """Toggle tour provider listing visibility (owner only)"""
    try:
        payload = decode_jwt(token)
        provider_id = payload.get("sub")
        
        if not provider_id:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)
        
        updated_listing = await tour_provider_service.toggle_visibility(
            listing_id=listing_id,
            provider_id=provider_id,
            is_visible=is_visible
        )
        return DataResponse(http_code=status.HTTP_200_OK, data=updated_listing)
    except Exception as e:
        raise CustomException(exception=e)
