import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePostsFeed } from '../../hooks/useDataCaching';
import type { Post } from '../../types';
import PostCard from '../../components/PostCard';
import PostDetailModal from '../../components/PostDetailModal';
import CreatePostForm from '../../components/CreatePostForm';
import { PostCardSkeleton } from '../../components/Skeleton';
import { Notebook, ArrowUp, MagnifyingGlass, FunnelSimple, X } from '@phosphor-icons/react';
import { eventApi } from '../../api/endpoints';
import { formatToVietnameseDate } from '../../utils/date';
import './FeedPage.css';

const FeedPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [page, setPage] = useState(1);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const isLoadingMore = false;

    // Maintain a local posts list to handle appending for infinite scroll
    const [posts, setPosts] = useState<Post[]>([]);
    const [hasMore, setHasMore] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [eventIdFilter, setEventIdFilter] = useState('');
    const [selectedEventName, setSelectedEventName] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [showEventSearch, setShowEventSearch] = useState(false);
    const [eventQuery, setEventQuery] = useState('');
    const [foundEvents, setFoundEvents] = useState<any[]>([]);
    const [isSearchingEvents, setIsSearchingEvents] = useState(false);
    const eventFilterRef = useRef<HTMLDivElement>(null);

    // Handle click outside for event search
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (eventFilterRef.current && !eventFilterRef.current.contains(event.target as Node)) {
                setShowEventSearch(false);
            }
        };

        if (showEventSearch) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEventSearch]);

    const { data: feedData, isLoading } = usePostsFeed({
        page,
        pageSize: 10,
        q: searchQuery,
        city: cityFilter,
        event_id: eventIdFilter
    });
    const postsFromQuery = feedData?.posts || [];

    // Reset page and posts when filters change
    useEffect(() => {
        setPage(1);
        setPosts([]);
        setHasMore(true);
    }, [searchQuery, cityFilter, eventIdFilter]);

    // Search events for filter dropdown
    useEffect(() => {
        if (showEventSearch && eventQuery.trim()) {
            const searchEvents = async () => {
                setIsSearchingEvents(true);
                try {
                    const response = await eventApi.search({ q: eventQuery, pageSize: 5 });
                    if (response.data.data) {
                        setFoundEvents(response.data.data);
                    }
                } catch (error) {
                    console.error("Error searching events", error);
                } finally {
                    setIsSearchingEvents(false);
                }
            };

            const timeoutId = setTimeout(searchEvents, 500);
            return () => clearTimeout(timeoutId);
        } else if (!eventQuery.trim()) {
            setFoundEvents([]);
        }
    }, [showEventSearch, eventQuery]);

    useEffect(() => {
        if (page === 1) {
            setPosts(postsFromQuery);
        } else {
            setPosts(prev => {
                const combined = [...prev, ...postsFromQuery];
                // Unique filtering just in case
                return Array.from(new Map(combined.map(p => [p.id, p])).values());
            });
        }
        setHasMore(postsFromQuery.length === 10);
    }, [postsFromQuery, page]);

    const handlePostCreated = (newPost: Post) => {
        setPosts(prev => [newPost, ...prev]);
    };

    // Infinite scroll
    useEffect(() => {
        const handleScroll = () => {
            // Show scroll to top button
            setShowScrollTop(window.scrollY > 500);

            // Load more when near bottom
            if (
                window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
                hasMore &&
                !isLoading
            ) {
                setPage((prev: number) => prev + 1);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMore, isLoading]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleOpenDetail = (post: Post) => {
        setSelectedPost(post);
    };

    const handleCloseModal = () => {
        setSelectedPost(null);
    };

    const handlePostUpdate = (updatedPost: Post) => {
        setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
        setSelectedPost(updatedPost);
    };

    const handlePostDelete = (postId: string) => {
        setPosts(prev => prev.filter(p => p.id !== postId));
        setSelectedPost(null);
    };

    if (!isAuthenticated) {
        return (
            <div className="feed-page">
                <div className="container">
                    <div className="feed-login-prompt">
                        <Notebook size={64} weight="light" />
                        <h2>Cộng đồng du lịch</h2>
                        <p>Đăng nhập để xem và chia sẻ những khoảnh khắc du lịch</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="feed-page">
            <div className="container">
                <div className="feed-layout">
                    {/* Left spacer (empty) */}
                    <div className="feed-spacer" />

                    {/* Main Feed */}
                    <main className="feed-main">
                        {/* Create Post */}
                        <div className="feed-create-post">
                            <CreatePostForm onPostCreated={handlePostCreated} />
                        </div>

                        {/* Posts List */}
                        <div className="feed-posts">
                            {isLoading ? (
                                <>
                                    <PostCardSkeleton />
                                    <PostCardSkeleton />
                                    <PostCardSkeleton />
                                </>
                            ) : posts.length > 0 ? (
                                <>
                                    {posts.map((post) => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            onOpenDetail={handleOpenDetail}
                                            onUpdate={handlePostUpdate}
                                            onDelete={handlePostDelete}
                                        />
                                    ))}

                                    {/* Loading more indicator */}
                                    {isLoadingMore && (
                                        <div className="feed-loading-more">
                                            <PostCardSkeleton />
                                        </div>
                                    )}

                                    {/* End of feed */}
                                    {!hasMore && posts.length > 0 && (
                                        <div className="feed-end">
                                            <p>Bạn đã xem hết bài đăng</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="feed-empty card">
                                    <Notebook size={48} weight="light" />
                                    <h3>Chưa có bài đăng nào</h3>
                                    <p>Hãy là người đầu tiên chia sẻ khoảnh khắc du lịch!</p>
                                </div>
                            )}
                        </div>
                    </main>

                    {/* Sidebar Right (Search & Filters) */}
                    <aside className="feed-sidebar">
                        <div className="sidebar-sticky">
                            <div className="feed-search-section">
                                <h3 className="sidebar-title">Tìm kiếm & Lọc</h3>
                                <div className="search-bar-wrapper">
                                    <div className="search-input-group">
                                        <MagnifyingGlass size={18} className="search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Tìm bài đăng..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="feed-search-input"
                                        />
                                    </div>
                                    <button
                                        className={`filter-toggle-btn ${(showFilters || cityFilter || eventIdFilter) ? 'active' : ''}`}
                                        onClick={() => setShowFilters(!showFilters)}
                                        title="Lọc bài đăng"
                                    >
                                        <FunnelSimple size={18} weight={(cityFilter || eventIdFilter) ? "fill" : "regular"} />
                                    </button>
                                </div>

                                {showFilters && (
                                    <div className="feed-filters-panel">
                                        <div className="filter-group">
                                            <label>Địa điểm</label>
                                            <div className="filter-input-wrapper">
                                                <input
                                                    type="text"
                                                    placeholder="Tỉnh/Thành phố..."
                                                    value={cityFilter}
                                                    onChange={(e) => setCityFilter(e.target.value)}
                                                />
                                                {cityFilter && (
                                                    <button onClick={() => setCityFilter('')} className="clear-field">
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="filter-group" ref={eventFilterRef}>
                                            <label>Sự kiện</label>
                                            <div className="filter-input-wrapper">
                                                <input
                                                    type="text"
                                                    placeholder="Chọn sự kiện..."
                                                    value={selectedEventName || eventQuery}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setEventQuery(newVal);
                                                        setSelectedEventName('');
                                                        setEventIdFilter('');
                                                        if (newVal.trim()) {
                                                            setShowEventSearch(true);
                                                        }
                                                    }}
                                                    onFocus={() => {
                                                        if (eventQuery.trim() || !eventIdFilter) {
                                                            setShowEventSearch(true);
                                                        }
                                                    }}
                                                />
                                                {(eventIdFilter || selectedEventName || eventQuery) && (
                                                    <button onClick={() => {
                                                        setEventIdFilter('');
                                                        setSelectedEventName('');
                                                        setEventQuery('');
                                                        setShowEventSearch(false);
                                                    }} className="clear-field">
                                                        <X size={12} />
                                                    </button>
                                                )}
                                                {showEventSearch && (
                                                    <div className="event-filter-dropdown" onClick={(e) => e.stopPropagation()}>
                                                        <div className="event-results-list">
                                                            {isSearchingEvents ? (
                                                                <div className="dropdown-message">Đang tìm...</div>
                                                            ) : foundEvents.length > 0 ? (
                                                                foundEvents.map(event => (
                                                                    <div
                                                                        key={event.id}
                                                                        className="event-dropdown-item"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEventIdFilter(event.id);
                                                                            setSelectedEventName(event.name);
                                                                            setEventQuery('');
                                                                            setShowEventSearch(false);
                                                                        }}
                                                                    >
                                                                        <div className="event-item-name">{event.name}</div>
                                                                        <div className="event-item-meta">{formatToVietnameseDate(event.time?.next_occurrence || '')}</div>
                                                                    </div>
                                                                ))
                                                            ) : eventQuery ? (
                                                                <div className="dropdown-message">Không tìm thấy sự kiện</div>
                                                            ) : (
                                                                <div className="dropdown-message">Gợi ý sự kiện gần đây</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {(cityFilter || eventIdFilter || searchQuery) && (
                                            <div className="filters-footer">
                                                <button className="btn-text" onClick={() => {
                                                    setCityFilter('');
                                                    setEventIdFilter('');
                                                    setSelectedEventName('');
                                                    setSearchQuery('');
                                                    setShowEventSearch(false);
                                                }}>
                                                    Xóa tất cả
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>

                {/* Scroll to top button */}
                {showScrollTop && (
                    <button className="scroll-top-btn" onClick={scrollToTop}>
                        <ArrowUp size={24} weight="bold" />
                    </button>
                )}

                {/* Post Detail Modal */}
                {selectedPost && (
                    <PostDetailModal
                        post={selectedPost}
                        onClose={handleCloseModal}
                        onPostUpdate={handlePostUpdate}
                        onPostDelete={handlePostDelete}
                    />
                )}
            </div>
        </div>
    );
};

export default FeedPage;
