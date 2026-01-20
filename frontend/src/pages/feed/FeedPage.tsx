import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { postApi } from '../../api/endpoints';
import type { Post } from '../../types';
import PostCard from '../../components/PostCard';
import CreatePostForm from '../../components/CreatePostForm';
import { PostCardSkeleton } from '../../components/Skeleton';
import { Notebook, ArrowUp } from '@phosphor-icons/react';
import './FeedPage.css';

const FeedPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Fetch posts
    const fetchPosts = useCallback(async (pageNum: number, append: boolean = false) => {
        if (pageNum === 1) {
            setIsLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const response = await postApi.getFeed(pageNum, 10);
            if (response.data.data?.posts) {
                const newPosts = response.data.data.posts;
                if (append) {
                    setPosts(prev => [...prev, ...newPosts]);
                } else {
                    setPosts(newPosts);
                }
                setHasMore(newPosts.length === 10);
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchPosts(1);
        }
    }, [isAuthenticated, fetchPosts]);

    // Infinite scroll
    useEffect(() => {
        const handleScroll = () => {
            // Show scroll to top button
            setShowScrollTop(window.scrollY > 500);

            // Load more when near bottom
            if (
                window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
                hasMore &&
                !isLoadingMore &&
                !isLoading
            ) {
                setPage(prev => prev + 1);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMore, isLoadingMore, isLoading]);

    // Load more when page changes
    useEffect(() => {
        if (page > 1) {
            fetchPosts(page, true);
        }
    }, [page, fetchPosts]);

    const handlePostCreated = (newPost: Post) => {
        setPosts(prev => [newPost, ...prev]);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                    {/* Main Feed */}
                    <div className="feed-main">
                        {/* Create Post */}
                        <div className="feed-create-post card">
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
                                        <PostCard key={post.id} post={post} />
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
                    </div>
                </div>

                {/* Scroll to top button */}
                {showScrollTop && (
                    <button className="scroll-top-btn" onClick={scrollToTop}>
                        <ArrowUp size={24} weight="bold" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default FeedPage;
