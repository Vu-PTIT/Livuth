import React from 'react';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    text?: string;
}

const sizeMap = {
    small: 48,
    medium: 80,
    large: 120,
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium', text }) => {
    const dimension = sizeMap[size];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
        }}>
            <img
                src="/load.gif"
                alt="Loading..."
                style={{
                    width: dimension,
                    height: dimension,
                    objectFit: 'contain',
                }}
            />
            {text && (
                <p style={{
                    marginTop: '12px',
                    color: 'var(--text-secondary, #a0aec0)',
                    fontSize: size === 'small' ? '12px' : '14px',
                }}>
                    {text}
                </p>
            )}
        </div>
    );
};

export default LoadingSpinner;
