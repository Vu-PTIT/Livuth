import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import NotificationDropdown from '../components/NotificationDropdown';
import {
    House,
    CalendarBlank,
    ChatCircle,
    User,
    SignOut,
    GearSix,
    MapTrifold,
    Sun,
    Moon,
    UsersThree,
    Bell,
    Plus,
    MagnifyingGlass,
} from '@phosphor-icons/react';
import MobileCreateFAB from '../components/MobileCreateFAB';
import './MainLayout.css';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { user, isAuthenticated, logout, isAdmin, isEventProvider, isTourProvider } = useAuth();
    const { toggleTheme, isDark } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const location = useLocation();

    const handleLogoutClick = () => {
        setShowLogoutModal(true);
        setIsMobileMenuOpen(false);
    };

    const confirmLogout = () => {
        logout();
        setShowLogoutModal(false);
    };

    const isActive = (path: string) => location.pathname === path;

    // Hide header on landing, login, register pages for cleaner mobile experience
    const hideHeader = ['/', '/login', '/register'].includes(location.pathname) && !isAuthenticated;
    const isAuthPage = ['/login', '/register'].includes(location.pathname);

    // Check if we are on the home page
    const isHome = location.pathname === '/';

    // Mobile: Header visible ONLY on Social pages (Feed, Create Post, Post Detail)
    const isSocialPage = ['/feed', '/create-post', '/posts'].some(path => location.pathname.startsWith(path));
    const mobileHeaderHidden = !isSocialPage && isAuthenticated; // Only applies to authenticated users inside app

    return (
        <div className={`main-layout ${isAuthPage ? 'no-scroll' : ''} ${hideHeader ? 'hide-header-mobile' : ''} ${mobileHeaderHidden ? 'mobile-header-hidden' : ''} ${isHome ? 'home-layout' : ''}`} data-page={location.pathname.substring(1) || 'home'}>
            {/* Header - Hidden on landing/auth pages for unauthenticated users (mobile only via CSS) */}
            <header className={`header ${isHome ? 'home-header' : ''}`}>
                <div className="header-container">
                    <Link to="/" className="logo">
                        <img src="/logo-transparent.png" alt="Ganvo" className="logo-img" />
                        <span className="logo-text">Ganvo</span>
                    </Link>

                    {/* Mobile Header Right Actions (Visible only on mobile) */}
                    <div className="mobile-header-right">
                        <Link to="/create-post" className="mobile-action-btn" title="Tạo bài viết">
                            <Plus size={24} weight="bold" />
                        </Link>
                        <button
                            className="mobile-action-btn"
                            onClick={() => setIsSearchOpen(!isSearchOpen)}
                            title="Tìm kiếm"
                        >
                            <MagnifyingGlass size={24} />
                        </button>
                        {isAuthenticated && (
                            <Link to="/profile" className="mobile-profile-link">
                                <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.username} className="avatar-img" />
                                    ) : (
                                        user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'
                                    )}
                                </div>
                            </Link>
                        )}
                    </div>

                    {/* Desktop Navigation - Only show for authenticated users */}
                    {isAuthenticated && (
                        <nav className="nav-desktop">
                            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} data-tooltip="Trang chủ">
                                <House size={24} weight={isActive('/') ? 'fill' : 'regular'} />
                            </Link>
                            <Link to="/map" className={`nav-link ${isActive('/map') ? 'active' : ''}`} data-tooltip="Bản đồ">
                                <MapTrifold size={24} weight={isActive('/map') ? 'fill' : 'regular'} />
                            </Link>
                            <Link to="/events" className={`nav-link ${isActive('/events') ? 'active' : ''}`} data-tooltip="Sự kiện">
                                <CalendarBlank size={24} weight={isActive('/events') ? 'fill' : 'regular'} />
                            </Link>
                            <Link to="/create-post" className={`nav-link ${isActive('/create-post') ? 'active' : ''}`} data-tooltip="Cộng đồng">
                                <UsersThree size={24} weight={isActive('/create-post') ? 'fill' : 'regular'} />
                            </Link>
                            <Link to="/chat" className={`nav-link ${isActive('/chat') ? 'active' : ''}`} data-tooltip="Trợ lý AI">
                                <ChatCircle size={24} weight={isActive('/chat') ? 'fill' : 'regular'} />
                            </Link>

                        </nav>
                    )}

                    {/* User Menu */}
                    <div className="header-actions">
                        {/* Theme Toggle */}
                        <button
                            className="theme-toggle"
                            onClick={toggleTheme}
                            title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {/* Notification Dropdown */}
                        <NotificationDropdown />

                        {isAuthenticated ? (
                            <div className="user-menu">
                                <button className="user-menu-trigger">
                                    <div className="avatar">
                                        {user?.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.username} className="avatar-img" />
                                        ) : (
                                            user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'
                                        )}
                                    </div>
                                    <span className="user-name">{user?.full_name || user?.username}</span>
                                </button>
                                <div className="user-dropdown">
                                    <Link to="/profile" className="dropdown-item">
                                        <User size={18} />
                                        Hồ sơ
                                    </Link>
                                    {isEventProvider && (
                                        <Link to="/my-events" className="dropdown-item">
                                            <CalendarBlank size={18} />
                                            Sự kiện của tôi
                                        </Link>
                                    )}
                                    {isTourProvider && (
                                        <Link to="/my-listings" className="dropdown-item">
                                            <MapTrifold size={18} />
                                            Dịch vụ tour
                                        </Link>
                                    )}
                                    {isAdmin && (
                                        <Link to="/admin" className="dropdown-item admin">
                                            <GearSix size={18} />
                                            Quản trị
                                        </Link>
                                    )}
                                    <div className="dropdown-divider"></div>
                                    <button
                                        className="dropdown-item logout"
                                        onClick={handleLogoutClick}
                                    >
                                        <SignOut size={18} />
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="auth-buttons">
                                <Link to="/login" className="btn btn-outline">
                                    Đăng nhập
                                </Link>
                                <Link to="/register" className="btn btn-primary">
                                    Đăng ký
                                </Link>
                            </div>
                        )}

                        {/* Mobile Profile Link was here but moved to mobile-header-right */}
                    </div>
                </div>

                {/* Mobile Search Bar */}
                {isSearchOpen && (
                    <div className="mobile-search-bar">
                        <input
                            type="text"
                            className="mobile-search-input"
                            placeholder="Tìm kiếm sự kiện, địa điểm, người dùng..."
                            autoFocus
                        />
                    </div>
                )}
            </header>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && (
                <nav className="nav-mobile">
                    <Link to="/" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                        <House size={20} /> Trang chủ
                    </Link>
                    {isAuthenticated ? (
                        <>
                            <Link to="/events" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                <CalendarBlank size={20} /> Sự kiện
                            </Link>
                            <Link to="/map" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                <MapTrifold size={20} /> Bản đồ
                            </Link>
                            <Link to="/chat" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                <ChatCircle size={20} /> Trợ lý AI
                            </Link>
                            <Link to="/create-post" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                <UsersThree size={20} /> Cộng đồng
                            </Link>
                            <Link to="/profile" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                <User size={20} /> Hồ sơ
                            </Link>
                            {isEventProvider && (
                                <Link to="/my-events" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                    <CalendarBlank size={20} /> Sự kiện của tôi
                                </Link>
                            )}
                            {isTourProvider && (
                                <Link to="/my-listings" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                    <MapTrifold size={20} /> Dịch vụ tour
                                </Link>
                            )}
                            {isAdmin && (
                                <Link to="/admin" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                    <GearSix size={20} /> Quản trị
                                </Link>
                            )}
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                Đăng nhập
                            </Link>
                            <Link to="/register" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                Đăng ký
                            </Link>
                        </>
                    )}
                </nav>
            )}

            {/* Main Content */}
            <main className={`main-content ${['/', '/create-post', '/profile', '/login', '/register', '/notifications'].includes(location.pathname) ||
                ['/events', '/chat'].some(path => location.pathname.startsWith(path))
                ? 'no-padding-top' : ''
                }`}>{children}</main>

            {/* Footer - Hide on specific pages */}
            {!['/map', '/chat', '/events', '/profile', '/my-events', '/my-listings', '/admin', '/create-post', '/login', '/register', '/notifications'].some(path => location.pathname.startsWith(path)) && (
                <footer className="footer">
                    <div className="footer-container">
                        <div className="footer-info">
                            <span className="footer-logo">Ganvo</span>
                            <p>Khám phá văn hóa và lễ hội Việt Nam</p>
                        </div>
                        <div className="footer-links">
                            <Link to="/events">Sự kiện</Link>
                            <Link to="/map">Bản đồ</Link>
                            <Link to="/about">Giới thiệu</Link>
                        </div>
                        <div className="footer-copyright">
                            © 2025 Ganvo. All rights reserved.
                        </div>
                    </div>
                </footer>
            )}

            {/* Logout Confirmation Modal */}
            <Modal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                size="small"
            >
                <div className="logout-modal-content">
                    <h2 className="logout-title">Bạn có chắc muốn đăng xuất không?</h2>
                    <p className="logout-message">
                        Đăng xuất khỏi tài khoản {user?.email} trên Ganvo?
                    </p>
                    <div className="logout-actions">
                        <button
                            className="btn-logout-confirm"
                            onClick={confirmLogout}
                        >
                            Đăng xuất
                        </button>
                        <button
                            className="btn-logout-cancel"
                            onClick={() => setShowLogoutModal(false)}
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Bottom Navigation for Mobile */}
            {isAuthenticated && (
                <>
                    <nav className="bottom-nav">
                        <Link to="/create-post" className={`bottom-nav-item ${isActive('/create-post') ? 'active' : ''}`} title="Cộng đồng">
                            <UsersThree size={26} weight={isActive('/create-post') ? 'fill' : 'regular'} />
                        </Link>
                        <Link to="/events" className={`bottom-nav-item ${isActive('/events') ? 'active' : ''}`} title="Sự kiện">
                            <CalendarBlank size={26} weight={isActive('/events') ? 'fill' : 'regular'} />
                        </Link>
                        <Link to="/map" className={`bottom-nav-item bottom-nav-center ${isActive('/map') ? 'active' : ''}`} title="Bản đồ">
                            <MapTrifold size={26} weight="regular" />
                        </Link>
                        <Link to="/notifications" className={`bottom-nav-item ${isActive('/notifications') ? 'active' : ''}`} title="Thông báo">
                            <Bell size={26} weight={isActive('/notifications') ? 'fill' : 'regular'} />
                        </Link>
                        <Link to="/chat" className={`bottom-nav-item ${isActive('/chat') ? 'active' : ''}`} title="Trợ lý AI">
                            <ChatCircle size={26} weight={isActive('/chat') ? 'fill' : 'regular'} />
                        </Link>
                    </nav>
                    {location.pathname === '/map' && <MobileCreateFAB />}
                </>
            )}
        </div>
    );
};

export default MainLayout;
