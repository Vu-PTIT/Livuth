import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { eventApi } from '../../api/endpoints';
import type { Event } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { Plus, Pencil, Trash, Eye, EyeSlash, CalendarBlank } from '@phosphor-icons/react';
import { useToast } from '../../components/Toast';
import './ProviderPages.css';

const MyEventsPage: React.FC = () => {
    useAuth(); // Just for auth check
    const toast = useToast();
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            // Use the new /my/events endpoint which includes hidden events
            const response = await eventApi.getMyEvents();
            setEvents(response.data.data || []);
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

    const handleToggleVisibility = async (event: Event) => {
        setTogglingId(event.id);
        try {
            const newVisibility = !event.is_visible;
            await eventApi.toggleVisibility(event.id, newVisibility);
            setEvents((prev) =>
                prev.map((e) => (e.id === event.id ? { ...e, is_visible: newVisibility } : e))
            );
            toast.success(newVisibility ? 'Đã hiện sự kiện' : 'Đã ẩn sự kiện');
        } catch (error) {
            console.error('Failed to toggle visibility:', error);
            toast.error('Không thể thay đổi trạng thái hiển thị');
        } finally {
            setTogglingId(null);
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
                                    <td data-label="Tên sự kiện">
                                        <div className="event-name">
                                            <CalendarBlank size={18} className="event-icon" />
                                            <span>{event.name}</span>
                                            {event.is_visible === false && (
                                                <span className="visibility-badge hidden">Đã ẩn</span>
                                            )}
                                        </div>
                                    </td>
                                    <td data-label="Địa điểm">{event.location?.city || event.location?.province || '-'}</td>
                                    <td data-label="Danh mục">
                                        {event.categories?.slice(0, 2).map((cat, idx) => (
                                            <span key={idx} className="category-tag-small">{cat}</span>
                                        ))}
                                    </td>
                                    <td data-label="Ngày tạo">{new Date(event.created_at * 1000).toLocaleDateString('vi-VN')}</td>
                                    <td data-label="Thao tác">
                                        <div className="table-actions">
                                            <button
                                                className={`action-btn ${event.is_visible === false ? 'hidden-state' : 'visible-state'}`}
                                                title={event.is_visible === false ? 'Hiện sự kiện' : 'Ẩn sự kiện'}
                                                onClick={() => handleToggleVisibility(event)}
                                                disabled={togglingId === event.id}
                                            >
                                                {event.is_visible === false ? <Eye size={18} /> : <EyeSlash size={18} />}
                                            </button>
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
