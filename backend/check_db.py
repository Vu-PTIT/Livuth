
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from backend.core.database import db
from backend.core.config import settings
from bson import ObjectId

async def check_db():
    print(f"Connecting to DB: {settings.DB_NAME} at {settings.MONGO_URI.split('@')[1] if '@' in settings.MONGO_URI else '...'}")
    await db.connect_db()
    
    event_id = "695fa71eb04a084889d8b005"
    
    print(f"\nChecking Event ID: {event_id}")
    try:
        if not ObjectId.is_valid(event_id):
            print("❌ Invalid ObjectId format!")
            return

        collection = db.get_collection("events")
        event = await collection.find_one({"_id": ObjectId(event_id)})
        
        if event:
            print(f"✅ Event FOUND: {event.get('name', 'No Name')}")
            print(f"   - Created By: {event.get('creator_id')}")
            print(f"   - Reviews: {event.get('review_count', 'N/A')}")
        else:
            print("❌ Event NOT FOUND in 'events' collection.")
            print("   -> This explains the 404 if the API tries to find this event.")
            
            # Count total events
            count = await collection.count_documents({})
            print(f"   -> Total events in DB: {count}")
            
    except Exception as e:
        print(f"❌ Error checking event: {e}")

    await db.close_db()

if __name__ == "__main__":
    asyncio.run(check_db())
