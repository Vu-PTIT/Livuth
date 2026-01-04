import React from 'react';
import './Skeleton.css';

interface SkeletonProps {
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    className?: string;
    animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton: React.FC<SkeletonProps> = ({
    variant = 'rectangular',
    width,
    height,
    className = '',
    animation = 'wave',
}) => {
    const style: React.CSSProperties = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
    };

    return (
        <div
            className={`skeleton skeleton-${variant} skeleton-${animation} ${className}`}
            style={style}
        />
    );
};

// Pre-built skeleton components for common use cases
export const EventCardSkeleton: React.FC = () => (
    <div className="event-card-skeleton">
        <Skeleton variant="rectangular" height={180} className="skeleton-image" />
        <div className="skeleton-content">
            <Skeleton variant="text" height={24} width="80%" />
            <Skeleton variant="text" height={16} width="60%" />
            <div className="skeleton-meta">
                <Skeleton variant="text" height={14} width="40%" />
                <Skeleton variant="text" height={14} width="30%" />
            </div>
            <div className="skeleton-tags">
                <Skeleton variant="rectangular" width={60} height={24} />
                <Skeleton variant="rectangular" width={50} height={24} />
            </div>
        </div>
    </div>
);

export const ProfileSkeleton: React.FC = () => (
    <div className="profile-skeleton">
        <div className="profile-skeleton-header">
            <Skeleton variant="circular" width={120} height={120} />
            <div className="profile-skeleton-info">
                <Skeleton variant="text" height={32} width="200px" />
                <Skeleton variant="text" height={20} width="150px" />
                <Skeleton variant="text" height={16} width="180px" />
            </div>
        </div>
        <div className="profile-skeleton-content">
            <Skeleton variant="rectangular" height={200} />
        </div>
    </div>
);

export const ChatSkeleton: React.FC = () => (
    <div className="chat-skeleton">
        {[1, 2, 3].map((i) => (
            <div key={i} className={`message-skeleton ${i % 2 === 0 ? 'right' : 'left'}`}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="rectangular" width={i % 2 === 0 ? '60%' : '70%'} height={60} />
            </div>
        ))}
    </div>
);

export default Skeleton;
