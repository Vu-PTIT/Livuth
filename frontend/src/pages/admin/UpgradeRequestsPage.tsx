import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../../api/endpoints';
import type { User } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { ArrowLeft, Check, X } from '@phosphor-icons/react';
import './AdminPages.css';

const UpgradeRequestsPage: React.FC = () => {
    const [requests, setRequests] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionUserId, setActionUserId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const response = await userApi.getPendingUpgrades();
            setRequests(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch requests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!actionUserId) return;

        setIsProcessing(true);
        try {
            await userApi.approveUpgrade(actionUserId);
            setRequests((prev) => prev.filter((r) => r.id !== actionUserId));
            closeModal();
        } catch (error) {
            console.error('Failed to approve:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!actionUserId || !rejectReason.trim()) return;

        setIsProcessing(true);
        try {
            await userApi.rejectUpgrade(actionUserId, rejectReason);
            setRequests((prev) => prev.filter((r) => r.id !== actionUserId));
            closeModal();
        } catch (error) {
            console.error('Failed to reject:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const openModal = (userId: string, type: 'approve' | 'reject') => {
        setActionUserId(userId);
        setActionType(type);
        setRejectReason('');
    };

    const closeModal = () => {
        setActionUserId(null);
        setActionType(null);
        setRejectReason('');
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
                    <h1 className="page-title">Yêu cầu nâng cấp</h1>
                    <p className="page-subtitle">{requests.length} yêu cầu đang chờ</p>
                </div>
            </div>

            {requests.length > 0 ? (
                <div className="requests-list">
                    {requests.map((user) => (
                        <div key={user.id} className="request-card card">
                            <div className="request-header">
                                <div className="user-info">
                                    <div className="user-avatar-small">
                                        {user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <span className="user-name">{user.full_name || user.username}</span>
                                        <span className="user-email">{user.email}</span>
                                    </div>
                                </div>
                                <div className="requested-role">
                                    <span className="role-badge highlight">{user.pending_role_upgrade}</span>
                                </div>
                            </div>

                            <div className="request-reason">
                                <strong>Lý do:</strong>
                                <p>{user.upgrade_request_reason || 'Không có lý do'}</p>
                            </div>

                            <div className="request-meta">
                                <span>
                                    Ngày gửi: {user.upgrade_request_date
                                        ? new Date(user.upgrade_request_date * 1000).toLocaleDateString('vi-VN')
                                        : 'N/A'}
                                </span>
                            </div>

                            <div className="request-actions">
                                <button
                                    className="btn btn-success"
                                    onClick={() => openModal(user.id, 'approve')}
                                >
                                    <Check size={18} />
                                    Phê duyệt
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => openModal(user.id, 'reject')}
                                >
                                    <X size={18} />
                                    Từ chối
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state card">
                    <div className="empty-state-icon">✅</div>
                    <h3 className="empty-state-title">Không có yêu cầu nào</h3>
                    <p>Tất cả yêu cầu đã được xử lý</p>
                </div>
            )}

            {/* Approve Modal */}
            <Modal
                isOpen={actionType === 'approve'}
                onClose={closeModal}
                title="Xác nhận phê duyệt"
                size="small"
            >
                <p>Bạn có chắc chắn muốn phê duyệt yêu cầu này?</p>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={closeModal}>
                        Hủy
                    </button>
                    <button
                        className="btn btn-success"
                        onClick={handleApprove}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Đang xử lý...' : 'Phê duyệt'}
                    </button>
                </div>
            </Modal>

            {/* Reject Modal */}
            <Modal
                isOpen={actionType === 'reject'}
                onClose={closeModal}
                title="Từ chối yêu cầu"
                size="small"
            >
                <div className="form-group">
                    <label className="form-label">Lý do từ chối *</label>
                    <textarea
                        className="form-textarea"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                        placeholder="Nhập lý do từ chối..."
                        required
                    />
                </div>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={closeModal}>
                        Hủy
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={handleReject}
                        disabled={isProcessing || !rejectReason.trim()}
                    >
                        {isProcessing ? 'Đang xử lý...' : 'Từ chối'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default UpgradeRequestsPage;
