import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { eventApi } from '../../api/endpoints';
import type { Event } from '../../types';
import EventCard from '../../components/EventCard';
import { EventCardSkeleton } from '../../components/Skeleton';
import { CATEGORIES } from '../../constants/categories';
import { MagnifyingGlass, ArrowRight, Sparkle, Funnel } from '@phosphor-icons/react';
import useIsMobile from '../../hooks/useIsMobile';
import './HomePage.css';



const HomePage: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [events, setEvents] = useState<Event[]>([]);
    const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [city, setCity] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all events
                const eventsRes = await eventApi.getAll(1, 8);
                setEvents(eventsRes.data.data || []);

                // Fetch recommendations if logged in
                if (isAuthenticated && user?.id) {
                    try {
                        const recRes = await eventApi.getRecommendations(user.id, 4);
                        if (recRes.data.data && recRes.data.data.length > 0) {
                            setRecommendedEvents(recRes.data.data);
                        } else {
                            // Fallback to latest events if no recommendations
                            setRecommendedEvents((eventsRes.data.data || []).slice(0, 4));
                        }
                    } catch (err) {
                        console.log('No recommendations available');
                        // Fallback on error
                        setRecommendedEvents((eventsRes.data.data || []).slice(0, 4));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch events:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [isAuthenticated, user]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        if (selectedCategory) params.set('categories', selectedCategory);
        if (city.trim()) params.set('city', city.trim());

        navigate(`/events?${params.toString()}`);
    };

    const carouselRef = React.useRef<HTMLDivElement>(null);
    const isDown = React.useRef(false);
    const startX = React.useRef(0);
    const scrollLeft = React.useRef(0);
    const isDragging = React.useRef(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!carouselRef.current) return;
        isDown.current = true;
        isDragging.current = false;
        startX.current = e.pageX - carouselRef.current.offsetLeft;
        scrollLeft.current = carouselRef.current.scrollLeft;
        carouselRef.current.style.cursor = 'grabbing';
    };

    const handleMouseLeave = () => {
        isDown.current = false;
        if (carouselRef.current) {
            carouselRef.current.style.cursor = 'grab';
        }
    };

    const handleMouseUp = () => {
        isDown.current = false;
        if (carouselRef.current) {
            carouselRef.current.style.cursor = 'grab';
        }
        setTimeout(() => {
            isDragging.current = false;
        }, 0);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDown.current || !carouselRef.current) return;
        e.preventDefault();
        const x = e.pageX - carouselRef.current.offsetLeft;
        const walk = (x - startX.current) * 2;

        if (Math.abs(walk) > 5) {
            isDragging.current = true;
        }

        carouselRef.current.scrollLeft = scrollLeft.current - walk;
    };

    const handleCategoryItemClick = (categoryName: string) => {
        if (!isDragging.current) {
            navigate(`/events?categories=${encodeURIComponent(categoryName)}`);
        }
    };

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                {/* Banner background */}
                <img
                    src="/banner.jpg"
                    alt=""
                    className="hero-bg"
                    aria-hidden="true"
                />
                <div className="hero-decoration"></div>
            </section>

            {/* Floating Search Bar */}
            <div className="search-bar-wrapper">
                <div className="container">
                    <form className="hero-search" onSubmit={handleSearch}>
                        <div className="search-main">
                            <MagnifyingGlass size={24} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm lễ hội, sự kiện..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button
                                type="button"
                                className={`filter-toggle ${showFilters ? 'active' : ''}`}
                                onClick={() => setShowFilters(!showFilters)}
                                title="Bộ lọc"
                            >
                                <Funnel size={20} />
                            </button>
                            <button type="submit" className="btn btn-primary search-btn">
                                <span className="search-text">Tìm kiếm</span>
                                <MagnifyingGlass size={20} className="search-btn-icon" />
                            </button>
                        </div>

                        {/* Expanded Filter Panel */}
                        <div className={`search-filters ${showFilters ? 'show' : ''}`}>
                            <div className="filters-row">
                                {/* City/Location Column */}
                                <div className="filter-group location-group" style={{ flex: 1, width: '100%' }}>
                                    <span className="filter-label">Thành phố:</span>
                                    <input
                                        type="text"
                                        className="form-input filter-input"
                                        placeholder="Nhập thành phố (VD: Hà Nội)"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Categories */}
            <section className="section categories-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Khám phá theo danh mục</h2>
                    </div>
                    <div
                        className="categories-scroll-container"
                        ref={carouselRef}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        style={{ cursor: 'grab' }}
                    >
                        {CATEGORIES.map((cat) => (
                            <div
                                key={cat.id}
                                className="category-card"
                                onClick={() => handleCategoryItemClick(cat.name)}
                            >
                                <span className="category-icon">{cat.icon}</span>
                                <span className="category-name">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>



            {/* Recommended Events (if logged in and has hobbies) */}
            {isAuthenticated && recommendedEvents.length > 0 && (
                <section className="section recommended-section">
                    <div className="container">
                        <div className="section-header">
                            <div>
                                <h2>
                                    <Sparkle size={24} className="section-icon" />
                                    Gợi ý cho bạn
                                </h2>
                                <p className="section-subtitle">Dựa trên sở thích của bạn</p>
                            </div>
                            <Link to="/events" className="section-link">
                                Xem tất cả <ArrowRight size={18} />
                            </Link>
                        </div>
                        <div className="events-scroll-container">
                            {recommendedEvents.map((event) => (
                                <div key={event.id} className="event-scroll-item">
                                    <EventCard event={event} variant={isMobile ? "list" : "card"} />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Recent Events */}
            <section className="section recent-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Sự kiện mới nhất</h2>
                        <Link to="/events" className="view-all">
                            Xem tất cả <ArrowRight />
                        </Link>
                    </div>

                    {isLoading ? (
                        <div className="events-list-container">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <EventCardSkeleton key={i} variant={isMobile ? 'list' : 'card'} />
                            ))}
                        </div>
                    ) : events.length > 0 ? (
                        <div className="events-list-container">
                            {events.map((event) => (
                                <EventCard key={event.id} event={event} variant={isMobile ? "list" : "card"} />
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>Chưa có sự kiện nào</p>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            {!isAuthenticated && (
                <section className="section cta-section">
                    <div className="container">
                        <div className="cta-card">
                            <div className="cta-content">
                                <h2>Tham gia cộng đồng Ganvo</h2>
                                <p>Đăng ký để nhận gợi ý sự kiện phù hợp và trải nghiệm trợ lý AI thông minh</p>
                            </div>
                            <div className="cta-actions">
                                <Link to="/register" className="btn btn-primary btn-lg">
                                    Đăng ký miễn phí
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default HomePage;
