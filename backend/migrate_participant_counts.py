
import asyncio
import os
import sys

# Add project root to sys.path to allow imports from backend
# Current file: backend/migrate_participant_counts.py
# Root: backend/..
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from backend.core.database import db
from bson import ObjectId

async def migrate_participant_counts():
    print("Starting Participant Count Migration...")
    try:
        # 1. Connect to Database
        await db.connect_db()
        info = await db.client.server_info()
        print(f"Connected to Database: {info['version']}")
        
        event_collection = db.get_collection("events")
        checkin_collection = db.get_collection("checkins")
        
        # 2. Get all events
        # We only need _id to calculate stats, but fetching names helps logging
        events = await event_collection.find({}, {"_id": 1, "name": 1}).to_list(length=None)
        print(f"Found {len(events)} events to process.")
        
        updated_count = 0
        
        # 3. Iterate and Update
        for event in events:
            event_id = event["_id"]
            event_name = event.get("name", "Unknown Event")
            
            # Count check-ins for this event
            count = await checkin_collection.count_documents({"event_id": event_id})
            
            # Update event document with new fields
            # Using $set to ensure other fields are untouched
            result = await event_collection.update_one(
                {"_id": event_id},
                {"$set": {
                    "participant_count": count
                }}
            )
            
            # Sanitize name for printing
            safe_name = event_name.encode('ascii', 'replace').decode('ascii')
            
            if result.modified_count > 0:
                updated_count += 1
                print(f"   Updated: '{safe_name}' -> Participants: {count}")
            elif count > 0:
                 print(f"   Checked: '{safe_name}' -> Already up-to-date (Participants: {count})")

        print(f"\nMigration Complete!")
        print(f"   - Processed: {len(events)}")
        print(f"   - Updated: {updated_count}")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db.close_db()

if __name__ == "__main__":
    # Fix for Windows asyncio loop
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(migrate_participant_counts())
