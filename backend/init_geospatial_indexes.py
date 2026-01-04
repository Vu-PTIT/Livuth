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
        
        print("✅ All indexes created successfully!")
    except Exception as e:
        print(f"❌ Error creating indexes: {e}")
    finally:
        # Close connection
        await db.close_db()


if __name__ == "__main__":
    asyncio.run(init_indexes())
