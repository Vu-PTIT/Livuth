"""
Roadmap Service for MongoDB
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.core.database import db
from backend.models.mongo_roadmap import RoadmapMongo
from backend.schemas.sche_roadmap import RoadmapCreateRequest, RoadmapUpdateRequest
from backend.utils.exception_handler import CustomException, ExceptionType


class RoadmapMongoService:
    """Roadmap Service for MongoDB operations"""
    
    def __init__(self):
        self.collection_name = "roadmaps"
    
    def get_collection(self):
        """Get roadmaps collection"""
        return db.get_collection(self.collection_name)
    
    async def get_event_roadmaps(self, event_id: str, limit: int = 50) -> List[Dict]:
        """
        Get all roadmaps for an event
        
        Returns:
            List of roadmap dictionaries
        """
        collection = self.get_collection()
        
        # Get roadmaps sorted by likes (descending) then newest first
        cursor = collection.find(
            {"event_id": ObjectId(event_id)}
        ).sort([("like_count", -1), ("created_at", -1)]).limit(limit)
        
        roadmaps = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            doc["event_id"] = str(doc.get("event_id", ""))
            doc["user_id"] = str(doc.get("user_id", ""))
            
            # Convert ObjectIds in likes list to string
            likes = doc.get("likes", [])
            doc["likes"] = [str(like_id) for like_id in likes]
            
            roadmaps.append(doc)
            
        return roadmaps
    
    async def get_roadmap_by_id(self, roadmap_id: str) -> Optional[Dict]:
        """Get roadmap by its ID"""
        collection = self.get_collection()
        doc = await collection.find_one({"_id": ObjectId(roadmap_id)})
        
        if doc:
            doc["id"] = str(doc.pop("_id"))
            doc["event_id"] = str(doc.get("event_id", ""))
            doc["user_id"] = str(doc.get("user_id", ""))
            
            likes = doc.get("likes", [])
            doc["likes"] = [str(like_id) for like_id in likes]
            
            return doc
        
        return None

    async def create_roadmap(
        self, 
        event_id: str, 
        user_id: str, 
        user_name: str,
        user_avatar: Optional[str],
        data: RoadmapCreateRequest
    ) -> Dict:
        """Create a new roadmap"""
        collection = self.get_collection()
        
        # Validate event exists
        event_collection = db.get_collection("events")
        event = await event_collection.find_one({"_id": ObjectId(event_id)})
        if not event:
            raise CustomException(
                exception_type=ExceptionType.NOT_FOUND,
                message="Sự kiện không tồn tại"
            )
        
        # Create roadmap document
        roadmap_doc = {
            "event_id": ObjectId(event_id),
            "user_id": ObjectId(user_id),
            "title": data.title,
            "duration": data.duration,
            "tags": data.tags,
            "content": data.content,
            "user_name": user_name,
            "user_avatar": user_avatar,
            "likes": [],
            "like_count": 0,
            "created_at": datetime.now().timestamp(),
            "updated_at": datetime.now().timestamp()
        }
        
        result = await collection.insert_one(roadmap_doc)
        roadmap_doc["id"] = str(result.inserted_id)
        roadmap_doc["event_id"] = event_id
        roadmap_doc["user_id"] = user_id
        roadmap_doc.pop("_id", None)
        
        return roadmap_doc
    
    async def update_roadmap(
        self, 
        roadmap_id: str, 
        user_id: str,
        data: RoadmapUpdateRequest
    ) -> Dict:
        """Update an existing roadmap (only owner can update)"""
        collection = self.get_collection()
        
        # Find and verify ownership
        roadmap = await collection.find_one({"_id": ObjectId(roadmap_id)})
        if not roadmap:
            raise CustomException(
                exception_type=ExceptionType.NOT_FOUND,
                message="Không tìm thấy lộ trình"
            )
        
        if str(roadmap.get("user_id")) != user_id:
            raise CustomException(
                exception_type=ExceptionType.FORBIDDEN,
                message="Bạn không có quyền sửa lộ trình này"
            )
        
        # Update fields
        update_data = {"updated_at": datetime.now().timestamp()}
        if data.title is not None:
            update_data["title"] = data.title
        if data.duration is not None:
            update_data["duration"] = data.duration
        if data.tags is not None:
            update_data["tags"] = data.tags
        if data.content is not None:
            update_data["content"] = data.content
            
        await collection.update_one(
            {"_id": ObjectId(roadmap_id)},
            {"$set": update_data}
        )
        
        # Return updated roadmap
        return await self.get_roadmap_by_id(roadmap_id)
    
    async def delete_roadmap(self, roadmap_id: str, user_id: str, is_admin: bool = False) -> bool:
        """Delete a roadmap (owner or admin)"""
        collection = self.get_collection()
        
        roadmap = await collection.find_one({"_id": ObjectId(roadmap_id)})
        if not roadmap:
            raise CustomException(
                exception_type=ExceptionType.NOT_FOUND,
                message="Không tìm thấy lộ trình"
            )
        
        # Check permission
        if not is_admin and str(roadmap.get("user_id")) != user_id:
            raise CustomException(
                exception_type=ExceptionType.FORBIDDEN,
                message="Bạn không có quyền xóa lộ trình này"
            )
        
        await collection.delete_one({"_id": ObjectId(roadmap_id)})
        
        return True
    
    async def toggle_like(self, roadmap_id: str, user_id: str) -> Dict:
        """Toggle like status for a roadmap"""
        collection = self.get_collection()
        
        roadmap = await collection.find_one({"_id": ObjectId(roadmap_id)})
        if not roadmap:
            raise CustomException(
                exception_type=ExceptionType.NOT_FOUND,
                message="Không tìm thấy lộ trình"
            )
        
        user_obj_id = ObjectId(user_id)
        likes = roadmap.get("likes", [])
        
        if user_obj_id in likes:
            # Unlike
            likes.remove(user_obj_id)
            is_liked = False
        else:
            # Like
            likes.append(user_obj_id)
            is_liked = True
            
        await collection.update_one(
            {"_id": ObjectId(roadmap_id)},
            {"$set": {
                "likes": likes,
                "like_count": len(likes),
                "updated_at": datetime.now().timestamp()
            }}
        )
        
        return {
            "is_liked": is_liked,
            "like_count": len(likes)
        }
