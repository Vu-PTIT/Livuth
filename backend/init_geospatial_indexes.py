"""
Initialize geospatial and text indexes for MongoDB
Run this script after setting up your database
"""
import asyncio
from backend.core.database import db
from backend.services.srv_event_mongo import EventMongoService


async def init_indexes():
    """Initialize all necessary indexes for the events collection"""
    print("🚀 Initializing MongoDB indexes...")
    
    # Connect to database
    await db.connect_db()
    
    try:
        # Create indexes
        event_service = EventMongoService()
        await event_service.create_geospatial_index()
        
        # Create Vibe Snaps indexes
        vibe_snaps = db.get_collection("vibe_snaps")
        import pymongo
        await vibe_snaps.create_index([("location", pymongo.GEOSPHERE)])
        await vibe_snaps.create_index([("expires_at", pymongo.ASCENDING)], expireAfterSeconds=0)
        print("✅ Vibe Snaps indexes (2dsphere, TTL) created successfully!")
        
        print("✅ All indexes created successfully!")
    except Exception as e:
        print(f"❌ Error creating indexes: {e}")
    finally:
        # Close connection
        await db.close_db()


if __name__ == "__main__":
    asyncio.run(init_indexes())
