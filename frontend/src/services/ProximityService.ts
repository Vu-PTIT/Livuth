/**
 * ProximityService - Location-based event notifications
 * 
 * This service monitors user location and sends notifications when
 * the user is within 1km of an event they've participated in.
 * 
 * For Android: Uses Capacitor Geolocation and LocalNotifications plugins.
 * For Web: Uses browser Geolocation API with Web Notifications.
 */

import { Capacitor } from '@capacitor/core';
import { calculateDistance } from '../utils/distance';
import { eventApi } from '../api/endpoints';
import type { Event } from '../types';

// Constants
const PROXIMITY_RADIUS_METERS = 1000; // 1km
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Track which events we've already notified about
const notifiedEvents = new Set<string>();

interface ProximityNotification {
    eventId: string;
    eventName: string;
    distance: number;
}

class ProximityService {
    private intervalId: number | null = null;
    private isRunning = false;
    private lastPosition: { lat: number; lng: number } | null = null;

    /**
     * Check if running on native platform (Android/iOS)
     */
    private isNative(): boolean {
        return Capacitor.isNativePlatform();
    }

    /**
     * Start the proximity monitoring service
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('[ProximityService] Already running');
            return;
        }

        console.log('[ProximityService] Starting...');
        this.isRunning = true;

        // Request permissions
        await this.requestPermissions();

        // Initial check
        await this.checkProximity();

        // Set up periodic checks
        this.intervalId = window.setInterval(() => {
            this.checkProximity();
        }, CHECK_INTERVAL_MS);

        console.log('[ProximityService] Started with interval:', CHECK_INTERVAL_MS, 'ms');
    }

    /**
     * Stop the proximity monitoring service
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('[ProximityService] Stopped');
    }

    /**
     * Request necessary permissions
     */
    private async requestPermissions(): Promise<void> {
        if (this.isNative()) {
            try {
                // Import Capacitor plugins dynamically
                const { Geolocation } = await import('@capacitor/geolocation');
                const { LocalNotifications } = await import('@capacitor/local-notifications');

                await Geolocation.requestPermissions();
                await LocalNotifications.requestPermissions();
            } catch (error) {
                console.error('[ProximityService] Failed to request native permissions:', error);
            }
        } else {
            // Web: Request notification permission
            if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
            }
        }
    }

    /**
     * Get current position
     */
    private async getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
        if (this.isNative()) {
            try {
                const { Geolocation } = await import('@capacitor/geolocation');
                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: false, // Battery saving
                    timeout: 10000,
                });
                return {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
            } catch (error) {
                console.error('[ProximityService] Native geolocation failed:', error);
                return null;
            }
        } else {
            // Web fallback
            return new Promise((resolve) => {
                if (!navigator.geolocation) {
                    resolve(null);
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        });
                    },
                    () => {
                        resolve(null);
                    },
                    { enableHighAccuracy: false, timeout: 10000 }
                );
            });
        }
    }

    /**
     * Check proximity to nearby events
     */
    private async checkProximity(): Promise<void> {
        console.log('[ProximityService] Checking proximity...');

        const position = await this.getCurrentPosition();
        if (!position) {
            console.log('[ProximityService] Could not get position');
            return;
        }

        this.lastPosition = position;
        console.log('[ProximityService] Position:', position.lat, position.lng);

        try {
            // Get nearby events (2km radius to catch approaching events)
            const response = await eventApi.getNearby(position.lat, position.lng, 2, 20);
            const nearbyEvents: Event[] = response.data.data || [];

            console.log('[ProximityService] Found', nearbyEvents.length, 'nearby events');

            for (const event of nearbyEvents) {
                // Skip if already notified
                if (notifiedEvents.has(event.id)) continue;

                // Skip if no coordinates
                const coords = event.location?.coordinates?.coordinates;
                if (!coords || coords.length !== 2) continue;

                const [lng, lat] = coords;
                const distance = calculateDistance(position.lat, position.lng, lat, lng);

                console.log('[ProximityService] Event', event.name, 'is', Math.round(distance), 'm away');

                // Check if within proximity radius
                if (distance <= PROXIMITY_RADIUS_METERS) {
                    await this.sendProximityNotification({
                        eventId: event.id,
                        eventName: event.name,
                        distance,
                    });
                    notifiedEvents.add(event.id);
                }
            }
        } catch (error) {
            console.error('[ProximityService] Failed to check nearby events:', error);
        }
    }

    /**
     * Send a proximity notification
     */
    private async sendProximityNotification(data: ProximityNotification): Promise<void> {
        const title = 'Sự kiện gần bạn! 📍';
        const body = `Bạn đang ở gần "${data.eventName}" (${Math.round(data.distance)}m). Ghé thăm nhé!`;

        console.log('[ProximityService] Sending notification:', title, body);

        if (this.isNative()) {
            try {
                const { LocalNotifications } = await import('@capacitor/local-notifications');
                await LocalNotifications.schedule({
                    notifications: [{
                        id: Date.now(),
                        title,
                        body,
                        extra: { eventId: data.eventId },
                    }],
                });
            } catch (error) {
                console.error('[ProximityService] Failed to send native notification:', error);
            }
        } else {
            // Web notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body });
            }
        }
    }

    /**
     * Clear notification history for an event (allow re-notification)
     */
    clearEventNotification(eventId: string): void {
        notifiedEvents.delete(eventId);
    }

    /**
     * Clear all notification history
     */
    clearAllNotifications(): void {
        notifiedEvents.clear();
    }

    /**
     * Get service status
     */
    getStatus(): { isRunning: boolean; lastPosition: { lat: number; lng: number } | null } {
        return {
            isRunning: this.isRunning,
            lastPosition: this.lastPosition,
        };
    }
}

// Export singleton instance
export const proximityService = new ProximityService();
export default proximityService;
