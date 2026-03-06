import { Capacitor } from '@capacitor/core';

/**
 * Request application permissions (Location and Notifications) for both Mobile and Web.
 * Safe to call; it captures and logs errors without crashing the app.
 */
export const requestAppPermissions = async (): Promise<void> => {
    try {
        if (Capacitor.isNativePlatform()) {
            await requestNativePermissions();
        } else {
            await requestWebPermissions();
        }
    } catch (error) {
        console.error('[Permissions] Failed to request app permissions:', error);
    }
};

const requestNativePermissions = async (): Promise<void> => {
    try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const { LocalNotifications } = await import('@capacitor/local-notifications');

        console.log('[Permissions] Requesting Native Location permission...');
        await Geolocation.requestPermissions();

        console.log('[Permissions] Requesting Native Notification permission...');
        await LocalNotifications.requestPermissions();

        console.log('[Permissions] Native permissions requested successfully.');
    } catch (error) {
        console.error('[Permissions] Native permission request error:', error);
    }
};

const requestWebPermissions = async (): Promise<void> => {
    try {
        console.log('[Permissions] Requesting Web permissions concurrently...');

        // 1. Request Notification Permission (non-blocking)
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
                .then((permission) => console.log('[Permissions] Notification permission:', permission))
                .catch((err) => console.warn('[Permissions] Notification permission error:', err));
        }

        // 2. Request Location Permission (non-blocking)
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('[Permissions] Web Location permission granted.', position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.warn('[Permissions] Web Location permission denied or error:', error.message);
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
            );
        }
    } catch (error) {
        console.error('[Permissions] Web permission request error:', error);
    }
};
