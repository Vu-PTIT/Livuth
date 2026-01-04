import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tourProviderApi } from '../../api/endpoints';
import type { TourProviderListing } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { ArrowLeft, Check, X, CheckCircle, Eye } from '@phosphor-icons/react';
import './AdminPages.css';

const TourProviderModerationPage: React.FC = () => {
    const [listings, setListings] = useState<TourProviderListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
    const [actionListingId, setActionListingId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | 'verify' | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchListings();
    }, [activeTab]);

    const fetchListings = async () => {
        setIsLoading(true);
        try {
            const response = activeTab === 'pending'
                ? await tourProviderApi.getPending()
                : await tourProviderApi.getAll();
            setListings(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch listings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!actionListingId) return;
        setIsProcessing(true);
        try {
            await tourProviderApi.approve(actionListingId);
            fetchListings();
            closeModal();
        } catch (error) {
            console.error('Failed to approve:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!actionListingId || !rejectReason.trim()) return;
        setIsProcessing(true);
        try {
            await tourProviderApi.reject(actionListingId, rejectReason);
            fetchListings();
            closeModal();
        } catch (error) {
            console.error('Failed to reject:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerify = async () => {
        if (!actionListingId) return;
        setIsProcessing(true);
        try {
            await tourProviderApi.verify(actionListingId);
            fetchListings();
            closeModal();
        } catch (error) {
            console.error('Failed to verify:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const openModal = (listingId: string, type: 'approve' | 'reject' | 'verify') => {
        setActionListingId(listingId);
        setActionType(type);
        setRejectReason('');
    };

    const closeModal = () => {
        setActionListingId(null);
        setActionType(null);
        setRejectReason('');
    };

    return (
        <div className="admin-page container">
            <Link to="/admin" className="back-link">
                <ArrowLeft size={18} />
                Dashboard
            </Link>

            <div className="page-header">
                <div>
                    <h1 className="page-title">Tour Provider Moderation</h1>
                    <p className="page-subtitle">Xét duyệt và quản lý nhà cung cấp tour</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="admin-tabs">
                <button
                    className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Chờ duyệt
                </button>
                <button
                    className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    Tất cả
                </button>
            </div>

            {isLoading ? (
                <div className="loading-container">
                    <LoadingSpinner text="Đang tải..." />
                </div>
            ) : listings.length > 0 ? (
                <div className="table-container card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Công ty</th>
                                <th>Dịch vụ</th>
                                <th>Giá</th>
                                <th>Trạng thái</th>
                                <th>Xác minh</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listings.map((listing) => (
                                <tr key={listing.id}>
                                    <td>
                                        <span className="company-name">{listing.company_name}</span>
                                    </td>
                                    <td>{listing.service_name}</td>
                                    <td>{listing.price_range}</td>
                                    <td>
                                        <StatusBadge status={listing.status} size="small" />
                                    </td>
                                    <td>
                                        <StatusBadge status={listing.verification_status} size="small" />
                                    </td>
                                    <td>
                                        <div className="table-actions">
                                            <Link
                                                to={`/tour-providers/${listing.id}`}
                                                className="action-btn view"
                                                title="Xem"
                                            >
                                                <Eye size={18} />
                                            </Link>
                                            {listing.status === 'pending' && (
                                                <>
                                                    <button
                                                        className="action-btn approve"
                                                        title="Phê duyệt"
                                                        onClick={() => openModal(listing.id, 'approve')}
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        title="Từ chối"
                                                        onClick={() => openModal(listing.id, 'reject')}
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </>
                                            )}
                                            {listing.status === 'approved' && listing.verification_status !== 'verified' && (
                                                <button
                                                    className="action-btn verify"
                                                    title="Xác minh"
                                                    onClick={() => openModal(listing.id, 'verify')}
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state card">
                    <div className="empty-state-icon">✅</div>
                    <h3 className="empty-state-title">
                        {activeTab === 'pending' ? 'Không có yêu cầu đang chờ' : 'Chưa có dữ liệu'}
                    </h3>
                </div>
            )}

            {/* Approve Modal */}
            <Modal isOpen={actionType === 'approve'} onClose={closeModal} title="Xác nhận phê duyệt" size="small">
                <p>Bạn có chắc chắn muốn phê duyệt listing này?</p>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                    <button className="btn btn-success" onClick={handleApprove} disabled={isProcessing}>
                        {isProcessing ? 'Đang xử lý...' : 'Phê duyệt'}
                    </button>
                </div>
            </Modal>

            {/* Reject Modal */}
            <Modal isOpen={actionType === 'reject'} onClose={closeModal} title="Từ chối listing" size="small">
                <div className="form-group">
                    <label className="form-label">Lý do từ chối *</label>
                    <textarea
                        className="form-textarea"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                        placeholder="Nhập lý do..."
                    />
                </div>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                    <button className="btn btn-danger" onClick={handleReject} disabled={isProcessing || !rejectReason.trim()}>
                        {isProcessing ? 'Đang xử lý...' : 'Từ chối'}
                    </button>
                </div>
            </Modal>

            {/* Verify Modal */}
            <Modal isOpen={actionType === 'verify'} onClose={closeModal} title="Xác minh nhà cung cấp" size="small">
                <p>Xác minh nhà cung cấp này là đáng tin cậy?</p>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                    <button className="btn btn-primary" onClick={handleVerify} disabled={isProcessing}>
                        {isProcessing ? 'Đang xử lý...' : 'Xác minh'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default TourProviderModerationPage;
