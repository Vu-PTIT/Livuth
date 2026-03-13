"""
Roadmap Service for MongoDB
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.core.database import db
from backend.models.mongo_roadmap import RoadmapMongo
from backend.schemas.sche_roadmap import RoadmapCreateRequest, RoadmapUpdateRequest, RoadmapGenerateRequest
from backend.utils.exception_handler import CustomException, ExceptionType
from backend.services.ai_agent import AIAgent
import json


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
        
        # Use aggregation pipeline to join real-time avatar from users collection
        pipeline = [
            {"$match": {"event_id": ObjectId(event_id)}},
            {"$sort": {"like_count": -1, "created_at": -1}},
            {"$limit": limit},
            {"$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user_info",
                "pipeline": [{"$project": {"avatar_url": 1, "username": 1}}]
            }},
            {"$addFields": {
                "user_avatar": {
                    "$ifNull": [
                        {"$arrayElemAt": ["$user_info.avatar_url", 0]},
                        "$user_avatar"
                    ]
                }
            }},
            {"$unset": "user_info"}
        ]
        
        roadmaps = []
        async for doc in collection.aggregate(pipeline):
            doc["id"] = str(doc.pop("_id"))
            doc["event_id"] = str(doc.get("event_id", ""))
            doc["user_id"] = str(doc.get("user_id", ""))
            
            # Convert ObjectIds in likes list to string
            likes = doc.get("likes", [])
            doc["likes"] = [str(like_id) for like_id in likes]
            
            roadmaps.append(doc)
            
        return roadmaps
    
    async def get_roadmap_by_id(self, roadmap_id: str) -> Optional[Dict]:
        """Get roadmap by its ID with real-time avatar from user profile"""
        collection = self.get_collection()
        
        pipeline = [
            {"$match": {"_id": ObjectId(roadmap_id)}},
            {"$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user_info",
                "pipeline": [{"$project": {"avatar_url": 1, "username": 1}}]
            }},
            {"$addFields": {
                "user_avatar": {
                    "$ifNull": [
                        {"$arrayElemAt": ["$user_info.avatar_url", 0]},
                        "$user_avatar"
                    ]
                }
            }},
            {"$unset": "user_info"}
        ]
        
        docs = await collection.aggregate(pipeline).to_list(1)
        if not docs:
            return None
        
        doc = docs[0]
        doc["id"] = str(doc.pop("_id"))
        doc["event_id"] = str(doc.get("event_id", ""))
        doc["user_id"] = str(doc.get("user_id", ""))
        
        likes = doc.get("likes", [])
        doc["likes"] = [str(like_id) for like_id in likes]
        
        return doc

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
                exception=ExceptionType.NOT_FOUND,
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
            "days": [day.model_dump() for day in data.days] if data.days else [],
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
                exception=ExceptionType.NOT_FOUND,
                message="Không tìm thấy lộ trình"
            )
        
        if str(roadmap.get("user_id")) != user_id:
            raise CustomException(
                exception=ExceptionType.FORBIDDEN,
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
        if data.days is not None:
            update_data["days"] = [day.model_dump() for day in data.days]
            
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
                exception=ExceptionType.NOT_FOUND,
                message="Không tìm thấy lộ trình"
            )
        
        # Check permission
        if not is_admin and str(roadmap.get("user_id")) != user_id:
            raise CustomException(
                exception=ExceptionType.FORBIDDEN,
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
                exception=ExceptionType.NOT_FOUND,
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

    async def generate_ai_roadmap(self, data: RoadmapGenerateRequest) -> Dict:
        """Generate a roadmap using AI Assistant (Gemini)"""
        ai_agent = AIAgent()
        
        prompt = f"""
        Prompt: Đóng vai một chuyên gia du lịch. Lên một lịch trình TỐT NHẤT dựa vào:
        - Điểm đến: {data.location}
        - Số ngày: {data.duration_days} ngày
        - Sở thích: {data.interests}
        
        YÊU CẦU: 
        1. TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON (KHÔNG GÁN THÊM MARKDOWN HAY TEXT BÊN NGOÀI).
        2. Mỗi ngày chỉ cần 3-4 địa điểm tiêu biểu nhất để lịch trình không quá dài.
        
        Cấu trúc JSON bắt buộc:
        {{
            "title": "Tên hấp dẫn (VD: Vi vu Đà Nẵng 3N2Đ)",
            "duration": "VD: 3 Ngày 2 Đêm",
            "days": [
                {{
                    "day": 1,
                    "title": "Tiêu đề ngày",
                    "waypoints": [
                        {{
                            "location": {{
                                "name": "Tên địa điểm",
                                "address": "Khu vực",
                                "lat": 16.0,
                                "lng": 108.0
                            }},
                            "time": "08:00",
                            "description": "Mô tả ngắn gọn 1 câu.",
                            "activity_type": "Tham quan"
                        }}
                    ]
                }}
            ]
        }}
        """
        
        try:
            response_text = ai_agent.get_response(user_message=prompt)
            # Clean up the response in case Gemini includes markdown blocks
            clean_json = response_text.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            clean_json = clean_json.strip()
                
            generated_data = json.loads(clean_json)
            return generated_data
        except json.JSONDecodeError as e:
            print(f"Error decoding AI response: {e}")
            print(f"Raw response: {response_text}")
            raise CustomException(
                exception=ExceptionType.BAD_REQUEST_FORMAT_MISMATCH,
                message="AI trả về dữ liệu bị lỗi định dạng. Vui lòng thử lại lần nữa."
            )
        except Exception as e:
            print(f"Generate Roadmap Error: {e}")
            raise CustomException(
                exception=ExceptionType.INTERNAL_SERVER_ERROR,
                message="Có lỗi xảy ra khi tạo lộ trình tự động. Vui lòng thử lại sau."
            )
