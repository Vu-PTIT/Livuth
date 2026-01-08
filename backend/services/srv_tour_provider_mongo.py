"""
Tour Provider Listing Service for MongoDB
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.core.database import db
from backend.models.mongo_tour_provider import TourProviderListing
from backend.schemas.sche_tour_provider import (
    TourProviderListingCreateRequest,
    TourProviderListingUpdateRequest,
    TourProviderListingResponse
)
from backend.utils.exception_handler import CustomException, ExceptionType


class TourProviderService:
    """Tour Provider Listing Service for MongoDB operations"""
    
    def __init__(self):
        self.collection_name = "tour_provider_listings"
    
    def get_collection(self):
        """Get tour provider listings collection"""
        return db.get_collection(self.collection_name)
    
    async def create(self, data: TourProviderListingCreateRequest, provider_id: str) -> TourProviderListingResponse:
        """Create new tour provider listing"""
        collection = self.get_collection()
        
        # Prepare listing document
        listing_dict = data.model_dump()
        listing_dict["provider_id"] = ObjectId(provider_id)
        listing_dict["event_id"] = ObjectId(data.event_id)
        listing_dict["status"] = "pending"
        listing_dict["verification_status"] = "unverified"
        listing_dict["view_count"] = 0
        listing_dict["created_at"] = datetime.now().timestamp()
        listing_dict["updated_at"] = datetime.now().timestamp()
        
        # Insert listing
        result = await collection.insert_one(listing_dict)
        
        # Get created listing
        created_listing = await collection.find_one({"_id": result.inserted_id})
        created_listing["id"] = str(created_listing["_id"])
        created_listing["provider_id"] = str(created_listing["provider_id"])
        created_listing["event_id"] = str(created_listing["event_id"])
        
        return TourProviderListingResponse(**created_listing)
    
    async def get_by_id(self, listing_id: str, increment_view: bool = False) -> Optional[TourProviderListingResponse]:
        """Get listing by ID"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(listing_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        # Increment view count if requested
        if increment_view:
            await collection.update_one(
                {"_id": ObjectId(listing_id)},
                {"$inc": {"view_count": 1}}
            )
        
        listing = await collection.find_one({"_id": ObjectId(listing_id)})
        
        if not listing:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        listing["id"] = str(listing["_id"])
        listing["provider_id"] = str(listing["provider_id"])
        listing["event_id"] = str(listing["event_id"])
        
        return TourProviderListingResponse(**listing)
    
    async def update_by_id(
        self, 
        listing_id: str, 
        data: TourProviderListingUpdateRequest,
        provider_id: str
    ) -> TourProviderListingResponse:
        """Update listing by ID (only by owner)"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(listing_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        # Check ownership
        listing = await collection.find_one({"_id": ObjectId(listing_id)})
        if not listing:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        # Robust ownership check
        if str(listing["provider_id"]) != provider_id:
            raise CustomException(exception=ExceptionType.FORBIDDEN)
        
        # Prepare update data
        update_dict = data.model_dump(exclude_unset=True)
        update_dict["updated_at"] = datetime.now().timestamp()
        
        # Update listing
        result = await collection.find_one_and_update(
            {"_id": ObjectId(listing_id)},
            {"$set": update_dict},
            return_document=True
        )
        
        result["id"] = str(result["_id"])
        result["provider_id"] = str(result["provider_id"])
        result["event_id"] = str(result["event_id"])
        
        return TourProviderListingResponse(**result)
    
    async def delete_by_id(self, listing_id: str, provider_id: str) -> bool:
        """Delete listing by ID (only by owner)"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(listing_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        # Check ownership
        listing = await collection.find_one({"_id": ObjectId(listing_id)})
        if not listing:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        # Robust ownership check
        if str(listing["provider_id"]) != provider_id:
            raise CustomException(exception=ExceptionType.FORBIDDEN)
        
        result = await collection.delete_one({"_id": ObjectId(listing_id)})
        
        if result.deleted_count == 0:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        return True
    
    async def toggle_visibility(self, listing_id: str, provider_id: str, is_visible: bool) -> TourProviderListingResponse:
        """Toggle listing visibility (only by owner)"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(listing_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        # Check ownership
        listing = await collection.find_one({"_id": ObjectId(listing_id)})
        if not listing:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        if str(listing["provider_id"]) != provider_id:
            raise CustomException(exception=ExceptionType.FORBIDDEN)
        
        result = await collection.find_one_and_update(
            {"_id": ObjectId(listing_id)},
            {"$set": {"is_visible": is_visible, "updated_at": datetime.now().timestamp()}},
            return_document=True
        )
        
        result["id"] = str(result["_id"])
        result["provider_id"] = str(result["provider_id"])
        result["event_id"] = str(result["event_id"])
        
        return TourProviderListingResponse(**result)
    
    async def get_by_event(self, event_id: str, approved_only: bool = True) -> tuple[List[TourProviderListingResponse], Dict[str, Any]]:
        """Get all listings for an event"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(event_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        query = {"event_id": ObjectId(event_id)}
        if approved_only:
            query["status"] = "approved"
            # Only show visible listings (or those without is_visible field for backwards compatibility)
            query["$or"] = [{"is_visible": True}, {"is_visible": {"$exists": False}}]
        
        cursor = collection.find(query).sort([("verification_status", -1), ("created_at", -1)])  # Verified first, then newest
        listings = await cursor.to_list(length=None)
        
        # Convert to response format
        listing_responses = []
        for listing in listings:
            listing["id"] = str(listing["_id"])
            listing["provider_id"] = str(listing["provider_id"])
            listing["event_id"] = str(listing["event_id"])
            
            # Fetch event name
            try:
                event = await db.get_collection("events").find_one({"_id": ObjectId(listing["event_id"])})
                if event:
                    listing["event_name"] = event.get("name")
            except:
                pass
                
            listing_responses.append(TourProviderListingResponse(**listing))
        
        metadata = {
            "total": len(listings),
            "page": 1,
            "page_size": len(listings),
            "event_id": event_id
        }
        
        return listing_responses, metadata
    
    async def get_my_listings(self, provider_id: str) -> tuple[List[TourProviderListingResponse], Dict[str, Any]]:
        """Get all listings by provider (any status)"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(provider_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        # Robust query for provider_id (can be string or ObjectId)
        query = {
            "$or": [
                {"provider_id": ObjectId(provider_id)},
                {"provider_id": provider_id}
            ]
        }
        
        cursor = collection.find(query).sort("created_at", -1)
        listings = await cursor.to_list(length=None)
        
        # Convert to response format
        listing_responses = []
        for listing in listings:
            listing["id"] = str(listing["_id"])
            listing["provider_id"] = str(listing["provider_id"])
            listing["event_id"] = str(listing["event_id"])
            
            # Fetch event name
            try:
                event = await db.get_collection("events").find_one({"_id": ObjectId(listing["event_id"])})
                if event:
                    listing["event_name"] = event.get("name")
            except:
                pass
                
            listing_responses.append(TourProviderListingResponse(**listing))
        
        # Calculate stats
        total_views = sum(l.view_count for l in listing_responses)
        
        metadata = {
            "total": len(listings),
            "page": 1,
            "page_size": len(listings),
            "provider_id": provider_id,
            "total_views": total_views,
            "pending": len([l for l in listing_responses if l.status == "pending"]),
            "approved": len([l for l in listing_responses if l.status == "approved"]),
            "rejected": len([l for l in listing_responses if l.status == "rejected"])
        }
        
        return listing_responses, metadata
    
    async def search_listings(
        self, 
        query: Optional[str] = None,
        event_id: Optional[str] = None,
        limit: int = 20
    ) -> tuple[List[TourProviderListingResponse], Dict[str, Any]]:
        """Search approved listings"""
        collection = self.get_collection()
        
        # Build filter
        filter_dict = {"status": "approved"}
        
        if event_id:
            if not ObjectId.is_valid(event_id):
                raise CustomException(exception=ExceptionType.NOT_FOUND)
            filter_dict["event_id"] = ObjectId(event_id)
        
        if query:
            filter_dict["$or"] = [
                {"company_name": {"$regex": query, "$options": "i"}},
                {"service_name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
            ]
        
        cursor = collection.find(filter_dict).limit(limit)
        listings = await cursor.to_list(length=None)
        
        # Convert to response format
        listing_responses = []
        for listing in listings:
            listing["id"] = str(listing["_id"])
            listing["provider_id"] = str(listing["provider_id"])
            listing["event_id"] = str(listing["event_id"])
            listing_responses.append(TourProviderListingResponse(**listing))
        
        metadata = {
            "total": len(listings),
            "page": 1,
            "page_size": len(listings),
            "query": query,
            "event_id": event_id,
            "limit": limit
        }
        
        return listing_responses, metadata
    
    # Admin methods
    
    async def get_pending_listings(self) -> tuple[List[TourProviderListingResponse], Dict[str, Any]]:
        """Get all pending listings (admin review queue)"""
        collection = self.get_collection()
        
        cursor = collection.find({"status": "pending"}).sort("created_at", -1)  # Newest first
        listings = await cursor.to_list(length=None)
        
        # Convert to response format
        listing_responses = []
        for listing in listings:
            listing["id"] = str(listing["_id"])
            listing["provider_id"] = str(listing["provider_id"])
            listing["event_id"] = str(listing["event_id"])
            
            # Fetch event name
            try:
                event = await db.get_collection("events").find_one({"_id": ObjectId(listing["event_id"])})
                if event:
                    listing["event_name"] = event.get("name")
            except:
                pass
                
            listing_responses.append(TourProviderListingResponse(**listing))
        
        metadata = {
            "total": len(listings),
            "page": 1,
            "page_size": len(listings),
            "status": "pending"
        }
        
        return listing_responses, metadata
    
    async def approve_listing(self, listing_id: str) -> TourProviderListingResponse:
        """Approve a listing (admin only)"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(listing_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        result = await collection.find_one_and_update(
            {"_id": ObjectId(listing_id)},
            {
                "$set": {
                    "status": "approved",
                    "rejection_reason": None,
                    "updated_at": datetime.now().timestamp()
                }
            },
            return_document=True
        )
        
        if not result:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        result["id"] = str(result["_id"])
        result["provider_id"] = str(result["provider_id"])
        result["event_id"] = str(result["event_id"])
        
        return TourProviderListingResponse(**result)
    
    async def reject_listing(self, listing_id: str, reason: str) -> TourProviderListingResponse:
        """Reject a listing (admin only)"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(listing_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        result = await collection.find_one_and_update(
            {"_id": ObjectId(listing_id)},
            {
                "$set": {
                    "status": "rejected",
                    "rejection_reason": reason,
                    "updated_at": datetime.now().timestamp()
                }
            },
            return_document=True
        )
        
        if not result:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        result["id"] = str(result["_id"])
        result["provider_id"] = str(result["provider_id"])
        result["event_id"] = str(result["event_id"])
        
        return TourProviderListingResponse(**result)
    
    async def verify_provider(self, listing_id: str) -> TourProviderListingResponse:
        """Mark provider as verified (admin only)"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(listing_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        result = await collection.find_one_and_update(
            {"_id": ObjectId(listing_id)},
            {
                "$set": {
                    "verification_status": "verified",
                    "updated_at": datetime.now().timestamp()
                }
            },
            return_document=True
        )
        
        if not result:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        result["id"] = str(result["_id"])
        result["provider_id"] = str(result["provider_id"])
        result["event_id"] = str(result["event_id"])
        
        return TourProviderListingResponse(**result)
    
    async def get_all_listings(self, status: Optional[str] = None) -> tuple[List[TourProviderListingResponse], Dict[str, Any]]:
        """Get all listings (admin only)"""
        collection = self.get_collection()
        
        query = {}
        if status:
            query["status"] = status
        
        cursor = collection.find(query).sort("created_at", -1)
        listings = await cursor.to_list(length=None)
        
        # Convert to response format
        listing_responses = []
        for listing in listings:
            listing["id"] = str(listing["_id"])
            listing["provider_id"] = str(listing["provider_id"])
            listing["event_id"] = str(listing["event_id"])
            listing_responses.append(TourProviderListingResponse(**listing))
        
        metadata = {
            "total": len(listings),
            "page": 1,
            "page_size": len(listings),
            "status_filter": status
        }
        
        return listing_responses, metadata
    
    async def create_indexes(self):
        """Create indexes for efficient queries"""
        collection = self.get_collection()
        
        try:
            # Index for getting listings by event
            await collection.create_index("event_id")
            
            # Index for getting listings by provider
            await collection.create_index("provider_id")
            
            # Index for filtering by status
            await collection.create_index("status")
            
            # Compound index for approved listings by event
            await collection.create_index([("event_id", 1), ("status", 1)])
            
            # Text index for search
            await collection.create_index([
                ("company_name", "text"),
                ("service_name", "text"),
                ("description", "text")
            ])
            
            print("✅ Tour provider listing indexes created successfully!")
        except Exception as e:
            print(f"⚠️ Error creating indexes: {e}")
