import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Bell,
    Heart,
    ChatCircle,
    Checks,
} from '@phosphor-icons/react';
import { useAuth } from '../hooks/useAuth';
import { notificationApi } from '../api/endpoints';
import type { Notification } from '../types';
import './NotificationDropdown.css';

const NotificationDropdown: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            setIsLoading(true);
            const response = await notificationApi.getAll(1, 20);
            if (response.data.data) {
                setNotifications(response.data.data.notifications);
                setUnreadCount(response.data.data.unread_count);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    // Fetch on mount and when dropdown opens
    useEffect(() => {
        if (isAuthenticated) {
            fetchNotifications();
        }
    }, [isAuthenticated, fetchNotifications]);

    // Refetch when dropdown opens
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen, fetchNotifications]);

    // Poll for new notifications every 30 seconds
    useEffect(() => {
        if (!isAuthenticated) return;

        const interval = setInterval(async () => {
            try {
                const response = await notificationApi.getUnreadCount();
                if (response.data.data) {
                    setUnreadCount(response.data.data.unread_count);
                }
            } catch (error) {
                // Silently fail
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatTimeAgo = (timestamp: number): string => {
        const seconds = Math.floor(Date.now() / 1000 - timestamp);
        if (seconds < 60) return 'Vừa xong';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} phút`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ`;
        const days = Math.floor(hours / 24);
        return `${days} ngày`;
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'like':
                return <Heart size={18} weight="fill" className="notif-icon notif-icon-like" />;
            case 'comment':
                return <ChatCircle size={18} weight="fill" className="notif-icon notif-icon-comment" />;
            default:
                return <Bell size={18} className="notif-icon" />;
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            try {
                await notificationApi.markAsRead(notification.id);
                setNotifications(prev =>
                    prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (error) {
                console.error('Failed to mark as read:', error);
            }
        }
        setIsOpen(false);
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="notification-dropdown-wrapper" ref={dropdownRef}>
            <button
                className={`notification-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Thông báo"
            >
                <Bell size={22} weight={isOpen ? 'fill' : 'regular'} />
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Thông báo</h3>
                        {unreadCount > 0 && (
                            <button className="mark-all-read" onClick={handleMarkAllAsRead}>
                                <Checks size={16} />
                                Đánh dấu đã đọc
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {isLoading ? (
                            <div className="notification-empty">
                                <p>Đang tải...</p>
                            </div>
                        ) : notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <Link
                                    key={notification.id}
                                    to={notification.post_id ? `/feed` : '#'}
                                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-icon-wrapper">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="notification-content">
                                        <p className="notification-text">
                                            <strong>{notification.actor.full_name || notification.actor.username}</strong> {notification.message}
                                        </p>
                                        <span className="notification-time">{formatTimeAgo(notification.created_at)}</span>
                                    </div>
                                    {!notification.read && <span className="unread-dot"></span>}
                                </Link>
                            ))
                        ) : (
                            <div className="notification-empty">
                                <Bell size={32} weight="light" />
                                <p>Không có thông báo mới</p>
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="notification-footer">
                            <Link to="/feed" onClick={() => setIsOpen(false)}>
                                Xem tất cả thông báo
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
