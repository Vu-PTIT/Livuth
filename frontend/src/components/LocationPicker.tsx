import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MagnifyingGlass, MapPin, Crosshair, ArrowsOut, X } from '@phosphor-icons/react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

interface LocationPickerProps {
    coordinates?: { lat: number; lng: number } | null;
    address?: string;
    city?: string;
    province?: string;
    onLocationChange: (coords: { lat: number; lng: number } | null) => void;
}

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

// Component to center map on coordinates
function MapCenterer({ coordinates }: { coordinates: { lat: number; lng: number } | null }) {
    const map = useMap();
    useEffect(() => {
        if (coordinates) {
            map.setView([coordinates.lat, coordinates.lng], 14);
        }
    }, [coordinates, map]);
    return null;
}

// Component to invalidate map size when modal opens
function MapResizer({ trigger }: { trigger: boolean }) {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }, [trigger, map]);
    return null;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
    coordinates,
    address,
    city,
    province,
    onLocationChange,
}) => {
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [geocodeError, setGeocodeError] = useState('');
    const [mapCenter] = useState<[number, number]>([16.0, 106.0]); // Vietnam center
    const [isExpanded, setIsExpanded] = useState(false);

    // Geocode address to coordinates using Nominatim
    const geocodeAddress = async () => {
        const searchQuery = [address, city, province].filter(Boolean).join(', ');
        if (!searchQuery.trim()) {
            setGeocodeError('Vui lòng nhập địa chỉ trước');
            return;
        }

        setIsGeocoding(true);
        setGeocodeError('');

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=vn&limit=1`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                onLocationChange({ lat: parseFloat(lat), lng: parseFloat(lon) });
            } else {
                setGeocodeError('Không tìm thấy vị trí. Hãy thử click trực tiếp trên bản đồ.');
            }
        } catch (error) {
            setGeocodeError('Lỗi khi tìm vị trí. Vui lòng thử lại.');
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleMapClick = (lat: number, lng: number) => {
        onLocationChange({ lat, lng });
    };

    const clearLocation = () => {
        onLocationChange(null);
    };

    return (
        <div className="location-picker">
            <div className="location-picker-header">
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={geocodeAddress}
                    disabled={isGeocoding}
                >
                    <MagnifyingGlass size={16} />
                    {isGeocoding ? 'Đang tìm...' : 'Tìm tọa độ từ địa chỉ'}
                </button>
                <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setIsExpanded(true)}
                >
                    <ArrowsOut size={16} />
                    Mở rộng
                </button>
                {coordinates && (
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={clearLocation}
                    >
                        Xóa vị trí
                    </button>
                )}
            </div>

            {geocodeError && (
                <div className="geocode-error">{geocodeError}</div>
            )}

            <div className="location-picker-map">
                <MapContainer
                    center={coordinates ? [coordinates.lat, coordinates.lng] : mapCenter}
                    zoom={coordinates ? 14 : 6}
                    style={{ height: '250px', width: '100%', borderRadius: '8px' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url={`https://api.maptiler.com/maps/base-v4/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`}
                    />
                    <MapClickHandler onLocationSelect={handleMapClick} />
                    <MapCenterer coordinates={coordinates || null} />
                    {coordinates && (
                        <Marker position={[coordinates.lat, coordinates.lng]} />
                    )}
                </MapContainer>
            </div>

            <div className="location-picker-hint">
                <MapPin size={14} />
                <span>Click trên bản đồ để chọn vị trí hoặc dùng nút "Tìm tọa độ" để tự động định vị</span>
            </div>

            {coordinates && (
                <div className="location-picker-coords">
                    <Crosshair size={14} />
                    <span>
                        Tọa độ: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                    </span>
                </div>
            )}

            {/* Expanded Map Modal */}
            {isExpanded && (
                <div className="location-picker-modal" onClick={() => setIsExpanded(false)}>
                    <div className="location-picker-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="location-picker-modal-header">
                            <h3>Chọn vị trí trên bản đồ</h3>
                            <button
                                type="button"
                                className="location-picker-modal-close"
                                onClick={() => setIsExpanded(false)}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="location-picker-modal-map">
                            <MapContainer
                                center={coordinates ? [coordinates.lat, coordinates.lng] : mapCenter}
                                zoom={coordinates ? 14 : 6}
                                style={{ height: '100%', width: '100%' }}
                                scrollWheelZoom={true}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url={`https://api.maptiler.com/maps/base-v4/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`}
                                />
                                <MapClickHandler onLocationSelect={handleMapClick} />
                                <MapCenterer coordinates={coordinates || null} />
                                <MapResizer trigger={isExpanded} />
                                {coordinates && (
                                    <Marker position={[coordinates.lat, coordinates.lng]} />
                                )}
                            </MapContainer>
                        </div>
                        <div className="location-picker-modal-footer">
                            {coordinates ? (
                                <>
                                    <Crosshair size={16} />
                                    <span>
                                        Tọa độ: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                                    </span>
                                </>
                            ) : (
                                <span className="location-picker-modal-hint">Click trên bản đồ để chọn vị trí</span>
                            )}
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => setIsExpanded(false)}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationPicker;
