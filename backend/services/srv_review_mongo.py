"""
Review Service for MongoDB
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.core.database import db
from backend.models.mongo_review import ReviewMongo
from backend.schemas.sche_review import ReviewCreateRequest, ReviewUpdateRequest
from backend.utils.exception_handler import CustomException, ExceptionType


class ReviewMongoService:
    """Review Service for MongoDB operations"""
    
    def __init__(self):
        self.collection_name = "reviews"
    
    def get_collection(self):
        """Get reviews collection"""
        return db.get_collection(self.collection_name)
    
    async def get_event_reviews(self, event_id: str, limit: int = 50) -> Dict[str, Any]:
        """
        Get all reviews for an event with statistics
        
        Returns:
            Dict containing reviews list and statistics
        """
        collection = self.get_collection()
        
        # Get reviews sorted by newest first
        cursor = collection.find(
            {"event_id": ObjectId(event_id)}
        ).sort("created_at", -1).limit(limit)
        
        reviews = []
        rating_sum = 0
        rating_distribution = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
        
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            doc["event_id"] = str(doc.get("event_id", ""))
            doc["user_id"] = str(doc.get("user_id", ""))
            reviews.append(doc)
            
            rating = doc.get("rating", 0)
            rating_sum += rating
            rating_distribution[str(rating)] = rating_distribution.get(str(rating), 0) + 1
        
        total_reviews = len(reviews)
        average_rating = round(rating_sum / total_reviews, 1) if total_reviews > 0 else 0.0
        
        return {
            "stats": {
                "average_rating": average_rating,
                "total_reviews": total_reviews,
                "rating_distribution": rating_distribution
            },
            "reviews": reviews
        }
    
    async def get_user_review_for_event(self, event_id: str, user_id: str) -> Optional[Dict]:
        """Check if user has already reviewed this event"""
        collection = self.get_collection()
        
        doc = await collection.find_one({
            "event_id": ObjectId(event_id),
            "user_id": ObjectId(user_id)
        })
        
        if doc:
            doc["id"] = str(doc.pop("_id"))
            doc["event_id"] = str(doc.get("event_id", ""))
            doc["user_id"] = str(doc.get("user_id", ""))
            return doc
        return None
    
    async def _update_event_stats(self, event_id: str):
        """Recalculate and update average rating and review count for an event"""
        stats = await self.get_event_average_rating(event_id)
        
        event_collection = db.get_collection("events")
        await event_collection.update_one(
            {"_id": ObjectId(event_id)},
            {"$set": {
                "average_rating": stats["average_rating"],
                "review_count": stats["total_reviews"],
                "updated_at": datetime.now().timestamp()
            }}
        )

    async def create_review(
        self, 
        event_id: str, 
        user_id: str, 
        user_name: str,
        user_avatar: Optional[str],
        data: ReviewCreateRequest
    ) -> Dict:
        """Create a new review"""
        collection = self.get_collection()
        
        # Validate event exists
        event_collection = db.get_collection("events")
        event = await event_collection.find_one({"_id": ObjectId(event_id)})
        if not event:
            raise CustomException(
                exception_type=ExceptionType.NOT_FOUND,
                message="Sự kiện không tồn tại"
            )

        # Check if user already reviewed this event
        existing = await self.get_user_review_for_event(event_id, user_id)
        if existing:
            raise CustomException(
                exception_type=ExceptionType.DUPLICATE_ENTRY,
                message="Bạn đã đánh giá sự kiện này rồi"
            )
        
        # Create review document
        review_doc = {
            "event_id": ObjectId(event_id),
            "user_id": ObjectId(user_id),
            "rating": data.rating,
            "comment": data.comment,
            "user_name": user_name,
            "user_avatar": user_avatar,
            "created_at": datetime.now().timestamp(),
            "updated_at": datetime.now().timestamp()
        }
        
        result = await collection.insert_one(review_doc)
        review_doc["id"] = str(result.inserted_id)
        review_doc["event_id"] = event_id
        review_doc["user_id"] = user_id
        review_doc.pop("_id", None)
        
        # Update event stats
        await self._update_event_stats(event_id)
        
        return review_doc
    
    async def update_review(
        self, 
        review_id: str, 
        user_id: str,
        data: ReviewUpdateRequest
    ) -> Dict:
        """Update an existing review (only owner can update)"""
        collection = self.get_collection()
        
        # Find and verify ownership
        review = await collection.find_one({"_id": ObjectId(review_id)})
        if not review:
            raise CustomException(
                exception_type=ExceptionType.NOT_FOUND,
                message="Không tìm thấy đánh giá"
            )
        
        if str(review.get("user_id")) != user_id:
            raise CustomException(
                exception_type=ExceptionType.FORBIDDEN,
                message="Bạn không có quyền sửa đánh giá này"
            )
        
        # Update fields
        update_data = {"updated_at": datetime.now().timestamp()}
        if data.rating is not None:
            update_data["rating"] = data.rating
        if data.comment is not None:
            update_data["comment"] = data.comment
        
        await collection.update_one(
            {"_id": ObjectId(review_id)},
            {"$set": update_data}
        )
        
        # Update event stats if rating changed
        if data.rating is not None:
            event_id = str(review.get("event_id"))
            await self._update_event_stats(event_id)
        
        # Return updated review
        updated = await collection.find_one({"_id": ObjectId(review_id)})
        updated["id"] = str(updated.pop("_id"))
        updated["event_id"] = str(updated.get("event_id", ""))
        updated["user_id"] = str(updated.get("user_id", ""))
        
        return updated
    
    async def delete_review(self, review_id: str, user_id: str, is_admin: bool = False) -> bool:
        """Delete a review (owner or admin)"""
        collection = self.get_collection()
        
        review = await collection.find_one({"_id": ObjectId(review_id)})
        if not review:
            raise CustomException(
                exception_type=ExceptionType.NOT_FOUND,
                message="Không tìm thấy đánh giá"
            )
        
        # Check permission
        if not is_admin and str(review.get("user_id")) != user_id:
            raise CustomException(
                exception_type=ExceptionType.FORBIDDEN,
                message="Bạn không có quyền xóa đánh giá này"
            )
        
        event_id = str(review.get("event_id"))
        await collection.delete_one({"_id": ObjectId(review_id)})
        
        # Update event stats
        await self._update_event_stats(event_id)
        
        return True
    
    async def get_event_average_rating(self, event_id: str) -> Dict[str, Any]:
        """Get just the average rating for an event (for event cards)"""
        collection = self.get_collection()
        
        pipeline = [
            {"$match": {"event_id": ObjectId(event_id)}},
            {"$group": {
                "_id": None,
                "average_rating": {"$avg": "$rating"},
                "total_reviews": {"$sum": 1}
            }}
        ]
        
        result = await collection.aggregate(pipeline).to_list(1)
        
        if result:
            return {
                "average_rating": round(result[0]["average_rating"], 1),
                "total_reviews": result[0]["total_reviews"]
            }
        
        return {"average_rating": 0.0, "total_reviews": 0}
