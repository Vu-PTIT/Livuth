import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRoles?: string[];
    requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRoles = [],
    requireAdmin = false,
}) => {
    const { isAuthenticated, isLoading, hasRole, isAdmin } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="loading-container">
                <LoadingSpinner />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    if (requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.some((role) => hasRole(role));
        if (!hasRequiredRole && !isAdmin) {
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
