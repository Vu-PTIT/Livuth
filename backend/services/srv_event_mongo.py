"""
Event Service for MongoDB
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.core.database import db
from backend.models.mongo_event import EventMongo
from backend.schemas.sche_event import EventCreateRequest, EventUpdateRequest, EventBaseResponse
from backend.utils.exception_handler import CustomException, ExceptionType
from backend.utils.recommendation import rank_events_by_relevance
from backend.utils.geo_utils import calculate_distance


class EventMongoService:
    """Event Service for MongoDB operations"""
    
    def __init__(self):
        self.collection_name = "events"
    
    def get_collection(self):
        """Get events collection"""
        return db.get_collection(self.collection_name)
    
    async def get_all(self, page: int = 1, page_size: int = 20, include_hidden: bool = False, user_id: Optional[str] = None) -> tuple[List[EventBaseResponse], Dict[str, Any]]:
        """Get all events with pagination"""
        collection = self.get_collection()
        
        # Filter by visibility (only show visible events unless include_hidden)
        filter_dict = {} if include_hidden else {"$or": [{"is_visible": True}, {"is_visible": {"$exists": False}}]}
        
        # Count total
        total = await collection.count_documents(filter_dict)
        
        # Sort by newest first
        cursor = collection.find(filter_dict).sort("created_at", -1)
        
        # Pagination
        skip = (page - 1) * page_size
        cursor = cursor.skip(skip).limit(page_size)
        
        events = await cursor.to_list(length=None)
        
        
        # Convert to response format
        event_responses = []
        for event in events:
            event["id"] = str(event["_id"])
            # Convert creator_id to string if present
            if event.get("creator_id"):
                event["creator_id"] = str(event["creator_id"])
            # Sanitize list fields
            for field in ["categories", "tags", "media"]:
                if event.get(field) is None:
                    event[field] = []
            # Add participant count (now directly from event document)
            if "participant_count" not in event:
                event["participant_count"] = 0
            

            # Check if user liked the event
            event["is_liked"] = False
            if user_id and event.get("likes"):
                event["is_liked"] = ObjectId(user_id) in event["likes"]
            
            try:
                event_responses.append(EventBaseResponse(**event))
            except Exception as e:
                print(f"Skipping invalid event {event.get('id')}: {e}")
                continue
        
        metadata = {
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": total > (page * page_size)
        }
        return event_responses, metadata
    
    async def get_by_id(self, event_id: str, include_tours: bool = False, user_id: Optional[str] = None) -> Optional[EventBaseResponse]:
        """Get event by ID"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(event_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        event = await collection.find_one({"_id": ObjectId(event_id)})
        
        if not event:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        event["id"] = str(event["_id"])
        if event.get("creator_id"):
            event["creator_id"] = str(event["creator_id"])
        

        # Check if user liked the event
        event["is_liked"] = False
        if user_id and event.get("likes"):
            event["is_liked"] = ObjectId(user_id) in event["likes"]
        
        # Optionally populate tour providers
        if include_tours:
            from backend.services.srv_tour_provider_mongo import TourProviderService
            tour_service = TourProviderService()
            try:
                tours, _ = await tour_service.get_by_event(event_id, approved_only=True)
                event["tour_providers"] = [tour.model_dump() for tour in tours]
            except:
                event["tour_providers"] = []
        
        return EventBaseResponse(**event)
    
    async def create(self, data: EventCreateRequest, creator_id: str = None) -> EventBaseResponse:
        """Create new event"""
        collection = self.get_collection()
        
        # Prepare event document
        event_dict = data.model_dump()
        
        # Add creator_id if provided
        if creator_id and ObjectId.is_valid(creator_id):
            event_dict["creator_id"] = ObjectId(creator_id)
        
        event_dict["created_at"] = datetime.now().timestamp()
        event_dict["updated_at"] = datetime.now().timestamp()
        
        # Insert event
        result = await collection.insert_one(event_dict)
        
        # Get created event
        created_event = await collection.find_one({"_id": result.inserted_id})
        created_event["id"] = str(created_event["_id"])
        
        # Convert creator_id to string if present
        if created_event.get("creator_id"):
            created_event["creator_id"] = str(created_event["creator_id"])
        
        # Sanitize list fields
        for field in ["categories", "tags", "media"]:
            if created_event.get(field) is None:
                created_event[field] = []
        
        return EventBaseResponse(**created_event)
    
    async def update_by_id(self, event_id: str, data: EventUpdateRequest) -> EventBaseResponse:
        """Update event by ID"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(event_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        # Prepare update data
        update_dict = data.model_dump(exclude_unset=True)
        update_dict["updated_at"] = datetime.now().timestamp()
        
        # Update event
        result = await collection.find_one_and_update(
            {"_id": ObjectId(event_id)},
            {"$set": update_dict},
            return_document=True
        )
        
        if not result:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        result["id"] = str(result["_id"])
        if result.get("creator_id"):
            result["creator_id"] = str(result["creator_id"])
        return EventBaseResponse(**result)
    
    async def delete_by_id(self, event_id: str) -> bool:
        """Delete event by ID"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(event_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        result = await collection.delete_one({"_id": ObjectId(event_id)})
        
        if result.deleted_count == 0:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        return True
    
    async def toggle_like(self, event_id: str, user_id: str) -> EventBaseResponse:
        """Toggle like status for an event"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(event_id) or not ObjectId.is_valid(user_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
            
        event = await collection.find_one({"_id": ObjectId(event_id)})
        if not event:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
            
        user_oid = ObjectId(user_id)
        likes = event.get("likes", [])
        
        if user_oid in likes:
            # Unlike
            update_op = {
                "$pull": {"likes": user_oid},
                "$inc": {"like_count": -1}
            }
            action = "unliked"
        else:
            # Like
            update_op = {
                "$addToSet": {"likes": user_oid},
                "$inc": {"like_count": 1}
            }
            action = "liked"
            
        # Update event
        result = await collection.find_one_and_update(
            {"_id": ObjectId(event_id)},
            update_op,
            return_document=True
        )
        
        if not result:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
            
        # Format response
        result["id"] = str(result["_id"])
        if result.get("creator_id"):
            result["creator_id"] = str(result["creator_id"])
            
        # Set is_liked based on action
        result["is_liked"] = (action == "liked")
        
        # Sanitize list fields if needed
        for field in ["categories", "tags", "media"]:
            if result.get(field) is None:
                result[field] = []
                
        return EventBaseResponse(**result)
    
    async def toggle_visibility(self, event_id: str, is_visible: bool) -> EventBaseResponse:
        """Toggle event visibility"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(event_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        result = await collection.find_one_and_update(
            {"_id": ObjectId(event_id)},
            {"$set": {"is_visible": is_visible, "updated_at": datetime.now().timestamp()}},
            return_document=True
        )
        
        if not result:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        result["id"] = str(result["_id"])
        if result.get("creator_id"):
            result["creator_id"] = str(result["creator_id"])
        
        return EventBaseResponse(**result)
    
    async def get_by_creator(self, creator_id: str) -> tuple[List[EventBaseResponse], Dict[str, Any]]:
        """Get all events by creator (includes hidden)"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(creator_id):
            return [], {"total": 0, "page": 1, "page_size": 0}
        
        cursor = collection.find({"creator_id": ObjectId(creator_id)}).sort("created_at", -1)
        events = await cursor.to_list(length=None)
        
        event_responses = []
        for event in events:
            event["id"] = str(event["_id"])
            if event.get("creator_id"):
                event["creator_id"] = str(event["creator_id"])
            for field in ["categories", "tags", "media"]:
                if event.get(field) is None:
                    event[field] = []
            try:
                event_responses.append(EventBaseResponse(**event))
            except Exception:
                continue
        
        return event_responses, {"total": len(events), "page": 1, "page_size": len(events)}
    
    async def get_recommended_events(
        self, 
        user_hobbies: List[str], 
        limit: int = 10,
        include_score: bool = True,
        user_id: Optional[str] = None
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Get recommended events based on user's hobbies
        
        Args:
            user_hobbies: List of user's hobby strings
            limit: Maximum number of events to return
            include_score: Whether to include relevance score in response
            user_id: Optional user ID to check like status
        
        Returns:
            Tuple of (recommended events, metadata)
        """
        collection = self.get_collection()
        
        # Only get visible events (public listing)
        visibility_filter = {"$or": [{"is_visible": True}, {"is_visible": {"$exists": False}}]}
        cursor = collection.find(visibility_filter)
        events = await cursor.to_list(length=None)
        
        # Convert to dict format for recommendation algorithm
        events_dict = []
        for event in events:
            event["id"] = str(event["_id"])
            if event.get("creator_id"):
                event["creator_id"] = str(event["creator_id"])
            events_dict.append(event)
        
        # Rank events by relevance
        ranked_events = rank_events_by_relevance(events_dict, user_hobbies, include_score=include_score)
        
        # Filter out events with zero score and limit
        recommended = [e for e in ranked_events if e.get("relevance_score", 0) > 0][:limit]
        
        # Convert to response format
        event_responses = []
        event_responses = []
        for event in recommended:
            # Check if user liked the event
            event["is_liked"] = False
            if user_id and event.get("likes"):
                event["is_liked"] = ObjectId(user_id) in event["likes"]
                
            try:
                event_responses.append(EventBaseResponse(**event))
            except Exception:
                # Skip events that don't match schema
                continue
        
        metadata = {
            "total": len(recommended),
            "page": 1,
            "page_size": len(recommended),
            "limit": limit,
            "has_more": len(ranked_events) > limit
        }
        
        return event_responses, metadata
    
    async def get_nearby_events(
        self, 
        lat: float, 
        lng: float, 
        radius_km: float = 10.0,
        limit: int = 20,
        user_id: Optional[str] = None
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Get events within a specified radius from a location
        
        Args:
            lat: Latitude of center point
            lng: Longitude of center point
            radius_km: Search radius in kilometers
            limit: Maximum number of events to return
        
        Returns:
            Tuple of (nearby events with distance, metadata)
        """
        collection = self.get_collection()
        
        # Only get visible events with coordinates (public listing)
        visibility_filter = {"$and": [
            {"location.coordinates": {"$ne": None}},
            {"$or": [{"is_visible": True}, {"is_visible": {"$exists": False}}]}
        ]}
        cursor = collection.find(visibility_filter)
        events = await cursor.to_list(length=None)
        
        nearby_events = []
        for event in events:
            if event.get("location") and event["location"].get("coordinates"):
                coords = event["location"]["coordinates"].get("coordinates", [])
                if len(coords) == 2:
                    event_lng, event_lat = coords
                    distance = calculate_distance(lat, lng, event_lat, event_lng)
                    
                    if distance <= radius_km:
                        event["id"] = str(event["_id"])
                        # Convert creator_id to string if present
                        if event.get("creator_id"):
                            event["creator_id"] = str(event["creator_id"])
                        event["distance_km"] = round(distance, 2)
                        nearby_events.append(event)
        
        # Sort by distance
        nearby_events.sort(key=lambda x: x.get("distance_km", float('inf')))
        nearby_events = nearby_events[:limit]
        
        # Convert to response format
        event_responses = []
        event_responses = []
        for event in nearby_events:
            # Check if user liked the event
            event["is_liked"] = False
            if user_id and event.get("likes"):
                event["is_liked"] = ObjectId(user_id) in event["likes"]
                
            try:
                event_responses.append(EventBaseResponse(**event))
            except Exception:
                continue
        
        metadata = {
            "total": len(nearby_events),
            "page": 1,
            "page_size": len(nearby_events),
            "center": {"lat": lat, "lng": lng},
            "radius_km": radius_km,
            "limit": limit
        }
        
        return event_responses, metadata
    
    async def search_events(
        self,
        query: Optional[str] = None,
        city: Optional[str] = None,
        province: Optional[str] = None,
        categories: Optional[List[str]] = None,
        page: int = 1,
        page_size: int = 20,
        user_id: Optional[str] = None
    ) -> tuple[List[EventBaseResponse], Dict[str, Any]]:
        """
        Search and filter events with pagination
        
        Args:
            query: Text search query (searches in name, intro, history)
            city: Filter by city
            province: Filter by province
            categories: Filter by categories
            page: Page number
            page_size: Items per page
        
        Returns:
            Tuple of (filtered events, metadata)
        """
        collection = self.get_collection()
        
        # Build filter - always include visibility filter for public listing
        filter_dict = {"$or": [{"is_visible": True}, {"is_visible": {"$exists": False}}]}
        filter_conditions = [filter_dict]
        
        if query:
            # Text search on multiple fields
            filter_conditions.append({"$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"content.intro": {"$regex": query, "$options": "i"}},
                {"content.history": {"$regex": query, "$options": "i"}},
            ]})
        
        if city:
            filter_conditions.append({"location.city": {"$regex": city, "$options": "i"}})
        
        if province:
            filter_conditions.append({"location.province": {"$regex": province, "$options": "i"}})
        
        if categories:
            # Use case-insensitive regex matching for categories
            category_conditions = [
                {"categories": {"$regex": f"^{cat}$", "$options": "i"}}
                for cat in categories
            ]
            filter_conditions.append({"$or": category_conditions})
        
        # Combine all conditions with $and
        final_filter = {"$and": filter_conditions} if len(filter_conditions) > 1 else filter_conditions[0]
        
        # Count total
        total = await collection.count_documents(final_filter)
        
        # Pagination
        skip = (page - 1) * page_size
        
        # Execute query with sort
        cursor = collection.find(final_filter).sort("created_at", -1).skip(skip).limit(page_size)
        events = await cursor.to_list(length=None)
        
        # Convert to response format
        event_responses = []
        for event in events:
            event["id"] = str(event["_id"])
            if event.get("creator_id"):
                event["creator_id"] = str(event["creator_id"])
            # Sanitize list fields
            for field in ["categories", "tags", "media"]:
                if event.get(field) is None:
                    event[field] = []
            
            # Check if user liked the event
            event["is_liked"] = False
            if user_id and event.get("likes"):
                event["is_liked"] = ObjectId(user_id) in event["likes"]
            
            try:
                event_responses.append(EventBaseResponse(**event))
            except Exception as e:
                print(f"Skipping invalid event {event.get('id')}: {e}")
                continue
        
        metadata = {
            "total": total,
            "page": page,
            "page_size": page_size,
            "query": query,
            "filters": {
                "city": city,
                "province": province,
                "categories": categories
            },
            "has_more": total > (page * page_size)
        }
        
        return event_responses, metadata
    
    async def get_by_category(self, category: str, user_id: Optional[str] = None) -> tuple[List[EventBaseResponse], Dict[str, Any]]:
        """Get all events in a specific category"""
        collection = self.get_collection()
        
        # Only get visible events in category (public listing)
        filter_dict = {
            "$and": [
                {"categories": category},
                {"$or": [{"is_visible": True}, {"is_visible": {"$exists": False}}]}
            ]
        }
        cursor = collection.find(filter_dict)
        events = await cursor.to_list(length=None)
        
        # Convert to response format
        event_responses = []
        for event in events:
            event["id"] = str(event["_id"])
            if event.get("creator_id"):
                event["creator_id"] = str(event["creator_id"])
            # Sanitize list fields
            for field in ["categories", "tags", "media"]:
                if event.get(field) is None:
                    event[field] = []
            
            try:
                event_responses.append(EventBaseResponse(**event))
            except Exception as e:
                print(f"Skipping invalid event {event.get('id')}: {e}")
                continue
        
        metadata = {
            "total": len(events),
            "category": category
        }
        
        return event_responses, metadata
    
    async def create_geospatial_index(self):
        """Create geospatial and text indexes for efficient queries"""
        collection = self.get_collection()
        
        try:
            # Create 2dsphere index for geospatial queries
            await collection.create_index([("location.coordinates", "2dsphere")])
            
            # Create text index for search
            await collection.create_index([
                ("name", "text"),
                ("content.intro", "text"),
                ("content.history", "text")
            ])
            
            # Create indexes for filtering
            await collection.create_index("categories")
            await collection.create_index("location.city")
            await collection.create_index("location.province")
            
            print("✅ Geospatial and text indexes created successfully!")
        except Exception as e:
            print(f"⚠️ Error creating indexes: {e}")

    async def get_participant_count(self, event_id: str) -> int:
        """
        Count how many users have participated in this event
        by checking users' participated_events lists
        """
        users_collection = db.get_collection("users")
        
        count = await users_collection.count_documents({
            "participated_events": event_id
        })
        
        return count
    
    async def get_participant_counts(self, event_ids: List[str]) -> Dict[str, int]:
        """
        Get participant counts for multiple events (batch operation)
        Returns dict: {event_id: count}
        """
        users_collection = db.get_collection("users")
        
        # Use aggregation to count participants for each event
        pipeline = [
            {"$unwind": "$participated_events"},
            {"$match": {"participated_events": {"$in": event_ids}}},
            {"$group": {"_id": "$participated_events", "count": {"$sum": 1}}}
        ]
        
        cursor = users_collection.aggregate(pipeline)
        results = await cursor.to_list(length=None)
        
        # Build dict with all event_ids (default 0)
        counts = {eid: 0 for eid in event_ids}
        for r in results:
            counts[r["_id"]] = r["count"]
        
        return counts

