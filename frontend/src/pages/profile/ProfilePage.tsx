import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast';
import { userApi, eventApi } from '../../api/endpoints';
import type { Event } from '../../types';
import EventCard from '../../components/EventCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { CATEGORIES } from '../../constants/categories';
import {
    User,
    Envelope,
    Phone,
    MapPin,
    Calendar,
    GenderIntersex,
    Tag,
    X,
    ArrowRight,
    Sparkle,
    PencilSimple,
    Check,
    Camera,
    UploadSimple,
} from '@phosphor-icons/react';
import './ProfilePage.css';

// Use shared CATEGORIES for hobby selection
const HOBBY_CATEGORIES = CATEGORIES;

const GENDER_OPTIONS = ['Nam', 'Nữ', 'Khác'];

const ProfilePage: React.FC = () => {
    const { user, refreshUser, isEventProvider, isTourProvider, isAdmin } = useAuth();
    const toast = useToast();
    const [participatedEvents, setParticipatedEvents] = useState<Event[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);

    // Edit profile state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '',
        phone: '',
        address: '',
        gender: '',
        bio: '',
    });
    const [isUpdating, setIsUpdating] = useState(false);

    // Hobby state
    const [showHobbyModal, setShowHobbyModal] = useState(false);
    const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
    const [isSavingHobbies, setIsSavingHobbies] = useState(false);

    // Avatar state
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isSavingAvatar, setIsSavingAvatar] = useState(false);

    const [error, setError] = useState('');

    useEffect(() => {
        const fetchParticipatedEvents = async () => {
            if (user?.participated_events && user.participated_events.length > 0) {
                setIsLoadingEvents(true);
                try {
                    const events: Event[] = [];
                    for (const eventId of user.participated_events.slice(0, 4)) {
                        try {
                            const res = await eventApi.getById(eventId, false);
                            if (res.data.data) {
                                events.push(res.data.data);
                            }
                        } catch (err) {
                            console.log(`Could not fetch event ${eventId}`);
                        }
                    }
                    setParticipatedEvents(events);
                } catch (error) {
                    console.error('Failed to fetch events:', error);
                } finally {
                    setIsLoadingEvents(false);
                }
            }
        };

        fetchParticipatedEvents();
    }, [user]);

    // Initialize edit form when user data is available
    useEffect(() => {
        if (user) {
            setEditForm({
                full_name: user.full_name || '',
                phone: user.phone || '',
                address: user.address || '',
                gender: user.gender || '',
                bio: user.bio || '',
            });
            setSelectedHobbies(user.hobbies || []);
            setAvatarUrl(user.avatar_url || '');
        }
    }, [user]);

    const handleEditProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsUpdating(true);
        setError('');

        try {
            await userApi.updateMe(editForm);
            await refreshUser();
            setShowEditModal(false);
            toast.success('Cập nhật thông tin thành công!');
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Không thể cập nhật thông tin');
            setError(err.response?.data?.message || 'Không thể cập nhật thông tin');
        } finally {
            setIsUpdating(false);
        }
    };

    const toggleHobby = (hobbyName: string) => {
        setSelectedHobbies(prev => {
            if (prev.includes(hobbyName)) {
                return prev.filter(h => h !== hobbyName);
            } else {
                return [...prev, hobbyName];
            }
        });
    };

    const handleSaveHobbies = async () => {
        if (!user) return;

        setIsSavingHobbies(true);
        setError('');

        try {
            // Get current hobbies
            const currentHobbies = user.hobbies || [];

            // Find hobbies to add (in selected but not in current)
            const hobbiesToAdd = selectedHobbies.filter(h => !currentHobbies.includes(h));

            // Find hobbies to remove (in current but not in selected)
            const hobbiesToRemove = currentHobbies.filter(h => !selectedHobbies.includes(h));

            // Add new hobbies
            for (const hobby of hobbiesToAdd) {
                await userApi.addHobby(user.id, hobby);
            }

            // Remove old hobbies
            for (const hobby of hobbiesToRemove) {
                await userApi.removeHobby(user.id, hobby);
            }

            await refreshUser();
            setShowHobbyModal(false);
            toast.success('Cập nhật sở thích thành công!');
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Không thể cập nhật sở thích');
            setError(err.response?.data?.message || 'Không thể cập nhật sở thích');
        } finally {
            setIsSavingHobbies(false);
        }
    };

    const handleRemoveHobby = async (hobby: string) => {
        if (!user) return;

        try {
            await userApi.removeHobby(user.id, hobby);
            await refreshUser();
            toast.success(`Đã xóa sở thích: ${hobby}`);
        } catch (err: any) {
            console.error('Failed to remove hobby:', err);
            toast.error('Không thể xóa sở thích');
        }
    };

    const handleSaveAvatar = async () => {
        if (!user) return;

        setIsSavingAvatar(true);
        setError('');

        try {
            await userApi.updateMe({ avatar_url: avatarUrl || undefined });
            await refreshUser();
            setShowAvatarModal(false);
            toast.success('Cập nhật ảnh đại diện thành công!');
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Không thể cập nhật ảnh đại diện');
            setError(err.response?.data?.message || 'Không thể cập nhật ảnh đại diện');
        } finally {
            setIsSavingAvatar(false);
        }
    };

    // File input ref for avatar upload
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Vui lòng chọn file ảnh');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('Ảnh không được vượt quá 2MB');
            return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = () => {
            setAvatarUrl(reader.result as string);
            setError('');
        };
        reader.onerror = () => {
            setError('Không thể đọc file ảnh');
        };
        reader.readAsDataURL(file);
    };

    if (!user) {
        return (
            <div className="loading-container">
                <LoadingSpinner />
            </div>
        );
    }

    const formatDate = (timestamp?: number) => {
        if (!timestamp) return 'Chưa cập nhật';
        return new Date(timestamp * 1000).toLocaleDateString('vi-VN');
    };

    return (
        <div className="profile-page container">
            <div className="profile-layout">
                {/* Sidebar */}
                <aside className="profile-sidebar">
                    <div className="profile-card card">
                        <div
                            className="avatar-large avatar-editable"
                            onClick={() => setShowAvatarModal(true)}
                            title="Bấm để thay đổi ảnh đại diện"
                        >
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.username} className="avatar-image" />
                            ) : (
                                user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'
                            )}
                            <div className="avatar-overlay">
                                <Camera size={24} weight="bold" />
                            </div>
                        </div>
                        <h1 className="profile-name">{user.full_name || user.username}</h1>
                        <p className="profile-email">{user.email}</p>

                        <div className="profile-roles">
                            {user.roles.map((role, idx) => (
                                <span key={idx} className="role-badge">{role}</span>
                            ))}
                        </div>

                        {user.bio && <p className="profile-bio">{user.bio}</p>}

                        <div className="profile-actions">
                            <button
                                className="btn btn-primary btn-block"
                                onClick={() => setShowEditModal(true)}
                            >
                                <PencilSimple size={18} />
                                Chỉnh sửa thông tin
                            </button>
                            {(!isEventProvider || !isTourProvider) && !isAdmin && (
                                <Link to="/profile/upgrade" className="btn btn-outline btn-block">
                                    <Sparkle size={18} />
                                    Nâng cấp tài khoản
                                </Link>
                            )}
                        </div>

                        {/* Pending upgrade notice */}
                        {user.pending_role_upgrade && (
                            <div className="upgrade-notice">
                                <strong>Đang chờ duyệt:</strong> {user.pending_role_upgrade}
                            </div>
                        )}

                        {user.upgrade_rejection_reason && (
                            <div className="rejection-notice">
                                <strong>Lý do từ chối:</strong> {user.upgrade_rejection_reason}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="profile-main">
                    {/* Personal Info */}
                    <section className="info-section card">
                        <div className="section-header">
                            <h2>Thông tin cá nhân</h2>
                            <button
                                className="btn btn-sm btn-outline"
                                onClick={() => setShowEditModal(true)}
                            >
                                <PencilSimple size={16} />
                                Sửa
                            </button>
                        </div>
                        <div className="info-grid">
                            <div className="info-item">
                                <User size={20} />
                                <div>
                                    <span className="info-label">Họ và tên</span>
                                    <span className="info-value">{user.full_name || 'Chưa cập nhật'}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Envelope size={20} />
                                <div>
                                    <span className="info-label">Email</span>
                                    <span className="info-value">{user.email}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Phone size={20} />
                                <div>
                                    <span className="info-label">Số điện thoại</span>
                                    <span className="info-value">{user.phone || 'Chưa cập nhật'}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <MapPin size={20} />
                                <div>
                                    <span className="info-label">Địa chỉ</span>
                                    <span className="info-value">{user.address || 'Chưa cập nhật'}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <Calendar size={20} />
                                <div>
                                    <span className="info-label">Ngày sinh</span>
                                    <span className="info-value">{user.dob ? formatDate(user.dob) : 'Chưa cập nhật'}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <GenderIntersex size={20} />
                                <div>
                                    <span className="info-label">Giới tính</span>
                                    <span className="info-value">{user.gender || 'Chưa cập nhật'}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Hobbies */}
                    <section className="hobbies-section card">
                        <div className="section-header">
                            <h2>
                                <Tag size={20} />
                                Sở thích
                            </h2>
                            <button
                                className="btn btn-sm btn-outline"
                                onClick={() => {
                                    setSelectedHobbies(user.hobbies || []);
                                    setShowHobbyModal(true);
                                }}
                            >
                                <PencilSimple size={16} />
                                Chọn sở thích
                            </button>
                        </div>

                        {user.hobbies && user.hobbies.length > 0 ? (
                            <div className="hobbies-list">
                                {user.hobbies.map((hobby, idx) => (
                                    <span key={idx} className="hobby-tag">
                                        {HOBBY_CATEGORIES.find(c => c.name === hobby)?.icon || '🏷️'} {hobby}
                                        <button
                                            className="remove-hobby"
                                            onClick={() => handleRemoveHobby(hobby)}
                                            title="Xóa"
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="no-hobbies">
                                Thêm sở thích để nhận gợi ý sự kiện phù hợp với bạn
                            </p>
                        )}
                    </section>

                    {/* Participated Events */}
                    <section className="events-section card">
                        <div className="section-header">
                            <h2>Sự kiện đã tham gia</h2>
                            {user.participated_events && user.participated_events.length > 4 && (
                                <Link to="/events" className="section-link">
                                    Xem tất cả <ArrowRight size={16} />
                                </Link>
                            )}
                        </div>

                        {isLoadingEvents ? (
                            <LoadingSpinner size="small" />
                        ) : participatedEvents.length > 0 ? (
                            <div className="events-grid grid grid-2">
                                {participatedEvents.map((event) => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        ) : (
                            <p className="no-events">Bạn chưa tham gia sự kiện nào</p>
                        )}
                    </section>
                </main>
            </div>

            {/* Edit Profile Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Chỉnh sửa thông tin cá nhân"
            >
                <form onSubmit={handleEditProfile}>
                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="form-group">
                        <label className="form-label" htmlFor="full_name">
                            Họ và tên
                        </label>
                        <input
                            type="text"
                            id="full_name"
                            className="form-input"
                            placeholder="Nhập họ và tên"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="phone">
                            Số điện thoại
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            className="form-input"
                            placeholder="Nhập số điện thoại"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="address">
                            Địa chỉ
                        </label>
                        <input
                            type="text"
                            id="address"
                            className="form-input"
                            placeholder="Nhập địa chỉ"
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="gender">
                            Giới tính
                        </label>
                        <select
                            id="gender"
                            className="form-input"
                            value={editForm.gender}
                            onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                        >
                            <option value="">Chọn giới tính</option>
                            {GENDER_OPTIONS.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="bio">
                            Giới thiệu bản thân
                        </label>
                        <textarea
                            id="bio"
                            className="form-input"
                            rows={3}
                            placeholder="Viết vài dòng về bản thân..."
                            value={editForm.bio}
                            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        />
                    </div>

                    <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowEditModal(false)}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isUpdating}
                        >
                            {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Hobby Selection Modal */}
            <Modal
                isOpen={showHobbyModal}
                onClose={() => setShowHobbyModal(false)}
                title="Chọn sở thích của bạn"
            >
                <div className="hobby-selection">
                    <p className="hobby-description">
                        Chọn các danh mục bạn quan tâm để nhận gợi ý sự kiện phù hợp
                    </p>

                    <div className="hobby-categories-grid">
                        {HOBBY_CATEGORIES.map((category) => (
                            <button
                                key={category.id}
                                type="button"
                                className={`hobby-category-btn ${selectedHobbies.includes(category.name) ? 'selected' : ''}`}
                                onClick={() => toggleHobby(category.name)}
                            >
                                <span className="hobby-icon">{category.icon}</span>
                                <span className="hobby-name">{category.name}</span>
                                {selectedHobbies.includes(category.name) && (
                                    <Check size={16} className="hobby-check" weight="bold" />
                                )}
                            </button>
                        ))}
                    </div>

                    {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

                    <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowHobbyModal(false)}
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSaveHobbies}
                            disabled={isSavingHobbies}
                        >
                            {isSavingHobbies ? 'Đang lưu...' : `Lưu (${selectedHobbies.length} đã chọn)`}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Avatar Edit Modal */}
            <Modal
                isOpen={showAvatarModal}
                onClose={() => setShowAvatarModal(false)}
                title="Thay đổi ảnh đại diện"
            >
                <div className="avatar-edit-modal">
                    <div className="avatar-preview">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Preview" className="avatar-preview-image" />
                        ) : (
                            <div className="avatar-preview-placeholder">
                                <Camera size={48} weight="light" />
                                <span>Chưa có ảnh</span>
                            </div>
                        )}
                    </div>

                    {/* File Upload */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                    <button
                        type="button"
                        className="btn btn-outline btn-block avatar-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UploadSimple size={18} />
                        Tải ảnh từ máy tính
                    </button>

                    <div className="avatar-divider">
                        <span>hoặc</span>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="avatar_url">
                            URL ảnh đại diện
                        </label>
                        <input
                            type="url"
                            id="avatar_url"
                            className="form-input"
                            placeholder="https://example.com/avatar.jpg"
                            value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                        />
                        <p className="form-hint">
                            Nhập URL ảnh từ internet
                        </p>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                setShowAvatarModal(false);
                                setAvatarUrl(user?.avatar_url || '');
                            }}
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSaveAvatar}
                            disabled={isSavingAvatar}
                        >
                            {isSavingAvatar ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ProfilePage;
