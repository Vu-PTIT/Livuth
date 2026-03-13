import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.core.database import db

async def check():
    await db.connect_db()
    col = db.get_collection("events")
    docs = await col.find({}).sort("created_at", -1).to_list(None)
    for i, d in enumerate(docs):
        created = d.get("created_at")
        print(f"{i+1}. {d.get('name')} - {type(created)}: {created}")
    await db.close_db()

if __name__ == "__main__":
    asyncio.run(check())
