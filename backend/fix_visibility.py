import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.core.database import db

async def migrate_null_visibility():
    await db.connect_db()
    col = db.get_collection("events")
    
    # Find events where is_visible is NOT True
    query = {"is_visible": {"$ne": True}}
    
    docs = await col.find(query).to_list(None)
    print(f"Events not visible: {len(docs)}")
    for d in docs:
        print(d.get("name"), d.get("is_visible"))

    update = {"$set": {"is_visible": True}}
    
    result = await col.update_many(query, update)
    print(f"Updated {result.modified_count} events to is_visible: True.")
    
    await db.close_db()

if __name__ == "__main__":
    asyncio.run(migrate_null_visibility())
