import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventApi } from '../../api/endpoints';
import type { Event, TourProviderListing } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
    MapPin,
    Calendar,
    Ticket,
    Tag,
    Clock,
    Phone,
    CheckCircle,
    ArrowLeft,
} from '@phosphor-icons/react';
import './EventDetailPage.css';

const EventDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'intro' | 'history' | 'activities'>('intro');

    useEffect(() => {
        const fetchEvent = async () => {
            if (!id) return;

            try {
                const response = await eventApi.getById(id, true);
                setEvent(response.data.data || null);
            } catch (err) {
                setError('Không tìm thấy sự kiện');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvent();
    }, [id]);

    if (isLoading) {
        return (
            <div className="loading-container">
                <LoadingSpinner text="Đang tải thông tin sự kiện..." />
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="container">
                <div className="empty-state">
                    <div className="empty-state-icon">😢</div>
                    <h3 className="empty-state-title">{error || 'Không tìm thấy sự kiện'}</h3>
                    <Link to="/events" className="btn btn-primary mt-3">
                        <ArrowLeft size={18} />
                        Quay lại danh sách
                    </Link>
                </div>
            </div>
        );
    }

    const mainImage = event.media?.[0]?.url || '/placeholder-event.jpg';

    return (
        <div className="event-detail-page">
            {/* Hero Section */}
            <section className="event-hero">
                <div className="event-hero-image">
                    <img
                        src={mainImage}
                        alt={event.name}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                    <div className="event-hero-overlay"></div>
                </div>

                <Link to="/events" className="back-link">
                    <ArrowLeft size={20} weight="bold" />
                    Tất cả sự kiện
                </Link>

                <div className="event-hero-content container">
                    <h1>{event.name}</h1>
                    <div className="event-meta">
                        {event.location?.city && (
                            <span className="meta-item">
                                <MapPin size={18} />
                                {event.location.city}{event.location.province ? `, ${event.location.province}` : ''}
                            </span>
                        )}
                        {event.time?.lunar && (
                            <span className="meta-item">
                                <Calendar size={18} />
                                {event.time.lunar}
                            </span>
                        )}
                        {event.info?.is_free ? (
                            <span className="meta-item tag-free">
                                <Ticket size={18} />
                                Miễn phí
                            </span>
                        ) : event.info?.ticket_price && (
                            <span className="meta-item">
                                <Ticket size={18} />
                                {event.info.ticket_price.toLocaleString('vi-VN')} VND
                            </span>
                        )}
                    </div>
                    {event.categories && event.categories.length > 0 && (
                        <div className="event-categories">
                            {event.categories.map((cat, idx) => (
                                <span key={idx} className="category-tag">
                                    <Tag size={14} />
                                    {cat}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Content Section */}
            <section className="event-content container">
                <div className="event-main">
                    {/* Tabs */}
                    <div className="content-tabs">
                        <button
                            className={`tab ${activeTab === 'intro' ? 'active' : ''}`}
                            onClick={() => setActiveTab('intro')}
                        >
                            Giới thiệu
                        </button>
                        <button
                            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            Lịch sử
                        </button>
                        <button
                            className={`tab ${activeTab === 'activities' ? 'active' : ''}`}
                            onClick={() => setActiveTab('activities')}
                        >
                            Hoạt động
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="tab-content card">
                        {activeTab === 'intro' && (
                            <div className="content-section">
                                {event.content?.intro ? (
                                    <p>{event.content.intro}</p>
                                ) : (
                                    <p className="text-secondary">Chưa có thông tin giới thiệu</p>
                                )}
                            </div>
                        )}
                        {activeTab === 'history' && (
                            <div className="content-section">
                                {event.content?.history ? (
                                    <p>{event.content.history}</p>
                                ) : (
                                    <p className="text-secondary">Chưa có thông tin lịch sử</p>
                                )}
                            </div>
                        )}
                        {activeTab === 'activities' && (
                            <div className="content-section">
                                {event.content?.activities && event.content.activities.length > 0 ? (
                                    <ul className="activities-list">
                                        {event.content.activities.map((activity, idx) => (
                                            <li key={idx}>{activity}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-secondary">Chưa có thông tin hoạt động</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Location */}
                    {event.location?.address && (
                        <div className="card info-card">
                            <h3>
                                <MapPin size={20} />
                                Địa điểm
                            </h3>
                            <p>{event.location.address}</p>
                            {event.location.city && (
                                <p className="text-secondary">
                                    {event.location.city}{event.location.province ? `, ${event.location.province}` : ''}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Additional Info */}
                    {event.info?.note && (
                        <div className="card info-card">
                            <h3>
                                <Clock size={20} />
                                Lưu ý
                            </h3>
                            <p>{event.info.note}</p>
                        </div>
                    )}

                    {/* Gallery */}
                    {event.media && event.media.length > 1 && (
                        <div className="gallery-section">
                            <h3>Hình ảnh</h3>
                            <div className="gallery-grid">
                                {event.media.map((item, idx) => (
                                    <div key={idx} className="gallery-item">
                                        <img src={item.url} alt={item.caption || `Ảnh ${idx + 1}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar - Tour Providers */}
                <aside className="event-sidebar">
                    <div className="sidebar-section">
                        <h3>Dịch vụ tour</h3>
                        {event.tour_providers && event.tour_providers.length > 0 ? (
                            <div className="tour-providers-list">
                                {event.tour_providers.map((provider: TourProviderListing) => (
                                    <Link
                                        key={provider.id}
                                        to={`/tour-providers/${provider.id}`}
                                        className="tour-provider-card"
                                    >
                                        <div className="provider-header">
                                            <div className="provider-name">
                                                {provider.company_name}
                                                {provider.verification_status === 'verified' && (
                                                    <CheckCircle size={16} className="verified-badge" weight="fill" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="provider-service">{provider.service_name}</div>
                                        <div className="provider-price">{provider.price_range}</div>
                                        <div className="provider-contact">
                                            <span><Phone size={14} /> {provider.contact_phone}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="no-providers">Chưa có dịch vụ tour cho sự kiện này</p>
                        )}
                    </div>
                </aside>
            </section>
        </div>
    );
};

export default EventDetailPage;
