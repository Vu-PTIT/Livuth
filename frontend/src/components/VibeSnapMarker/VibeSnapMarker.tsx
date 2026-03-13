import type { VibeSnap } from '../../types';
import L from 'leaflet';
import './VibeSnapMarker.css';

// Fix for default marker icon in Leaflet with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Set default icon
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

export const createVibeSnapIcon = (snap: VibeSnap) => {
    // Determine the thumbnail to show. Usually avatar.
    const thumbUrl = snap.user.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + snap.user.username;
    
    const html = `
        <div class="vibe-snap-marker">
            <div class="vibe-snap-story-ring">
                <img src="${thumbUrl}" alt="@${snap.user.username}" />
            </div>
            ${snap.type === 'video' ? '<div class="vibe-snap-play-icon">▶</div>' : ''}
        </div>
    `;

    return new L.DivIcon({
        className: 'vibe-snap-marker-container',
        html,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
    });
};
