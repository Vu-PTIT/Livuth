import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { tourProviderApi } from '../../api/endpoints';
import type { TourProviderListing } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { Plus, Pencil, Trash, Eye, EyeSlash, MapTrifold, Info } from '@phosphor-icons/react';
import { useToast } from '../../components/Toast';
import './ProviderPages.css';

const MyListingsPage: React.FC = () => {
    useAuth(); // Just for auth check
    const [listings, setListings] = useState<TourProviderListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteListingId, setDeleteListingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        fetchListings();
    }, []);

    const fetchListings = async () => {
        try {
            const response = await tourProviderApi.getMyListings();
            setListings(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch listings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteListingId) return;

        setIsDeleting(true);
        try {
            await tourProviderApi.delete(deleteListingId);
            setListings((prev) => prev.filter((l) => l.id !== deleteListingId));
            setDeleteListingId(null);
            showToast('Xóa dịch vụ thành công', 'success');
        } catch (error) {
            console.error('Failed to delete listing:', error);
            showToast('Không thể xóa dịch vụ', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleVisibility = async (listing: TourProviderListing) => {
        setTogglingId(listing.id);
        try {
            const newVisibility = !listing.is_visible;
            await tourProviderApi.toggleVisibility(listing.id, newVisibility);
            setListings((prev) =>
                prev.map((l) => (l.id === listing.id ? { ...l, is_visible: newVisibility } : l))
            );
            showToast(newVisibility ? 'Đã hiện dịch vụ' : 'Đã ẩn dịch vụ', 'success');
        } catch (error) {
            console.error('Failed to toggle visibility:', error);
            showToast('Không thể thay đổi trạng thái hiển thị', 'error');
        } finally {
            setTogglingId(null);
        }
    };

    const filteredListings = statusFilter
        ? listings.filter((l) => l.status === statusFilter)
        : listings;

    const stats = {
        total: listings.length,
        approved: listings.filter((l) => l.status === 'approved').length,
        pending: listings.filter((l) => l.status === 'pending').length,
        rejected: listings.filter((l) => l.status === 'rejected').length,
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <LoadingSpinner text="Đang tải dữ liệu..." />
            </div>
        );
    }

    return (
        <div className="provider-page container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dịch vụ Tour</h1>
                    <p className="page-subtitle">Quản lý các dịch vụ tour của bạn</p>
                </div>
                <Link to="/my-listings/new" className="btn btn-primary">
                    <Plus size={18} />
                    Tạo dịch vụ mới
                </Link>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card" onClick={() => setStatusFilter('')}>
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">Tổng dịch vụ</span>
                </div>
                <div className="stat-card approved" onClick={() => setStatusFilter('approved')}>
                    <span className="stat-value">{stats.approved}</span>
                    <span className="stat-label">Đã duyệt</span>
                </div>
                <div className="stat-card pending" onClick={() => setStatusFilter('pending')}>
                    <span className="stat-value">{stats.pending}</span>
                    <span className="stat-label">Đang chờ</span>
                </div>
                <div className="stat-card rejected" onClick={() => setStatusFilter('rejected')}>
                    <span className="stat-value">{stats.rejected}</span>
                    <span className="stat-label">Từ chối</span>
                </div>
            </div>

            {filteredListings.length > 0 ? (
                <div className="table-container card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Dịch vụ</th>
                                <th>Sự kiện</th>
                                <th>Giá</th>
                                <th>Trạng thái</th>
                                <th>Lượt xem</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredListings.map((listing) => (
                                <tr key={listing.id}>
                                    <td data-label="Dịch vụ">
                                        <div className="listing-name">
                                            <div className="listing-icon-wrapper">
                                                <MapTrifold size={20} weight="bold" />
                                            </div>
                                            <div>
                                                <span className="company-name">
                                                    {listing.company_name}
                                                    {listing.is_visible === false && (
                                                        <span className="visibility-badge hidden">Đã ẩn</span>
                                                    )}
                                                </span>
                                                <span className="service-name">{listing.service_name}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Sự kiện">
                                        <div className="event-tag">
                                            {listing.event_name || 'Đang cập nhật...'}
                                        </div>
                                    </td>
                                    <td className="price-cell" data-label="Giá">{listing.price_range}</td>
                                    <td data-label="Trạng thái">
                                        <div className="status-with-reason">
                                            <StatusBadge status={listing.status} size="small" />
                                            {listing.rejection_reason && (
                                                <div className="rejection-info" title={listing.rejection_reason}>
                                                    <Info size={14} weight="fill" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="view-count" data-label="Lượt xem">{listing.view_count.toLocaleString()}</td>
                                    <td data-label="Thao tác">
                                        <div className="table-actions">
                                            <button
                                                className={`action-btn ${listing.is_visible === false ? 'hidden-state' : 'visible-state'}`}
                                                title={listing.is_visible === false ? 'Hiện dịch vụ' : 'Ẩn dịch vụ'}
                                                onClick={() => handleToggleVisibility(listing)}
                                                disabled={togglingId === listing.id}
                                            >
                                                {listing.is_visible === false ? <Eye size={18} weight="bold" /> : <EyeSlash size={18} weight="bold" />}
                                            </button>
                                            <Link
                                                to={`/tour-providers/${listing.id}`}
                                                className="action-btn view"
                                                title="Xem"
                                            >
                                                <Eye size={18} weight="bold" />
                                            </Link>
                                            <Link
                                                to={`/my-listings/${listing.id}/edit`}
                                                className="action-btn edit"
                                                title="Sửa"
                                            >
                                                <Pencil size={18} weight="bold" />
                                            </Link>
                                            <button
                                                className="action-btn delete"
                                                title="Xóa"
                                                onClick={() => setDeleteListingId(listing.id)}
                                            >
                                                <Trash size={18} weight="bold" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state-card container">
                    <div className="empty-illustration">
                        <MapTrifold size={80} weight="duotone" />
                    </div>
                    <h3 className="empty-title">
                        {statusFilter ? `Không có dịch vụ ${statusFilter}` : 'Chưa có dịch vụ nào'}
                    </h3>
                    <p className="empty-description">Hãy tạo dịch vụ tour đầu tiên của bạn để kết nối với khách du lịch.</p>
                    <Link to="/my-listings/new" className="btn btn-primary btn-lg mt-4">
                        <Plus size={20} weight="bold" />
                        Tạo dịch vụ ngay
                    </Link>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteListingId}
                onClose={() => setDeleteListingId(null)}
                title="Xác nhận xóa"
                size="small"
            >
                <p>Bạn có chắc chắn muốn xóa dịch vụ này? Hành động này không thể hoàn tác.</p>
                <div className="modal-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setDeleteListingId(null)}
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

export default MyListingsPage;
