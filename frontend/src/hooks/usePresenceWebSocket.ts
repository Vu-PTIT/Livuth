import { useEffect, useRef, useCallback, useState } from 'react';
import { getWebSocketUrl } from '../api/client';

const WS_PATH = '/ws/presence';
const UPDATE_INTERVAL_MS = 15_000; // Send location every 15 seconds
const INITIAL_DELAY_MS = 1_000;    // Small delay before first send

export interface PresenceEvent {
    id: string;
    lat: number;
    lng: number;
}

interface UsePresenceWebSocketOptions {
    /** Current user's location [lat, lng]. Pass null to skip (no permission). */
    userLocation: [number, number] | null;
    /** Events to track (must have id + coordinates). */
    events: PresenceEvent[];
    /** Detection radius in meters (default 500m). */
    radiusM?: number;
    /** Pass false to intentionally disconnect (e.g. user logged out). */
    enabled?: boolean;
}

interface UsePresenceWebSocketResult {
    /** Map from event_id → number of nearby users (excluding current user). */
    nearbyCounts: Record<string, number>;
    /** Total active users on the map right now. */
    activeUsers: number;
    /** Whether the WebSocket is currently connected. */
    isConnected: boolean;
}

/**
 * Maintains a WebSocket connection to the presence server and
 * returns real-time nearby user counts per event.
 */
export function usePresenceWebSocket({
    userLocation,
    events,
    radiusM = 500,
    enabled = true,
}: UsePresenceWebSocketOptions): UsePresenceWebSocketResult {
    const [nearbyCounts, setNearbyCounts] = useState<Record<string, number>>({});
    const [activeUsers, setActiveUsers] = useState(0);
    const [isConnected, setIsConnected] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectAttempts = useRef(0);
    const isMountedRef = useRef(true);

    // Keep latest values in refs so interval callback doesn't go stale
    const userLocationRef = useRef(userLocation);
    const eventsRef = useRef(events);
    const radiusRef = useRef(radiusM);
    useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
    useEffect(() => { eventsRef.current = events; }, [events]);
    useEffect(() => { radiusRef.current = radiusM; }, [radiusM]);

    /** Build the payload the server expects for `update_location`. */
    const buildPayload = useCallback(() => {
        const loc = userLocationRef.current;
        if (!loc) return null;
        return {
            type: 'update_location',
            lat: loc[0],
            lng: loc[1],
            radius_m: radiusRef.current,
            events: eventsRef.current.map(e => ({ id: e.id, lat: e.lat, lng: e.lng })),
        };
    }, []);

    /** Send current location + events to server if socket is open. */
    const sendUpdate = useCallback(() => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const payload = buildPayload();
        if (!payload) return;
        ws.send(JSON.stringify(payload));
    }, [buildPayload]);

    const clearTimers = useCallback(() => {
        if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
        }
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    }, []);

    const connect = useCallback(() => {
        if (!isMountedRef.current) return;

        const token = localStorage.getItem('access_token');
        if (!token) return;

        const url = `${getWebSocketUrl(WS_PATH)}?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!isMountedRef.current) { ws.close(); return; }
            reconnectAttempts.current = 0;
            setIsConnected(true);

            // Send first update after a small delay (give server time to register)
            setTimeout(sendUpdate, INITIAL_DELAY_MS);

            // Then send periodically
            updateIntervalRef.current = setInterval(sendUpdate, UPDATE_INTERVAL_MS);
        };

        ws.onmessage = (event) => {
            if (!isMountedRef.current) return;
            try {
                const msg = JSON.parse(event.data as string);
                if (msg.type === 'nearby_counts') {
                    setNearbyCounts(msg.data ?? {});
                    setActiveUsers(msg.active_users ?? 0);
                } else if (msg.type === 'presence_changed') {
                    // Another user came/left — ask server for fresh counts
                    const ws = wsRef.current;
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'request_counts',
                            radius_m: radiusRef.current,
                            events: eventsRef.current.map(e => ({ id: e.id, lat: e.lat, lng: e.lng })),
                        }));
                    }
                }
                // pong / other messages ignored
            } catch {
                // ignore parse errors
            }
        };

        ws.onclose = () => {
            if (!isMountedRef.current) return;
            setIsConnected(false);
            clearTimers();

            // Exponential back-off reconnect (max 30s)
            const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30_000);
            reconnectAttempts.current += 1;
            reconnectTimerRef.current = setTimeout(connect, delay);
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [sendUpdate, clearTimers, buildPayload]);

    // Connect when enabled + mounted, disconnect otherwise
    useEffect(() => {
        isMountedRef.current = true;

        if (enabled) {
            connect();
        }

        return () => {
            isMountedRef.current = false;
            clearTimers();
            if (wsRef.current) {
                wsRef.current.onclose = null; // prevent reconnect on unmount
                wsRef.current.close(1000, 'Component unmounted');
                wsRef.current = null;
            }
        };
        // Only re-run when enabled changes, not on every render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    // When userLocation first becomes available, send an immediate update
    useEffect(() => {
        if (userLocation && isConnected) {
            sendUpdate();
        }
    }, [userLocation, isConnected, sendUpdate]);

    // When the events list changes significantly, request fresh counts
    useEffect(() => {
        if (isConnected && events.length > 0) {
            sendUpdate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events.length, isConnected]);

    return { nearbyCounts, activeUsers, isConnected };
}
