import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.core.database import db
from backend.utils.geo_utils import calculate_distance # If it exists

async def debug_geo():
    await db.connect_db()
    col = db.get_collection("events")
    
    # Coordinates from screenshot
    user_lat = 20.99996
    user_lng = 105.81437
    
    # Standard filter
    vis_filter = {"$or": [{"is_visible": True}, {"is_visible": {"$exists": False}}]}
    
    # Geo filter
    geo_filter = {
        "location.coordinates": {
            "$nearSphere": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [user_lng, user_lat]
                },
                "$maxDistance": 10000  # 10km
            }
        }
    }
    
    final_filter = {"$and": [vis_filter, geo_filter]}
    
    cursor = col.find(final_filter).limit(5)
    events = await cursor.to_list(None)
    
    print(f"--- GEO QUERY RESULTS for ({user_lat}, {user_lng}) ---")
    if not events:
        print("No events found in 10km radius.")
    for i, e in enumerate(events):
        name = e.get("name")
        coords = e.get("location", {}).get("coordinates", {}).get("coordinates")
        dist = "N/A"
        if coords:
            # Simple Haversine approx or just let Mongo do it
            pass
        print(f"{i+1}. {name} | Coordinates: {coords}")

    await db.close_db()

if __name__ == "__main__":
    asyncio.run(debug_geo())
