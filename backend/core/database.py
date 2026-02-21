"""
MongoDB Database Configuration
"""
from motor.motor_asyncio import AsyncIOMotorClient
from backend.core.config import settings

# Get MongoDB configuration from settings
MONGO_URI = settings.MONGO_URI
DB_NAME = settings.DB_NAME


class Database:
    client: AsyncIOMotorClient = None
    
    @classmethod
    async def connect_db(cls):
        """Connect to MongoDB"""
        cls.client = AsyncIOMotorClient(MONGO_URI)
        print(f"Connected to MongoDB Atlas!")
        print(f"Database: {DB_NAME}")
    
    @classmethod
    async def close_db(cls):
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()
            print("MongoDB connection closed")
    
    @classmethod
    def get_database(cls):
        """Get database instance"""
        return cls.client[DB_NAME]
    
    @classmethod
    def get_collection(cls, collection_name: str):
        """Get collection by name"""
        db = cls.get_database()
        return db[collection_name]


# Singleton instance
db = Database()
