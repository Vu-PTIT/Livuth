import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ChatCircle, ShareNetwork, DotsThree, MapPin, PencilSimple, Trash, Ticket } from '@phosphor-icons/react';
import type { Post } from '../types';
import { postApi } from '../api/endpoints';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './Toast';
import './PostCard.css';

interface PostCardProps {
    post: Post;
    onUpdate?: (post: Post) => void;
    onDelete?: (postId: string) => void;
    onOpenDetail?: (post: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onUpdate, onDelete, onOpenDetail }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [isLiked, setIsLiked] = useState(post.is_liked);
    const [likeCount, setLikeCount] = useState(post.like_count);
    const [isLiking, setIsLiking] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const menuRef = useRef<HTMLDivElement>(null);

    const isOwner = user?.id === post.author.id;

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

        // Optimistic update
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);

        try {
            const response = await postApi.toggleLike(post.id);
            if (response.data.data) {
                setIsLiked(response.data.data.is_liked);
                setLikeCount(response.data.data.like_count);
            }
        } catch (error) {
            // Revert on error
            setIsLiked(!newIsLiked);
            setLikeCount(prev => newIsLiked ? prev - 1 : prev + 1);
        } finally {
            setIsLiking(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;

        setIsDeleting(true);
        try {
            await postApi.delete(post.id);
            showToast('Đã xóa bài viết', 'success');
            if (onDelete) {
                onDelete(post.id);
            }
        } catch (error) {
            showToast('Không thể xóa bài viết', 'error');
        } finally {
            setIsDeleting(false);
            setShowMenu(false);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setShowMenu(false);
    };

    const handleSaveEdit = async () => {
        if (!editContent.trim()) return;

        try {
            const response = await postApi.update(post.id, { content: editContent });
            if (response.data.data && onUpdate) {
                onUpdate(response.data.data);
            }
            showToast('Đã cập nhật bài viết', 'success');
            setIsEditing(false);
        } catch (error) {
            showToast('Không thể cập nhật bài viết', 'error');
        }
    };

    const handleCancelEdit = () => {
        setEditContent(post.content);
        setIsEditing(false);
    };

    return (
        <article className={`post-card ${isDeleting ? 'deleting' : ''}`}>
            {/* Header */}
            <div className="post-header">
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

                {/* Menu Button */}
                <div className="post-menu-wrapper" ref={menuRef}>
                    <button
                        className="post-menu-btn"
                        onClick={() => setShowMenu(!showMenu)}
                    >
                        <DotsThree size={24} weight="bold" />
                    </button>

                    {showMenu && (
                        <div className="post-menu-dropdown">
                            {isOwner && (
                                <>
                                    <button className="menu-item" onClick={handleEdit}>
                                        <PencilSimple size={18} />
                                        <span>Chỉnh sửa</span>
                                    </button>
                                    <button
                                        className="menu-item menu-item-danger"
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                    >
                                        <Trash size={18} />
                                        <span>{isDeleting ? 'Đang xóa...' : 'Xóa bài viết'}</span>
                                    </button>
                                </>
                            )}
                            {!isOwner && (
                                <button className="menu-item">
                                    <span>Báo cáo</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="post-content" onClick={() => !isEditing && onOpenDetail?.(post)} style={{ cursor: isEditing ? 'default' : 'pointer' }}>
                {isEditing ? (
                    <div className="post-edit-form" onClick={(e) => e.stopPropagation()}>
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="post-edit-textarea"
                            rows={4}
                        />
                        <div className="post-edit-actions">
                            <button className="btn btn-outline btn-sm" onClick={handleCancelEdit}>
                                Hủy
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>
                                Lưu
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
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

                        {/* Check-in Event */}
                        {post.checkin_event && (
                            <div className="post-checkin" onClick={(e) => e.stopPropagation()}>
                                <Ticket size={16} color="var(--primary-color)" />
                                <Link to={`/events/${post.checkin_event.id}`} className="checkin-link">
                                    {post.checkin_event.name}
                                </Link>
                            </div>
                        )}

                        {/* Tags */}
                        {post.tags.length > 0 && (
                            <div className="post-tags" onClick={(e) => e.stopPropagation()}>
                                {post.tags.map((tag, index) => (
                                    <Link key={index} to={`/search?tag=${tag}`} className="post-tag">
                                        #{tag}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Media */}
            {post.media.length > 0 && !isEditing && (
                <div
                    className={`post-media post-media-${Math.min(post.media.length, 4)}`}
                    onClick={() => onOpenDetail?.(post)}
                    style={{ cursor: 'pointer' }}
                >
                    {post.media.slice(0, 4).map((item, index) => (
                        <div key={index} className="post-media-item">
                            {item.type === 'video' ? (
                                <video src={item.url} controls onClick={(e) => e.stopPropagation()} />
                            ) : (
                                <img src={item.url} alt={item.caption || 'Post image'} />
                            )}
                            {index === 3 && post.media.length > 4 && (
                                <div className="post-media-more">
                                    +{post.media.length - 4}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Stats */}
            {(likeCount > 0 || post.comment_count > 0) && !isEditing && (
                <div className="post-stats">
                    {likeCount > 0 && (
                        <span className="post-stat">
                            <Heart size={16} weight="fill" className="stat-icon-like" />
                            {likeCount}
                        </span>
                    )}
                    {post.comment_count > 0 && (
                        <span
                            className="post-stat post-stat-comments"
                            onClick={() => onOpenDetail?.(post)}
                        >
                            {post.comment_count} bình luận
                        </span>
                    )}
                </div>
            )}

            {/* Actions */}
            {!isEditing && (
                <div className="post-actions">
                    <button
                        className={`post-action ${isLiked ? 'liked' : ''}`}
                        onClick={handleLike}
                        disabled={isLiking}
                    >
                        <Heart size={20} weight={isLiked ? 'fill' : 'regular'} />
                        <span>Thích</span>
                    </button>
                    <button
                        className="post-action"
                        onClick={() => onOpenDetail?.(post)}
                    >
                        <ChatCircle size={20} />
                        <span>Bình luận</span>
                    </button>
                    <button className="post-action">
                        <ShareNetwork size={20} />
                        <span>Chia sẻ</span>
                    </button>
                </div>
            )}
        </article>
    );
};

export default PostCard;
