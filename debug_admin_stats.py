import asyncio
import sys
import os

# Add the project root to the python path
sys.path.append(os.getcwd())

from backend.core.database import db
from backend.services.srv_user_mongo import UserMongoService
from backend.services.srv_event_mongo import EventMongoService
from backend.services.srv_tour_provider_mongo import TourProviderMongoService

async def debug_stats():
    print("Connecting to database...")
    # Initialize services
    user_service = UserMongoService()
    event_service = EventMongoService()
    tour_service = TourProviderMongoService()
    
    # 1. Check Users
    print("\n--- Users ---")
    users = await user_service.get_collection().count_documents({})
    print(f"Total Users in DB: {users}")
    
    # 2. Check Events
    print("\n--- Events ---")
    events = await event_service.get_collection().count_documents({})
    print(f"Total Events in DB: {events}")

    # 3. Check Pending Upgrades
    print("\n--- Pending Upgrades ---")
    pending_upgrades = await user_service.get_collection().count_documents({"pending_role_upgrade": {"$ne": None}})
    print(f"Pending Upgrades in DB: {pending_upgrades}")

    # 4. Check Pending Tours
    print("\n--- Pending Tours ---")
    pending_tours = await tour_service.get_collection().count_documents({"status": "pending"})
    print(f"Pending Tours in DB: {pending_tours}")

if __name__ == "__main__":
    asyncio.run(debug_stats())
