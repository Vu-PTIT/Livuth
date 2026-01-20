"""
Post API Routes - Social media posts for travel experiences
"""
from typing import Any, Optional
from datetime import datetime
from fastapi import APIRouter, status, Depends, Query
from bson import ObjectId

from backend.core.database import db
from backend.utils.exception_handler import CustomException, ExceptionType
from backend.schemas.sche_response import DataResponse
from backend.schemas.sche_post import (
    PostCreate, PostUpdate, PostResponse, PostListResponse, AuthorInfo
)
from backend.schemas.sche_comment import (
    CommentCreate, CommentResponse, CommentListResponse, CommentAuthor
)
from backend.services.srv_user_mongo import UserMongoService
from backend.core.security import JWTBearer, decode_jwt

router = APIRouter(prefix="/posts")
user_service = UserMongoService()

# Collection references
def get_posts_collection():
    return db.get_collection("posts")

def get_comments_collection():
    return db.get_collection("comments")


# Helper functions
async def get_user_info(user_id: str) -> dict:
    """Get user info for embedding in post/comment"""
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


async def format_post_response(post: dict, current_user_id: str = None) -> dict:
    """Format post for response with author info"""
    author_info = await get_user_info(str(post.get("author_id")))
    
    liked_by = post.get("liked_by", [])
    is_liked = False
    if current_user_id:
        is_liked = ObjectId(current_user_id) in liked_by or current_user_id in [str(x) for x in liked_by]
    
    return {
        "id": str(post["_id"]),
        "author": author_info,
        "content": post.get("content", ""),
        "media": post.get("media", []),
        "location": post.get("location"),
        "tags": post.get("tags", []),
        "like_count": post.get("like_count", 0),
        "comment_count": post.get("comment_count", 0),
        "share_count": post.get("share_count", 0),
        "is_liked": is_liked,
        "visibility": post.get("visibility", "public"),
        "created_at": post.get("created_at", 0),
        "updated_at": post.get("updated_at", 0)
    }


# ==================== POST CRUD ====================

@router.post("", response_model=DataResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    token: str = Depends(JWTBearer())
) -> Any:
    """Create a new travel post"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    now = datetime.now().timestamp()
    post_doc = {
        "author_id": ObjectId(user_id),
        "content": post_data.content,
        "media": [m.model_dump() for m in post_data.media],
        "location": post_data.location.model_dump() if post_data.location else None,
        "tags": post_data.tags,
        "like_count": 0,
        "comment_count": 0,
        "share_count": 0,
        "liked_by": [],
        "visibility": post_data.visibility,
        "created_at": now,
        "updated_at": now
    }
    
    result = await get_posts_collection().insert_one(post_doc)
    post_doc["_id"] = result.inserted_id
    
    response = await format_post_response(post_doc, user_id)
    return DataResponse(data=response, message="Đăng bài thành công!")


@router.get("", response_model=DataResponse)
async def get_feed(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    token: str = Depends(JWTBearer())
) -> Any:
    """Get posts feed with pagination"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    skip = (page - 1) * page_size
    
    # Get public posts, sorted by newest first
    cursor = get_posts_collection().find(
        {"visibility": "public"}
    ).sort("created_at", -1).skip(skip).limit(page_size + 1)
    
    posts = await cursor.to_list(length=page_size + 1)
    has_more = len(posts) > page_size
    posts = posts[:page_size]
    
    # Get total count
    total = await get_posts_collection().count_documents({"visibility": "public"})
    
    # Format responses
    formatted_posts = []
    for post in posts:
        formatted = await format_post_response(post, user_id)
        formatted_posts.append(formatted)
    
    return DataResponse(data={
        "posts": formatted_posts,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": has_more
    })


@router.get("/user/{target_user_id}", response_model=DataResponse)
async def get_user_posts(
    target_user_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    token: str = Depends(JWTBearer())
) -> Any:
    """Get posts by a specific user"""
    payload = decode_jwt(token)
    current_user_id = payload.get("sub")
    
    skip = (page - 1) * page_size
    
    # If viewing own profile, show all posts; otherwise only public
    query = {"author_id": ObjectId(target_user_id)}
    if current_user_id != target_user_id:
        query["visibility"] = "public"
    
    cursor = get_posts_collection().find(query).sort("created_at", -1).skip(skip).limit(page_size + 1)
    posts = await cursor.to_list(length=page_size + 1)
    has_more = len(posts) > page_size
    posts = posts[:page_size]
    
    total = await get_posts_collection().count_documents(query)
    
    formatted_posts = []
    for post in posts:
        formatted = await format_post_response(post, current_user_id)
        formatted_posts.append(formatted)
    
    return DataResponse(data={
        "posts": formatted_posts,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": has_more
    })


@router.get("/{post_id}", response_model=DataResponse)
async def get_post(
    post_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Get a single post by ID"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    post = await get_posts_collection().find_one({"_id": ObjectId(post_id)})
    if not post:
        raise CustomException(exception=ExceptionType.NOT_FOUND)
    
    response = await format_post_response(post, user_id)
    return DataResponse(data=response)


@router.put("/{post_id}", response_model=DataResponse)
async def update_post(
    post_id: str,
    post_data: PostUpdate,
    token: str = Depends(JWTBearer())
) -> Any:
    """Update a post (owner only)"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    post = await get_posts_collection().find_one({"_id": ObjectId(post_id)})
    if not post:
        raise CustomException(exception=ExceptionType.NOT_FOUND)
    
    if str(post["author_id"]) != user_id:
        raise CustomException(exception=ExceptionType.FORBIDDEN)
    
    update_data = {"updated_at": datetime.now().timestamp()}
    if post_data.content is not None:
        update_data["content"] = post_data.content
    if post_data.media is not None:
        update_data["media"] = [m.model_dump() for m in post_data.media]
    if post_data.location is not None:
        update_data["location"] = post_data.location.model_dump()
    if post_data.tags is not None:
        update_data["tags"] = post_data.tags
    if post_data.visibility is not None:
        update_data["visibility"] = post_data.visibility
    
    await get_posts_collection().update_one(
        {"_id": ObjectId(post_id)},
        {"$set": update_data}
    )
    
    updated_post = await get_posts_collection().find_one({"_id": ObjectId(post_id)})
    response = await format_post_response(updated_post, user_id)
    return DataResponse(data=response, message="Cập nhật thành công!")


@router.delete("/{post_id}", response_model=DataResponse)
async def delete_post(
    post_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Delete a post (owner only)"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    role = payload.get("role", "")
    is_admin = role.upper() == "ADMIN"
    
    post = await get_posts_collection().find_one({"_id": ObjectId(post_id)})
    if not post:
        raise CustomException(exception=ExceptionType.NOT_FOUND)
    
    if str(post["author_id"]) != user_id and not is_admin:
        raise CustomException(exception=ExceptionType.FORBIDDEN)
    
    # Delete post and its comments
    await get_posts_collection().delete_one({"_id": ObjectId(post_id)})
    await get_comments_collection().delete_many({"post_id": ObjectId(post_id)})
    
    return DataResponse(data=None, message="Xóa bài đăng thành công!")


# ==================== LIKE ====================

@router.post("/{post_id}/like", response_model=DataResponse)
async def toggle_like(
    post_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Toggle like on a post"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    post = await get_posts_collection().find_one({"_id": ObjectId(post_id)})
    if not post:
        raise CustomException(exception=ExceptionType.NOT_FOUND)
    
    user_oid = ObjectId(user_id)
    liked_by = post.get("liked_by", [])
    
    if user_oid in liked_by:
        # Unlike
        await get_posts_collection().update_one(
            {"_id": ObjectId(post_id)},
            {
                "$pull": {"liked_by": user_oid},
                "$inc": {"like_count": -1}
            }
        )
        is_liked = False
        message = "Đã bỏ thích"
    else:
        # Like
        await get_posts_collection().update_one(
            {"_id": ObjectId(post_id)},
            {
                "$push": {"liked_by": user_oid},
                "$inc": {"like_count": 1}
            }
        )
        is_liked = True
        message = "Đã thích bài viết"
    
    updated_post = await get_posts_collection().find_one({"_id": ObjectId(post_id)})
    return DataResponse(data={
        "is_liked": is_liked,
        "like_count": updated_post.get("like_count", 0)
    }, message=message)


# ==================== COMMENTS ====================

@router.get("/{post_id}/comments", response_model=DataResponse)
async def get_comments(
    post_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    token: str = Depends(JWTBearer())
) -> Any:
    """Get comments for a post"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    # Verify post exists
    post = await get_posts_collection().find_one({"_id": ObjectId(post_id)})
    if not post:
        raise CustomException(exception=ExceptionType.NOT_FOUND)
    
    skip = (page - 1) * page_size
    
    # Get top-level comments (no parent)
    cursor = get_comments_collection().find({
        "post_id": ObjectId(post_id),
        "parent_id": None
    }).sort("created_at", -1).skip(skip).limit(page_size + 1)
    
    comments = await cursor.to_list(length=page_size + 1)
    has_more = len(comments) > page_size
    comments = comments[:page_size]
    
    total = await get_comments_collection().count_documents({
        "post_id": ObjectId(post_id),
        "parent_id": None
    })
    
    # Format comments with author info
    formatted_comments = []
    for comment in comments:
        author_info = await get_user_info(str(comment["author_id"]))
        
        liked_by = comment.get("liked_by", [])
        is_liked = ObjectId(user_id) in liked_by
        
        formatted = {
            "id": str(comment["_id"]),
            "post_id": str(comment["post_id"]),
            "author": author_info,
            "content": comment.get("content", ""),
            "like_count": comment.get("like_count", 0),
            "is_liked": is_liked,
            "parent_id": None,
            "reply_count": comment.get("reply_count", 0),
            "replies": [],
            "created_at": comment.get("created_at", 0),
            "updated_at": comment.get("updated_at", 0)
        }
        formatted_comments.append(formatted)
    
    return DataResponse(data={
        "comments": formatted_comments,
        "total": total,
        "has_more": has_more
    })


@router.post("/{post_id}/comments", response_model=DataResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: str,
    comment_data: CommentCreate,
    token: str = Depends(JWTBearer())
) -> Any:
    """Create a comment on a post"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    # Verify post exists
    post = await get_posts_collection().find_one({"_id": ObjectId(post_id)})
    if not post:
        raise CustomException(exception=ExceptionType.NOT_FOUND)
    
    now = datetime.now().timestamp()
    comment_doc = {
        "post_id": ObjectId(post_id),
        "author_id": ObjectId(user_id),
        "content": comment_data.content,
        "like_count": 0,
        "liked_by": [],
        "parent_id": ObjectId(comment_data.parent_id) if comment_data.parent_id else None,
        "reply_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    result = await get_comments_collection().insert_one(comment_doc)
    
    # Update post comment count
    await get_posts_collection().update_one(
        {"_id": ObjectId(post_id)},
        {"$inc": {"comment_count": 1}}
    )
    
    # If this is a reply, update parent's reply count
    if comment_data.parent_id:
        await get_comments_collection().update_one(
            {"_id": ObjectId(comment_data.parent_id)},
            {"$inc": {"reply_count": 1}}
        )
    
    # Format response
    author_info = await get_user_info(user_id)
    response = {
        "id": str(result.inserted_id),
        "post_id": post_id,
        "author": author_info,
        "content": comment_data.content,
        "like_count": 0,
        "is_liked": False,
        "parent_id": comment_data.parent_id,
        "reply_count": 0,
        "replies": [],
        "created_at": now,
        "updated_at": now
    }
    
    return DataResponse(data=response, message="Đã bình luận!")


@router.post("/{post_id}/comments/{comment_id}/like", response_model=DataResponse)
async def toggle_comment_like(
    post_id: str,
    comment_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Toggle like on a comment"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    
    comment = await get_comments_collection().find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise CustomException(exception=ExceptionType.NOT_FOUND)
    
    user_oid = ObjectId(user_id)
    liked_by = comment.get("liked_by", [])
    
    if user_oid in liked_by:
        await get_comments_collection().update_one(
            {"_id": ObjectId(comment_id)},
            {
                "$pull": {"liked_by": user_oid},
                "$inc": {"like_count": -1}
            }
        )
        is_liked = False
    else:
        await get_comments_collection().update_one(
            {"_id": ObjectId(comment_id)},
            {
                "$push": {"liked_by": user_oid},
                "$inc": {"like_count": 1}
            }
        )
        is_liked = True
    
    updated = await get_comments_collection().find_one({"_id": ObjectId(comment_id)})
    return DataResponse(data={
        "is_liked": is_liked,
        "like_count": updated.get("like_count", 0)
    })


@router.delete("/{post_id}/comments/{comment_id}", response_model=DataResponse)
async def delete_comment(
    post_id: str,
    comment_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Delete a comment (owner only)"""
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    role = payload.get("role", "")
    is_admin = role.upper() == "ADMIN"
    
    comment = await get_comments_collection().find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise CustomException(exception=ExceptionType.NOT_FOUND)
    
    if str(comment["author_id"]) != user_id and not is_admin:
        raise CustomException(exception=ExceptionType.FORBIDDEN)
    
    # Delete comment
    await get_comments_collection().delete_one({"_id": ObjectId(comment_id)})
    
    # Update post comment count
    await get_posts_collection().update_one(
        {"_id": ObjectId(post_id)},
        {"$inc": {"comment_count": -1}}
    )
    
    # If this was a reply, update parent's reply count
    if comment.get("parent_id"):
        await get_comments_collection().update_one(
            {"_id": comment["parent_id"]},
            {"$inc": {"reply_count": -1}}
        )
    
    return DataResponse(data=None, message="Đã xóa bình luận!")
