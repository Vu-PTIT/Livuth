
import asyncio
import os
import sys

# Add project root to sys.path to allow imports from backend
# Current file: backend/migrate_event_stats.py
# Root: backend/..
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from backend.core.database import db
from backend.services.srv_review_mongo import ReviewMongoService
from backend.models.mongo_event import EventMongo
from bson import ObjectId

async def migrate_stats():
    print("🚀 Starting Event Stats Migration...")
    try:
        # 1. Connect to Database
        await db.connect_db()
        print(f"✅ Connected to Database: {db.client.server_info()['version']}")
        
        event_collection = db.get_collection("events")
        review_service = ReviewMongoService()
        
        # 2. Get all events
        # We only need _id to calculate stats, but fetching names helps logging
        events = await event_collection.find({}, {"_id": 1, "name": 1}).to_list(length=None)
        print(f"📦 Found {len(events)} events to process.")
        
        updated_count = 0
        
        # 3. Iterate and Update
        for event in events:
            event_id = str(event["_id"])
            event_name = event.get("name", "Unknown Event")
            
            # Calculate stats from reviews collection
            stats = await review_service.get_event_average_rating(event_id)
            avg_rating = stats["average_rating"]
            count = stats["total_reviews"]
            
            # Update event document with new fields
            # Using $set to ensure other fields are untouched
            result = await event_collection.update_one(
                {"_id": ObjectId(event_id)},
                {"$set": {
                    "average_rating": avg_rating,
                    "review_count": count
                }}
            )
            
            if result.modified_count > 0:
                updated_count += 1
                print(f"   Updated: '{event_name}' -> Rating: {avg_rating}, Reviews: {count}")
            elif count > 0:
                 print(f"   Checked: '{event_name}' -> Already up-to-date (Rating: {avg_rating})")

        print(f"\n✅ Migration Complete!")
        print(f"   - Processed: {len(events)}")
        print(f"   - Updated: {updated_count}")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
    finally:
        await db.close_db()

if __name__ == "__main__":
    # Fix for Windows asyncio loop
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(migrate_stats())
