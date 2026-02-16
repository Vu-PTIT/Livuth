import { useState, useEffect, useRef, useMemo, useContext, useCallback } from 'react';
import { useToast } from '../../components/Toast';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { eventApi, userApi } from '../../api/endpoints';
import type { Event } from '../../types';
import { CATEGORIES } from '../../constants/categories';
import CategoryChip from '../../components/CategoryChip';
import { calculateDistance, formatDistance, CHECKIN_RADIUS_METERS } from '../../utils/distance';
import { MagnifyingGlass, Crosshair, MapPin, X, FunnelSimple, Calendar, ArrowRight, CheckCircle, CalendarBlank, CaretDown } from '@phosphor-icons/react';
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

// Parse Vietnamese date string to Date object
const parseVietnameseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;

    // Handle formats like "ngày 15 tháng 1" or "15/1/2026" or "15-01-2026"

    // Format: "ngày X tháng Y"
    const vnMatch = dateStr.match(/ngày\s*(\d+)\s*tháng\s*(\d+)/i);
    if (vnMatch) {
        const day = parseInt(vnMatch[1]);
        const month = parseInt(vnMatch[2]) - 1; // months are 0-indexed
        const year = new Date().getFullYear();
        return new Date(year, month, day);
    }

    // Format: "DD/MM" or "DD/MM/YYYY"
    const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (slashMatch) {
        const day = parseInt(slashMatch[1]);
        const month = parseInt(slashMatch[2]) - 1;
        let year = slashMatch[3] ? parseInt(slashMatch[3]) : new Date().getFullYear();
        if (year < 100) year += 2000;
        return new Date(year, month, day);
    }

    // Format: "DD-MM-YYYY"
    const dashMatch = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
    if (dashMatch) {
        const day = parseInt(dashMatch[1]);
        const month = parseInt(dashMatch[2]) - 1;
        let year = parseInt(dashMatch[3]);
        if (year < 100) year += 2000;
        return new Date(year, month, day);
    }

    return null;
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
    const size = getMarkerSize(count);
    let { tier, color, hasPulse } = getMarkerTier(count);

    // Override style for past events
    if (isEventPast(event)) {
        tier = 'cold';
        color = '#9ca3af'; // Gray-400
        hasPulse = false;
    }

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
    const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'today' | 'week' | 'month' | 'year' | 'past'>('all');
    const [showDateFilter, setShowDateFilter] = useState(false);

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
    }, [fetchNearbyEvents, searchParams]);

    // Use shared categories from constants
    const allCategories = CATEGORIES;

    // Date filter options
    const dateFilterOptions = [
        { value: 'all' as const, label: 'Tất cả', icon: '📅' },
        { value: 'upcoming' as const, label: 'Sắp diễn ra', icon: '🚀' },
        { value: 'today' as const, label: 'Hôm nay', icon: '☀️' },
        { value: 'week' as const, label: '7 ngày tới', icon: '📆' },
        { value: 'month' as const, label: '30 ngày tới', icon: '🗓️' },
        { value: 'year' as const, label: 'Trong năm', icon: '🎯' },
        { value: 'past' as const, label: 'Đã qua', icon: '⏳' },
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
            case 'past':
                // Events that have already occurred
                return eventDate < today;

            case 'upcoming':
                // All upcoming events (from today onwards)
                return eventDate >= today;

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
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Trình duyệt của bạn không hỗ trợ định vị');
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
                toast.error('Không thể lấy vị trí của bạn. Vui lòng kiểm tra quyền truy cập vị trí.');
                setIsLocating(false);
            }
        );
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

                {/* Date Filter Dropdown */}
                <div className="date-filter-container">
                    <button
                        className={`date-filter-button ${dateFilter !== 'all' ? 'has-filter' : ''}`}
                        onClick={() => setShowDateFilter(!showDateFilter)}
                        title="Lọc theo thời gian"
                    >
                        <CalendarBlank size={20} />
                        <span className="date-filter-label">
                            {dateFilterOptions.find(opt => opt.value === dateFilter)?.label || 'Thời gian'}
                        </span>
                        <CaretDown size={14} className={`caret-icon ${showDateFilter ? 'open' : ''}`} />
                    </button>

                    {showDateFilter && (
                        <div className="date-filter-dropdown">
                            {dateFilterOptions.map((option) => (
                                <button
                                    key={option.value}
                                    className={`date-filter-option ${dateFilter === option.value ? 'active' : ''}`}
                                    onClick={() => {
                                        setDateFilter(option.value);
                                        setShowDateFilter(false);
                                    }}
                                >
                                    <span className="option-icon">{option.icon}</span>
                                    <span className="option-label">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
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
        </div>
    );
};

export default MapPage;
