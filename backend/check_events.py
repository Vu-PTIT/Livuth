import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.core.database import db
from backend.services.srv_event_mongo import EventMongoService

async def test_get_all():
    await db.connect_db()
    service = EventMongoService()
    events, metadata = await service.get_all(page=1, page_size=20)
    print(f"Total in metadata: {metadata['total']}")
    print(f"Returned events: {len(events)}")
    for i, e in enumerate(events):
        print(f"{i+1}. {e.name}")
    await db.close_db()

if __name__ == "__main__":
    asyncio.run(test_get_all())
