import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.core.database import db

async def check_hidden():
    await db.connect_db()
    col = db.get_collection("events")
    
    # Matching filter
    visible_filter = {"$or": [{"is_visible": True}, {"is_visible": {"$exists": False}}]}
    vis_count = await col.count_documents(visible_filter)
    print(f"Visible: {vis_count}")
    
    # NOT matching filter (Hidden)
    hidden_filter = {"$and": [
        {"is_visible": {"$ne": True}},
        {"is_visible": {"$exists": True}}
    ]}
    hidden_docs = await col.find(hidden_filter).to_list(None)
    print(f"Hidden: {len(hidden_docs)}")
    for d in hidden_docs:
        print(f"Hidden event: {d.get('name')} | is_visible: {d.get('is_visible')} ({type(d.get('is_visible'))})")
        
    await db.close_db()

if __name__ == "__main__":
    asyncio.run(check_hidden())
