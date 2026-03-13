import asyncio
import os
import sys
import json
from bson import json_util, ObjectId

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.core.database import db
from backend.schemas.sche_event import EventBaseResponse

async def diagnostic():
    await db.connect_db()
    col = db.get_collection("events")
    
    # 1. Total count
    total = await col.count_documents({})
    print(f"--- DATABASE STATS ---")
    print(f"Total events in 'events' collection: {total}")
    
    # 2. Service Filter
    filter_dict = {"$or": [{"is_visible": True}, {"is_visible": {"$exists": False}}]}
    filtered_count = await col.count_documents(filter_dict)
    print(f"Events matching service visibility filter: {filtered_count}")
    
    # 3. Hidden events
    hidden_count = await col.count_documents({"is_visible": False})
    print(f"Events with is_visible: False: {hidden_count}")
    
    # 4. List all events with status
    print(f"\n--- ALL EVENTS ---")
    cursor = col.find({}).sort("created_at", -1)
    events = await cursor.to_list(None)
    
    for i, event in enumerate(events):
        name = event.get("name", "UNNAMED")
        is_vis = event.get("is_visible", "MISSING")
        created = event.get("created_at", "MISSING")
        eid = str(event.get("_id"))
        
        # Validation test
        event_copy = dict(event)
        event_copy["id"] = eid
        if event_copy.get("creator_id"):
            event_copy["creator_id"] = str(event_copy["creator_id"])
        for field in ["categories", "tags", "media"]:
            if event_copy.get(field) is None:
                event_copy[field] = []
        if "participant_count" not in event_copy:
            event_copy["participant_count"] = 0
            
        valid = "PENDING"
        error = ""
        try:
            EventBaseResponse(**event_copy)
            valid = "YES"
        except Exception as e:
            valid = "NO"
            error = str(e)
            
        print(f"{i+1}. [{eid}] {name}")
        print(f"   - is_visible: {is_vis}")
        print(f"   - created_at: {created}")
        print(f"   - Valid BaseResponse: {valid} {error}")
        
    await db.close_db()

if __name__ == "__main__":
    asyncio.run(diagnostic())
