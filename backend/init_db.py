"""
MongoDB Initialization Script
Creates all collections and indexes for better query performance
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "p_inno_db")


async def init_db():
    """Initialize MongoDB - create all collections and indexes"""
    print("🔧 Initializing MongoDB...")
    print(f"📊 Database: {DB_NAME}")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    # ============================================
    # USERS COLLECTION
    # ============================================
    users_collection = db["users"]
    
    print("\n📋 Creating indexes for 'users' collection...")
    
    # Unique indexes
    await users_collection.create_index("username", unique=True)
    print("   ✓ Created unique index on 'username'")
    
    await users_collection.create_index("email", unique=True)
    print("   ✓ Created unique index on 'email'")
    
    # Regular indexes for frequently queried fields
    await users_collection.create_index("is_active")
    print("   ✓ Created index on 'is_active'")
    
    await users_collection.create_index("created_at")
    print("   ✓ Created index on 'created_at'")
    
    await users_collection.create_index("roles")
    print("   ✓ Created index on 'roles'")
    
    # Index for role upgrade requests
    await users_collection.create_index("pending_role_upgrade", sparse=True)
    print("   ✓ Created sparse index on 'pending_role_upgrade'")
    
    # SSO index
    await users_collection.create_index("sso_sub", sparse=True)
    print("   ✓ Created sparse index on 'sso_sub'")
    
    # Index for hobbies (for event recommendations)
    await users_collection.create_index("hobbies")
    print("   ✓ Created index on 'hobbies'")
    
    # ============================================
    # EVENTS COLLECTION
    # ============================================
    events_collection = db["events"]
    
    print("\n📋 Creating indexes for 'events' collection...")
    
    # Index for event_id (optional numeric ID)
    await events_collection.create_index("event_id", unique=True, sparse=True)
    print("   ✓ Created unique sparse index on 'event_id'")
    
    # Index for event name for search
    await events_collection.create_index("name")
    print("   ✓ Created index on 'name'")
    
    # Index for created_at for sorting
    await events_collection.create_index("created_at")
    print("   ✓ Created index on 'created_at'")
    
    # Index for creator_id (for event ownership)
    await events_collection.create_index("creator_id", sparse=True)
    print("   ✓ Created sparse index on 'creator_id'")
    
    # Index for categories (for event recommendations)
    await events_collection.create_index("categories")
    print("   ✓ Created index on 'categories'")
    
    # Index for tags
    await events_collection.create_index("tags")
    print("   ✓ Created index on 'tags'")
    
    # Geospatial index for location-based queries
    await events_collection.create_index([("location.coordinates", "2dsphere")])
    print("   ✓ Created 2dsphere index on 'location.coordinates'")
    
    # Text index for full-text search
    await events_collection.create_index([
        ("name", "text"),
        ("content.intro", "text"),
        ("content.history", "text"),
        ("tags", "text")
    ])
    print("   ✓ Created text index for full-text search")
    
    # ============================================
    # CHAT CONVERSATIONS COLLECTION
    # ============================================
    conversations_collection = db["conversations"]
    
    print("\n📋 Creating indexes for 'conversations' collection...")
    
    # Index for user_id to get user's conversations
    await conversations_collection.create_index("user_id")
    print("   ✓ Created index on 'user_id'")
    
    # Index for created_at for sorting
    await conversations_collection.create_index("created_at")
    print("   ✓ Created index on 'created_at'")
    
    # Index for updated_at for sorting by recent activity
    await conversations_collection.create_index("updated_at")
    print("   ✓ Created index on 'updated_at'")
    
    # Compound index for user_id + updated_at (most common query)
    await conversations_collection.create_index([("user_id", 1), ("updated_at", -1)])
    print("   ✓ Created compound index on 'user_id' + 'updated_at'")
    
    # ============================================
    # CHAT MESSAGES COLLECTION
    # ============================================
    messages_collection = db["messages"]
    
    print("\n📋 Creating indexes for 'messages' collection...")
    
    # Index for conversation_id to get messages in a conversation
    await messages_collection.create_index("conversation_id")
    print("   ✓ Created index on 'conversation_id'")
    
    # Index for created_at for sorting messages
    await messages_collection.create_index("created_at")
    print("   ✓ Created index on 'created_at'")
    
    # Compound index for conversation_id + created_at (most common query)
    await messages_collection.create_index([("conversation_id", 1), ("created_at", 1)])
    print("   ✓ Created compound index on 'conversation_id' + 'created_at'")
    
    # Index for role (to filter by user/assistant/system)
    await messages_collection.create_index("role")
    print("   ✓ Created index on 'role'")
    
    # ============================================
    # TOUR PROVIDER LISTINGS COLLECTION
    # ============================================
    tour_listings_collection = db["tour_provider_listings"]
    
    print("\n📋 Creating indexes for 'tour_provider_listings' collection...")
    
    # Index for event_id to get listings for an event
    await tour_listings_collection.create_index("event_id")
    print("   ✓ Created index on 'event_id'")
    
    # Index for provider_id to get listings by provider
    await tour_listings_collection.create_index("provider_id")
    print("   ✓ Created index on 'provider_id'")
    
    # Index for status (pending, approved, rejected)
    await tour_listings_collection.create_index("status")
    print("   ✓ Created index on 'status'")
    
    # Index for verification_status
    await tour_listings_collection.create_index("verification_status")
    print("   ✓ Created index on 'verification_status'")
    
    # Index for created_at for sorting
    await tour_listings_collection.create_index("created_at")
    print("   ✓ Created index on 'created_at'")
    
    # Compound index for event_id + status (common query for approved listings)
    await tour_listings_collection.create_index([("event_id", 1), ("status", 1)])
    print("   ✓ Created compound index on 'event_id' + 'status'")
    
    # Text index for search
    await tour_listings_collection.create_index([
        ("company_name", "text"),
        ("service_name", "text"),
        ("description", "text")
    ])
    print("   ✓ Created text index for full-text search")
    
    # ============================================
    # SUMMARY
    # ============================================
    print("\n" + "=" * 50)
    print("📊 Collections Summary:")
    print("-" * 50)
    
    collections = await db.list_collection_names()
    for coll_name in sorted(collections):
        count = await db[coll_name].count_documents({})
        print(f"   📁 {coll_name}: {count} documents")
    
    print("\n✅ MongoDB initialized successfully!")
    
    # Test connection
    try:
        await db.command("ping")
        print("✅ Database connection test: OK")
    except Exception as e:
        print(f"❌ Database connection test failed: {e}")
    
    # Close connection
    client.close()
    print("\n👋 Initialization complete!")


if __name__ == "__main__":
    asyncio.run(init_db())
