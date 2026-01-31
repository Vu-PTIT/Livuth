import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast';
import { userApi, eventApi, postApi } from '../../api/endpoints';
import type { Event, Post, User } from '../../types';
import EventCard from '../../components/EventCard';
import PostCard from '../../components/PostCard';
import CreatePostForm from '../../components/CreatePostForm';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { CATEGORIES } from '../../constants/categories';
import {
    User as UserIcon,
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
    Notebook,
    CalendarCheck,
    UserPlus,
    UserMinus,
} from '@phosphor-icons/react';
import './ProfilePage.css';

const HOBBY_CATEGORIES = CATEGORIES;
const GENDER_OPTIONS = ['Nam', 'Nữ', 'Khác'];

const ProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { user: currentUser, refreshUser, isEventProvider, isTourProvider, isAdmin } = useAuth();
    const toast = useToast();

    // Determine if viewing own profile
    const isOwnProfile = !userId || userId === currentUser?.id;

    // Profile data
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [participatedEvents, setParticipatedEvents] = useState<Event[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);

    // Edit profile state (only for own profile)
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
    const [activeTab, setActiveTab] = useState<'events' | 'posts'>('posts');
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);

    // Follow state
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    // Fetch profile user
    useEffect(() => {
        const fetchProfileUser = async () => {
            if (isOwnProfile) {
                setProfileUser(currentUser);
                setFollowersCount(currentUser?.followers_count || 0);
                setFollowingCount(currentUser?.following_count || 0);
                return;
            }

            if (!userId) return;

            setIsLoadingProfile(true);
            try {
                // Fetch profile user
                const response = await userApi.getById(userId);
                if (response.data.data) {
                    const userData = response.data.data;
                    setProfileUser(userData);
                    setFollowersCount(userData.followers_count || 0);
                    setFollowingCount(userData.following_count || 0);
                }

                // Check if following
                if (currentUser) {
                    const followResponse = await userApi.checkIsFollowing(userId);
                    if (followResponse.data.data) {
                        setIsFollowing(followResponse.data.data.is_following);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
                toast.error('Không thể tải thông tin người dùng');
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchProfileUser();
    }, [userId, isOwnProfile, currentUser?.id, toast]);

    // Fetch participated events
    useEffect(() => {
        const fetchParticipatedEvents = async () => {
            if (profileUser?.participated_events && profileUser.participated_events.length > 0) {
                setIsLoadingEvents(true);
                try {
                    const events: Event[] = [];
                    for (const eventId of profileUser.participated_events.slice(0, 4)) {
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
    }, [profileUser]);

    // Initialize edit form when user data is available
    useEffect(() => {
        if (profileUser && isOwnProfile) {
            setEditForm({
                full_name: profileUser.full_name || '',
                phone: profileUser.phone || '',
                address: profileUser.address || '',
                gender: profileUser.gender || '',
                bio: profileUser.bio || '',
            });
            setSelectedHobbies(profileUser.hobbies || []);
            setAvatarUrl(profileUser.avatar_url || '');
        }
    }, [profileUser, isOwnProfile]);

    // Fetch user posts
    useEffect(() => {
        const fetchUserPosts = async () => {
            if (!profileUser?.id || activeTab !== 'posts') return;

            setIsLoadingPosts(true);
            try {
                const response = await postApi.getUserPosts(profileUser.id, 1, 10);
                if (response.data.data?.posts) {
                    setUserPosts(response.data.data.posts);
                }
            } catch (error) {
                console.error('Failed to fetch user posts:', error);
            } finally {
                setIsLoadingPosts(false);
            }
        };

        fetchUserPosts();
        fetchUserPosts();
    }, [profileUser?.id, activeTab]);

    const handleFollowToggle = async () => {
        if (!currentUser || !profileUser) return;

        setIsFollowLoading(true);
        try {
            if (isFollowing) {
                await userApi.unfollow(profileUser.id);
                setIsFollowing(false);
                setFollowersCount(prev => Math.max(0, prev - 1));
                toast.success(`Đã hủy theo dõi ${profileUser.full_name || profileUser.username}`);
            } else {
                await userApi.follow(profileUser.id);
                setIsFollowing(true);
                setFollowersCount(prev => prev + 1);
                toast.success(`Đã theo dõi ${profileUser.full_name || profileUser.username}`);
            }
        } catch (error) {
            console.error('Failed to toggle follow:', error);
            toast.error('Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setIsFollowLoading(false);
        }
    };

    const handleEditProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

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
        if (!currentUser) return;

        setIsSavingHobbies(true);
        setError('');

        try {
            const currentHobbies = currentUser.hobbies || [];
            const hobbiesToAdd = selectedHobbies.filter(h => !currentHobbies.includes(h));
            const hobbiesToRemove = currentHobbies.filter(h => !selectedHobbies.includes(h));

            for (const hobby of hobbiesToAdd) {
                await userApi.addHobby(currentUser.id, hobby);
            }

            for (const hobby of hobbiesToRemove) {
                await userApi.removeHobby(currentUser.id, hobby);
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
        if (!currentUser) return;

        try {
            await userApi.removeHobby(currentUser.id, hobby);
            await refreshUser();
            toast.success(`Đã xóa sở thích: ${hobby}`);
        } catch (err: any) {
            console.error('Failed to remove hobby:', err);
            toast.error('Không thể xóa sở thích');
        }
    };

    const handleSaveAvatar = async () => {
        if (!currentUser) return;

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

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Vui lòng chọn file ảnh');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError('Ảnh không được vượt quá 2MB');
            return;
        }

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

    if (isLoadingProfile || !profileUser) {
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
                            className={`avatar-large ${isOwnProfile ? 'avatar-editable' : ''}`}
                            onClick={() => isOwnProfile && setShowAvatarModal(true)}
                            title={isOwnProfile ? 'Bấm để thay đổi ảnh đại diện' : ''}
                        >
                            {profileUser.avatar_url ? (
                                <img src={profileUser.avatar_url} alt={profileUser.username} className="avatar-image" />
                            ) : (
                                profileUser.full_name?.charAt(0) || profileUser.username?.charAt(0) || 'U'
                            )}
                            {isOwnProfile && (
                                <div className="avatar-overlay">
                                    <Camera size={24} weight="bold" />
                                </div>
                            )}
                        </div>
                        <h1 className="profile-name">{profileUser.full_name || profileUser.username}</h1>
                        <p className="profile-email">{profileUser.email}</p>

                        {profileUser.roles && (
                            <div className="profile-roles">
                                {profileUser.roles
                                    .filter((role: string) => role !== 'Normal user' && role !== 'User' && role !== 'user')
                                    .map((role: string, idx: number) => {
                                        let displayRole = role;
                                        const roleLower = role.toLowerCase();

                                        if (roleLower === 'tour provider' || roleLower === 'tour_provider') {
                                            displayRole = 'Nhà cung cấp Tour';
                                        } else if (roleLower === 'event provider' || roleLower === 'event_provider') {
                                            displayRole = 'Nhà tổ chức sự kiện';
                                        } else if (roleLower === 'admin') {
                                            displayRole = 'Quản trị viên';
                                        }

                                        return <span key={idx} className="role-badge">{displayRole}</span>;
                                    })}
                            </div>
                        )}

                        {profileUser.bio && <p className="profile-bio">{profileUser.bio}</p>}

                        {/* Social Stats */}
                        <div className="profile-stats">
                            <div className="stat-item">
                                <span className="stat-value">{followersCount}</span>
                                <span className="stat-label">Người theo dõi</span>
                            </div>
                            <div className="stat-divider"></div>
                            <div className="stat-item">
                                <span className="stat-value">{followingCount}</span>
                                <span className="stat-label">Đang theo dõi</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="profile-actions">
                            {isOwnProfile ? (
                                <>
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
                                </>
                            ) : (
                                <button
                                    className={`btn btn-block ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
                                    onClick={handleFollowToggle}
                                    disabled={isFollowLoading}
                                >
                                    {isFollowing ? (
                                        <>
                                            <UserMinus size={18} />
                                            Hủy theo dõi
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={18} />
                                            Theo dõi
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Pending upgrade notice - only for own profile */}
                        {isOwnProfile && currentUser?.pending_role_upgrade && (
                            <div className="upgrade-notice">
                                <strong>Đang chờ duyệt:</strong> {currentUser.pending_role_upgrade}
                            </div>
                        )}

                        {isOwnProfile && currentUser?.upgrade_rejection_reason && (
                            <div className="rejection-notice">
                                <strong>Lý do từ chối:</strong> {currentUser.upgrade_rejection_reason}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="profile-main">
                    {/* Personal Info - Show limited info for visitors */}
                    <section className="info-section card">
                        <div className="section-header">
                            <h2>Thông tin cá nhân</h2>
                            {isOwnProfile && (
                                <button
                                    className="btn btn-sm btn-outline"
                                    onClick={() => setShowEditModal(true)}
                                >
                                    <PencilSimple size={16} />
                                    Sửa
                                </button>
                            )}
                        </div>
                        <div className="info-grid">
                            <div className="info-item">
                                <UserIcon size={20} />
                                <div>
                                    <span className="info-label">Họ và tên</span>
                                    <span className="info-value">{profileUser.full_name || 'Chưa cập nhật'}</span>
                                </div>
                            </div>
                            {/* Show more details only for own profile */}
                            {isOwnProfile && (
                                <>
                                    <div className="info-item">
                                        <Envelope size={20} />
                                        <div>
                                            <span className="info-label">Email</span>
                                            <span className="info-value">{profileUser.email}</span>
                                        </div>
                                    </div>
                                    <div className="info-item">
                                        <Phone size={20} />
                                        <div>
                                            <span className="info-label">Số điện thoại</span>
                                            <span className="info-value">{profileUser.phone || 'Chưa cập nhật'}</span>
                                        </div>
                                    </div>
                                    <div className="info-item">
                                        <MapPin size={20} />
                                        <div>
                                            <span className="info-label">Địa chỉ</span>
                                            <span className="info-value">{profileUser.address || 'Chưa cập nhật'}</span>
                                        </div>
                                    </div>
                                    <div className="info-item">
                                        <Calendar size={20} />
                                        <div>
                                            <span className="info-label">Ngày sinh</span>
                                            <span className="info-value">{profileUser.dob ? formatDate(profileUser.dob) : 'Chưa cập nhật'}</span>
                                        </div>
                                    </div>
                                    <div className="info-item">
                                        <GenderIntersex size={20} />
                                        <div>
                                            <span className="info-label">Giới tính</span>
                                            <span className="info-value">{profileUser.gender || 'Chưa cập nhật'}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </section>

                    {/* Hobbies */}
                    <section className="hobbies-section card">
                        <div className="section-header">
                            <h2>
                                <Tag size={20} />
                                Sở thích
                            </h2>
                            {isOwnProfile && (
                                <button
                                    className="btn btn-sm btn-outline"
                                    onClick={() => {
                                        setSelectedHobbies(profileUser.hobbies || []);
                                        setShowHobbyModal(true);
                                    }}
                                >
                                    <PencilSimple size={16} />
                                    Chọn sở thích
                                </button>
                            )}
                        </div>

                        {profileUser.hobbies && profileUser.hobbies.length > 0 ? (
                            <div className="hobbies-list">
                                {profileUser.hobbies.map((hobby: string, idx: number) => (
                                    <span key={idx} className="hobby-tag">
                                        {HOBBY_CATEGORIES.find(c => c.name === hobby)?.icon || '🏷️'} {hobby}
                                        {isOwnProfile && (
                                            <button
                                                className="remove-hobby"
                                                onClick={() => handleRemoveHobby(hobby)}
                                                title="Xóa"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="no-hobbies">
                                {isOwnProfile
                                    ? 'Thêm sở thích để nhận gợi ý sự kiện phù hợp với bạn'
                                    : 'Người dùng chưa thêm sở thích nào'
                                }
                            </p>
                        )}
                    </section>

                    {/* Tabs Section */}
                    <section className="tabs-section card">
                        <div className="profile-tabs">
                            <button
                                className={`profile-tab ${activeTab === 'events' ? 'active' : ''}`}
                                onClick={() => setActiveTab('events')}
                            >
                                <CalendarCheck size={20} />
                                <span>Sự kiện đã tham gia</span>
                            </button>
                            <button
                                className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
                                onClick={() => setActiveTab('posts')}
                            >
                                <Notebook size={20} />
                                <span>Bài đăng</span>
                            </button>
                        </div>

                        {/* Events Tab Content */}
                        {activeTab === 'events' && (
                            <div className="tab-content">
                                {profileUser.participated_events && profileUser.participated_events.length > 4 && (
                                    <div className="tab-header">
                                        <Link to="/events" className="section-link">
                                            Xem tất cả <ArrowRight size={16} />
                                        </Link>
                                    </div>
                                )}
                                {isLoadingEvents ? (
                                    <LoadingSpinner size="small" />
                                ) : participatedEvents.length > 0 ? (
                                    <div className="events-grid grid grid-2">
                                        {participatedEvents.map((event) => (
                                            <EventCard key={event.id} event={event} />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="no-events">
                                        {isOwnProfile ? 'Bạn chưa tham gia sự kiện nào' : 'Người dùng chưa tham gia sự kiện nào'}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Posts Tab Content */}
                        {activeTab === 'posts' && (
                            <div className="tab-content">
                                {/* Create Post Form - only for own profile */}
                                {isOwnProfile && (
                                    <div className="profile-create-post">
                                        <CreatePostForm
                                            onPostCreated={(newPost) => setUserPosts([newPost, ...userPosts])}
                                        />
                                    </div>
                                )}

                                {/* User Posts */}
                                {isLoadingPosts ? (
                                    <LoadingSpinner size="small" />
                                ) : userPosts.length > 0 ? (
                                    <div className="profile-posts">
                                        {userPosts.map((post) => (
                                            <PostCard key={post.id} post={post} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="no-posts">
                                        <Notebook size={48} weight="light" />
                                        <p>{isOwnProfile ? 'Bạn chưa có bài đăng nào' : 'Người dùng chưa có bài đăng nào'}</p>
                                        {isOwnProfile && <span>Chia sẻ khoảnh khắc du lịch của bạn!</span>}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </main>
            </div>

            {/* Modals - only render for own profile */}
            {isOwnProfile && (
                <>
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
                                        setAvatarUrl(currentUser?.avatar_url || '');
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
                </>
            )}
        </div>
    );
};

export default ProfilePage;
