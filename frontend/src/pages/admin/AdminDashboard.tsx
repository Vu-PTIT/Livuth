import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userApi, eventApi, tourProviderApi } from '../../api/endpoints';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
    Users,
    CalendarBlank,
    MapTrifold,
    ArrowUp,
    ArrowRight,
} from '@phosphor-icons/react';
import './AdminPages.css';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        users: 0,
        events: 0,
        listings: 0,
        pendingUpgrades: 0,
        pendingListings: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const [usersRes, eventsRes, pendingUpgrades, pendingListings] = await Promise.all([
                userApi.getAll(),
                eventApi.getAll(),
                userApi.getPendingUpgrades(),
                tourProviderApi.getPending(),
            ]);

            setStats({
                users: (usersRes.data.data || []).length,
                events: (eventsRes.data.data || []).length,
                listings: 0, // Would need a separate endpoint
                pendingUpgrades: (pendingUpgrades.data.data || []).length,
                pendingListings: (pendingListings.data.data || []).length,
            });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <LoadingSpinner text="Đang tải..." />
            </div>
        );
    }

    return (
        <div className="admin-page container">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Tổng quan hệ thống p-INNO</p>
            </div>

            {/* Stats Grid */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="stat-icon users">
                        <Users size={28} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.users}</span>
                        <span className="stat-label">Người dùng</span>
                    </div>
                    <Link to="/admin/users" className="stat-link">
                        <ArrowRight size={18} />
                    </Link>
                </div>

                <div className="admin-stat-card">
                    <div className="stat-icon events">
                        <CalendarBlank size={28} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.events}</span>
                        <span className="stat-label">Sự kiện</span>
                    </div>
                    <Link to="/admin/events" className="stat-link">
                        <ArrowRight size={18} />
                    </Link>
                </div>

                <div className="admin-stat-card highlight">
                    <div className="stat-icon pending">
                        <ArrowUp size={28} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.pendingUpgrades}</span>
                        <span className="stat-label">Yêu cầu nâng cấp</span>
                    </div>
                    <Link to="/admin/upgrade-requests" className="stat-link">
                        <ArrowRight size={18} />
                    </Link>
                </div>

                <div className="admin-stat-card highlight">
                    <div className="stat-icon listings">
                        <MapTrifold size={28} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.pendingListings}</span>
                        <span className="stat-label">Tour chờ duyệt</span>
                    </div>
                    <Link to="/admin/tour-providers" className="stat-link">
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions card">
                <h2>Thao tác nhanh</h2>
                <div className="actions-grid">
                    <Link to="/admin/users" className="action-card">
                        <Users size={24} />
                        <span>Quản lý người dùng</span>
                    </Link>
                    <Link to="/admin/events" className="action-card">
                        <CalendarBlank size={24} />
                        <span>Quản lý sự kiện</span>
                    </Link>
                    <Link to="/admin/upgrade-requests" className="action-card">
                        <ArrowUp size={24} />
                        <span>Xét duyệt nâng cấp</span>
                    </Link>
                    <Link to="/admin/tour-providers" className="action-card">
                        <MapTrifold size={24} />
                        <span>Duyệt tour providers</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
