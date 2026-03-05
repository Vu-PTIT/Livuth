import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { eventApi } from '../api/endpoints';
import { MapPin, Calendar, Tag, Image as ImageIcon, Heart } from '@phosphor-icons/react';
import type { Event } from '../types';
import { formatToVietnameseDate } from '../utils/date';
import './EventCard.css';

interface EventCardProps {
    event: Event;
    variant?: 'card' | 'list';
}

const EventCard: React.FC<EventCardProps> = ({ event, variant = 'card' }) => {
    const [imageError, setImageError] = useState(false);
    const categoriesRef = useRef<HTMLDivElement>(null);
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [isLiked, setIsLiked] = useState(event.is_liked || false);
    const [likeCount, setLikeCount] = useState(event.like_count || 0);

    // Sync state if prop changes
    useEffect(() => {
        setIsLiked(event.is_liked || false);
        setLikeCount(event.like_count || 0);
    }, [event.is_liked, event.like_count]);

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            navigate('/auth/login');
            return;
        }

        const newIsLiked = !isLiked;
        const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;

        setIsLiked(newIsLiked);
        setLikeCount(newLikeCount);

        try {
            await eventApi.toggleLike(event.id);
        } catch (error) {
            // Revert on error
            setIsLiked(!newIsLiked);
            setLikeCount(likeCount);
            console.error('Failed to toggle like:', error);
        }
    };

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

    // Format date to Vietnamese format: "ngày X tháng Y"
    const formatDate = (timestamp?: string) => {
        if (!timestamp) return 'Đang cập nhật';

        // Return textual times as-is
        if (timestamp.includes('Hàng ngày')) {
            return timestamp;
        }

        return formatToVietnameseDate(timestamp);
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
            {/* Heart Icon - Top Right (Absolute on Card) */}
            <button
                className={`favorite-btn ${isLiked ? 'liked' : ''}`}
                onClick={handleLike}
                title={isLiked ? "Bỏ thích" : "Thích"}
            >
                <Heart size={20} weight={isLiked ? "fill" : "regular"} color={isLiked ? "#ef4444" : "currentColor"} />
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

                    {variant !== 'list' && (
                        <div className="event-badges-container" style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 4 }}>
                            {(event.interested_count || 0) > 0 && (
                                <span className="event-badge interested">
                                    🔥 {event.interested_count}
                                </span>
                            )}
                            {likeCount > 0 && (
                                <span className="event-badge interested" style={{ color: '#ef4444' }}>
                                    ❤️ {likeCount}
                                </span>
                            )}
                        </div>
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
                            <span className="meta-text">{formatDate(event.time?.next_occurrence || event.time?.lunar)}</span>
                        </div>
                        <div className="event-meta-item">
                            <MapPin size={14} weight="fill" className="meta-icon" />
                            <span className="meta-text">{event.location?.city || event.location?.province || 'Việt Nam'}</span>
                        </div>
                    </div>

                    {/* Row 4: Social Proof - List View Only here */}
                    {/* Row 4: Social Proof - List View Only here */}
                    {variant === 'list' && (
                        <div className="event-social-proof">
                            {(event.interested_count || 0) > 0 && <span>🔥 {event.interested_count} quan tâm</span>}
                            {likeCount > 0 && (
                                <span style={{ marginLeft: (event.interested_count || 0) > 0 ? 8 : 0 }}>
                                    ❤️ {likeCount} yêu thích
                                </span>
                            )}
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
