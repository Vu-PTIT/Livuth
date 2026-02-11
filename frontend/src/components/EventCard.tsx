import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Tag, Image as ImageIcon } from '@phosphor-icons/react';
import type { Event } from '../types';
import './EventCard.css';

interface EventCardProps {
    event: Event;
    showDistance?: boolean;
    distance?: number;
}

const EventCard: React.FC<EventCardProps> = ({ event, showDistance, distance }) => {
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

    const formatDate = (timestamp?: string) => {
        if (!timestamp) return 'Đang cập nhật';
        return timestamp;
    };

    const getImageUrl = () => {
        if (event.media && event.media.length > 0) {
            return event.media[0].url;
        }
        return '';
    };

    const imageUrl = getImageUrl();
    const hasValidImage = imageUrl && !imageError;

    return (
        <Link to={`/events/${event.id}`} className="event-card">
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
                {event.info?.is_free ? (
                    <span className="event-badge free">Miễn phí</span>
                ) : (
                    <span className="event-badge paid">Mất phí</span>
                )}
                {(event.interested_count || 0) > 0 && (
                    <span className="event-badge interested">
                        🔥 {event.interested_count} quan tâm
                    </span>
                )}
            </div>
            <div className="event-card-content">
                <div className="event-card-date">
                    <Calendar size={16} />
                    <span>{formatDate(event.time?.next_occurrence || event.time?.lunar)}</span>
                </div>
                <h3 className="event-card-title">{event.name}</h3>
                <div className="event-card-location">
                    <MapPin size={16} />
                    <span>{event.location?.city || event.location?.province || 'Việt Nam'}</span>
                    {showDistance && distance !== undefined && (
                        <span className="distance">({distance} km)</span>
                    )}
                </div>
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
            </div>
        </Link>
    );
};

export default EventCard;
