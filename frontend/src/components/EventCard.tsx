import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Tag, Image as ImageIcon, Heart } from '@phosphor-icons/react';
import type { Event } from '../types';
import './EventCard.css';

interface EventCardProps {
    event: Event;
    variant?: 'card' | 'list';
}

const EventCard: React.FC<EventCardProps> = ({ event, variant = 'card' }) => {
    const [imageError, setImageError] = useState(false);
    const categoriesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = categoriesRef.current;
        if (!container) return;

        const checkOverflow = () => {
            const tags = container.querySelectorAll('.event-card-tag');
            const containerRect = container.getBoundingClientRect();
            const containerRight = containerRect.right - 2; // Small buffer

            tags.forEach((tag) => {
                const tagElement = tag as HTMLElement;
                tagElement.style.visibility = 'visible'; // Reset first
                const tagRight = tagElement.getBoundingClientRect().right;

                // Hide if tag extends past container
                if (tagRight > containerRight) {
                    tagElement.style.visibility = 'hidden';
                }
            });
        };

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [event.categories]);

    // Format date to Vietnamese format: "25 thg 4, 2026"
    const formatDate = (timestamp?: string) => {
        if (!timestamp) return 'Đang cập nhật';

        // Return textual times as-is
        if (timestamp.includes('Hàng ngày') || timestamp.includes('thg')) {
            return timestamp;
        }

        let date: Date;

        // Check for DD/MM/YYYY format (common in VN APIs)
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(timestamp)) {
            const [day, month, year] = timestamp.split('/').map(Number);
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(timestamp);
        }

        if (isNaN(date.getTime())) return timestamp;

        // Check if it's this year
        const thisYear = new Date().getFullYear();
        const isThisYear = date.getFullYear() === thisYear;

        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        return `${day} thg ${month}${!isThisYear ? `, ${year}` : ''}`;
    };

    const getImageUrl = () => {
        if (event.media && event.media.length > 0) {
            return event.media[0].url;
        }
        return '';
    };

    const imageUrl = getImageUrl();
    const hasValidImage = imageUrl && !imageError;

    // Helper to render the badge
    const renderBadge = (className = "event-badge") => {
        return (
            <>
                {event.info?.is_free ? (
                    <span className={`${className} free`}>Miễn phí</span>
                ) : (
                    <span className={`${className} paid`}>Mất phí</span>
                )}
            </>
        );
    };

    return (
        <div className={`event-card ${variant === 'list' ? 'event-card-list' : ''}`}>
            {/* Heart Icon - Top Right (Absolute on Card) */}
            <button
                className="favorite-btn"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Handle like logic here
                }}
            >
                <Heart size={20} weight="regular" />
            </button>
            <Link to={`/events/${event.id}`} className="event-card-link-wrapper">
                <div className={`event-card-image ${!hasValidImage ? 'no-image' : ''}`}>
                    {hasValidImage ? (
                        <img
                            src={imageUrl}
                            alt={event.name}
                            onError={() => setImageError(true)}
                            loading="lazy"
                        />
                    ) : (
                        <div className="event-card-placeholder">
                            <ImageIcon size={40} weight="thin" />
                            <span>{event.name}</span>
                        </div>
                    )}

                    {/* Category Check */}
                    {event.categories && event.categories.length > 0 && (
                        <div className="event-badge category">
                            {event.categories[0]}
                        </div>
                    )}

                    {/* Badge always on image now - Bottom Right */}
                    <div className="event-badge-wrapper">
                        {renderBadge(variant === 'list' ? "event-badge-corner" : "event-badge")}
                    </div>

                    {variant !== 'list' && (event.interested_count || 0) > 0 && (
                        <span className="event-badge interested">
                            🔥 {event.interested_count} quan tâm
                        </span>
                    )}
                </div>
            </Link>

            <div className="event-card-content">
                {/* Heart Icon - Top Right (Absolute in List View) */}


                <Link to={`/events/${event.id}`} className="event-content-link">


                    {/* Row 2: Title */}
                    <h3 className="event-card-title">{event.name}</h3>

                    {/* Row 3: Date & Location */}
                    <div className="event-meta-row">
                        <div className="event-meta-item">
                            <Calendar size={14} weight="fill" className="meta-icon" />
                            <span>{formatDate(event.time?.next_occurrence || event.time?.lunar)}</span>
                        </div>
                        <span className="meta-divider">•</span>
                        <div className="event-meta-item">
                            <MapPin size={14} weight="fill" className="meta-icon" />
                            <span className="location-text">{event.location?.city || event.location?.province || 'Việt Nam'}</span>
                        </div>
                    </div>

                    {/* Row 4: Social Proof - List View Only here */}
                    {variant === 'list' && (event.interested_count || 0) > 0 && (
                        <div className="event-social-proof">
                            🔥 {event.interested_count} quan tâm
                        </div>
                    )}

                    {/* Categories - Enabled for all variants now */}
                    {event.categories && event.categories.length > 0 && (
                        <div className="event-card-categories" ref={categoriesRef}>
                            {event.categories.slice(0, 3).map((cat, idx) => (
                                <span key={idx} className="event-card-tag">
                                    <Tag size={12} />
                                    {cat === 'Lê hội' ? 'Lễ hội' : cat}
                                </span>
                            ))}
                        </div>
                    )}
                </Link>
            </div>
        </div>
    );
};


export default EventCard;
