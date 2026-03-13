import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.core.database import db
from backend.services.srv_event_mongo import EventMongoService

async def test_api_simulation():
    await db.connect_db()
    service = EventMongoService()
    
    # Simulate empty search (default list page)
    events, metadata = await service.search_events(
        query=None,
        city=None,
        province=None,
        categories=None,
        page=1,
        page_size=12, # Match frontend desktop default
        user_id=None
    )
    
    print(f"--- API SIMULATION ---")
    print(f"Metadata Total: {metadata.get('total')}")
    print(f"Returned Events: {len(events)}")
    for i, e in enumerate(events):
        print(f"{i+1}. {e.name}")
        
    await db.close_db()

if __name__ == "__main__":
    asyncio.run(test_api_simulation())
