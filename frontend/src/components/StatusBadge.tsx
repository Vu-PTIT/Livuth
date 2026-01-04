import React from 'react';
import './StatusBadge.css';

interface StatusBadgeProps {
    status: 'pending' | 'approved' | 'rejected' | 'verified' | 'unverified';
    size?: 'small' | 'medium';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'medium' }) => {
    const getStatusInfo = () => {
        switch (status) {
            case 'pending':
                return { label: 'Đang chờ', className: 'pending' };
            case 'approved':
                return { label: 'Đã duyệt', className: 'approved' };
            case 'rejected':
                return { label: 'Từ chối', className: 'rejected' };
            case 'verified':
                return { label: 'Đã xác minh', className: 'verified' };
            case 'unverified':
                return { label: 'Chưa xác minh', className: 'unverified' };
            default:
                return { label: status, className: '' };
        }
    };

    const { label, className } = getStatusInfo();

    return (
        <span className={`status-badge ${className} ${size}`}>
            {label}
        </span>
    );
};

export default StatusBadge;
