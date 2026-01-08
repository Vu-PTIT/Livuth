import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SignOut, ArrowLeft } from '@phosphor-icons/react';
import './LogoutPage.css';

const LogoutPage: React.FC = () => {
    const { logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // If not authenticated, redirect to login
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    const handleConfirmLogout = () => {
        logout();
        navigate('/');
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <div className="logout-page container">
            <div className="logout-card">
                <div className="logout-icon-wrapper">
                    <div className="logout-icon-ring">
                        <SignOut size={48} weight="duotone" className="logout-icon" />
                    </div>
                </div>

                <h1 className="logout-title">Xác nhận đăng xuất</h1>

                <p className="logout-message">
                    Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?<br />
                    Mọi phiên làm việc chưa lưu sẽ bị hủy bỏ.
                </p>

                <div className="logout-actions">
                    <button
                        className="btn btn-outline"
                        onClick={handleCancel}
                    >
                        <ArrowLeft size={18} />
                        Quay lại
                    </button>
                    <button
                        className="btn btn-primary btn-danger"
                        onClick={handleConfirmLogout}
                    >
                        <SignOut size={18} />
                        Đăng xuất ngay
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutPage;
