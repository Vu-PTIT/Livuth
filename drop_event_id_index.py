"""Drop the unique index on event_id field"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load from backend/.env where the actual MongoDB URI is
load_dotenv("backend/.env")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "p_inno_db")

async def drop_event_id_index():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db.events
    
    print(f"Connected to {DB_NAME}")
    
    # List current indexes
    print("\n--- Current Indexes ---")
    async for index in collection.list_indexes():
        print(f"  {index['name']}: {index.get('key')}")
    
    # Drop the index event_id_1
    try:
        await collection.drop_index("event_id_1")
        print("\n✅ Successfully dropped index 'event_id_1'")
    except Exception as e:
        print(f"\n⚠️ Error dropping index: {e}")
    
    # List indexes after
    print("\n--- Indexes After ---")
    async for index in collection.list_indexes():
        print(f"  {index['name']}: {index.get('key')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(drop_event_id_index())
