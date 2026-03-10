import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearchEvents } from '../../hooks/useDataCaching';
import type { Event } from '../../types';
import EventCard from '../../components/EventCard';
import { useAuth } from '../../hooks/useAuth';
import { EventCardSkeleton } from '../../components/Skeleton';
import { CATEGORIES } from '../../constants/categories';
import CategoryChip from '../../components/CategoryChip';
import { MagnifyingGlass, FunnelSimple, X, CaretLeft, CaretRight } from '@phosphor-icons/react';
import useIsMobile from '../../hooks/useIsMobile';
import './EventsPage.css';

const EventsPage: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const isMobile = useIsMobile();

    // Dynamic items per page
    const itemsPerPage = isMobile ? 10 : 12;

    const [events, setEvents] = useState<Event[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalEvents, setTotalEvents] = useState(0);

    // Filter states
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        searchParams.get('categories')?.split(',').filter(Boolean) || []
    );
    const [city, setCity] = useState(searchParams.get('city') || '');

    const { data: searchResult, isLoading } = useSearchEvents({
        q: query,
        city: city,
        categories: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
        page: currentPage,
        pageSize: itemsPerPage
    });

    useEffect(() => {
        if (searchResult) {
            setEvents(searchResult.data);
            setTotalEvents(searchResult.total);
        }
    }, [searchResult]);

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [query, selectedCategories, city]);

    // Pagination calculations
    const totalPages = Math.ceil(totalEvents / itemsPerPage);

    // No more client-side slicing
    const currentEvents = events;

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
        setCurrentPage(1);
    };

    const hasFilters = query || selectedCategories.length > 0 || city;

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="events-page container">
            <div className="events-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <h1 className="page-title">Sự kiện & Lễ hội</h1>
                    <p className="page-subtitle">Khám phá các sự kiện văn hóa trên khắp Việt Nam</p>
                </div>
                {isAuthenticated && (
                    <Link to="/profile" className="header-profile-icon" style={{ flexShrink: 0 }}>
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.8rem', borderRadius: '50%', overflow: 'hidden' }}>
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', backgroundColor: '#f97316', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                                </div>
                            )}
                        </div>
                    </Link>
                )}
            </div>

            {/* Search Bar */}
            {/* Search Bar - Consolidated Row */}
            <div className="search-section">
                <form className="search-bar" onSubmit={handleSearch}>
                    <MagnifyingGlass size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm sự kiện, địa điểm..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />

                    {/* Filter Icon Button inside Search Bar */}
                    <button
                        type="button"
                        className={`filter-icon-btn ${showFilters || hasFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                        title="Bộ lọc"
                    >
                        <FunnelSimple size={20} weight={hasFilters ? "fill" : "regular"} />
                        {hasFilters && <span className="filter-dot"></span>}
                    </button>
                </form>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="filters-panel card">
                    <div className="filters-header">
                        <div className="filters-title-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <h3>Bộ lọc</h3>
                            {/* Moved Results Count Here */}
                            <span className="results-count-text" style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 400 }}>
                                Tìm thấy <strong style={{ color: '#f97316' }}>{totalEvents}</strong> kết quả
                            </span>
                        </div>
                        {hasFilters && (
                            <button className="btn btn-sm btn-outline" onClick={clearFilters}>
                                <X size={16} />
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Danh mục</label>
                        <div className="category-chips-flex">
                            {CATEGORIES.map((cat) => (
                                <CategoryChip
                                    key={cat.id}
                                    name={cat.name}
                                    icon={cat.icon}
                                    isActive={selectedCategories.includes(cat.name)}
                                    onClick={() => toggleCategory(cat.name)}
                                    variant="rounded"
                                />
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
                    <div className="events-list">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <EventCardSkeleton key={i} variant={isMobile ? 'list' : 'card'} />
                        ))}
                    </div>
                ) : events.length > 0 ? (
                    <>
                        {/* Removed pagination info from here to keep it simple */}
                        <div className="events-list">
                            {currentEvents.map((event) => (
                                <EventCard key={event.id} event={event} variant={isMobile ? "list" : "card"} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="pagination-btn"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <CaretLeft size={18} />
                                </button>

                                {getPageNumbers().map((page, index) => (
                                    typeof page === 'number' ? (
                                        <button
                                            key={index}
                                            className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                                            onClick={() => handlePageChange(page)}
                                        >
                                            {page}
                                        </button>
                                    ) : (
                                        <span key={index} className="pagination-ellipsis">...</span>
                                    )
                                ))}

                                <button
                                    className="pagination-btn"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    <CaretRight size={18} />
                                </button>
                            </div>
                        )}
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
