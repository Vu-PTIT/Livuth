import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../api/endpoints';
import { ArrowLeft, Sparkle, CheckCircle, Warning } from '@phosphor-icons/react';
import './RoleUpgradePage.css';

const UPGRADE_ROLES = [
    {
        value: 'Tour Provider',
        label: 'Nhà cung cấp Tour',
        description: 'Đăng ký dịch vụ tour cho các sự kiện và lễ hội',
        icon: '🚌',
    },
    {
        value: 'Event Provider',
        label: 'Nhà tổ chức sự kiện',
        description: 'Tạo và quản lý các sự kiện, lễ hội trên nền tảng',
        icon: '🎭',
    },
];

const RoleUpgradePage: React.FC = () => {
    const { user, refreshUser, isEventProvider, isTourProvider } = useAuth();

    const [selectedRole, setSelectedRole] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Check if user already has BOTH roles (complete upgrade)
    const hasBothRoles = isEventProvider && isTourProvider;
    const hasPendingRequest = !!user?.pending_role_upgrade;

    // Filter roles to only show ones user doesn't already have
    const availableRoles = UPGRADE_ROLES.filter(role => {
        if (role.value === 'Tour Provider' && isTourProvider) return false;
        if (role.value === 'Event Provider' && isEventProvider) return false;
        return true;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedRole || reason.length < 10) {
            setError('Vui lòng chọn vai trò và nhập lý do (ít nhất 10 ký tự)');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await userApi.requestUpgrade({
                requested_role: selectedRole,
                reason: reason,
            });

            await refreshUser();
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="upgrade-page container container-sm">
                <div className="success-card card">
                    <div className="success-icon">
                        <CheckCircle size={60} weight="fill" />
                    </div>
                    <h2>Yêu cầu đã được gửi!</h2>
                    <p>
                        Yêu cầu nâng cấp lên <strong>{selectedRole}</strong> của bạn đã được gửi đến quản trị viên.
                        Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.
                    </p>
                    <Link to="/profile" className="btn btn-primary">
                        Quay lại hồ sơ
                    </Link>
                </div>
            </div>
        );
    }

    if (hasBothRoles) {
        return (
            <div className="upgrade-page container container-sm">
                <div className="info-card card">
                    <div className="info-icon">✨</div>
                    <h2>Bạn đã có đầy đủ quyền truy cập</h2>
                    <p>
                        Bạn đã là <strong>Event Provider</strong> và <strong>Tour Provider</strong>.
                        Bạn có thể sử dụng tất cả các tính năng dành riêng cho các vai trò này.
                    </p>
                    <div className="info-actions">
                        <Link to="/my-events" className="btn btn-primary">
                            Quản lý sự kiện
                        </Link>
                        <Link to="/my-listings" className="btn btn-primary">
                            Quản lý dịch vụ tour
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (hasPendingRequest) {
        return (
            <div className="upgrade-page container container-sm">
                <div className="pending-card card">
                    <div className="pending-icon">⏳</div>
                    <h2>Đang chờ xét duyệt</h2>
                    <p>
                        Yêu cầu nâng cấp lên <strong>{user?.pending_role_upgrade}</strong> của bạn đang được xem xét.
                        Vui lòng chờ quản trị viên phản hồi.
                    </p>
                    {user?.upgrade_request_reason && (
                        <div className="request-info">
                            <strong>Lý do bạn đã gửi:</strong>
                            <p>{user.upgrade_request_reason}</p>
                        </div>
                    )}
                    <Link to="/profile" className="btn btn-secondary">
                        <ArrowLeft size={18} />
                        Quay lại hồ sơ
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="upgrade-page container">
            <div className="upgrade-container">
                <div className="upgrade-header-compact">
                    <Link to="/profile" className="back-link-icon">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="header-text">
                        <h1>Nâng cấp tài khoản</h1>
                        <p>Đăng ký làm đối tác để mở rộng khả năng của bạn</p>
                    </div>
                </div>

                {/* Rejection Notice */}
                {user?.upgrade_rejection_reason && (
                    <div className="alert alert-warning compact-alert">
                        <Warning size={20} />
                        <div>
                            <strong>Đã bị từ chối:</strong> {user.upgrade_rejection_reason}
                        </div>
                    </div>
                )}

                {error && <div className="alert alert-error compact-alert">{error}</div>}

                <form onSubmit={handleSubmit} className="upgrade-form-grid">
                    {/* Left Column: Role Selection */}
                    <div className="form-section role-section">
                        <h3 className="section-title">1. Chọn vai trò</h3>
                        <div className="role-options">
                            {availableRoles.map((role) => (
                                <label
                                    key={role.value}
                                    className={`role-option ${selectedRole === role.value ? 'selected' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="role"
                                        value={role.value}
                                        checked={selectedRole === role.value}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                    />
                                    <div className="role-content">
                                        <span className="role-icon">{role.icon}</span>
                                        <div className="role-info">
                                            <span className="role-label">{role.label}</span>
                                            <span className="role-description">{role.description}</span>
                                        </div>
                                        {selectedRole === role.value && (
                                            <div className="role-check">
                                                <CheckCircle size={24} weight="fill" />
                                            </div>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Reason & Submit */}
                    <div className="form-section reason-section">
                        <h3 className="section-title">2. Lý do yêu cầu</h3>
                        <div className="reason-input-wrapper">
                            <textarea
                                id="reason"
                                className="form-textarea custom-scrollbar"
                                placeholder="Giới thiệu về bản thân, kinh nghiệm..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                            />
                            <small className="form-hint">
                                Tối thiểu 10 ký tự.
                            </small>
                        </div>

                        <div className="form-actions">
                            <button
                                type="submit"
                                className="btn btn-primary btn-lg btn-block"
                                disabled={isSubmitting || !selectedRole || reason.length < 10}
                            >
                                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu nâng cấp'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoleUpgradePage;
