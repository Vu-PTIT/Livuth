import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.core.database import db
from backend.schemas.sche_event import EventBaseResponse
from bson import ObjectId

async def check():
    await db.connect_db()
    col = db.get_collection("events")
    docs = await col.find({"name": {"$regex": "ptit", "$options": "i"}}).to_list(None)
    for event in docs:
        event["id"] = str(event["_id"])
        if event.get("creator_id"):
            event["creator_id"] = str(event["creator_id"])
        # Sanitize list fields
        for field in ["categories", "tags", "media"]:
            if event.get(field) is None:
                event[field] = []
        if "participant_count" not in event:
            event["participant_count"] = 0
            
        print("Trying to validate event:", event["name"])
        try:
            EventBaseResponse(**event)
            print("Validation successful!")
        except Exception as e:
            print(f"Validation failed: {e}")
            
    await db.close_db()

if __name__ == "__main__":
    asyncio.run(check())
