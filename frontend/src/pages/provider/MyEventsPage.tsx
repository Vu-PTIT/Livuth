import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { eventApi } from '../../api/endpoints';
import type { Event } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { Plus, Pencil, Trash, Eye, CalendarBlank } from '@phosphor-icons/react';
import './ProviderPages.css';

const MyEventsPage: React.FC = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await eventApi.getAll(100);
            // Filter events by creator
            const myEvents = (response.data.data || []).filter(
                (event) => event.creator_id === user?.id
            );
            setEvents(myEvents);
        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setIsLoading(false);
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
                <LoadingSpinner text="Đang tải sự kiện..." />
            </div>
        );
    }

    return (
        <div className="provider-page container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sự kiện của tôi</h1>
                    <p className="page-subtitle">Quản lý các sự kiện bạn đã tạo</p>
                </div>
                <Link to="/my-events/new" className="btn btn-primary">
                    <Plus size={18} />
                    Tạo sự kiện mới
                </Link>
            </div>

            {events.length > 0 ? (
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
                            {events.map((event) => (
                                <tr key={event.id}>
                                    <td>
                                        <div className="event-name">
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
                                            <Link
                                                to={`/events/${event.id}`}
                                                className="action-btn view"
                                                title="Xem"
                                            >
                                                <Eye size={18} />
                                            </Link>
                                            <Link
                                                to={`/my-events/${event.id}/edit`}
                                                className="action-btn edit"
                                                title="Sửa"
                                            >
                                                <Pencil size={18} />
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
            ) : (
                <div className="empty-state card">
                    <div className="empty-state-icon">📅</div>
                    <h3 className="empty-state-title">Chưa có sự kiện nào</h3>
                    <p>Tạo sự kiện đầu tiên của bạn</p>
                    <Link to="/my-events/new" className="btn btn-primary mt-3">
                        <Plus size={18} />
                        Tạo sự kiện
                    </Link>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteEventId}
                onClose={() => setDeleteEventId(null)}
                title="Xác nhận xóa"
                size="small"
            >
                <p>Bạn có chắc chắn muốn xóa sự kiện này? Hành động này không thể hoàn tác.</p>
                <div className="modal-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setDeleteEventId(null)}
                    >
                        Hủy
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Đang xóa...' : 'Xóa'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default MyEventsPage;
