"""
Recommendation algorithm for matching events with user preferences
"""
from typing import List, Dict, Any


def calculate_relevance_score(user_hobbies: List[str], event_categories: List[str]) -> float:
    """
    Calculate relevance score between user hobbies and event categories
    
    Scoring:
    - Exact match (case-insensitive): 10 points
    - Partial match (substring): 5 points
    - Related keywords: 2 points
    
    Args:
        user_hobbies: List of user's hobby strings
        event_categories: List of event category strings
    
    Returns:
        Relevance score (higher is better)
    """
    if not user_hobbies or not event_categories:
        return 0.0
    
    score = 0.0
    
    # Normalize to lowercase for comparison
    hobbies_lower = [h.lower().strip() for h in user_hobbies]
    categories_lower = [c.lower().strip() for c in event_categories]
    
    for hobby in hobbies_lower:
        for category in categories_lower:
            # Exact match
            if hobby == category:
                score += 10.0
            # Partial match (one contains the other)
            elif hobby in category or category in hobby:
                score += 5.0
            # Related keywords (you can expand this with synonyms)
            elif are_related_keywords(hobby, category):
                score += 2.0
    
    return score


def are_related_keywords(word1: str, word2: str) -> bool:
    """
    Check if two words are related based on predefined relationships
    
    You can expand this with a more sophisticated matching algorithm
    or use word embeddings for semantic similarity
    
    Args:
        word1: First word
        word2: Second word
    
    Returns:
        True if words are related, False otherwise
    """
    # Predefined relationships (Vietnamese cultural context)
    related_pairs = {
        ("văn hóa", "lễ hội"),
        ("văn hóa", "truyền thống"),
        ("âm nhạc", "ca nhạc"),
        ("âm nhạc", "nhạc sống"),
        ("thể thao", "bóng đá"),
        ("thể thao", "chạy bộ"),
        ("nghệ thuật", "hội họa"),
        ("nghệ thuật", "triển lãm"),
        ("ẩm thực", "món ăn"),
        ("ẩm thực", "nấu ăn"),
        ("du lịch", "khám phá"),
        ("du lịch", "phượt"),
        ("tâm linh", "thiền"),
        ("tâm linh", "chùa"),
        ("công nghệ", "khoa học"),
        ("công nghệ", "AI"),
    }
    
    pair = tuple(sorted([word1, word2]))
    return pair in related_pairs or tuple(reversed(pair)) in related_pairs


def rank_events_by_relevance(
    events: List[Dict[str, Any]], 
    user_hobbies: List[str],
    include_score: bool = False
) -> List[Dict[str, Any]]:
    """
    Rank events by relevance to user's hobbies
    
    Args:
        events: List of event dictionaries
        user_hobbies: User's list of hobbies
        include_score: Whether to include the relevance score in the result
    
    Returns:
        List of events sorted by relevance (highest first)
    """
    scored_events = []
    
    for event in events:
        categories = event.get("categories", [])
        score = calculate_relevance_score(user_hobbies, categories)
        
        event_copy = event.copy()
        if include_score:
            event_copy["relevance_score"] = score
        
        scored_events.append({
            "event": event_copy,
            "score": score
        })
    
    # Sort by score (descending)
    scored_events.sort(key=lambda x: x["score"], reverse=True)
    
    # Return only events (without internal scoring info unless requested)
    return [item["event"] for item in scored_events]


def filter_events_by_min_score(
    events: List[Dict[str, Any]], 
    user_hobbies: List[str],
    min_score: float = 5.0
) -> List[Dict[str, Any]]:
    """
    Filter events that meet a minimum relevance score threshold
    
    Args:
        events: List of event dictionaries
        user_hobbies: User's list of hobbies
        min_score: Minimum score threshold
    
    Returns:
        Filtered and ranked list of events
    """
    ranked = rank_events_by_relevance(events, user_hobbies, include_score=True)
    filtered = [e for e in ranked if e.get("relevance_score", 0) >= min_score]
    
    # Remove score from final result
    for event in filtered:
        if "relevance_score" in event:
            del event["relevance_score"]
    
    return filtered
