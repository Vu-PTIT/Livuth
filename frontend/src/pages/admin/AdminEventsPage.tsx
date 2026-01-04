import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventApi } from '../../api/endpoints';
import type { Event } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { ArrowLeft, Trash, Eye, MagnifyingGlass, CalendarBlank } from '@phosphor-icons/react';
import './AdminPages.css';

const AdminEventsPage: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        filterEvents();
    }, [searchQuery, events]);

    const fetchEvents = async () => {
        try {
            const response = await eventApi.getAll(100);
            setEvents(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filterEvents = () => {
        if (!searchQuery) {
            setFilteredEvents(events);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredEvents(
                events.filter(
                    (event) =>
                        event.name.toLowerCase().includes(query) ||
                        event.location?.city?.toLowerCase().includes(query) ||
                        event.categories?.some((c) => c.toLowerCase().includes(query))
                )
            );
        }
    };

    const handleDelete = async () => {
        if (!deleteEventId) return;

        setIsDeleting(true);
        try {
            await eventApi.delete(deleteEventId);
            setEvents((prev) => prev.filter((e) => e.id !== deleteEventId));
            setDeleteEventId(null);
        } catch (error) {
            console.error('Failed to delete event:', error);
        } finally {
            setIsDeleting(false);
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
            <Link to="/admin" className="back-link">
                <ArrowLeft size={18} />
                Dashboard
            </Link>

            <div className="page-header">
                <div>
                    <h1 className="page-title">Quản lý sự kiện</h1>
                    <p className="page-subtitle">{events.length} sự kiện</p>
                </div>
            </div>

            {/* Search */}
            <div className="search-bar-admin">
                <MagnifyingGlass size={20} />
                <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, thành phố, danh mục..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Events Table */}
            <div className="table-container card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Tên sự kiện</th>
                            <th>Địa điểm</th>
                            <th>Danh mục</th>
                            <th>Ngày tạo</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEvents.map((event) => (
                            <tr key={event.id}>
                                <td>
                                    <div className="event-cell">
                                        <CalendarBlank size={18} className="event-icon" />
                                        <span>{event.name}</span>
                                    </div>
                                </td>
                                <td>{event.location?.city || event.location?.province || '-'}</td>
                                <td>
                                    {event.categories?.slice(0, 2).map((cat, idx) => (
                                        <span key={idx} className="category-tag-small">{cat}</span>
                                    ))}
                                </td>
                                <td>{new Date(event.created_at * 1000).toLocaleDateString('vi-VN')}</td>
                                <td>
                                    <div className="table-actions">
                                        <Link to={`/events/${event.id}`} className="action-btn view" title="Xem">
                                            <Eye size={18} />
                                        </Link>
                                        <button
                                            className="action-btn delete"
                                            title="Xóa"
                                            onClick={() => setDeleteEventId(event.id)}
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Delete Modal */}
            <Modal isOpen={!!deleteEventId} onClose={() => setDeleteEventId(null)} title="Xác nhận xóa" size="small">
                <p>Bạn có chắc chắn muốn xóa sự kiện này?</p>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => setDeleteEventId(null)}>Hủy</button>
                    <button className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? 'Đang xóa...' : 'Xóa'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default AdminEventsPage;
