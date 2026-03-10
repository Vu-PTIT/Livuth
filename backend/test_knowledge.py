import asyncio
import sys
import os
import io

# Set stdout to utf-8 to avoid Windows charmap encoding errors
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.srv_knowledge import KnowledgeBaseService

async def test_knowledge_service():
    print("Testing KnowledgeBaseService...")
    service = KnowledgeBaseService()
    
    # Test keyword extraction
    query = "Lễ hội Chùa Hương tổ chức ở đâu vậy?"
    keywords = service._extract_keywords(query)
    print(f"Query: '{query}' -> Keywords: {keywords}")
    
    assert "chùa" in keywords or "hương" in keywords, "Failed to extract key terms"
    print("Keyword extraction test passed!")
    
    # Test formatting with dummy data
    dummy_events = [
        {
            "name": "Lễ hội Chùa Hương",
            "time": {"lunar": "Mùng 6 tháng Giêng", "next_occurrence": "2025"},
            "location": {"province": "Hà Nội", "address": "Xã Hương Sơn, Mỹ Đức"},
            "content": {"intro": "Lễ hội kéo dài nhất Việt Nam", "activities": ["Lễ phật", "Đi thuyền"]}
        }
    ]
    
    formatted = service.format_events_context(dummy_events)
    print(f"\nFormatted Context:\n{formatted}")
    
    assert "Lễ hội Chùa Hương" in formatted
    assert "Hà Nội" in formatted
    print("Formatting test passed!")
    
    # Test intent detection
    print("\nTesting Intent Detection:")
    queries = {
        "Sự kiện nào nhiều tim nhất?": "like_count",
        "Lễ hội nào đông người tham gia nhất": "participant_count",
        "Có nhiều lượt đánh giá nhất là sự kiện nào": "review_count",
        "Lễ hội nào đánh giá cao nhất": "average_rating",
        "Lễ hội chùa Hương có gì": "average_rating" # Default case
    }
    
    for q, expected_intent in queries.items():
        field, direction = service._detect_intent_and_sort(q)
        print(f"Query: '{q}' -> Intent: {field}")
        assert field == expected_intent, f"Failed: Expected {expected_intent}, got {field}"
        
    print("Intent Detection test passed!")
    
    # Test formatting with intent
    dummy_event_with_intent = [
        {
            "name": "Lễ hội Mẫu Sơn",
            "like_count": 1500,
            "_matched_intent": "like_count"
        }
    ]
    formatted_intent = service.format_events_context(dummy_event_with_intent)
    print(f"\nFormatted Intent Context:\n{formatted_intent}")
    assert "1500" in formatted_intent
    print("Intent Formatting test passed!")

if __name__ == "__main__":
    asyncio.run(test_knowledge_service())
