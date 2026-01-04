
import asyncio
import os
import sys
from bson import ObjectId

# Add parent dir to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.database import db
from backend.services.srv_tour_provider_mongo import TourProviderService

async def check_pending_tours():
    print("Connecting to DB...")
    # Assuming db is already initialized or needs initialization
    # In this project structure, db is a singleton that connects on first use or via app startup
    # We might need to purely use motor to connect if backend.core.database relies on FastAPI events
    
    collection = db.get_collection("tour_provider_listings")
    
    print("Querying pending tours...")
    cursor = collection.find({"status": "pending"}).sort("created_at", -1)
    tours = await cursor.to_list(length=None)
    
    print(f"Found {len(tours)} pending tours.")
    
    for t in tours:
        print(f"\n--- Tour: {t.get('company_name')} ({t.get('_id')}) ---")
        print(f"Status: {t.get('status')}")
        print(f"Service: {t.get('service_name')}")
        print(f"Provider ID: {t.get('provider_id')}")
        print(f"Event ID: {t.get('event_id')} (Type: {type(t.get('event_id'))})")
        
        # Check Event linkage
        event_id = t.get('event_id')
        event_query = {"_id": event_id}
        if isinstance(event_id, str):
             print(f"WARNING: event_id is string. Querying as ObjectId...")
             try:
                 event_query = {"_id": ObjectId(event_id)}
             except:
                 print("  > Invalid ObjectId string")
        
        event = await db.get_collection("events").find_one(event_query)
        if event:
            print(f"Linked Event: {event.get('name')} ({event.get('_id')})")
        else:
            print(f"!!! EVENT NOT FOUND for ID: {event_id}")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(check_pending_tours())
