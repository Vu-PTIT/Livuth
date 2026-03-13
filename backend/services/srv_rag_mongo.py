"""
RAG (Retrieval-Augmented Generation) Service for MongoDB
Central service that retrieves context from multiple collections
based on detected intent from the user's query.
"""
import re
from typing import List, Dict, Any, Optional, Tuple
from backend.core.database import db
from backend.services.srv_presence import presence_service


# --------------------------------------------------------------------------- #
# Intent constants
# --------------------------------------------------------------------------- #
INTENT_NEARBY_USERS   = "nearby_users"    # "bao nhiêu người ở gần sự kiện X?"
INTENT_NEARBY_EVENTS  = "nearby_events"   # "sự kiện gần tôi là gì?"
INTENT_EVENT_STATS    = "event_stats"     # "sự kiện đông người nhất / nhiều tim nhất"
INTENT_TOUR_PROVIDERS = "tour_providers"  # "có tour nào ở sự kiện X không?"
INTENT_EVENT_SEARCH   = "event_search"    # fallback — tìm kiếm thông tin sự kiện


# Vietnamese stop words for keyword extraction
_STOP_WORDS = {
    "là", "gì", "ở", "đâu", "khi", "nào", "có", "những", "cho",
    "tôi", "biết", "về", "nhé", "thế", "làm", "sao", "đi", "đến",
    "bao", "nhiêu", "người", "một", "hay", "với", "và", "của",
    "các", "đó", "này", "đây", "thì", "mà", "rằng", "còn", "như",
    "được", "không", "chưa", "đã", "sẽ", "vẫn", "còn", "đang",
}


def _extract_keywords(query: str) -> List[str]:
    """Return meaningful keywords from a Vietnamese query."""
    cleaned = re.sub(r"[^\w\s]", " ", query.lower())
    return [w for w in cleaned.split() if w not in _STOP_WORDS and len(w) > 1]


def _detect_intent(query: str) -> str:
    """
    Classify the user query into one of 5 intent buckets.
    Returns a INTENT_* constant.
    """
    q = query.lower()

    # --- nearby USERS around an event (real-time presence) ---
    if any(kw in q for kw in [
        "bao nhiêu người ở gần", "bao nhiêu người đang ở gần",
        "người ở gần sự kiện", "người đang gần sự kiện",
        "bao nhiêu người gần", "mấy người gần", "đếm người gần",
        "bao nhiêu người đang ở khu vực",
    ]):
        return INTENT_NEARBY_USERS

    # --- nearby EVENTS around a location ---
    if any(kw in q for kw in [
        "sự kiện gần tôi", "sự kiện gần đây", "sự kiện ở gần",
        "sự kiện near", "lễ hội gần tôi", "lễ hội gần đây",
        "cách bao xa", "bán kính", "trong vòng km",
        "gần đây không", "có gần đây",
    ]):
        return INTENT_NEARBY_EVENTS

    # --- event STATISTICS / ranking ---
    if any(kw in q for kw in [
        "đông người nhất", "nhiều người tham gia nhất", "đông đúc nhất",
        "tham gia nhất", "đông người tham gia",
        "nhiều tim nhất", "nhiều lượt thích nhất", "được thích nhất",
        "đánh giá cao nhất", "điểm cao nhất", "nổi tiếng nhất",
        "nhiều bình luận nhất", "nhiều review nhất", "top sự kiện",
        "xếp hạng", "hạng mục", "nhiều người nhất", "phổ biến nhất",
    ]):
        return INTENT_EVENT_STATS

    # --- TOUR PROVIDERS ---
    if any(kw in q for kw in [
        "tour", "công ty du lịch", "nhà cung cấp tour",
        "đặt tour", "book tour", "hướng dẫn viên", "dịch vụ tour",
        "gói du lịch", "giá tour",
    ]):
        return INTENT_TOUR_PROVIDERS

    # --- default: general event text search ---
    return INTENT_EVENT_SEARCH


def _extract_event_name_hint(query: str) -> Optional[str]:
    """
    Try to extract the event / place name from a nearby-users query.
    Works for patterns like "… gần [event name]" or "… sự kiện [name]".
    Returns None if nothing useful found — fallback to keyword search.
    """
    q = query.lower()
    for pattern in [
        r"gần\s+(?:sự kiện\s+)?(.+?)(?:\s+không|\s+\?|$)",
        r"sự kiện\s+(.+?)(?:\s+không|\s+\?|$)",
        r"lễ hội\s+(.+?)(?:\s+không|\s+\?|$)",
    ]:
        m = re.search(pattern, q)
        if m:
            return m.group(1).strip()
    return None


# --------------------------------------------------------------------------- #
# Main RAG Service
# --------------------------------------------------------------------------- #

class RAGService:
    """
    Retrieval-Augmented Generation service.
    Routes user queries to the correct MongoDB collection(s) and
    returns a structured context string ready to be injected into
    the Gemini system prompt.
    """

    def __init__(self):
        self._events_col      = lambda: db.get_collection("events")
        self._tours_col       = lambda: db.get_collection("tour_providers")
        self._checkins_col    = lambda: db.get_collection("checkins")
        self._users_col       = lambda: db.get_collection("users")

    # ----------------------------------------------------------------------- #
    # Public API
    # ----------------------------------------------------------------------- #

    async def retrieve_context(
        self,
        query: str,
        limit: int = 5,
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None,
    ) -> str:
        """
        Main entry point.  Given a user query, detect the intent,
        fetch the relevant data, and return a formatted context string.

        Args:
            query:    The user's raw message.
            limit:    Max number of documents to retrieve.
            user_lat: Latitude of the requesting user (from PresenceService).
            user_lng: Longitude of the requesting user (from PresenceService).
        """
        intent = _detect_intent(query)
        keywords = _extract_keywords(query)

        if intent == INTENT_NEARBY_USERS:
            return await self._context_nearby_users(query, keywords, user_lat, user_lng)

        if intent == INTENT_NEARBY_EVENTS:
            if user_lat is not None and user_lng is not None:
                # User is on the map — use their real location
                return await self._context_nearby_events_geo(user_lat, user_lng, limit)
            else:
                # No location available — ask them to enable it
                return self._context_no_location()

        if intent == INTENT_EVENT_STATS:
            return await self._context_event_stats(query, limit)

        if intent == INTENT_TOUR_PROVIDERS:
            return await self._context_tour_providers(keywords, limit)

        # default: event text search
        return await self._context_event_search(keywords, query, limit)

    # ----------------------------------------------------------------------- #
    # Intent handlers
    # ----------------------------------------------------------------------- #

    async def _context_nearby_users(
        self,
        query: str,
        keywords: List[str],
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None,
    ) -> str:
        """
        Count real-time users near a specific event.
        Looks up the event in MongoDB by name hint or keywords,
        then queries PresenceService for nearby user count.
        """
        # 1. Try to find the target event
        events = await self._find_events_by_keywords(keywords, limit=3)
        if not events:
            name_hint = _extract_event_name_hint(query)
            if name_hint:
                regex = {"$regex": re.escape(name_hint), "$options": "i"}
                # Search events with visibility filter
                filter_dict = {"$or": [{"is_visible": True}, {"is_visible": {"$exists": False}}]}
                search_conditions = {"$or": [
                    {"name": regex}, {"location.city": regex},
                    {"location.province": regex}
                ]}
                cursor = self._events_col().find({"$and": [filter_dict, search_conditions]}).limit(3)
                events = await cursor.to_list(length=3)

        lines = ["THÔNG TIN NGƯỜI DÙNG GẦN SỰ KIỆN (REAL-TIME):\n"]

        # Show user's own location if available
        if user_lat is not None and user_lng is not None:
            lines.append(f"Vị trí hiện tại của bạn: ({user_lat:.5f}, {user_lng:.5f})\n")

        if not events:
            lines.append(
                "Không tìm thấy sự kiện phù hợp với câu hỏi. "
                "Hãy nói tên cụ thể hơn (ví dụ: 'Lễ hội Chùa Hương')."
            )
        else:
            for event in events:
                name = event.get("name", "Không rõ")
                loc  = event.get("location", {}) or {}
                coords_info = loc.get("coordinates") or {}
                coords = (coords_info.get("coordinates") or []) if isinstance(coords_info, dict) else []

                if len(coords) == 2:
                    event_lng, event_lat = coords
                    nearby_count = presence_service.count_nearby_users(
                        event_lat=event_lat,
                        event_lng=event_lng,
                        radius_m=500,
                    )
                    lines.append(f"- Sự kiện: {name}")
                    lines.append(f"  Địa điểm: {loc.get('address', '')} {loc.get('province', '')}".strip())
                    lines.append(f"  Số người đang ở gần (trong bán kính 500m, real-time): {nearby_count}")
                    lines.append(f"  Tổng số người đã tham gia (check-in): {event.get('participant_count', 0)}\n")
                else:
                    lines.append(f"- Sự kiện: {name}")
                    lines.append(
                        f"  Chưa có dữ liệu tọa độ để đếm người gần. "
                        f"Tổng người đã check-in: {event.get('participant_count', 0)}\n"
                    )

        total_online = presence_service.active_user_count()
        lines.append(f"\n(Tổng số người đang online trên toàn hệ thống ngay bây giờ: {total_online})")
        return "\n".join(lines)

    def _context_no_location(self) -> str:
        """Fallback when user asks nearby events but provides no coordinates."""
        return (
            "THÔNG TIN VỀ SỰ KIỆN GẦN ĐÂY:\n\n"
            "Để tìm sự kiện gần bạn, hệ thống cần biết vị trí (kinh độ/vĩ độ) của bạn. "
            "Bạn có thể bật chia sẻ vị trí trên bản đồ trong ứng dụng để hệ thống "
            "tự động gợi ý sự kiện gần nhất. Ngoài ra, bạn cũng có thể tìm theo tên tỉnh/thành phố."
        )

    async def _context_nearby_events_geo(
        self,
        user_lat: float,
        user_lng: float,
        limit: int,
        radius_km: float = 20.0,
    ) -> str:
        """
        Find events within `radius_km` km from the user.
        Uses the Haversine-based distance already in srv_event_mongo.py logic.
        """
        from backend.utils.geo_utils import calculate_distance

        # Fetch all events that have coordinates and are visible
        filter_dict = {"$or": [{"is_visible": True}, {"is_visible": {"$exists": False}}]}
        query = {
            "$and": [
                filter_dict,
                {"location.coordinates": {"$ne": None}}
            ]
        }
        cursor = self._events_col().find(query)
        all_events = await cursor.to_list(length=None)

        nearby = []
        for ev in all_events:
            loc = ev.get("location") or {}
            coords_info = loc.get("coordinates") or {}
            coords = coords_info.get("coordinates") or [] if isinstance(coords_info, dict) else []
            if len(coords) != 2:
                continue
            ev_lng, ev_lat = coords
            dist_km = calculate_distance(user_lat, user_lng, ev_lat, ev_lng)
            if dist_km <= radius_km:
                ev["_distance_km"] = round(dist_km, 2)
                nearby.append(ev)

        # Sort by distance
        nearby.sort(key=lambda e: e.get("_distance_km", 999))
        nearby = nearby[:limit]

        if not nearby:
            return (
                f"THÔNG TIN SỰ KIỆN GẦN BẠN:\n\n"
                f"Vị trí của bạn: ({user_lat:.5f}, {user_lng:.5f})\n"
                f"Không tìm thấy sự kiện nào trong bán kính {radius_km}km từ vị trí của bạn."
            )

        lines = [
            f"SỰ KIỆN GẦN BẠN (trong vòng {radius_km}km):",
            f"Vị trí của bạn: ({user_lat:.5f}, {user_lng:.5f})\n",
        ]
        for i, ev in enumerate(nearby, 1):
            name = ev.get("name", "Không rõ tên")
            dist = ev.get("_distance_km", "?")
            loc_str = _fmt_location(ev.get("location"))
            rating = ev.get("average_rating", 0)
            participants = ev.get("participant_count", 0)
            cats = ", ".join(ev.get("categories", []))

            # Real-time nearby count at this event
            loc = ev.get("location") or {}
            coords_info = loc.get("coordinates") or {}
            coords = coords_info.get("coordinates") or [] if isinstance(coords_info, dict) else []
            if len(coords) == 2:
                ev_lng2, ev_lat2 = coords
                nearby_count = presence_service.count_nearby_users(ev_lat2, ev_lng2, radius_m=500)
            else:
                nearby_count = 0

            lines.append(
                f"{i}. {name}\n"
                f"   Khoảng cách: {dist} km | Địa điểm: {loc_str}\n"
                f"   Danh mục: {cats}\n"
                f"   Đánh giá: {rating}/5 | Người tham gia: {participants}\n"
                f"   Người đang ở gần đây (real-time): {nearby_count}"
            )
        return "\n".join(lines)

    async def _context_event_stats(self, query: str, limit: int) -> str:
        """Return top events sorted by the stat field that matches the query intent."""
        q = query.lower()

        # Determine which stat field to sort by
        if any(kw in q for kw in ["tim", "lượt thích", "được thích", "like"]):
            sort_field, label = "like_count", "Lượt thích (tim)"
        elif any(kw in q for kw in ["tham gia", "đông người", "đông đúc", "check-in", "checkin"]):
            sort_field, label = "participant_count", "Số người tham gia"
        elif any(kw in q for kw in ["bình luận", "review", "đánh giá"]) \
                and not any(kw in q for kw in ["đánh giá cao", "điểm cao"]):
            sort_field, label = "review_count", "Số lượt đánh giá"
        else:
            sort_field, label = "average_rating", "Điểm đánh giá TB"

        filter_dict = {"$or": [{"is_visible": True}, {"is_visible": {"$exists": False}}]}
        cursor = self._events_col().find(
            filter_dict
        ).sort(sort_field, -1).limit(limit)
        events = await cursor.to_list(length=limit)

        lines = [f"TOP SỰ KIỆN THEO {label.upper()}:\n"]
        for i, ev in enumerate(events, 1):
            name  = ev.get("name", "Không rõ")
            loc   = _fmt_location(ev.get("location"))
            value = ev.get(sort_field, 0)
            rating = ev.get("average_rating", 0)
            participants = ev.get("participant_count", 0)
            lines.append(
                f"{i}. {name}\n"
                f"   {label}: {value} | Đánh giá: {rating}/5 | Người tham gia: {participants}\n"
                f"   Địa điểm: {loc}"
            )
        return "\n".join(lines)

    async def _context_tour_providers(self, keywords: List[str], limit: int) -> str:
        """Find tour providers relevant to the query."""
        query_filter: Dict[str, Any] = {"status": "approved"}

        if keywords:
            pattern = "|".join(re.escape(k) for k in keywords)
            regex   = {"$regex": pattern, "$options": "i"}
            query_filter["$or"] = [
                {"name": regex},
                {"description": regex},
                {"location": regex},
                {"event_name": regex},
            ]

        cursor = self._tours_col().find(query_filter).sort("rating", -1).limit(limit)
        tours  = await cursor.to_list(length=limit)

        if not tours:
            # Retry without status filter to give a better "not found" message
            return (
                "THÔNG TIN TOUR DU LỊCH:\n\n"
                "Không tìm thấy tour nào phù hợp với yêu cầu của bạn trong hệ thống. "
                "Bạn thử tìm theo tên địa điểm hoặc tên lễ hội cụ thể nhé!"
            )

        lines = ["DANH SÁCH TOUR DU LỊCH TỪ HỆ THỐNG:\n"]
        for i, t in enumerate(tours, 1):
            lines.append(
                f"{i}. {t.get('name', 'Chưa đặt tên')}\n"
                f"   Mô tả: {(t.get('description') or '')[:120]}\n"
                f"   Địa điểm: {t.get('location', 'Chưa cập nhật')}\n"
                f"   Đánh giá: {t.get('rating', 0)}/5 | Giá: {t.get('price', 'Liên hệ')}"
            )
        return "\n".join(lines)

    async def _context_event_search(
        self,
        keywords: List[str],
        query: str,
        limit: int,
    ) -> str:
        """General event search by keyword regex across key fields."""
        events = await self._find_events_by_keywords(keywords, limit=limit)

        # Intent sort for result ordering
        sort_field = _intent_sort_field(query)
        if events:
            events.sort(key=lambda e: e.get(sort_field, 0), reverse=True)

        if not events and keywords:
            # Last resort: fetch a few high-rated events for general info
            cursor = self._events_col().find(
                {"is_visible": True}
            ).sort("average_rating", -1).limit(limit)
            events = await cursor.to_list(length=limit)

        return _format_events_context(events, sort_field)

    # ----------------------------------------------------------------------- #
    # Helpers
    # ----------------------------------------------------------------------- #

    async def _find_events_by_keywords(
        self, keywords: List[str], limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search events by keyword regex across name, location, categories, tags."""
        if not keywords:
            cursor = self._events_col().find(
                {"is_visible": True}
            ).sort("average_rating", -1).limit(limit)
            return await cursor.to_list(length=limit)

        pattern = "|".join(re.escape(k) for k in keywords)
        regex   = {"$regex": pattern, "$options": "i"}
        q = {
            "$or": [
                {"name": regex},
                {"categories": regex},
                {"tags": regex},
                {"location.province": regex},
                {"location.city": regex},
                {"location.address": regex},
                {"content.intro": regex},
                {"content.activities": regex},
            ],
        }
        cursor = self._events_col().find(q).sort(
            [("participant_count", -1), ("average_rating", -1)]
        ).limit(limit)
        return await cursor.to_list(length=limit)


# --------------------------------------------------------------------------- #
# Formatting helpers (module-level)
# --------------------------------------------------------------------------- #

def _fmt_location(loc: Optional[Dict]) -> str:
    if not loc or not isinstance(loc, dict):
        return "Chưa cập nhật"
    parts = [loc.get("address", ""), loc.get("city", ""), loc.get("province", "")]
    return ", ".join(p for p in parts if p).strip(", ") or "Chưa cập nhật"


def _intent_sort_field(query: str) -> str:
    q = query.lower()
    if any(k in q for k in ["tim", "lượt thích", "like"]):
        return "like_count"
    if any(k in q for k in ["tham gia", "đông người", "check-in"]):
        return "participant_count"
    if any(k in q for k in ["bình luận", "review"]):
        return "review_count"
    return "average_rating"


def _format_events_context(events: List[Dict[str, Any]], sort_field: str = "average_rating") -> str:
    """Format a list of event documents into a readable context string."""
    if not events:
        return ""

    lines = ["THÔNG TIN SỰ KIỆN TỪ HỆ THỐNG:\n"]
    stat_labels = {
        "like_count":       "Lượt thích",
        "participant_count": "Người tham gia",
        "review_count":      "Lượt đánh giá",
        "average_rating":    "Điểm đánh giá TB",
    }

    for i, ev in enumerate(events, 1):
        name = ev.get("name", "Không rõ tên")

        # Time
        time_info = ev.get("time", {}) or {}
        time_parts = []
        if isinstance(time_info, dict):
            if time_info.get("lunar"):
                time_parts.append(f"Âm lịch: {time_info['lunar']}")
            if time_info.get("next_occurrence"):
                time_parts.append(f"Dương lịch: {time_info['next_occurrence']}")
        time_str = " | ".join(time_parts) or "Chưa xác định"

        # Location
        loc_str = _fmt_location(ev.get("location"))

        # Content
        content = ev.get("content", {}) or {}
        intro = (content.get("intro") or "")[:200] if isinstance(content, dict) else ""
        activities = content.get("activities", []) if isinstance(content, dict) else []

        # Key stat
        stat_label = stat_labels.get(sort_field, "Điểm đánh giá")
        stat_value = ev.get(sort_field, 0)

        block = (
            f"Sự kiện {i}: {name}\n"
            f"  - Thời gian: {time_str}\n"
            f"  - Địa điểm: {loc_str}\n"
            f"  - {stat_label}: {stat_value}"
        )
        if sort_field != "average_rating":
            block += f" | Đánh giá TB: {ev.get('average_rating', 0)}/5"
        block += f" | Tổng người tham gia: {ev.get('participant_count', 0)}"
        if intro:
            block += f"\n  - Giới thiệu: {intro}"
        if activities:
            block += f"\n  - Hoạt động: {', '.join(activities[:5])}"
        lines.append(block)

    return "\n\n".join(lines)
