/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Check if user is within check-in radius of an event
 */
export function isWithinCheckinRadius(
    userLat: number,
    userLng: number,
    eventLat: number,
    eventLng: number,
    radiusMeters: number = 500
): boolean {
    const distance = calculateDistance(userLat, userLng, eventLat, eventLng);
    return distance <= radiusMeters;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
}

// Constants
export const CHECKIN_RADIUS_METERS = 100;
export const GPS_TIMEOUT_MS = 10000;
