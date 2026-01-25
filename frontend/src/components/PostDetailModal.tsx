import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    X,
    Heart,
    PaperPlaneRight,
    DotsThree,
    MapPin,
    PencilSimple,
    Trash,
} from '@phosphor-icons/react';
import type { Post, Comment } from '../types';
import { postApi } from '../api/endpoints';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './Toast';
import './PostDetailModal.css';

interface PostDetailModalProps {
    post: Post;
    onClose: () => void;
    onPostUpdate?: (post: Post) => void;
    onPostDelete?: (postId: string) => void;
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({
    post,
    onClose,
    onPostUpdate,
    onPostDelete,
}) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLiked, setIsLiked] = useState(post.is_liked);
    const [likeCount, setLikeCount] = useState(post.like_count);
    const [isLiking, setIsLiking] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const [isDeleting, setIsDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const isOwner = user?.id === post.author.id;

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch comments
    useEffect(() => {
        const fetchComments = async () => {
            try {
                const response = await postApi.getComments(post.id);
                if (response.data.data?.comments) {
                    setComments(response.data.data.comments);
                }
            } catch (error) {
                console.error('Failed to fetch comments:', error);
            } finally {
                setIsLoadingComments(false);
            }
        };
        fetchComments();
    }, [post.id]);

    // Prevent body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

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
        if (isLiking) return;
        setIsLiking(true);
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikeCount((prev) => (newIsLiked ? prev + 1 : prev - 1));

        try {
            const response = await postApi.toggleLike(post.id);
            if (response.data.data) {
                setIsLiked(response.data.data.is_liked);
                setLikeCount(response.data.data.like_count);
            }
        } catch (error) {
            setIsLiked(!newIsLiked);
            setLikeCount((prev) => (newIsLiked ? prev - 1 : prev + 1));
        } finally {
            setIsLiking(false);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const response = await postApi.createComment(post.id, { content: newComment });
            if (response.data.data) {
                setComments((prev) => [...prev, response.data.data!]);
                setNewComment('');
            }
        } catch (error) {
            showToast('Không thể gửi bình luận', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditPost = async () => {
        if (!editContent.trim()) return;
        try {
            const response = await postApi.update(post.id, { content: editContent });
            if (response.data.data && onPostUpdate) {
                onPostUpdate(response.data.data);
            }
            showToast('Đã cập nhật bài viết', 'success');
            setIsEditing(false);
        } catch (error) {
            showToast('Không thể cập nhật bài viết', 'error');
        }
    };

    const handleDeletePost = async () => {
        if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
        setIsDeleting(true);
        try {
            await postApi.delete(post.id);
            showToast('Đã xóa bài viết', 'success');
            if (onPostDelete) onPostDelete(post.id);
            onClose();
        } catch (error) {
            showToast('Không thể xóa bài viết', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    return (
        <div className="post-modal-overlay" onClick={handleBackdropClick}>
            <div className="post-modal" ref={modalRef}>
                {/* Close button */}
                <button className="post-modal-close" onClick={onClose}>
                    <X size={24} weight="bold" />
                </button>

                <div className="post-modal-content">
                    {/* Post Content Area */}
                    <div className="post-modal-main">
                        {/* Header */}
                        <div className="post-modal-header">
                            <Link to={`/profile/${post.author.id}`} className="post-author" onClick={onClose}>
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

                            {/* Menu */}
                            {isOwner && (
                                <div className="post-menu-wrapper" ref={menuRef}>
                                    <button className="post-menu-btn" onClick={() => setShowMenu(!showMenu)}>
                                        <DotsThree size={24} weight="bold" />
                                    </button>
                                    {showMenu && (
                                        <div className="post-menu-dropdown">
                                            <button className="menu-item" onClick={() => { setIsEditing(true); setShowMenu(false); }}>
                                                <PencilSimple size={18} />
                                                <span>Chỉnh sửa</span>
                                            </button>
                                            <button className="menu-item menu-item-danger" onClick={handleDeletePost} disabled={isDeleting}>
                                                <Trash size={18} />
                                                <span>{isDeleting ? 'Đang xóa...' : 'Xóa bài viết'}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="post-modal-body">
                            {isEditing ? (
                                <div className="post-edit-form">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="post-edit-textarea"
                                        rows={4}
                                    />
                                    <div className="post-edit-actions">
                                        <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(false)}>Hủy</button>
                                        <button className="btn btn-primary btn-sm" onClick={handleEditPost}>Lưu</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="post-text">{post.content}</p>
                            )}

                            {post.location && (post.location.city || post.location.province) && (
                                <div className="post-location">
                                    <MapPin size={16} />
                                    <span>{[post.location.city, post.location.province].filter(Boolean).join(', ')}</span>
                                </div>
                            )}

                            {/* Media */}
                            {post.media.length > 0 && (
                                <div className="post-modal-media">
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

                            {/* Stats & Like */}
                            <div className="post-modal-stats">
                                <button className={`like-btn ${isLiked ? 'liked' : ''}`} onClick={handleLike} disabled={isLiking}>
                                    <Heart size={20} weight={isLiked ? 'fill' : 'regular'} />
                                    <span>{likeCount} lượt thích</span>
                                </button>
                                <span className="comment-count">{comments.length} bình luận</span>
                            </div>
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="post-modal-comments">
                        <h3>Bình luận ({comments.length})</h3>

                        {/* Comment Input */}
                        <form className="comment-form" onSubmit={handleSubmitComment}>
                            <div className="comment-input-wrapper">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="" className="comment-avatar" />
                                ) : (
                                    <div className="comment-avatar-placeholder">
                                        {user?.full_name?.[0] || user?.username?.[0]}
                                    </div>
                                )}
                                <input
                                    type="text"
                                    placeholder="Viết bình luận..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="comment-input"
                                />
                                <button type="submit" className="comment-submit" disabled={!newComment.trim() || isSubmitting}>
                                    <PaperPlaneRight size={20} weight="fill" />
                                </button>
                            </div>
                        </form>

                        {/* Comments List */}
                        <div className="comments-list">
                            {isLoadingComments ? (
                                <div className="comments-loading">Đang tải bình luận...</div>
                            ) : comments.length > 0 ? (
                                comments.map((comment) => (
                                    <div key={comment.id} className="comment-item">
                                        <Link to={`/profile/${comment.author.id}`} className="comment-author-avatar" onClick={onClose}>
                                            {comment.author.avatar_url ? (
                                                <img src={comment.author.avatar_url} alt="" />
                                            ) : (
                                                <span>{comment.author.full_name?.[0] || comment.author.username[0]}</span>
                                            )}
                                        </Link>
                                        <div className="comment-content">
                                            <div className="comment-header">
                                                <span className="comment-author">{comment.author.full_name || comment.author.username}</span>
                                                <span className="comment-time">{formatTimeAgo(comment.created_at)}</span>
                                            </div>
                                            <p className="comment-text">{comment.content}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="comments-empty">Chưa có bình luận nào</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostDetailModal;
