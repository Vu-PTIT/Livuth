from typing import List, Dict, Any
import re
from backend.core.database import db

class KnowledgeBaseService:
    """Service for retrieving relevant knowledge for the AI agent"""
    
    def __init__(self):
        self.event_collection = "events"

    def get_event_collection(self):
        return db.get_collection(self.event_collection)

    def _extract_keywords(self, query: str) -> List[str]:
        """Simple keyword extraction from query string"""
        # Remove common stop words and punctuation
        stop_words = ["là", "gì", "ở", "đâu", "khi", "nào", "có", "những", "cho", "tôi", "biết", "về", "nhé", "thế", "nào", "làm", "sao", "đi", "đến"]
        
        # Clean query
        cleaned = re.sub(r'[^\w\s]', ' ', query.lower())
        words = cleaned.split()
        
        # Filter strings
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        return keywords

    def _detect_intent_and_sort(self, query: str) -> tuple[str, int]:
        """
        Detect the user's intent to sort by specific statistics.
        Returns a tuple of (sort_field, sort_direction).
        """
        query_lower = query.lower()
        
        # Intent: Most likes/favorites
        if any(kw in query_lower for kw in ["nhiều tim", "lượt thích", "thích nhất", "yêu thích nhất", "nhiều like"]):
            return ("like_count", -1)
            
        # Intent: Most participants/checkins
        if any(kw in query_lower for kw in ["đông người", "nhiều người tham gia", "nhiều người đi", "đông nhất", "đông đúc"]):
            return ("participant_count", -1)
            
        # Intent: Most reviews/comments/ratings quantity
        if any(kw in query_lower for kw in ["nhiều bình luận", "nhiều lượt đánh giá", "nhiều đánh giá", "nhiều review", "bình luận nhiều nhất"]):
            # Prevent overlap with highest rating
            if not any(kw in query_lower for kw in ["đánh giá cao", "tốt nhất"]):
                return ("review_count", -1)
            
        # Intent: Highest rating/best
        if any(kw in query_lower for kw in ["đánh giá cao", "tốt nhất", "hay nhất", "cao điểm", "nhiều sao nhất"]):
            return ("average_rating", -1)
            
        # Default sort
        return ("average_rating", -1)

    async def search_events(self, query: str, limit: int = 5) -> List[Dict[Any, Any]]:
        """
        Search for events related to the query.
        For now, this uses a simple regex-based keyword search on important fields.
        """
        collection = self.get_event_collection()
        keywords = self._extract_keywords(query)
        
        # Detect sort intent
        sort_field, sort_direction = self._detect_intent_and_sort(query)
        
        if not keywords:
            # Try to return some events sorted by intent if no keywords extracted
            cursor = collection.find({"is_visible": True}).sort(sort_field, sort_direction).limit(limit)
            return await cursor.to_list(length=limit)
        
        # Create regex pattern for keywords
        # Match any of the keywords
        pattern = "|".join([re.escape(k) for k in keywords])
        regex = {"$regex": pattern, "$options": "i"}
        
        # Search in name, categories, tags, location, and activities
        search_query = {
            "is_visible": True,
            "$or": [
                {"name": regex},
                {"categories": regex},
                {"tags": regex},
                {"location.province": regex},
                {"location.city": regex},
                {"content.activities": regex},
                {"content.intro": regex}
            ]
        }
        
        # Sort by detected intent to get best results first
        cursor = collection.find(search_query).sort([(sort_field, sort_direction), ("review_count", -1)]).limit(limit)
        results = await cursor.to_list(length=limit)
        
        # Note the sort field to be used in context formatting
        for r in results:
            r["_matched_intent"] = sort_field
            
        return results

    def format_events_context(self, events: List[Dict[Any, Any]]) -> str:
        """Format retrieved events into a readable context string for the AI"""
        if not events:
            return ""
            
        context_parts = ["THÔNG TIN SỰ KIỆN TỪ HỆ THỐNG:\n"]
        
        for i, event in enumerate(events, 1):
            name = event.get("name", "Không rõ tên")
            
            # Time formatting
            time_info = event.get("time", {})
            time_str = ""
            if type(time_info) is dict:
                lunar = time_info.get("lunar", "")
                solar = time_info.get("next_occurrence", "")
                if lunar: time_str += f"Âm lịch: {lunar}. "
                if solar: time_str += f"Dương lịch: {solar}."
            elif time_info:
                time_str = str(time_info)
                
            # Location
            loc_info = event.get("location", {})
            loc_str = ""
            if type(loc_info) is dict:
                address = loc_info.get("address", "")
                prov = loc_info.get("province", "")
                loc_str = f"{address}, {prov}".strip(", ")
                
            # Content
            content_info = event.get("content", {})
            intro = ""
            activities = []
            if type(content_info) is dict:
                intro = content_info.get("intro", "")
                activities = content_info.get("activities", [])
            
            event_text = f"Sự kiện {i}: {name}\n"
            if time_str: event_text += f"- Thời gian: {time_str}\n"
            if loc_str: event_text += f"- Địa điểm: {loc_str}\n"
            
            # Stats (crucial for answering intent queries)
            matched_intent = event.get("_matched_intent")
            if matched_intent == "like_count":
                event_text += f"- Số lượt thích (tim): {event.get('like_count', 0)}\n"
            elif matched_intent == "participant_count":
                event_text += f"- Số người tham gia (check-in): {event.get('participant_count', 0)}\n"
            elif matched_intent == "review_count":
                event_text += f"- Số lượt đánh giá/bình luận: {event.get('review_count', 0)}\n"
            elif matched_intent == "average_rating":
                event_text += f"- Điểm đánh giá trung bình: {event.get('average_rating', 0)}/5\n"
            
            if intro: event_text += f"- Giới thiệu: {intro}\n"
            if activities: event_text += f"- Hoạt động: {', '.join(activities)}\n"
            
            context_parts.append(event_text)
            
        return "\n".join(context_parts)
