import { useState, useEffect, useRef, useMemo, useContext, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { eventApi } from '../../api/endpoints';
import type { Event } from '../../types';
import { CATEGORIES } from '../../constants/categories';
import { MagnifyingGlass, Crosshair, MapPin, X, FunnelSimple, Calendar, ArrowRight } from '@phosphor-icons/react';
import 'leaflet/dist/leaflet.css';
import './MapPage.css';
import { AuthContext } from '../../contexts/AuthContext';

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

// Create user location marker with avatar
const createUserLocationIcon = (avatarUrl?: string) => {
    const defaultAvatar = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

    const html = avatarUrl
        ? `<div class="user-marker-avatar">
               <img src="${avatarUrl}" alt="Me" />
               <div class="user-marker-pulse"></div>
           </div>`
        : `<div class="user-marker-avatar user-marker-default">
               ${defaultAvatar}
               <div class="user-marker-pulse"></div>
           </div>`;

    return new L.DivIcon({
        className: 'user-location-marker',
        html,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });
};

// Function to get marker tier based on review count
const getMarkerTier = (count: number): { tier: string; color: string; hasPulse: boolean } => {
    if (count >= 50) return { tier: 'hot', color: '#ef4444', hasPulse: true };
    if (count >= 20) return { tier: 'warm', color: '#f97316', hasPulse: true };
    if (count >= 5) return { tier: 'medium', color: '#22c55e', hasPulse: false };
    return { tier: 'cold', color: '#6366f1', hasPulse: false };
};

// Function to get marker size based on participant count (logarithmic scale)
const getMarkerSize = (count: number): number => {
    const baseSize = 28;
    const maxSize = 52;
    if (count <= 0) return baseSize;
    return Math.min(maxSize, baseSize + Math.log10(count + 1) * 12);
};

// Function to format count for badge display
const formatCount = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    if (count >= 100) return `${count}`;
    return count > 0 ? `${count}` : '';
};

// Create dynamic event marker icon
const createEventIcon = (event: Event) => {
    // Use participant_count from backend, fallback to review_count if not available
    const count = event.participant_count || event.review_count || 0;
    const size = getMarkerSize(count);
    const { tier, color, hasPulse } = getMarkerTier(count);
    const badge = formatCount(count);

    const html = `
        <div class="event-marker event-marker--${tier}" style="width: ${size}px; height: ${size}px;">
            <div class="event-marker-dot" style="background: ${color};"></div>
            ${hasPulse ? `<div class="event-marker-pulse" style="background: ${color};"></div>` : ''}
            ${badge ? `<span class="event-marker-badge" style="color: ${color};">${badge}</span>` : ''}
        </div>
    `;

    return new L.DivIcon({
        className: 'event-marker-container',
        html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
    });
};

// Component to update map center
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

// Component to close popup when zooming out
function ClosePopupOnZoom() {
    const map = useMap();

    useEffect(() => {
        const handleZoomStart = () => {
            // Close popup when user starts zooming
            map.closePopup();
        };

        map.on('zoomstart', handleZoomStart);

        return () => {
            map.off('zoomstart', handleZoomStart);
        };
    }, [map]);

    return null;
}

// Calculate radius from map bounds (in km)
const calculateRadiusFromBounds = (map: L.Map): number => {
    const bounds = map.getBounds();
    const center = bounds.getCenter();
    const ne = bounds.getNorthEast();

    // Calculate distance from center to corner in km
    const R = 6371; // Earth's radius in km
    const dLat = (ne.lat - center.lat) * Math.PI / 180;
    const dLon = (ne.lng - center.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(center.lat * Math.PI / 180) * Math.cos(ne.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Return radius with some padding
    return Math.min(Math.max(distance * 1.2, 5), 500); // Min 5km, max 500km
};

// Component to detect map movement and trigger event reload
function MapEventHandler({ onViewportChange }: { onViewportChange: (center: L.LatLng, radius: number) => void }) {
    const map = useMap();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useMapEvents({
        moveend: () => {
            // Debounce: wait 500ms after user stops moving
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                const center = map.getCenter();
                const radius = calculateRadiusFromBounds(map);
                onViewportChange(center, radius);
            }, 500);
        },
        zoomend: () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                const center = map.getCenter();
                const radius = calculateRadiusFromBounds(map);
                onViewportChange(center, radius);
            }, 500);
        },
    });

    return null;
}

// Search result interface
interface SearchResult {
    display_name: string;
    lat: string;
    lon: string;
}

const MapPage = () => {
    const navigate = useNavigate();
    const auth = useContext(AuthContext);
    const user = auth?.user;
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [center, setCenter] = useState<[number, number]>([16.0, 106.0]); // Vietnam center
    const [zoom, setZoom] = useState(6);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const initialFetchDone = useRef(false);

    // Fetch events based on viewport using getNearby API
    const fetchNearbyEvents = useCallback(async (lat: number, lng: number, radiusKm: number) => {
        try {
            // Limit based on radius - smaller radius = fewer events needed
            const limit = radiusKm < 20 ? 30 : radiusKm < 100 ? 50 : 100;
            const response = await eventApi.getNearby(lat, lng, radiusKm, limit);
            if (response.data.success && response.data.data) {
                setEvents(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching nearby events:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle viewport change from map
    const handleViewportChange = useCallback((center: L.LatLng, radius: number) => {
        fetchNearbyEvents(center.lat, center.lng, radius);
    }, [fetchNearbyEvents]);

    // Initial fetch - get events near default center or user location
    useEffect(() => {
        if (initialFetchDone.current) return;

        // Initial fetch with large radius for Vietnam overview
        const initialFetch = async () => {
            try {
                // First try to get user location
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const userPos: [number, number] = [position.coords.latitude, position.coords.longitude];
                            setUserLocation(userPos);
                            setCenter(userPos);
                            setZoom(10);
                            // Fetch events near user with 50km radius
                            fetchNearbyEvents(userPos[0], userPos[1], 50);
                            initialFetchDone.current = true;
                        },
                        () => {
                            // Fallback to Vietnam center with large radius
                            fetchNearbyEvents(16.0, 106.0, 300);
                            initialFetchDone.current = true;
                        }
                    );
                } else {
                    fetchNearbyEvents(16.0, 106.0, 300);
                    initialFetchDone.current = true;
                }
            } catch (error) {
                console.error('Error in initial fetch:', error);
                setLoading(false);
            }
        };

        initialFetch();
    }, [fetchNearbyEvents]);

    // Use shared categories from constants
    const allCategories = CATEGORIES;

    // Filter events that have coordinates and apply category filter
    const eventsWithLocation = useMemo(() => {
        return events
            .filter((event) => {
                // Must have coordinates
                if (!event.location?.coordinates?.coordinates ||
                    event.location.coordinates.coordinates.length !== 2) {
                    return false;
                }
                // If categories selected, event must have at least one matching category
                if (selectedCategories.length > 0) {
                    return event.categories?.some(cat =>
                        selectedCategories.some(selected => cat.toLowerCase() === selected.toLowerCase())
                    ) || false;
                }
                return true;
            })
            .sort((a, b) => (b.participant_count || b.review_count || 0) - (a.participant_count || a.review_count || 0));
    }, [events, selectedCategories]);

    // Toggle category selection
    const toggleCategory = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    // Clear all category filters
    const clearCategoryFilters = () => {
        setSelectedCategories([]);
    };

    // Search location using Nominatim API
    const searchLocation = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                    query + ', Vietnam'
                )}&limit=5`
            );
            const data = await response.json();
            setSearchResults(data);
            setShowSearchResults(true);
        } catch (error) {
            console.error('Error searching location:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle search input change with debounce
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            searchLocation(value);
        }, 500);
    };

    // Handle search result click - also fetch nearby events for new location
    const handleResultClick = (result: SearchResult) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        setCenter([lat, lon]);
        setZoom(12);
        setSearchQuery(result.display_name.split(',')[0]);
        setShowSearchResults(false);
        // Fetch events near the searched location
        fetchNearbyEvents(lat, lon, 30);
    };

    // Get current location
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Trình duyệt của bạn không hỗ trợ định vị');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userPos: [number, number] = [position.coords.latitude, position.coords.longitude];
                setUserLocation(userPos);
                setCenter(userPos);
                setZoom(12);
                setIsLocating(false);
                // Fetch events near user location
                fetchNearbyEvents(userPos[0], userPos[1], 30);
            },
            (error) => {
                console.error('Error getting location:', error);
                alert('Không thể lấy vị trí của bạn. Vui lòng kiểm tra quyền truy cập vị trí.');
                setIsLocating(false);
            }
        );
    };

    // Navigate to event detail
    const handleEventClick = (eventId: string) => {
        navigate(`/events/${eventId}`);
    };

    if (loading) {
        return (
            <div className="map-page-loading">
                <div className="loading-spinner"></div>
                <p>Đang tải bản đồ...</p>
            </div>
        );
    }

    return (
        <div className="map-page">
            {/* Search and Controls */}
            <div className="map-controls">
                <div className="search-container">
                    <div className="search-input-wrapper">
                        <MagnifyingGlass size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm địa điểm..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                            className="search-input"
                        />
                        {searchQuery && (
                            <button
                                className="clear-search"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSearchResults([]);
                                    setShowSearchResults(false);
                                }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                        <div className="search-results">
                            {searchResults.map((result, index) => (
                                <button
                                    key={index}
                                    className="search-result-item"
                                    onClick={() => handleResultClick(result)}
                                >
                                    <MapPin size={16} />
                                    <span>{result.display_name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {isSearching && (
                        <div className="search-results">
                            <div className="search-loading">Đang tìm kiếm...</div>
                        </div>
                    )}
                </div>

                <button
                    className={`locate-button ${isLocating ? 'loading' : ''}`}
                    onClick={getCurrentLocation}
                    disabled={isLocating}
                    title="Vị trí của tôi"
                >
                    <Crosshair size={20} />
                </button>

                <button
                    className={`filter-button ${showFilters ? 'active' : ''} ${selectedCategories.length > 0 ? 'has-filter' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                    title="Lọc theo danh mục"
                >
                    <FunnelSimple size={20} />
                    {selectedCategories.length > 0 && (
                        <span className="filter-count">{selectedCategories.length}</span>
                    )}
                </button>
            </div>

            {/* Category Filters */}
            {showFilters && allCategories.length > 0 && (
                <div className="category-filters">
                    <div className="category-filters-header">
                        <span>Lọc theo danh mục:</span>
                        {selectedCategories.length > 0 && (
                            <button className="clear-filters" onClick={clearCategoryFilters}>
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                    <div className="category-chips">
                        {allCategories.map((category) => (
                            <button
                                key={category.id}
                                className={`category-chip ${selectedCategories.includes(category.name) ? 'active' : ''}`}
                                onClick={() => toggleCategory(category.name)}
                            >
                                <span className="category-icon">{category.icon}</span>
                                <span className="category-name">{category.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Event Count */}
            <div className="event-count">
                <MapPin size={16} />
                <span>{eventsWithLocation.length} sự kiện trên bản đồ</span>
            </div>

            {/* Legend */}
            <div className="map-legend">
                <div className="legend-item">
                    <span className="legend-dot legend-dot--cold"></span>
                    <span>Ít người tham gia</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot legend-dot--medium"></span>
                    <span>Trung bình</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot legend-dot--warm"></span>
                    <span>Đông đúc</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot legend-dot--hot"></span>
                    <span>Rất hot</span>
                </div>
            </div>

            {/* Map */}
            <MapContainer
                center={center}
                zoom={zoom}
                className="map-container"
                scrollWheelZoom={true}
                maxZoom={18}
                minZoom={4}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url={`https://api.maptiler.com/maps/base-v4/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`}
                />
                <MapUpdater center={center} zoom={zoom} />
                <ClosePopupOnZoom />
                <MapEventHandler onViewportChange={handleViewportChange} />

                {eventsWithLocation.map((event) => {
                    const [lng, lat] = event.location!.coordinates!.coordinates;
                    return (
                        <Marker
                            key={event.id}
                            position={[lat, lng]}
                            icon={createEventIcon(event)}
                        >
                            <Popup>
                                <div className="event-popup">
                                    {event.media && event.media.length > 0 && (
                                        <div className="popup-image-wrapper">
                                            <img
                                                src={event.media[0].url}
                                                alt={event.name}
                                                className="popup-image"
                                            />
                                            <div className="popup-image-overlay" />
                                            {event.categories && event.categories.length > 0 && (
                                                <span className="popup-category-badge">
                                                    {event.categories[0]}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <h3 className="popup-title">{event.name}</h3>
                                    {event.location?.address && (
                                        <p className="popup-address">
                                            <MapPin size={14} weight="fill" />
                                            {event.location.address}
                                        </p>
                                    )}
                                    {event.time?.next_occurrence && (
                                        <p className="popup-time">
                                            <Calendar size={14} />
                                            {event.time.next_occurrence}
                                        </p>
                                    )}
                                    <button
                                        className="popup-button"
                                        onClick={() => handleEventClick(event.id)}
                                    >
                                        Xem chi tiết
                                        <ArrowRight size={16} weight="bold" />
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* User Location Marker */}
                {userLocation && (
                    <Marker position={userLocation} icon={createUserLocationIcon(user?.avatar_url)} />
                )}
            </MapContainer>
        </div>
    );
};

export default MapPage;
