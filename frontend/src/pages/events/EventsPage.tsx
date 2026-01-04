import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { eventApi } from '../../api/endpoints';
import type { Event } from '../../types';
import EventCard from '../../components/EventCard';
import { EventCardSkeleton } from '../../components/Skeleton';
import { MagnifyingGlass, FunnelSimple, X } from '@phosphor-icons/react';
import './EventsPage.css';

const CATEGORIES = [
    'Văn hóa', 'Tâm linh', 'Ẩm thực', 'Âm nhạc', 'Thể thao', 'Nghệ thuật', 'Du lịch', 'Công nghệ'
];

const EventsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Filter states
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        searchParams.get('categories')?.split(',').filter(Boolean) || []
    );
    const [city, setCity] = useState(searchParams.get('city') || '');

    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true);
            try {
                // Always fetch all events, then filter locally
                const response = await eventApi.getAll(100);
                let allEvents = response.data.data || [];

                // Apply filters locally
                if (query) {
                    const searchQuery = query.toLowerCase();
                    allEvents = allEvents.filter((event: any) =>
                        event.name?.toLowerCase().includes(searchQuery) ||
                        event.content?.intro?.toLowerCase().includes(searchQuery) ||
                        event.location?.city?.toLowerCase().includes(searchQuery)
                    );
                }

                if (selectedCategories.length > 0) {
                    allEvents = allEvents.filter((event: any) =>
                        event.categories?.some((cat: string) =>
                            selectedCategories.some(selected =>
                                cat.toLowerCase() === selected.toLowerCase()
                            )
                        )
                    );
                }

                if (city) {
                    const cityQuery = city.toLowerCase();
                    allEvents = allEvents.filter((event: any) =>
                        event.location?.city?.toLowerCase().includes(cityQuery) ||
                        event.location?.province?.toLowerCase().includes(cityQuery)
                    );
                }

                setEvents(allEvents);
            } catch (error) {
                console.error('Failed to fetch events:', error);
                setEvents([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvents();
    }, [query, selectedCategories, city]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateSearchParams();
    };

    const updateSearchParams = () => {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (selectedCategories.length > 0) {
            params.set('categories', selectedCategories.join(','));
        }
        if (city) params.set('city', city);
        setSearchParams(params);
    };

    const toggleCategory = (cat: string) => {
        setSelectedCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };

    const clearFilters = () => {
        setQuery('');
        setSelectedCategories([]);
        setCity('');
        setSearchParams({});
    };

    const hasFilters = query || selectedCategories.length > 0 || city;

    return (
        <div className="events-page container">
            <div className="page-header">
                <h1 className="page-title">Sự kiện & Lễ hội</h1>
                <p className="page-subtitle">Khám phá các sự kiện văn hóa trên khắp Việt Nam</p>
            </div>

            {/* Search Bar */}
            <div className="search-section">
                <form className="search-bar" onSubmit={handleSearch}>
                    <MagnifyingGlass size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm sự kiện..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary btn-sm">
                        Tìm kiếm
                    </button>
                </form>

                <button
                    className={`btn btn-secondary filter-toggle ${showFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <FunnelSimple size={18} />
                    Bộ lọc
                    {hasFilters && <span className="filter-count">{selectedCategories.length + (city ? 1 : 0)}</span>}
                </button>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="filters-panel card">
                    <div className="filters-header">
                        <h3>Bộ lọc</h3>
                        {hasFilters && (
                            <button className="btn btn-sm btn-outline" onClick={clearFilters}>
                                <X size={16} />
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Danh mục</label>
                        <div className="category-chips">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    className={`chip ${selectedCategories.includes(cat) ? 'active' : ''}`}
                                    onClick={() => toggleCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label" htmlFor="city">Thành phố</label>
                        <input
                            type="text"
                            id="city"
                            className="form-input"
                            placeholder="vd: Hà Nội, TP.HCM..."
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Active Filters Display */}
            {hasFilters && !showFilters && (
                <div className="active-filters">
                    {query && (
                        <span className="filter-tag">
                            Từ khóa: {query}
                            <button onClick={() => setQuery('')}><X size={14} /></button>
                        </span>
                    )}
                    {selectedCategories.map((cat) => (
                        <span key={cat} className="filter-tag">
                            {cat}
                            <button onClick={() => toggleCategory(cat)}><X size={14} /></button>
                        </span>
                    ))}
                    {city && (
                        <span className="filter-tag">
                            {city}
                            <button onClick={() => setCity('')}><X size={14} /></button>
                        </span>
                    )}
                </div>
            )}

            {/* Results */}
            <div className="results-section">
                {isLoading ? (
                    <div className="events-grid grid grid-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <EventCardSkeleton key={i} />
                        ))}
                    </div>
                ) : events.length > 0 ? (
                    <>
                        <div className="results-count">
                            Tìm thấy <strong>{events.length}</strong> sự kiện
                        </div>
                        <div className="events-grid grid grid-4">
                            {events.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <div className="empty-state-icon">🎭</div>
                        <h3 className="empty-state-title">Không tìm thấy sự kiện</h3>
                        <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                        {hasFilters && (
                            <button className="btn btn-primary mt-3" onClick={clearFilters}>
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventsPage;
