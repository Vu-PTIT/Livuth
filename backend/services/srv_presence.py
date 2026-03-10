"""
Presence Service - Tracks user locations in real-time for nearby user counting
"""
import math
import time
from typing import Dict, List, Optional

# Default radius for "nearby" detection in meters
DEFAULT_NEARBY_RADIUS_M = 500


class UserPresence:
    """Represents a user's current location and last seen timestamp"""

    def __init__(self, user_id: str, lat: float, lng: float):
        self.user_id = user_id
        self.lat = lat
        self.lng = lng
        self.last_seen = time.time()

    def update(self, lat: float, lng: float):
        self.lat = lat
        self.lng = lng
        self.last_seen = time.time()

    def is_expired(self, ttl_seconds: float = 30.0) -> bool:
        return (time.time() - self.last_seen) > ttl_seconds


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth (in meters).
    Uses the Haversine formula.
    """
    R = 6_371_000  # Earth radius in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


class PresenceService:
    """
    In-memory store for user presence data.
    Tracks user locations and computes nearby user counts per event.
    """

    # TTL for user presence entries (seconds)
    TTL_SECONDS = 30.0

    def __init__(self):
        # user_id -> UserPresence
        self._store: Dict[str, UserPresence] = {}

    def update_location(self, user_id: str, lat: float, lng: float) -> None:
        """Upsert user location, refresh last_seen."""
        if user_id in self._store:
            self._store[user_id].update(lat, lng)
        else:
            self._store[user_id] = UserPresence(user_id, lat, lng)

    def remove_user(self, user_id: str) -> None:
        """Remove user from presence store (on disconnect)."""
        self._store.pop(user_id, None)

    def cleanup_expired(self) -> None:
        """Remove entries whose last_seen is older than TTL."""
        expired = [uid for uid, p in self._store.items() if p.is_expired(self.TTL_SECONDS)]
        for uid in expired:
            del self._store[uid]

    def count_nearby_users(
        self,
        event_lat: float,
        event_lng: float,
        radius_m: float = DEFAULT_NEARBY_RADIUS_M,
        exclude_user_id: Optional[str] = None,
    ) -> int:
        """
        Count active users within `radius_m` meters of the given event location.
        Optionally exclude the requesting user themselves.
        """
        self.cleanup_expired()
        count = 0
        for uid, presence in self._store.items():
            if exclude_user_id and uid == exclude_user_id:
                continue
            dist = haversine_distance(presence.lat, presence.lng, event_lat, event_lng)
            if dist <= radius_m:
                count += 1
        return count

    def get_nearby_counts(
        self,
        events: List[dict],
        radius_m: float = DEFAULT_NEARBY_RADIUS_M,
        exclude_user_id: Optional[str] = None,
    ) -> Dict[str, int]:
        """
        Compute nearby user counts for multiple events at once.

        Args:
            events: list of dicts with keys: id, lat, lng
            radius_m: detection radius in meters
            exclude_user_id: user to exclude from counts (the requesting user)

        Returns:
            dict mapping event_id -> nearby user count
        """
        self.cleanup_expired()

        # Snapshot active presences to avoid repeated cleanup
        active = [
            p for p in self._store.values()
            if not p.is_expired(self.TTL_SECONDS) and (exclude_user_id is None or p.user_id != exclude_user_id)
        ]

        result: Dict[str, int] = {}
        for event in events:
            event_id = event.get("id") or event.get("event_id")
            event_lat = event.get("lat")
            event_lng = event.get("lng")

            if None in (event_id, event_lat, event_lng):
                continue

            count = sum(
                1 for p in active
                if haversine_distance(p.lat, p.lng, event_lat, event_lng) <= radius_m
            )
            result[event_id] = count

        return result

    def active_user_count(self) -> int:
        """Return total number of active (non-expired) users."""
        self.cleanup_expired()
        return len(self._store)


# Singleton instance shared across the application
presence_service = PresenceService()
