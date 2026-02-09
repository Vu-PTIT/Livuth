"""
CheckIn Service - Business logic for check-in operations
"""
from typing import Optional, Tuple, List, Dict, Any
from bson import ObjectId
from datetime import datetime
from backend.core.database import Database
from backend.models.mongo_checkin import CheckInMongo
from backend.schemas.sche_checkin import CheckInCreateRequest, CheckInResponse


class CheckInService:
    """Service for check-in operations"""
    
    def __init__(self):
        self.db = None
        self.collection = None
        self.events_collection = None
        self.users_collection = None
    
    async def _get_collection(self):
        if self.collection is None:
            self.db = Database.get_database()
            self.collection = self.db["checkins"]
            self.events_collection = self.db["events"]
            self.users_collection = self.db["users"]
            
            # Create indexes
            await self.collection.create_index("user_id")
            await self.collection.create_index("event_id")
            await self.collection.create_index([("user_id", 1), ("event_id", 1)], unique=True)
            await self.collection.create_index("nft_object_id", unique=True)
            await self.collection.create_index("tx_digest", unique=True)
        return self.collection
    
    async def create_checkin(
        self,
        user_id: str,
        event_id: str,
        data: CheckInCreateRequest
    ) -> CheckInResponse:
        """Record a new check-in after NFT minting"""
        collection = await self._get_collection()
        
        # Check if already checked in
        existing = await collection.find_one({
            "user_id": ObjectId(user_id),
            "event_id": ObjectId(event_id)
        })
        if existing:
            raise ValueError("User has already checked in to this event")
        
        checkin = CheckInMongo(
            user_id=ObjectId(user_id),
            event_id=ObjectId(event_id),
            wallet_address=data.wallet_address,
            nft_object_id=data.nft_object_id,
            tx_digest=data.tx_digest,
        )
        
        result = await collection.insert_one(checkin.model_dump(by_alias=True))
        checkin.id = result.inserted_id
        
        # Populate and return
        return await self._populate_checkin(checkin.model_dump(by_alias=True))
    
    async def get_user_checkins(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[CheckInResponse], Dict[str, Any]]:
        """Get all check-ins for a user"""
        collection = await self._get_collection()
        
        skip = (page - 1) * page_size
        cursor = collection.find({"user_id": ObjectId(user_id)}).sort("checked_in_at", -1).skip(skip).limit(page_size)
        
        checkins = []
        async for doc in cursor:
            checkins.append(await self._populate_checkin(doc))
        
        total = await collection.count_documents({"user_id": ObjectId(user_id)})
        
        metadata = {
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": total > skip + len(checkins)
        }
        
        return checkins, metadata
    
    async def get_event_checkins(
        self,
        event_id: str,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[CheckInResponse], Dict[str, Any]]:
        """Get all check-ins for an event"""
        collection = await self._get_collection()
        
        skip = (page - 1) * page_size
        cursor = collection.find({"event_id": ObjectId(event_id)}).sort("checked_in_at", -1).skip(skip).limit(page_size)
        
        checkins = []
        async for doc in cursor:
            checkins.append(await self._populate_checkin(doc))
        
        total = await collection.count_documents({"event_id": ObjectId(event_id)})
        
        metadata = {
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": total > skip + len(checkins)
        }
        
        return checkins, metadata
    
    async def verify_checkin(self, user_id: str, event_id: str) -> Tuple[bool, Optional[CheckInResponse]]:
        """Check if a user has checked in to an event"""
        collection = await self._get_collection()
        
        doc = await collection.find_one({
            "user_id": ObjectId(user_id),
            "event_id": ObjectId(event_id)
        })
        
        if doc:
            return True, await self._populate_checkin(doc)
        return False, None
    
    async def _populate_checkin(self, doc: dict) -> CheckInResponse:
        """Populate check-in with event and user info"""
        # Get event info
        event = await self.events_collection.find_one({"_id": doc["event_id"]})
        event_name = event.get("name") if event else None
        event_image = event.get("media", [{}])[0].get("url") if event and event.get("media") else None
        
        # Get user info
        user = await self.users_collection.find_one({"_id": doc["user_id"]})
        user_name = user.get("full_name") or user.get("username") if user else None
        
        return CheckInResponse(
            id=str(doc["_id"]),
            user_id=str(doc["user_id"]),
            event_id=str(doc["event_id"]),
            wallet_address=doc["wallet_address"],
            nft_object_id=doc["nft_object_id"],
            tx_digest=doc["tx_digest"],
            checked_in_at=doc["checked_in_at"],
            created_at=doc["created_at"],
            event_name=event_name,
            event_image=event_image,
            user_name=user_name,
        )
