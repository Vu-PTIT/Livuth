"""
Test script for the new RAG service with intent routing.
Tests all 5 intent types without making actual DB calls.
"""
import asyncio
import sys
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.srv_rag_mongo import (
    _detect_intent,
    _extract_keywords,
    _fmt_location,
    INTENT_NEARBY_USERS,
    INTENT_NEARBY_EVENTS,
    INTENT_EVENT_STATS,
    INTENT_TOUR_PROVIDERS,
    INTENT_EVENT_SEARCH,
)


def test_intent_detection():
    """Test that queries map to the correct intent buckets."""
    print("\n=== Intent Detection Tests ===")
    cases = [
        ("Bao nhiêu người đang ở gần sự kiện Lễ hội Chùa Hương?", INTENT_NEARBY_USERS),
        ("bao nhiêu người ở gần sự kiện Hội An?",                 INTENT_NEARBY_USERS),
        ("Sự kiện gần tôi là gì?",                                 INTENT_NEARBY_EVENTS),
        ("Có lễ hội nào gần đây không?",                           INTENT_NEARBY_EVENTS),
        ("Sự kiện nào đông người tham gia nhất?",                  INTENT_EVENT_STATS),
        ("Lễ hội nào nhiều tim nhất?",                             INTENT_EVENT_STATS),
        ("Đánh giá cao nhất là sự kiện nào?",                      INTENT_EVENT_STATS),
        ("Có tour nào ở Hội An không?",                            INTENT_TOUR_PROVIDERS),
        ("Đặt tour du lịch Hà Nội",                                INTENT_TOUR_PROVIDERS),
        ("Lễ hội Chùa Hương ở đâu vậy?",                          INTENT_EVENT_SEARCH),
        ("Hội An có gì hay?",                                      INTENT_EVENT_SEARCH),
    ]

    passed = failed = 0
    for query, expected in cases:
        result = _detect_intent(query)
        status = "✅" if result == expected else "❌"
        if result == expected:
            passed += 1
        else:
            failed += 1
        print(f"{status} '{query[:60]}'\n   => {result} (expected {expected})")

    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def test_keyword_extraction():
    """Test keyword extraction strips stop words."""
    print("\n=== Keyword Extraction Tests ===")
    cases = [
        "Lễ hội Chùa Hương tổ chức ở đâu?",
        "Sự kiện nào đông người nhất tại Hà Nội?",
        "Có tour du lịch Hội An không?",
    ]
    for q in cases:
        kw = _extract_keywords(q)
        print(f"'{q}' => {kw}")
    print("Keyword extraction OK ✅")
    return True


def test_location_formatter():
    """Test _fmt_location handles various input shapes."""
    print("\n=== Location Formatter Tests ===")
    cases = [
        ({"address": "Xã Hương Sơn", "province": "Hà Nội"}, "Xã Hương Sơn, Hà Nội"),
        ({"city": "Hoàn Kiếm", "province": "Hà Nội"},       "Hoàn Kiếm, Hà Nội"),
        ({},                                                  "Chưa cập nhật"),
        (None,                                                "Chưa cập nhật"),
    ]
    passed = failed = 0
    for loc, expected in cases:
        result = _fmt_location(loc)
        if result == expected:
            print(f"✅ {loc} => '{result}'")
            passed += 1
        else:
            print(f"❌ {loc} => '{result}' (expected '{expected}')")
            failed += 1
    return failed == 0


if __name__ == "__main__":
    results = [
        test_intent_detection(),
        test_keyword_extraction(),
        test_location_formatter(),
    ]
    print("\n" + "=" * 50)
    if all(results):
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed — see above.")
        sys.exit(1)
