import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reviewApi, roadmapApi } from '../../api/endpoints';
import { useEventDetail } from '../../hooks/useDataCaching';
import type { TourProviderListing, Review, ReviewStats } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner';
import CheckInButton from '../../components/sui/CheckInButton';
import {
    MapPin,
    Calendar,
    Ticket,
    Tag,
    Clock,
    Phone,
    CheckCircle,
    ArrowLeft,
    Star,
    PaperPlaneRight,
    PencilSimple,
    MapTrifold,
    Path,
    ThumbsUp,
    CaretRight,
} from '@phosphor-icons/react';
import './EventDetailPage.css';

const EventDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'info' | 'roadmaps'>('info');

    // Review states
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
    const [myReview, setMyReview] = useState<Review | null>(null);
    const [isLoadingReviews, setIsLoadingReviews] = useState(true);
    const [newRating, setNewRating] = useState(5);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reviewError, setReviewError] = useState('');
    const [isEditingReview, setIsEditingReview] = useState(false);

    // Drag-to-scroll state
    const roadmapListRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [dragStarted, setDragStarted] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!roadmapListRef.current) return;
        setIsDragging(true);
        setDragStarted(false); // Reset click prevention flag
        setStartX(e.pageX - roadmapListRef.current.offsetLeft);
        setScrollLeft(roadmapListRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
        setTimeout(() => setDragStarted(false), 50);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setTimeout(() => setDragStarted(false), 50);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !roadmapListRef.current) return;
        e.preventDefault();
        const x = e.pageX - roadmapListRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast

        // If moved more than 5px, we consider it a drag so we can prevent link clicks
        if (Math.abs(x - startX) > 5) {
            setDragStarted(true);
        }
        roadmapListRef.current.scrollLeft = scrollLeft - walk;
    };

    // Fetch roadmaps
    const [roadmaps, setRoadmaps] = useState<any[]>([]);
    const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState(true);

    useEffect(() => {
        const fetchRoadmaps = async () => {
            if (!id) return;
            try {
                const response = await roadmapApi.getEventRoadmaps(id);
                setRoadmaps(response.data.data?.roadmaps || []);
            } catch (err) {
                console.error('Failed to fetch roadmaps:', err);
            } finally {
                setIsLoadingRoadmaps(false);
            }
        };
        fetchRoadmaps();
    }, [id]);


    const { data: event, isLoading, error: queryError } = useEventDetail(id);

    useEffect(() => {
        if (queryError) {
            setError('Không tìm thấy sự kiện');
        }
    }, [queryError]);

    // Fetch reviews
    useEffect(() => {
        const fetchReviews = async () => {
            if (!id) return;

            try {
                const response = await reviewApi.getEventReviews(id);
                const data = response.data.data;
                if (data) {
                    setReviews(data.reviews || []);
                    setReviewStats(data.stats || null);
                }
            } catch (err) {
                console.error('Failed to fetch reviews:', err);
            } finally {
                setIsLoadingReviews(false);
            }
        };

        const fetchMyReview = async () => {
            if (!id || !user) return;

            try {
                const response = await reviewApi.getMyReview(id);
                setMyReview(response.data.data || null);
            } catch (err) {
                // User hasn't reviewed yet
            }
        };


        fetchReviews();
        fetchMyReview();
    }, [id, user]);

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !user) return;

        setIsSubmitting(true);
        setReviewError('');

        try {
            let newReviewData: Review;

            if (isEditingReview && myReview) {
                // Update existing review
                const response = await reviewApi.updateReview(myReview.id, {
                    rating: newRating,
                    comment: newComment || undefined,
                });
                if (!response.data.data) throw new Error('Không thể cập nhật đánh giá');
                newReviewData = response.data.data;
                setIsEditingReview(false);

                // Update reviews list with updated review
                setReviews(prev => prev.map(r => r.id === newReviewData.id ? newReviewData : r));
            } else {
                // Create new review
                const response = await reviewApi.createReview(id, {
                    rating: newRating,
                    comment: newComment || undefined,
                });
                if (!response.data.data) throw new Error('Không thể tạo đánh giá');
                newReviewData = response.data.data;
                setReviews(prev => [newReviewData, ...prev]);

                // Update stats only on creation (approximation)
                if (reviewStats) {
                    const newTotal = reviewStats.total_reviews + 1;
                    const newAvg = ((reviewStats.average_rating * reviewStats.total_reviews) + newRating) / newTotal;
                    setReviewStats({
                        ...reviewStats,
                        total_reviews: newTotal,
                        average_rating: Math.round(newAvg * 10) / 10,
                    });
                }
            }

            if (newReviewData) {
                setMyReview(newReviewData);
                setNewComment('');
            }
        } catch (err: any) {
            setReviewError(err.response?.data?.message || 'Không thể gửi đánh giá');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStars = (rating: number, interactive: boolean = false) => {
        return (
            <div className={`stars ${interactive ? 'interactive' : ''}`}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        size={interactive ? 28 : 16}
                        weight={star <= rating ? 'fill' : 'regular'}
                        className={star <= rating ? 'star-filled' : 'star-empty'}
                        onClick={interactive ? () => setNewRating(star) : undefined}
                    />
                ))}
            </div>
        );
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const capitalizeFirst = (str: string) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

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
                        {/* Rating in hero */}
                        {reviewStats && reviewStats.total_reviews > 0 && (
                            <span className="meta-item rating-badge">
                                <Star size={18} weight="fill" />
                                {reviewStats.average_rating} ({reviewStats.total_reviews} đánh giá)
                            </span>
                        )}
                    </div>
                    {event.categories && event.categories.length > 0 && (
                        <div className="event-categories desktop-only-tags">
                            {event.categories.map((cat: string, idx: number) => (
                                <span key={idx} className="category-tag">
                                    <Tag size={14} />
                                    {capitalizeFirst(cat)}
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
                            className={`tab ${activeTab === 'info' ? 'active' : ''}`}
                            onClick={() => setActiveTab('info')}
                        >
                            Giới thiệu
                        </button>
                        <button
                            className={`tab ${activeTab === 'roadmaps' ? 'active' : ''}`}
                            onClick={() => setActiveTab('roadmaps')}
                        >
                            Lộ trình tham khảo
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'info' && (
                        <>
                        <div className="tab-content card">
                            {/* Mobile-only tags relocated here */}
                            {event.categories && event.categories.length > 0 && (
                                <div className="event-categories mobile-only-tags" style={{ justifyContent: 'flex-start', marginBottom: '0.25rem', marginTop: 0 }}>
                                    {event.categories.map((cat: string, idx: number) => (
                                        <span key={idx} className="category-tag" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                                            <Tag size={14} />
                                            {capitalizeFirst(cat)}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="content-section">
                                {event.content?.intro && (
                                    <div style={{ marginBottom: event.content?.history || (event.content?.activities && event.content.activities.length > 0) ? '2rem' : 0 }}>
                                        <div className="section-title-wrapper" style={{ marginBottom: '1rem' }}>
                                            <h3 className="section-title">Giới thiệu chung</h3>
                                        </div>
                                        <p>{event.content.intro}</p>
                                    </div>
                                )}
                                {event.content?.history && (
                                    <div style={{ marginBottom: event.content?.activities && event.content.activities.length > 0 ? '2rem' : 0 }}>
                                        <div className="section-title-wrapper" style={{ marginBottom: '1rem' }}>
                                            <h3 className="section-title">
                                                <Clock size={22} weight="duotone" className="primary-icon" />
                                                Lịch sử
                                            </h3>
                                        </div>
                                        <p>{event.content.history}</p>
                                    </div>
                                )}
                                {event.content?.activities && event.content.activities.length > 0 && (
                                    <div>
                                        <div className="section-title-wrapper" style={{ marginBottom: '1rem' }}>
                                            <h3 className="section-title">
                                                <CheckCircle size={22} weight="duotone" className="primary-icon" />
                                                Hoạt động
                                            </h3>
                                        </div>
                                        <ul className="activities-list">
                                            {event.content.activities.map((activity: string, idx: number) => (
                                                <li key={idx}>{activity}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {!event.content?.intro && !event.content?.history && (!event.content?.activities || event.content.activities.length === 0) && (
                                    <p className="text-secondary">Chưa có thông tin sự kiện</p>
                                )}
                            </div>
                        </div>

                        {/* Location */}
                        {event.location?.address && (
                            <div className="card info-card" style={{ marginTop: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <h3 style={{ marginBottom: 0 }}>
                                        <MapPin size={20} />
                                        Địa điểm
                                    </h3>

                                    {event.location.coordinates?.coordinates && (
                                        <Link
                                            to={`/map?lat=${event.location.coordinates.coordinates[1]}&lng=${event.location.coordinates.coordinates[0]}&eventId=${event.id}`}
                                            className="btn btn-outline btn-sm"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                padding: '0.3rem 0.8rem',
                                                fontSize: '0.85rem',
                                                borderRadius: '20px',
                                                whiteSpace: 'nowrap',
                                                borderColor: 'var(--border-color)',
                                                color: 'var(--text-secondary)'
                                            }}
                                        >
                                            <MapTrifold size={16} weight="bold" />
                                            Xem bản đồ
                                        </Link>
                                    )}
                                </div>

                                <div style={{ paddingLeft: '0.25rem' }}>
                                    <p style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                                        {event.location.address}
                                    </p>
                                    {event.location.city && (
                                        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
                                            {event.location.city}{event.location.province ? `, ${event.location.province}` : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Additional Info */}
                        {event.info?.note && (
                            <div className="card info-card" style={{ marginTop: '1.5rem' }}>
                                <h3>
                                    <Clock size={20} />
                                    Lưu ý
                                </h3>
                                <p>{event.info.note}</p>
                            </div>
                        )}

                        {/* Gallery */}
                        {event.media && event.media.length > 1 && (
                            <div className="gallery-section" style={{ marginTop: '1.5rem' }}>
                                <h3>Hình ảnh</h3>
                                <div className="gallery-grid">
                                    {event.media.map((item: any, idx: number) => (
                                        <div key={idx} className="gallery-item">
                                            <img src={item.url} alt={item.caption || `Ảnh ${idx + 1}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        </>
                    )}

                    {/* Community Roadmaps Section */}
                    {activeTab === 'roadmaps' && (
                        <>
                        <div className="community-roadmaps-section card" style={{ marginTop: 0 }}>
                            <div className="section-header-flex">
                                <div className="section-title-wrapper">
                                    <h3 className="section-title">
                                        <Path size={22} weight="duotone" className="primary-icon" />
                                        Lộ trình tham khảo
                                    </h3>
                                    <p className="text-secondary section-subtitle">Cộng đồng chia sẻ lịch trình chuyến đi của họ.</p>
                                </div>
                                <Link to={`/events/${id}/roadmaps`} className="btn btn-outline btn-sm view-all-btn">
                                    Xem tất cả <CaretRight size={16} />
                                </Link>
                            </div>

                            <div
                                className={`roadmap-horizontal-list ${isDragging ? 'dragging' : ''} ${dragStarted ? 'is-moving' : ''}`}
                                ref={roadmapListRef}
                                onMouseDown={handleMouseDown}
                                onMouseLeave={handleMouseLeave}
                                onMouseUp={handleMouseUp}
                                onMouseMove={handleMouseMove}
                            >
                                {isLoadingRoadmaps ? (
                                    <div style={{ padding: '2rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
                                        <LoadingSpinner size="small" />
                                    </div>
                                ) : roadmaps.length === 0 ? (
                                    <p className="text-secondary" style={{ padding: '2rem 1rem', width: '100%', textAlign: 'center' }}>
                                        Chưa có lộ trình nào cho sự kiện này. Hãy là người đầu tiên chia sẻ!
                                    </p>
                                ) : (
                                    roadmaps.map(roadmap => (
                                        <Link
                                            to={`/events/${id}/roadmaps/${roadmap.id}`}
                                            key={roadmap.id}
                                            className="roadmap-card"
                                            onClick={(e) => {
                                                if (dragStarted) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }
                                            }}
                                            draggable={false}
                                        >
                                            <div className="roadmap-card-header">
                                                <h4 className="roadmap-title" title={roadmap.title}>{roadmap.title}</h4>
                                                <div className="roadmap-author">
                                                    <img src={roadmap.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${roadmap.user_name || 'user'}`} alt={roadmap.user_name || 'Người dùng'} />
                                                    <span>{roadmap.user_name || 'Người dùng ẩn danh'}</span>
                                                </div>
                                            </div>
                                            <div className="roadmap-card-body">
                                                <div className="roadmap-meta">
                                                    <span className="meta-badge"><Clock size={14} /> {roadmap.duration}</span>
                                                    <span className="meta-badge like-badge"><ThumbsUp size={14} /> {roadmap.like_count || 0}</span>
                                                </div>
                                                <div className="roadmap-tags">
                                                    {(roadmap.tags || []).map((tag: string, idx: number) => (
                                                        <span key={idx} className="roadmap-tag">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>

                            <div className="create-roadmap-cta">
                                <div className="cta-content">
                                    <strong>✍️ Bạn đã có trải nghiệm tuyệt vời?</strong>
                                    <span>Hãy chia sẻ lịch trình của bạn để truyền cảm hứng cho những người đi sau nhé!</span>
                                </div>
                                <Link to={`/events/${id}/roadmaps/create`} className="btn btn-primary btn-sm cta-btn">
                                    <PencilSimple size={16} /> Tạo lộ trình
                                </Link>
                            </div>
                        </div>

                        {/* Reviews Section */}
                        <div className="reviews-section card" style={{ marginTop: '1.5rem' }}>
                        <h3>
                            <Star size={20} weight="fill" />
                            Đánh giá ({reviewStats?.total_reviews || 0})
                        </h3>

                        {/* Review Stats */}
                        {reviewStats && reviewStats.total_reviews > 0 && (
                            <div className="review-stats">
                                <div className="stats-summary">
                                    <span className="big-rating">{reviewStats.average_rating}</span>
                                    {renderStars(Math.round(reviewStats.average_rating))}
                                    <span className="total-text">{reviewStats.total_reviews} đánh giá</span>
                                </div>
                                <div className="stats-bars">
                                    {[5, 4, 3, 2, 1].map((star) => {
                                        const count = reviewStats.rating_distribution[String(star)] || 0;
                                        const percentage = reviewStats.total_reviews > 0
                                            ? (count / reviewStats.total_reviews) * 100
                                            : 0;
                                        return (
                                            <div key={star} className="bar-row">
                                                <span className="bar-label">{star}</span>
                                                <Star size={12} weight="fill" className="star-filled" />
                                                <div className="bar-bg">
                                                    <div className="bar-fill" style={{ width: `${percentage}%` }} />
                                                </div>
                                                <span className="bar-count">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Write/Edit Review Form */}
                        {user && (!myReview || isEditingReview) && (
                            <form className="review-form" onSubmit={handleSubmitReview}>
                                <h4>{isEditingReview ? 'Chỉnh sửa đánh giá của bạn' : 'Viết đánh giá của bạn'}</h4>
                                <div className="form-group">
                                    <label>Đánh giá sao</label>
                                    {renderStars(newRating, true)}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="comment">Nhận xét (tùy chọn)</label>
                                    <textarea
                                        id="comment"
                                        className="form-textarea"
                                        rows={3}
                                        placeholder="Chia sẻ trải nghiệm của bạn..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        maxLength={1000}
                                    />
                                </div>
                                {reviewError && <p className="error-text" style={{ marginBottom: '0.25rem' }}>{reviewError}</p>}
                                <div className="form-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', padding: 0 }}>
                                    {isEditingReview && (
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={() => setIsEditingReview(false)}
                                            disabled={isSubmitting}
                                            style={{ flex: 1 }}
                                        >
                                            Hủy
                                        </button>
                                    )}
                                    <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 1 }}>
                                        <PaperPlaneRight size={18} />
                                        {isSubmitting ? 'Đang gửi...' : (isEditingReview ? 'Cập nhật' : 'Gửi đánh giá')}
                                    </button>
                                </div>
                            </form>
                        )}

                        {myReview && !isEditingReview && (
                            <div className="my-review-notice">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                    <CheckCircle size={20} weight="fill" />
                                    <span>Bạn đã đánh giá sự kiện này {myReview.rating} sao</span>
                                </div>
                                <button
                                    className="btn-edit-review"
                                    onClick={() => {
                                        setNewRating(myReview.rating);
                                        setNewComment(myReview.comment || '');
                                        setIsEditingReview(true);
                                    }}
                                    title="Sửa đánh giá"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                    <PencilSimple size={18} />
                                    Sửa
                                </button>
                            </div>
                        )}

                        {!user && (
                            <p className="login-prompt">
                                <Link to="/login">Đăng nhập</Link> để viết đánh giá
                            </p>
                        )}

                        {/* Reviews List */}
                        {isLoadingReviews ? (
                            <LoadingSpinner size="small" />
                        ) : reviews.length > 0 ? (
                            <div className="reviews-list">
                                {reviews.map((review) => (
                                    <div key={review.id} className="review-item">
                                        <div className="review-header">
                                            <div className="reviewer-info">
                                                <img 
                                                    src={review.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.user_name || 'user'}`} 
                                                    alt="" 
                                                    className="reviewer-avatar" 
                                                />
                                                <div>
                                                    <span className="reviewer-name">{review.user_name || 'Ẩn danh'}</span>
                                                    <span className="review-date">{formatDate(review.created_at)}</span>
                                                </div>
                                            </div>
                                            {renderStars(review.rating)}
                                        </div>
                                        {review.comment && <p className="review-comment">{review.comment}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-reviews">Chưa có đánh giá nào cho sự kiện này</p>
                        )}
                    </div>
                    </>
                )}
                </div>

                {/* Sidebar */}
                <aside className="event-sidebar">
                    {/* NFT Check-in Section */}
                    {id && event && (
                        <div className="sidebar-section checkin-section">
                            <h3>Check-in với NFT</h3>
                            <CheckInButton
                                eventId={id}
                                eventName={event.name}
                                eventLocation={event.location?.address || event.location?.city || 'Việt Nam'}
                                eventImageUrl={event.media?.[0]?.url}
                            />
                        </div>
                    )}

                    {/* Tour Providers Section */}
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
