import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.core.database import db

async def check():
    await db.connect_db()
    col = db.get_collection("events")
    total = await col.count_documents({})
    vis = await col.count_documents({"is_visible": True})
    print(f"Total events: {total}")
    print(f"Visible events: {vis}")
    await db.close_db()

if __name__ == "__main__":
    asyncio.run(check())
