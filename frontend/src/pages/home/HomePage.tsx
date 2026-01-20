import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { eventApi } from '../../api/endpoints';
import type { Event } from '../../types';
import EventCard from '../../components/EventCard';
import { EventCardSkeleton } from '../../components/Skeleton';
import { CATEGORIES } from '../../constants/categories';
import { MagnifyingGlass, ArrowRight, Sparkle } from '@phosphor-icons/react';
import './HomePage.css';

// Use first 6 categories for homepage display
const HOME_CATEGORIES = CATEGORIES.slice(0, 6);

const HomePage: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all events
                const eventsRes = await eventApi.getAll(8);
                setEvents(eventsRes.data.data || []);

                // Fetch recommendations if logged in
                if (isAuthenticated && user?.id) {
                    try {
                        const recRes = await eventApi.getRecommendations(user.id, 4);
                        setRecommendedEvents(recRes.data.data || []);
                    } catch (err) {
                        console.log('No recommendations available');
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
        if (searchQuery.trim()) {
            window.location.href = `/events?q=${encodeURIComponent(searchQuery)}`;
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
                <div className="hero-content container">
                    <h1 className="hero-title">
                        Khám phá <span className="gradient-text">Văn hóa</span><br />
                        và Lễ hội Việt Nam
                    </h1>
                    <p className="hero-subtitle">
                        Tìm hiểu, tham gia và trải nghiệm những lễ hội truyền thống độc đáo trên khắp đất nước
                    </p>

                    <form className="hero-search" onSubmit={handleSearch}>
                        <MagnifyingGlass size={24} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm lễ hội, sự kiện..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary">
                            Tìm kiếm
                        </button>
                    </form>
                </div>
                <div className="hero-decoration"></div>
            </section>

            {/* Categories */}
            <section className="section categories-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Khám phá theo danh mục</h2>
                    </div>
                    <div className="categories-grid">
                        {HOME_CATEGORIES.map((cat) => (
                            <Link
                                key={cat.id}
                                to={`/events?categories=${cat.name}`}
                                className="category-card"
                            >
                                <span className="category-icon">{cat.icon}</span>
                                <span className="category-name">{cat.name}</span>
                            </Link>
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
                        <div className="events-grid grid grid-4">
                            {recommendedEvents.map((event) => (
                                <EventCard key={event.id} event={event} />
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
                        <div className="events-grid grid grid-4">
                            {[1, 2, 3, 4].map((i) => (
                                <EventCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : events.length > 0 ? (
                        <div className="events-grid grid grid-4">
                            {events.map((event) => (
                                <EventCard key={event.id} event={event} />
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
                                <h2>Tham gia cộng đồng p-INNO</h2>
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
