import React from 'react';
import './CategoryChip.css';

export interface CategoryChipProps {
    name: string;
    icon?: string;
    isActive?: boolean;
    onClick?: () => void;
    variant?: 'pill' | 'rounded';
    size?: 'sm' | 'md';
}

const CategoryChip: React.FC<CategoryChipProps> = ({
    name,
    icon,
    isActive = false,
    onClick,
    variant = 'pill',
    size = 'md',
}) => {
    return (
        <button
            type="button"
            className={`category-chip category-chip--${variant} category-chip--${size} ${isActive ? 'active' : ''}`}
            onClick={onClick}
        >
            {icon && <span className="category-chip__icon">{icon}</span>}
            <span className="category-chip__name">{name}</span>
        </button>
    );
};

export default CategoryChip;
