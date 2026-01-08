"""
Migration script to add is_visible field to existing documents
Run from backend folder: python migrate_visibility.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB Atlas connection (from .env)
MONGO_URI = "mongodb+srv://vult:8s9AscRT0Mr4KsEf@cluster0.ntqyoma.mongodb.net/?appName=Cluster0"
DB_NAME = "p_inno_db"


async def migrate_visibility():
    """Add is_visible: true to all documents that don't have this field"""
    
    print(f"Connecting to MongoDB Atlas...")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Update events
    events_collection = db["events"]
    events_result = await events_collection.update_many(
        {"is_visible": {"$exists": False}},
        {"$set": {"is_visible": True}}
    )
    print(f"✅ Updated {events_result.modified_count} events with is_visible: true")
    
    # Update tour provider listings
    listings_collection = db["tour_provider_listings"]
    listings_result = await listings_collection.update_many(
        {"is_visible": {"$exists": False}},
        {"$set": {"is_visible": True}}
    )
    print(f"✅ Updated {listings_result.modified_count} tour listings with is_visible: true")
    
    print("\n✅ Migration completed!")
    client.close()


if __name__ == "__main__":
    asyncio.run(migrate_visibility())
