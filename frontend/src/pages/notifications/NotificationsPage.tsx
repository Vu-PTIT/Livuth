import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Bell,
    Heart,
    ChatCircle,
    Checks,
    MapPin,
    CheckCircle,
} from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuth';
import { notificationApi } from '../../api/endpoints';
import type { Notification } from '../../types';
import './NotificationsPage.css';

const NotificationsPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            setIsLoading(true);
            const response = await notificationApi.getAll(1, 50);
            if (response.data.data) {
                setNotifications(response.data.data.notifications as Notification[]);
                setUnreadCount(response.data.data.unread_count);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const formatTimeAgo = (timestamp: number): string => {
        const seconds = Math.floor(Date.now() / 1000 - timestamp);
        if (seconds < 60) return 'Vừa xong';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} phút trước`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        return `${days} ngày trước`;
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'like':
                return <Heart size={20} weight="fill" className="notif-icon notif-icon-like" />;
            case 'comment':
                return <ChatCircle size={20} weight="fill" className="notif-icon notif-icon-comment" />;
            case 'checkin':
                return <CheckCircle size={20} weight="fill" className="notif-icon notif-icon-checkin" />;
            case 'proximity':
                return <MapPin size={20} weight="fill" className="notif-icon notif-icon-proximity" />;
            default:
                return <Bell size={20} className="notif-icon" />;
        }
    };

    const getNotificationLink = (notification: Notification): string => {
        if (notification.event_id) {
            return `/events/${notification.event_id}`;
        }
        if (notification.post_id) {
            return `/feed`;
        }
        return '#';
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
        <div className="notifications-page">
            <div className="container">
                <div className="notifications-header">
                    <h1>Thông báo</h1>
                    {unreadCount > 0 && (
                        <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
                            <Checks size={18} />
                            <span>Đã đọc tất cả</span>
                        </button>
                    )}
                </div>

                <div className="notifications-list">
                    {isLoading ? (
                        <div className="notifications-loading">
                            <div className="loading-spinner"></div>
                            <p>Đang tải thông báo...</p>
                        </div>
                    ) : notifications.length > 0 ? (
                        notifications.map((notification) => (
                            <Link
                                key={notification.id}
                                to={getNotificationLink(notification)}
                                className={`notification-card ${!notification.read ? 'unread' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="notification-icon-wrapper">
                                    {getIcon(notification.type)}
                                </div>
                                <div className="notification-content">
                                    <p className="notification-message">{notification.message}</p>
                                    <span className="notification-time">{formatTimeAgo(notification.created_at)}</span>
                                </div>
                                {!notification.read && <span className="unread-indicator"></span>}
                            </Link>
                        ))
                    ) : (
                        <div className="notifications-empty">
                            <Bell size={48} weight="light" />
                            <h3>Không có thông báo</h3>
                            <p>Bạn sẽ nhận được thông báo khi có hoạt động mới</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
