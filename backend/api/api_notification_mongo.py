"""
Notification API Routes - User notifications for likes and comments
"""
from typing import Any
from fastapi import APIRouter, status, Depends, Query
from bson import ObjectId

from backend.core.database import db
from backend.utils.exception_handler import CustomException, ExceptionType
from backend.schemas.sche_response import DataResponse
from backend.services.srv_user_mongo import UserMongoService
from backend.core.security import JWTBearer, decode_jwt

router = APIRouter(prefix="/notifications")
user_service = UserMongoService()


def get_notifications_collection():
    return db.get_collection("notifications")


async def get_actor_info(user_id: str) -> dict:
    """Get actor info for embedding in notification"""
    try:
        user = await user_service.get_by_id(user_id)
        return {
            "id": str(user_id),
            "username": user.username,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url
        }
    except:
        return {
            "id": str(user_id),
            "username": "Unknown",
            "full_name": None,
            "avatar_url": None
        }


async def format_notification_response(notification: dict) -> dict:
    """Format notification for response with actor info"""
    actor_info = await get_actor_info(str(notification.get("actor_id")))
    
    return {
        "id": str(notification["_id"]),
        "user_id": str(notification["user_id"]),
        "actor": actor_info,
        "type": notification.get("type"),
        "message": notification.get("message", ""),
        "post_id": str(notification["post_id"]) if notification.get("post_id") else None,
        "comment_id": str(notification["comment_id"]) if notification.get("comment_id") else None,
        "event_id": str(notification["event_id"]) if notification.get("event_id") else None,
        "read": notification.get("read", False),
        "created_at": notification.get("created_at", 0)
    }


# ==================== NOTIFICATION CRUD ====================

@router.get("", response_model=DataResponse)
async def get_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    token: str = Depends(JWTBearer())
) -> Any:
    """Get current user's notifications with pagination"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    skip = (page - 1) * page_size
    
    # Get notifications for current user, sorted by newest first
    cursor = get_notifications_collection().find(
        {"user_id": ObjectId(user_id)}
    ).sort("created_at", -1).skip(skip).limit(page_size + 1)
    
    notifications = await cursor.to_list(length=page_size + 1)
    has_more = len(notifications) > page_size
    notifications = notifications[:page_size]
    
    # Get total and unread count
    total = await get_notifications_collection().count_documents({"user_id": ObjectId(user_id)})
    unread_count = await get_notifications_collection().count_documents({
        "user_id": ObjectId(user_id),
        "read": False
    })
    
    # Format responses
    formatted_notifications = []
    for notification in notifications:
        formatted = await format_notification_response(notification)
        formatted_notifications.append(formatted)
    
    return DataResponse(data={
        "notifications": formatted_notifications,
        "total": total,
        "unread_count": unread_count,
        "page": page,
        "page_size": page_size,
        "has_more": has_more
    })


@router.get("/unread-count", response_model=DataResponse)
async def get_unread_count(
    token: str = Depends(JWTBearer())
) -> Any:
    """Get count of unread notifications"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    count = await get_notifications_collection().count_documents({
        "user_id": ObjectId(user_id),
        "read": False
    })
    
    return DataResponse(data={"unread_count": count})


@router.patch("/{notification_id}/read", response_model=DataResponse)
async def mark_as_read(
    notification_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Mark a single notification as read"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    notification = await get_notifications_collection().find_one({
        "_id": ObjectId(notification_id),
        "user_id": ObjectId(user_id)
    })
    
    if not notification:
        raise CustomException(exception=ExceptionType.NOT_FOUND)
    
    await get_notifications_collection().update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"read": True}}
    )
    
    return DataResponse(data={"success": True}, message="Đã đánh dấu đã đọc")


@router.patch("/read-all", response_model=DataResponse)
async def mark_all_as_read(
    token: str = Depends(JWTBearer())
) -> Any:
    """Mark all notifications as read for current user"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    result = await get_notifications_collection().update_many(
        {"user_id": ObjectId(user_id), "read": False},
        {"$set": {"read": True}}
    )
    
    return DataResponse(
        data={"modified_count": result.modified_count},
        message=f"Đã đánh dấu {result.modified_count} thông báo là đã đọc"
    )


@router.delete("/{notification_id}", response_model=DataResponse)
async def delete_notification(
    notification_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Delete a notification"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    notification = await get_notifications_collection().find_one({
        "_id": ObjectId(notification_id),
        "user_id": ObjectId(user_id)
    })
    
    if not notification:
        raise CustomException(exception=ExceptionType.NOT_FOUND)
    
    await get_notifications_collection().delete_one({"_id": ObjectId(notification_id)})
    
    return DataResponse(data=None, message="Đã xóa thông báo")


# ==================== HELPER FUNCTION TO CREATE NOTIFICATIONS ====================

async def create_notification(
    user_id: str,
    actor_id: str,
    notification_type: str,
    message: str,
    post_id: str = None,
    comment_id: str = None
) -> None:
    """
    Helper function to create a notification.
    Called from other API modules (e.g., posts API when liking/commenting)
    """
    from datetime import datetime
    
    # Don't create notification if user is notifying themselves
    if user_id == actor_id:
        return
    
    notification_doc = {
        "user_id": ObjectId(user_id),
        "actor_id": ObjectId(actor_id),
        "type": notification_type,
        "message": message,
        "post_id": ObjectId(post_id) if post_id else None,
        "comment_id": ObjectId(comment_id) if comment_id else None,
        "read": False,
        "created_at": datetime.now().timestamp()
    }
    
    await get_notifications_collection().insert_one(notification_doc)


async def create_event_notification(
    user_id: str,
    notification_type: str,
    event_id: str,
    event_name: str,
    message: str = None
) -> None:
    """
    Create notification for event-related actions (checkin, proximity).
    This is a self-notification, so actor_id equals user_id.
    """
    from datetime import datetime
    
    if message is None:
        if notification_type == "checkin":
            message = f"Check-in thành công tại {event_name}! 🎉"
        elif notification_type == "proximity":
            message = f"Bạn đang ở gần sự kiện {event_name}. Ghé thăm nhé!"
        else:
            message = f"Thông báo về sự kiện {event_name}"
    
    notification_doc = {
        "user_id": ObjectId(user_id),
        "actor_id": ObjectId(user_id),  # Self-notification
        "type": notification_type,
        "message": message,
        "event_id": ObjectId(event_id),
        "read": False,
        "created_at": datetime.now().timestamp()
    }
    
    await get_notifications_collection().insert_one(notification_doc)

