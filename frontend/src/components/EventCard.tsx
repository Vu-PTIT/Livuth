import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Tag, Ticket } from '@phosphor-icons/react';
import type { Event } from '../types';
import './EventCard.css';

interface EventCardProps {
    event: Event;
    showDistance?: boolean;
    distance?: number;
}

const EventCard: React.FC<EventCardProps> = ({ event, showDistance, distance }) => {
    const formatDate = (timestamp?: string) => {
        if (!timestamp) return 'Đang cập nhật';
        return timestamp;
    };

    const getImageUrl = () => {
        if (event.media && event.media.length > 0) {
            return event.media[0].url;
        }
        return '/placeholder-event.jpg';
    };

    return (
        <Link to={`/events/${event.id}`} className="event-card">
            <div className="event-card-image">
                <img src={getImageUrl()} alt={event.name} />
                {event.info?.is_free && <span className="event-badge free">Miễn phí</span>}
                {event.interested_count && event.interested_count > 0 && (
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
                    <div className="event-card-categories">
                        <Tag size={14} />
                        {event.categories.slice(0, 2).map((cat, idx) => (
                            <span key={idx} className="category-chip">{cat}</span>
                        ))}
                    </div>
                )}
                {event.info?.ticket_price && !event.info?.is_free && (
                    <div className="event-card-price">
                        <Ticket size={16} />
                        <span>{event.info.ticket_price.toLocaleString('vi-VN')} VND</span>
                    </div>
                )}
            </div>
        </Link>
    );
};

export default EventCard;
