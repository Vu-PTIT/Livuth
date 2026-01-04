import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tourProviderApi, eventApi } from '../../api/endpoints';
import type { TourProviderListing, Event } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import {
    ArrowLeft,
    Phone,
    Envelope,
    Globe,
    FacebookLogo,
    MapPin,
    CheckCircle,
    Star,
    Eye,
    ChatCircle,
} from '@phosphor-icons/react';
import './TourProviderDetailPage.css';

const TourProviderDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [listing, setListing] = useState<TourProviderListing | null>(null);
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;

            try {
                const response = await tourProviderApi.getById(id);
                const listingData = response.data.data;
                setListing(listingData || null);

                // Fetch event info
                if (listingData?.event_id) {
                    try {
                        const eventRes = await eventApi.getById(listingData.event_id, false);
                        setEvent(eventRes.data.data || null);
                    } catch (err) {
                        console.log('Could not fetch event');
                    }
                }
            } catch (err) {
                setError('Không tìm thấy thông tin');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (isLoading) {
        return (
            <div className="loading-container">
                <LoadingSpinner text="Đang tải thông tin..." />
            </div>
        );
    }

    if (error || !listing) {
        return (
            <div className="container">
                <div className="empty-state">
                    <div className="empty-state-icon">😢</div>
                    <h3 className="empty-state-title">{error || 'Không tìm thấy thông tin'}</h3>
                    <Link to="/events" className="btn btn-primary mt-3">
                        <ArrowLeft size={18} />
                        Quay lại
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="tour-provider-detail-page container">
            <Link to={event ? `/events/${event.id}` : '/events'} className="back-link">
                <ArrowLeft size={18} />
                {event ? `Quay lại ${event.name}` : 'Quay lại danh sách'}
            </Link>

            <div className="provider-layout">
                {/* Main Content */}
                <div className="provider-main">
                    {/* Header */}
                    <div className="provider-header card">
                        <div className="provider-logo">
                            {listing.logo_url ? (
                                <img src={listing.logo_url} alt={listing.company_name} />
                            ) : (
                                <div className="logo-placeholder">
                                    {listing.company_name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="provider-info">
                            <div className="provider-title">
                                <h1>{listing.company_name}</h1>
                                {listing.verification_status === 'verified' && (
                                    <span className="verified-tag">
                                        <CheckCircle size={18} weight="fill" />
                                        Đã xác minh
                                    </span>
                                )}
                            </div>
                            <p className="provider-service-name">{listing.service_name}</p>
                            <div className="provider-stats">
                                <span className="stat">
                                    <Eye size={16} />
                                    {listing.view_count} lượt xem
                                </span>
                                <StatusBadge status={listing.status} size="small" />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="card">
                        <h2>Mô tả dịch vụ</h2>
                        <p className="description">{listing.description}</p>

                        {listing.highlights && listing.highlights.length > 0 && (
                            <div className="highlights">
                                <h3>Điểm nổi bật</h3>
                                <ul>
                                    {listing.highlights.map((highlight, idx) => (
                                        <li key={idx}>
                                            <Star size={16} weight="fill" className="star-icon" />
                                            {highlight}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Pricing */}
                    <div className="card pricing-card">
                        <h2>Giá dịch vụ</h2>
                        <div className="price-range">{listing.price_range}</div>
                        {listing.price_note && (
                            <p className="price-note">{listing.price_note}</p>
                        )}
                    </div>

                    {/* Photos */}
                    {listing.photos && listing.photos.length > 0 && (
                        <div className="card">
                            <h2>Hình ảnh</h2>
                            <div className="photos-grid">
                                {listing.photos.map((photo, idx) => (
                                    <div key={idx} className="photo-item">
                                        <img src={photo} alt={`Ảnh ${idx + 1}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar - Contact */}
                <aside className="provider-sidebar">
                    <div className="contact-card card">
                        <h3>Thông tin liên hệ</h3>

                        <div className="contact-name">
                            <strong>{listing.contact_name}</strong>
                        </div>

                        <div className="contact-list">
                            <a href={`tel:${listing.contact_phone}`} className="contact-item primary">
                                <Phone size={20} />
                                <span>{listing.contact_phone}</span>
                            </a>

                            <a href={`mailto:${listing.contact_email}`} className="contact-item">
                                <Envelope size={20} />
                                <span>{listing.contact_email}</span>
                            </a>

                            {listing.contact_website && (
                                <a
                                    href={listing.contact_website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="contact-item"
                                >
                                    <Globe size={20} />
                                    <span>Website</span>
                                </a>
                            )}

                            {listing.contact_facebook && (
                                <a
                                    href={listing.contact_facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="contact-item"
                                >
                                    <FacebookLogo size={20} />
                                    <span>Facebook</span>
                                </a>
                            )}

                            {listing.contact_zalo && (
                                <a href={`https://zalo.me/${listing.contact_zalo}`} className="contact-item">
                                    <ChatCircle size={20} />
                                    <span>Zalo: {listing.contact_zalo}</span>
                                </a>
                            )}

                            {listing.contact_address && (
                                <div className="contact-item address">
                                    <MapPin size={20} />
                                    <span>{listing.contact_address}</span>
                                </div>
                            )}
                        </div>

                        <div className="contact-actions">
                            <a href={`tel:${listing.contact_phone}`} className="btn btn-primary btn-block">
                                <Phone size={18} />
                                Gọi ngay
                            </a>
                        </div>
                    </div>

                    {/* Related Event */}
                    {event && (
                        <div className="related-event card">
                            <h4>Sự kiện liên quan</h4>
                            <Link to={`/events/${event.id}`} className="event-link">
                                <span>{event.name}</span>
                                <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                            </Link>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default TourProviderDetailPage;
