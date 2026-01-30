"""
User Service for MongoDB
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.core.database import db
from backend.models.mongo_user import UserMongo
from backend.schemas.sche_user import UserCreateRequest, UserUpdateRequest, UserBaseResponse
from backend.core.security import get_password_hash, verify_password, decode_jwt
from backend.utils.exception_handler import CustomException, ExceptionType
from backend.schemas.sche_auth import TokenRequest
from backend.core.config import keycloak_openid, settings
from google.oauth2 import id_token
from google.auth.transport import requests


class UserMongoService:
    """User Service for MongoDB operations"""
    
    def __init__(self):
        self.collection_name = "users"
    
    def get_collection(self):
        """Get users collection"""
        return db.get_collection(self.collection_name)
    
    async def get_all(self) -> tuple[List[UserBaseResponse], Dict[str, Any]]:
        """Get all users"""
        collection = self.get_collection()
        cursor = collection.find({})
        users = await cursor.to_list(length=None)
        
        # Convert to response format
        user_responses = []
        for user in users:
            user["id"] = str(user["_id"])
            user_responses.append(UserBaseResponse(**user))
        
        metadata = {
            "total": len(users),
            "page": 1,
            "page_size": len(users)
        }
        return user_responses, metadata
    
    async def get_by_id(self, user_id: str) -> Optional[UserBaseResponse]:
        """Get user by ID"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(user_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        user = await collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        user["id"] = str(user["_id"])
        return UserBaseResponse(**user)
    
    async def get_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username (returns raw dict for authentication)"""
        collection = self.get_collection()
        user = await collection.find_one({"username": username})
        return user
    
    async def get_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email"""
        collection = self.get_collection()
        user = await collection.find_one({"email": email})
        return user
    
    async def create(self, data: UserCreateRequest) -> UserBaseResponse:
        """Create new user"""
        collection = self.get_collection()
        
        # Check if user exists
        existing_user = await collection.find_one({
            "$or": [
                {"username": data.username},
                {"email": data.email}
            ]
        })
        
        if existing_user:
            raise CustomException(exception=ExceptionType.CONFLICT)
        
        # Hash password if provided
        hashed_password = get_password_hash(data.password) if data.password else None
        
        # Prepare user document
        user_dict = data.model_dump(exclude={"password"})
        user_dict["hashed_password"] = hashed_password
        user_dict["created_at"] = datetime.now().timestamp()
        user_dict["updated_at"] = datetime.now().timestamp()
        
        # Insert user
        result = await collection.insert_one(user_dict)
        
        # Get created user
        created_user = await collection.find_one({"_id": result.inserted_id})
        created_user["id"] = str(created_user["_id"])
        
        return UserBaseResponse(**created_user)
    
    async def update_by_id(self, user_id: str, data: UserUpdateRequest) -> UserBaseResponse:
        """Update user by ID"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(user_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        # Prepare update data
        update_dict = data.model_dump(exclude_unset=True)
        
        # Hash password if provided
        if "password" in update_dict and update_dict["password"]:
            update_dict["hashed_password"] = get_password_hash(update_dict["password"])
            del update_dict["password"]
        
        update_dict["updated_at"] = datetime.now().timestamp()
        
        # Update user
        result = await collection.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": update_dict},
            return_document=True
        )
        
        if not result:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        result["id"] = str(result["_id"])
        return UserBaseResponse(**result)
    
    async def delete_by_id(self, user_id: str) -> bool:
        """Delete user by ID"""
        collection = self.get_collection()
        
        if not ObjectId.is_valid(user_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        result = await collection.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count == 0:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        return True
    
    async def update_last_login(self, user_id: str):
        """Update user's last login timestamp"""
        collection = self.get_collection()
        await collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"last_login": datetime.now().timestamp()}}
        )
    
    async def get_pending_upgrades(self) -> List[UserBaseResponse]:
        """Get all users with pending role upgrade requests"""
        collection = self.get_collection()
        cursor = collection.find({"pending_role_upgrade": {"$ne": None}})
        users = await cursor.to_list(length=None)
        
        user_responses = []
        for user in users:
            user["id"] = str(user["_id"])
            user_responses.append(UserBaseResponse(**user))
        
        return user_responses
    
    @staticmethod
    async def get_me(access_token: str) -> UserBaseResponse:
        """Get current user from token (supports Keycloak, Google, and JWT)"""
        try:
            # Try Keycloak
            if keycloak_openid:
                try:
                    user_info = keycloak_openid.userinfo(access_token)
                    if user_info:
                        return UserBaseResponse(
                            id="",
                            username=user_info["preferred_username"],
                            email=user_info.get("email", ""),
                            full_name=user_info.get("name"),
                            roles=[]
                        )
                except:
                    pass
            
            # Try Google
            try:
                user_info = id_token.verify_oauth2_token(
                    access_token,
                    requests.Request(),
                    settings.GOOGLE_CLIENT_ID,
                )
                if user_info:
                    return UserBaseResponse(
                        id="",
                        username=user_info["sub"],
                        email=user_info.get("email", ""),
                        full_name=user_info.get("name"),
                        roles=[]
                    )
            except:
                pass
            
            # Try JWT
            payload = decode_jwt(access_token)
            if not payload:
                raise CustomException(exception=ExceptionType.UNAUTHORIZED)
            
            token_data = TokenRequest(**payload)
            user_service = UserMongoService()
            user = await user_service.get_by_id(token_data.sub)
            
            if not user:
                raise CustomException(exception=ExceptionType.UNAUTHORIZED)
            
            return user
            
        except Exception as e:
            raise CustomException(exception=ExceptionType.UNAUTHORIZED)

    async def follow_user(self, current_user_id: str, target_user_id: str) -> bool:
        """Follow a user"""
        if current_user_id == target_user_id:
            raise CustomException(status_code=400, message="Cannot follow yourself", data=None)
            
        collection = self.get_collection()
        target_oid = ObjectId(target_user_id)
        current_oid = ObjectId(current_user_id)
        
        # Check if target user exists
        target_user = await collection.find_one({"_id": target_oid})
        if not target_user:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
            
        # Check if already following
        current_user = await collection.find_one({"_id": current_oid})
        if target_oid in current_user.get("following", []):
            return False  # Already following
            
        # Update current user's following list
        await collection.update_one(
            {"_id": current_oid},
            {
                "$addToSet": {"following": target_oid},
                "$inc": {"following_count": 1}
            }
        )
        
        # Update target user's followers list
        await collection.update_one(
            {"_id": target_oid},
            {
                "$addToSet": {"followers": current_oid},
                "$inc": {"followers_count": 1}
            }
        )
        
        return True

    async def unfollow_user(self, current_user_id: str, target_user_id: str) -> bool:
        """Unfollow a user"""
        collection = self.get_collection()
        target_oid = ObjectId(target_user_id)
        current_oid = ObjectId(current_user_id)
        
        # Check if already following
        current_user = await collection.find_one({"_id": current_oid})
        if target_oid not in current_user.get("following", []):
            return False  # Not following
            
        # Update current user's following list
        await collection.update_one(
            {"_id": current_oid},
            {
                "$pull": {"following": target_oid},
                "$inc": {"following_count": -1}
            }
        )
        
        # Update target user's followers list
        await collection.update_one(
            {"_id": target_oid},
            {
                "$pull": {"followers": current_oid},
                "$inc": {"followers_count": -1}
            }
        )
        
        return True

    async def get_followers(self, user_id: str, page: int = 1, page_size: int = 20):
        """Get user's followers"""
        collection = self.get_collection()
        if not ObjectId.is_valid(user_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
            
        user = await collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
            
        follower_ids = user.get("followers", [])
        total = len(follower_ids)
        
        # Pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_ids = follower_ids[start:end]
        
        # Fetch user details
        followers = await collection.find({"_id": {"$in": paginated_ids}}).to_list(length=None)
        
        return [UserBaseResponse(**f, id=str(f["_id"])) for f in followers], total

    async def get_following(self, user_id: str, page: int = 1, page_size: int = 20):
        """Get user's following list"""
        collection = self.get_collection()
        if not ObjectId.is_valid(user_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
            
        user = await collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
            
        following_ids = user.get("following", [])
        total = len(following_ids)
        
        # Pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_ids = following_ids[start:end]
        
        # Fetch user details
        following = await collection.find({"_id": {"$in": paginated_ids}}).to_list(length=None)
        
        return [UserBaseResponse(**f, id=str(f["_id"])) for f in following], total

    async def is_following(self, current_user_id: str, target_user_id: str) -> bool:
        """Check if current user follows target user"""
        collection = self.get_collection()
        current_user = await collection.find_one({"_id": ObjectId(current_user_id)})
        if not current_user:
            return False
            
        return ObjectId(target_user_id) in current_user.get("following", [])
