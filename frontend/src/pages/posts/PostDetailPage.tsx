import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, ChatCircle, ShareNetwork, MapPin, DotsThree, PaperPlaneTilt } from '@phosphor-icons/react';
import { postApi } from '../../api/endpoints';
import { useAuth } from '../../hooks/useAuth';
import type { Post, Comment } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import './PostDetailPage.css';

const PostDetailPage: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [error, setError] = useState('');

    // Like state
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isLiking, setIsLiking] = useState(false);

    // Comment state
    const [commentText, setCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    useEffect(() => {
        const fetchPost = async () => {
            if (!postId) return;

            setIsLoading(true);
            try {
                const response = await postApi.getById(postId);
                if (response.data.data) {
                    const postData = response.data.data;
                    setPost(postData);
                    setIsLiked(postData.is_liked);
                    setLikeCount(postData.like_count);
                }
            } catch (err) {
                console.error('Failed to fetch post:', err);
                setError('Không thể tải bài đăng');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPost();
    }, [postId]);

    // Fetch comments
    useEffect(() => {
        const fetchComments = async () => {
            if (!postId) return;

            setIsLoadingComments(true);
            try {
                const response = await postApi.getComments(postId, 1, 50);
                if (response.data.data?.comments) {
                    setComments(response.data.data.comments);
                }
            } catch (err) {
                console.error('Failed to fetch comments:', err);
            } finally {
                setIsLoadingComments(false);
            }
        };

        fetchComments();
    }, [postId]);

    const formatTimeAgo = (timestamp: number): string => {
        const seconds = Math.floor(Date.now() / 1000 - timestamp);
        if (seconds < 60) return 'Vừa xong';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} phút trước`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} ngày trước`;
        return new Date(timestamp * 1000).toLocaleDateString('vi-VN');
    };

    const handleLike = async () => {
        if (!isAuthenticated || isLiking || !postId) return;
        setIsLiking(true);

        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);

        try {
            const response = await postApi.toggleLike(postId);
            if (response.data.data) {
                setIsLiked(response.data.data.is_liked);
                setLikeCount(response.data.data.like_count);
            }
        } catch (error) {
            setIsLiked(!newIsLiked);
            setLikeCount(prev => newIsLiked ? prev - 1 : prev + 1);
        } finally {
            setIsLiking(false);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated || !commentText.trim() || isSubmittingComment || !postId) return;

        setIsSubmittingComment(true);
        try {
            const response = await postApi.createComment(postId, { content: commentText.trim() });
            if (response.data.data) {
                setComments([response.data.data, ...comments]);
                setCommentText('');
                // Update comment count in post
                if (post) {
                    setPost({ ...post, comment_count: post.comment_count + 1 });
                }
            }
        } catch (err) {
            console.error('Failed to create comment:', err);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    if (isLoading) {
        return (
            <div className="post-detail-page">
                <div className="container">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="post-detail-page">
                <div className="container">
                    <div className="error-state">
                        <p>{error || 'Bài đăng không tồn tại'}</p>
                        <button className="btn btn-primary" onClick={() => navigate(-1)}>
                            <ArrowLeft size={18} /> Quay lại
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="post-detail-page">
            <div className="container">
                {/* Back button */}
                <button className="back-button" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                    <span>Quay lại</span>
                </button>

                <div className="post-detail-layout">
                    {/* Main Post */}
                    <article className="post-detail-card card">
                        {/* Header */}
                        <div className="post-detail-header">
                            <Link to={`/profile/${post.author.id}`} className="post-author">
                                <div className="post-avatar">
                                    {post.author.avatar_url ? (
                                        <img src={post.author.avatar_url} alt={post.author.username} />
                                    ) : (
                                        <span>{post.author.full_name?.[0] || post.author.username[0]}</span>
                                    )}
                                </div>
                                <div className="post-author-info">
                                    <span className="post-author-name">
                                        {post.author.full_name || post.author.username}
                                    </span>
                                    <span className="post-time">{formatTimeAgo(post.created_at)}</span>
                                </div>
                            </Link>
                            <button className="post-menu-btn">
                                <DotsThree size={24} weight="bold" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="post-detail-content">
                            <p>{post.content}</p>

                            {/* Location */}
                            {post.location && (post.location.city || post.location.province) && (
                                <div className="post-location">
                                    <MapPin size={16} />
                                    <span>
                                        {[post.location.city, post.location.province].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                            )}

                            {/* Tags */}
                            {post.tags.length > 0 && (
                                <div className="post-tags">
                                    {post.tags.map((tag, index) => (
                                        <Link key={index} to={`/search?tag=${tag}`} className="post-tag">
                                            #{tag}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Media */}
                        {post.media.length > 0 && (
                            <div className="post-detail-media">
                                {post.media.map((item, index) => (
                                    <div key={index} className="media-item">
                                        {item.type === 'video' ? (
                                            <video src={item.url} controls />
                                        ) : (
                                            <img src={item.url} alt={item.caption || 'Post image'} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Stats */}
                        <div className="post-detail-stats">
                            {likeCount > 0 && (
                                <span className="stat">
                                    <Heart size={16} weight="fill" className="stat-icon-like" />
                                    {likeCount} lượt thích
                                </span>
                            )}
                            {post.comment_count > 0 && (
                                <span className="stat">{post.comment_count} bình luận</span>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="post-detail-actions">
                            <button
                                className={`post-action ${isLiked ? 'liked' : ''}`}
                                onClick={handleLike}
                                disabled={isLiking || !isAuthenticated}
                            >
                                <Heart size={22} weight={isLiked ? 'fill' : 'regular'} />
                                <span>Thích</span>
                            </button>
                            <button className="post-action">
                                <ChatCircle size={22} />
                                <span>Bình luận</span>
                            </button>
                            <button className="post-action">
                                <ShareNetwork size={22} />
                                <span>Chia sẻ</span>
                            </button>
                        </div>
                    </article>

                    {/* Comments Section */}
                    <section className="comments-section card">
                        <h3>Bình luận ({post.comment_count})</h3>

                        {/* Comment Form */}
                        {isAuthenticated ? (
                            <form className="comment-form" onSubmit={handleSubmitComment}>
                                <div className="comment-avatar">
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.username} />
                                    ) : (
                                        <span>{user?.full_name?.[0] || user?.username?.[0] || 'U'}</span>
                                    )}
                                </div>
                                <div className="comment-input-wrapper">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Viết bình luận..."
                                        className="comment-input"
                                    />
                                    <button
                                        type="submit"
                                        className="comment-submit"
                                        disabled={!commentText.trim() || isSubmittingComment}
                                    >
                                        <PaperPlaneTilt size={18} weight="fill" />
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <p className="login-prompt">
                                <Link to="/login">Đăng nhập</Link> để bình luận
                            </p>
                        )}

                        {/* Comments List */}
                        <div className="comments-list">
                            {isLoadingComments ? (
                                <LoadingSpinner size="small" />
                            ) : comments.length > 0 ? (
                                comments.map((comment) => (
                                    <div key={comment.id} className="comment-item">
                                        <Link to={`/profile/${comment.author.id}`} className="comment-avatar">
                                            {comment.author.avatar_url ? (
                                                <img src={comment.author.avatar_url} alt={comment.author.username} />
                                            ) : (
                                                <span>{comment.author.full_name?.[0] || comment.author.username[0]}</span>
                                            )}
                                        </Link>
                                        <div className="comment-body">
                                            <div className="comment-header">
                                                <Link to={`/profile/${comment.author.id}`} className="comment-author">
                                                    {comment.author.full_name || comment.author.username}
                                                </Link>
                                                <span className="comment-time">{formatTimeAgo(comment.created_at)}</span>
                                            </div>
                                            <p className="comment-text">{comment.content}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="no-comments">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PostDetailPage;
