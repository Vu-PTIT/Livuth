import { useState, useEffect, useRef, useMemo, useContext, useCallback } from 'react';
import { useToast } from '../../components/Toast';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { eventApi, userApi } from '../../api/endpoints';
import type { Event } from '../../types';
import { CATEGORIES, getCategoryIcon } from '../../constants/categories';
import CategoryChip from '../../components/CategoryChip';
import { calculateDistance, formatDistance, CHECKIN_RADIUS_METERS } from '../../utils/distance';
import { parseVietnameseDate, formatToVietnameseDate } from '../../utils/date';
import { MagnifyingGlass, Crosshair, MapPin, X, FunnelSimple, Calendar, ArrowRight, CheckCircle, CalendarBlank } from '@phosphor-icons/react';
import 'leaflet/dist/leaflet.css';
import './MapPage.css';
import { AuthContext } from '../../contexts/AuthContext';
import { Geolocation } from '@capacitor/geolocation';
import Modal from '../../components/Modal';

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


// Check if event is in the past
const isEventPast = (event: Event): boolean => {
    const nextOccurrence = event.time?.next_occurrence;
    if (!nextOccurrence) return false;

    const eventDate = parseVietnameseDate(nextOccurrence);
    if (!eventDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    return eventDate < today;
};

// Create dynamic event marker icon
const createEventIcon = (event: Event) => {
    // Use participant_count from backend, fallback to review_count if not available
    const count = event.participant_count || event.review_count || 0;
    const baseSize = getMarkerSize(count);
    // Increase size slightly to fit images better
    const size = Math.max(40, baseSize);
    let { tier, color, hasPulse } = getMarkerTier(count);

    // Override style for past events
    if (isEventPast(event)) {
        tier = 'cold';
        color = '#9ca3af'; // Gray-400
        hasPulse = false;
    }

    const badge = formatCount(count);

    // Check if event has an image
    const imageUrl = event.media && event.media.length > 0 ? event.media[0].url : null;
    const categoryName = event.categories && event.categories.length > 0 ? event.categories[0] : '';
    const categoryIcon = categoryName ? getCategoryIcon(categoryName) : '📍';
    const hasImage = !!imageUrl;

    const fallbackHtml = `<span style="font-size: ${Math.max(16, size * 0.45)}px; line-height: 1;">${categoryIcon}</span>`;
    const escapedFallback = fallbackHtml.replace(/"/g, '&quot;');

    const iconContent = hasImage
        ? `<img src="${imageUrl}" alt="" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.outerHTML='${escapedFallback}';" />`
        : fallbackHtml;

    const html = `
        <div class="event-marker event-marker--${tier}" style="width: ${size}px; height: ${size}px;">
            <div class="event-marker-dot" style="background: ${hasImage ? 'white' : color}; border-color: ${hasImage ? color : 'white'}; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${iconContent}
            </div>
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

// Create custom cluster icon
const createClusterIcon = (cluster: any) => {
    return new L.DivIcon({
        html: `<div class="cluster-icon">
                <span>${cluster.getChildCount()}</span>
              </div>`,
        className: 'custom-marker-cluster',
        iconSize: L.point(40, 40, true),
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

// Component for Event Popup Image with fallback
const PopupImage = ({ event }: { event: Event }) => {
    const [imgError, setImgError] = useState(false);

    if (!event.media || event.media.length === 0) return null;

    if (imgError) {
        const categoryName = event.categories && event.categories.length > 0 ? event.categories[0] : '';
        const categoryIcon = categoryName ? getCategoryIcon(categoryName) : '📍';
        return (
            <div className="popup-image-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
                <span style={{ fontSize: '48px' }}>{categoryIcon}</span>
                <div className="popup-image-overlay" />
                {categoryName && (
                    <span className="popup-category-badge">
                        {categoryName}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="popup-image-wrapper">
            <img
                src={event.media[0].url}
                alt={event.name}
                className="popup-image"
                onError={() => setImgError(true)}
            />
            <div className="popup-image-overlay" />
            {event.categories && event.categories.length > 0 && (
                <span className="popup-category-badge">
                    {event.categories[0]}
                </span>
            )}
        </div>
    );
};

const MapPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const toast = useToast();
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
    const [checkingInEventId, setCheckingInEventId] = useState<string | null>(null);
    const [checkedInEvents, setCheckedInEvents] = useState<string[]>([]);
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
    const [showLocationPrompt, setShowLocationPrompt] = useState(false);

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

    const requestLocation = useCallback(async (isInitial = false, showPrompt = true) => {
        setIsLocating(true);
        try {
            // Check current permissions
            let permStatus = await Geolocation.checkPermissions();

            // If prompt is needed, request permissions - BUT only if showPrompt is true
            // If it's the initial load, we don't want to aggressively prompt if they haven't granted it yet.
            if ((permStatus.location === 'prompt' || permStatus.location === 'prompt-with-rationale') && showPrompt) {
                permStatus = await Geolocation.requestPermissions();
            }

            // If permission is denied or still prompt (meaning we didn't ask)
            if (permStatus.location === 'denied' || permStatus.location === 'prompt' || permStatus.location === 'prompt-with-rationale') {
                if (showPrompt) {
                    setShowLocationPrompt(true);
                }
                if (isInitial) {
                    fetchNearbyEvents(16.0, 106.0, 300); // Fallback to Vietnam
                }
                setIsLocating(false);
                return false;
            }

            // Get current position
            const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
            const userPos: [number, number] = [coordinates.coords.latitude, coordinates.coords.longitude];

            setUserLocation(userPos);
            setCenter(userPos);
            setZoom(isInitial ? 10 : 12);
            setIsLocating(false);

            // Fetch nearby events
            fetchNearbyEvents(userPos[0], userPos[1], isInitial ? 50 : 30);
            return true;
        } catch (error) {
            console.error('Error getting location:', error);
            if (showPrompt) {
                setShowLocationPrompt(true);
            }
            setIsLocating(false);
            if (isInitial) {
                fetchNearbyEvents(16.0, 106.0, 300); // Fallback to Vietnam
            }
            return false;
        }
    }, [fetchNearbyEvents]);

    // Initial fetch - get events near default center or user location
    useEffect(() => {
        if (initialFetchDone.current) return;

        const initialFetch = async () => {
            // Check for query params first
            const latParam = searchParams.get('lat');
            const lngParam = searchParams.get('lng');
            // const eventIdParam = searchParams.get('eventId');

            if (latParam && lngParam) {
                const lat = parseFloat(latParam);
                const lng = parseFloat(lngParam);
                if (!isNaN(lat) && !isNaN(lng)) {
                    setCenter([lat, lng]);
                    setZoom(15);
                    // Fetch specifically around this point
                    fetchNearbyEvents(lat, lng, 10);
                    initialFetchDone.current = true;
                    // If we have an event ID, we might want to highlight it or open popup later
                    // For now, centering is enough
                    return;
                }
            }

            try {
                await requestLocation(true, false);
                initialFetchDone.current = true;
            } catch (error) {
                console.error('Error in initial fetch:', error);
                setLoading(false);
            }
        };

        initialFetch();
    }, [fetchNearbyEvents, searchParams, requestLocation]);

    // Use shared categories from constants
    const allCategories = CATEGORIES;

    // Date filter options
    const dateFilterOptions = [
        { value: 'all' as const, label: 'Tất cả', icon: '📅' },
        { value: 'today' as const, label: 'Trong ngày', icon: '☀️' },
        { value: 'week' as const, label: 'Tuần', icon: '📆' },
        { value: 'month' as const, label: 'Tháng', icon: '🗓️' },
        { value: 'year' as const, label: 'Năm', icon: '🎯' },
    ];



    // Check if event date matches the filter
    const matchesDateFilter = (event: Event): boolean => {
        if (dateFilter === 'all') return true;

        const nextOccurrence = event.time?.next_occurrence;
        if (!nextOccurrence) return false;

        const eventDate = parseVietnameseDate(nextOccurrence);
        if (!eventDate) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        switch (dateFilter) {
            case 'today':
                return eventDate >= today && eventDate <= endOfToday;

            case 'week': {
                const endOfWeek = new Date(today);
                endOfWeek.setDate(today.getDate() + 7);
                endOfWeek.setHours(23, 59, 59, 999);
                return eventDate >= today && eventDate <= endOfWeek;
            }

            case 'month': {
                const endOfMonth = new Date(today);
                endOfMonth.setDate(today.getDate() + 30);
                endOfMonth.setHours(23, 59, 59, 999);
                return eventDate >= today && eventDate <= endOfMonth;
            }

            case 'year': {
                const endOfYear = new Date(today);
                endOfYear.setFullYear(today.getFullYear() + 1);
                endOfYear.setHours(23, 59, 59, 999);
                return eventDate >= today && eventDate <= endOfYear;
            }

            default:
                return true;
        }
    };

    // Filter events that have coordinates and apply category + date filter
    const eventsWithLocation = useMemo(() => {
        return events
            .filter((event) => {
                // Must have coordinates
                if (!event.location?.coordinates?.coordinates ||
                    event.location.coordinates.coordinates.length !== 2) {
                    return false;
                }
                // Apply date filter
                if (!matchesDateFilter(event)) {
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
    }, [events, selectedCategories, dateFilter]);

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
    const getCurrentLocation = async () => {
        await requestLocation(false);
    };

    // Navigate to event detail
    const handleEventClick = (eventId: string) => {
        navigate(`/events/${eventId}`);
    };

    // Handle check-in at event location
    const handleCheckIn = async (event: Event) => {
        if (!user || !userLocation) return;

        const [lng, lat] = event.location!.coordinates!.coordinates;
        const distance = calculateDistance(userLocation[0], userLocation[1], lat, lng);

        if (distance > CHECKIN_RADIUS_METERS) {
            toast.warning(`Bạn cần đến gần sự kiện hơn. Khoảng cách: ${formatDistance(distance)} (cần trong ${CHECKIN_RADIUS_METERS}m)`);
            return;
        }

        setCheckingInEventId(event.id);
        try {
            await userApi.addParticipatedEvent(user.id, event.id);
            setCheckedInEvents(prev => [...prev, event.id]);
            toast.success('Check-in thành công! 🎉');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể check-in');
        } finally {
            setCheckingInEventId(null);
        }
    };

    // Calculate distance from user to event
    const getDistanceToEvent = (event: Event): number | null => {
        if (!userLocation || !event.location?.coordinates?.coordinates) return null;
        const [lng, lat] = event.location.coordinates.coordinates;
        return calculateDistance(userLocation[0], userLocation[1], lat, lng);
    };

    // Check if user is within check-in range
    const isInCheckInRange = (event: Event): boolean => {
        const distance = getDistanceToEvent(event);
        return distance !== null && distance <= CHECKIN_RADIUS_METERS;
    };

    // Initialize checked-in events from user data
    useEffect(() => {
        if (user?.participated_events) {
            setCheckedInEvents(user.participated_events);
        }
    }, [user]);

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

            {/* Unified Filter Panel */}
            {showFilters && (
                <div className="unified-filters-panel">
                    <div className="filters-header">
                        <h3>Bộ lọc tìm kiếm</h3>
                        {(selectedCategories.length > 0 || dateFilter !== 'all') && (
                            <button
                                className="clear-all-filters"
                                onClick={() => {
                                    clearCategoryFilters();
                                    setDateFilter('all');
                                }}
                            >
                                Xóa tất cả
                            </button>
                        )}
                    </div>

                    <div className="filters-content">
                        {/* Date Filter Section */}
                        <div className="filter-section">
                            <div className="filter-section-title">
                                <CalendarBlank size={18} />
                                <span>Thời gian</span>
                            </div>
                            <div className="date-options-grid">
                                {dateFilterOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        className={`date-option-chip ${dateFilter === option.value ? 'active' : ''}`}
                                        onClick={() => setDateFilter(option.value)}
                                    >
                                        <span className="option-icon">{option.icon}</span>
                                        <span className="option-label">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="filter-divider"></div>

                        {/* Category Filter Section */}
                        <div className="filter-section">
                            <div className="filter-section-title">
                                <FunnelSimple size={18} />
                                <span>Danh mục</span>
                            </div>
                            <div className="category-chips-grid">
                                {allCategories.map((category) => (
                                    <CategoryChip
                                        key={category.id}
                                        name={category.name}
                                        icon={category.icon}
                                        isActive={selectedCategories.includes(category.name)}
                                        onClick={() => toggleCategory(category.name)}
                                        variant="rounded"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <button className="close-filters-btn" onClick={() => setShowFilters(false)}>
                        Đóng
                    </button>
                </div>
            )}

            {/* Event Count */}
            <div className="event-count">
                <MapPin size={16} />
                <span>{eventsWithLocation.length} sự kiện trên bản đồ</span>
            </div>

            {/* Legend */}
            {/* Legend removed */}

            {/* Map */}
            <MapContainer
                center={center}
                zoom={zoom}
                zoomControl={false}
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

                <MarkerClusterGroup
                    chunkedLoading
                    iconCreateFunction={createClusterIcon}
                    maxClusterRadius={60}
                    spiderfyOnMaxZoom={true}
                >
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
                                        <PopupImage event={event} />
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
                                                {formatToVietnameseDate(event.time.next_occurrence)}
                                            </p>
                                        )}
                                        <button
                                            className="popup-button"
                                            onClick={() => handleEventClick(event.id)}
                                        >
                                            Xem chi tiết
                                            <ArrowRight size={16} weight="bold" />
                                        </button>

                                        {/* Check-in Button */}
                                        {user && event.location?.coordinates?.coordinates && (
                                            <>
                                                {checkedInEvents.includes(event.id) ? (
                                                    <div className="popup-checkedin">
                                                        <CheckCircle size={16} weight="fill" />
                                                        Đã check-in
                                                    </div>
                                                ) : isInCheckInRange(event) ? (
                                                    <button
                                                        className="popup-checkin-btn"
                                                        onClick={() => handleCheckIn(event)}
                                                        disabled={checkingInEventId === event.id}
                                                    >
                                                        <CheckCircle size={16} weight="bold" />
                                                        {checkingInEventId === event.id ? 'Đang check-in...' : 'Check-in'}
                                                    </button>
                                                ) : userLocation ? (
                                                    <div className="popup-distance">
                                                        📍 Cách {formatDistance(getDistanceToEvent(event) || 0)}
                                                    </div>
                                                ) : null}
                                            </>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>

                {/* User Location Marker */}
                {userLocation && (
                    <Marker position={userLocation} icon={createUserLocationIcon(user?.avatar_url)} />
                )}
            </MapContainer>

            {/* Location Permission Prompt Modal */}
            <Modal
                isOpen={showLocationPrompt}
                onClose={() => setShowLocationPrompt(false)}
                title="Yêu cầu truy cập vị trí"
                size="small"
            >
                <div style={{ padding: '0 20px 20px', textAlign: 'center' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        backgroundColor: '#fee2e2',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <MapPin size={32} color="#ef4444" weight="fill" />
                    </div>
                    <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
                        Ứng dụng cần sử dụng vị trí của bạn
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
                        Để tìm kiếm sự kiện gần bạn và cung cấp trải nghiệm tốt nhất, vui lòng cho phép quyền truy cập vị trí trong cài đặt trình duyệt hoặc thiết bị của bạn.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                        <button
                            style={{
                                padding: '12px 16px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                width: '100%',
                                transition: 'background 0.2s'
                            }}
                            onClick={() => {
                                setShowLocationPrompt(false);
                                requestLocation(false);
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
                        >
                            Thử lại
                        </button>
                        <button
                            style={{
                                padding: '12px 16px',
                                backgroundColor: '#f3f4f6',
                                color: '#4b5563',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                width: '100%',
                                transition: 'background 0.2s'
                            }}
                            onClick={() => setShowLocationPrompt(false)}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MapPage;
