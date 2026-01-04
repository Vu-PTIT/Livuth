import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { eventApi } from '../../api/endpoints';
import type { Event } from '../../types';
import { MagnifyingGlass, Crosshair, MapPin, X } from '@phosphor-icons/react';
import 'leaflet/dist/leaflet.css';
import './MapPage.css';

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

// Custom event marker icon
const eventIcon = new L.Icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Custom user location marker icon (blue)
const userLocationIcon = new L.DivIcon({
    className: 'user-location-marker',
    html: '<div class="user-marker-dot"><div class="user-marker-pulse"></div></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

// Component to update map center
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
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

    // Fetch all events
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await eventApi.getAll(100);
                if (response.data.success && response.data.data) {
                    setEvents(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching events:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    // Filter events that have coordinates
    const eventsWithLocation = events.filter(
        (event) =>
            event.location?.coordinates?.coordinates &&
            event.location.coordinates.coordinates.length === 2
    );

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

    // Handle search result click
    const handleResultClick = (result: SearchResult) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        setCenter([lat, lon]);
        setSearchQuery(result.display_name.split(',')[0]);
        setShowSearchResults(false);
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
                setIsLocating(false);
            },
            (error) => {
                console.error('Error getting location:', error);
                alert('Không thể lấy vị trí của bạn. Vui lòng kiểm tra quyền truy cập vị trí.');
                setIsLocating(false);
            }
        );
    };

    // Auto-detect user location on mount and center map
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userPos: [number, number] = [position.coords.latitude, position.coords.longitude];
                    setUserLocation(userPos);
                    setCenter(userPos); // Center map on user location
                    setZoom(10); // Zoom closer (about 2 provinces)
                },
                (error) => {
                    console.log('Could not get user location:', error.message);
                }
            );
        }
    }, []);

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
            </div>

            {/* Event Count */}
            <div className="event-count">
                <MapPin size={16} />
                <span>{eventsWithLocation.length} sự kiện trên bản đồ</span>
            </div>

            {/* Map */}
            <MapContainer
                center={center}
                zoom={zoom}
                className="map-container"
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater center={center} zoom={zoom} />

                {eventsWithLocation.map((event) => {
                    const [lng, lat] = event.location!.coordinates!.coordinates;
                    return (
                        <Marker key={event.id} position={[lat, lng]} icon={eventIcon}>
                            <Popup>
                                <div className="event-popup">
                                    {event.media && event.media.length > 0 && (
                                        <img
                                            src={event.media[0].url}
                                            alt={event.name}
                                            className="popup-image"
                                        />
                                    )}
                                    <h3 className="popup-title">{event.name}</h3>
                                    {event.location?.address && (
                                        <p className="popup-address">
                                            <MapPin size={14} />
                                            {event.location.address}
                                        </p>
                                    )}
                                    {event.time?.next_occurrence && (
                                        <p className="popup-time">{event.time.next_occurrence}</p>
                                    )}
                                    <button
                                        className="popup-button"
                                        onClick={() => handleEventClick(event.id)}
                                    >
                                        Xem chi tiết
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* User Location Marker */}
                {userLocation && (
                    <Marker position={userLocation} icon={userLocationIcon} />
                )}
            </MapContainer>
        </div>
    );
};

export default MapPage;
