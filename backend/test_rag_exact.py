import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.core.database import db
from backend.services.srv_rag_mongo import RAGService

async def test_exact():
    await db.connect_db()
    rag = RAGService()
    user_lat = 20.99996
    user_lng = 105.81437
    query = "Có lễ hội nào gần đây không?"
    
    context = await rag.retrieve_context(
        query=query,
        user_lat=user_lat,
        user_lng=user_lng
    )
    
    print("--- RAG CONTEXT ---")
    print(context)
    await db.close_db()

if __name__ == "__main__":
    asyncio.run(test_exact())
