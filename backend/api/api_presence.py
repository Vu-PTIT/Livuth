"""
Presence WebSocket API - Realtime user location tracking for nearby user counting
"""
import json
import asyncio
from typing import Dict, Set, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from backend.core.security import decode_jwt
from backend.services.srv_presence import presence_service, DEFAULT_NEARBY_RADIUS_M

router = APIRouter(prefix="/ws")


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        # user_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str) -> None:
        self.active_connections.pop(user_id, None)
        presence_service.remove_user(user_id)

    async def send_personal(self, user_id: str, data: dict) -> None:
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                pass  # Connection may already be closed

    async def broadcast(self, data: dict, exclude: Optional[Set[str]] = None) -> None:
        """Broadcast a message to all connected users."""
        exclude = exclude or set()
        dead = []
        for uid, ws in self.active_connections.items():
            if uid in exclude:
                continue
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(uid)
        # Clean up dead connections
        for uid in dead:
            self.disconnect(uid)

    def connected_count(self) -> int:
        return len(self.active_connections)


manager = ConnectionManager()


@router.websocket("/presence")
async def presence_websocket(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token for authentication"),
):
    """
    WebSocket endpoint for realtime user presence tracking.

    Client messages (JSON):
        {
            "type": "update_location",
            "lat": <float>,
            "lng": <float>,
            "events": [{"id": <str>, "lat": <float>, "lng": <float>}, ...],
            "radius_m": <float>  (optional, default 500)
        }

    Server messages (JSON):
        Success:
        {
            "type": "nearby_counts",
            "data": { "<event_id>": <count>, ... },
            "active_users": <total active users on map>
        }

        Error:
        {
            "type": "error",
            "message": "<reason>"
        }
    """
    # --- Authentication ---
    try:
        payload = decode_jwt(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    # --- Connect ---
    await manager.connect(user_id, websocket)
    print(f"[Presence WS] User {user_id} connected. Total: {manager.connected_count()}")

    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break
                continue

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")

            if msg_type == "update_location":
                lat = msg.get("lat")
                lng = msg.get("lng")
                events = msg.get("events", [])
                radius_m = float(msg.get("radius_m", DEFAULT_NEARBY_RADIUS_M))

                if lat is None or lng is None:
                    await websocket.send_json({"type": "error", "message": "lat and lng required"})
                    continue

                # Update this user's location
                presence_service.update_location(user_id, float(lat), float(lng))

                # Compute nearby counts for all provided events
                counts = presence_service.get_nearby_counts(
                    events=events,
                    radius_m=radius_m,
                    exclude_user_id=user_id,  # Don't count the requesting user themselves
                )

                # Send counts back to THIS user immediately
                await manager.send_personal(user_id, {
                    "type": "nearby_counts",
                    "data": counts,
                    "active_users": presence_service.active_user_count(),
                })

                # Also refresh counts for ALL other connected users
                # (their view of nearby users may have changed because this user moved)
                # We do a lightweight broadcast: each user's last known events can differ,
                # so we just send a "presence_changed" signal for them to re-request.
                await manager.broadcast(
                    {"type": "presence_changed"},
                    exclude={user_id},
                )

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "request_counts":
                # Client can request current counts without updating location
                events = msg.get("events", [])
                radius_m = float(msg.get("radius_m", DEFAULT_NEARBY_RADIUS_M))
                counts = presence_service.get_nearby_counts(
                    events=events,
                    radius_m=radius_m,
                    exclude_user_id=user_id,
                )
                await manager.send_personal(user_id, {
                    "type": "nearby_counts",
                    "data": counts,
                    "active_users": presence_service.active_user_count(),
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[Presence WS] Error for user {user_id}: {e}")
    finally:
        manager.disconnect(user_id)
        print(f"[Presence WS] User {user_id} disconnected. Total: {manager.connected_count()}")

        # Notify others that someone left
        await manager.broadcast(
            {"type": "presence_changed"},
            exclude={user_id},
        )
