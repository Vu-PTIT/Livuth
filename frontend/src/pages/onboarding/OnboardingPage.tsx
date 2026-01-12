import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { CATEGORIES } from '../../constants/categories';
import { Sparkle, Check, Camera, UploadSimple, Image } from '@phosphor-icons/react';
import './Onboarding.css';

// Use shared CATEGORIES as hobbies
const HOBBIES = CATEGORIES.map(cat => ({
    id: cat.id,
    label: cat.name,
    emoji: cat.icon
}));

// Using Dicebear for reliable avatar placeholders
const AVATAR_OPTIONS = [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Bob',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Caitlyn',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=George',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Willow',
];

const OnboardingPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const toast = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn file ảnh');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Ảnh không được vượt quá 2MB');
            return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = () => {
            const base64Url = reader.result as string;
            setSelectedAvatar(base64Url);
            setCustomAvatarUrl(''); // Clear custom URL if file selected
        };
        reader.onerror = () => {
            toast.error('Không thể đọc file ảnh');
        };
        reader.readAsDataURL(file);
    };

    const [step, setStep] = useState(1);
    const [displayName, setDisplayName] = useState(user?.full_name || user?.username || '');
    const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar_url || '');
    const [customAvatarUrl, setCustomAvatarUrl] = useState('');
    const [selectedHobbies, setSelectedHobbies] = useState<string[]>(user?.hobbies || []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleHobbyToggle = (hobbyId: string) => {
        setSelectedHobbies(prev =>
            prev.includes(hobbyId)
                ? prev.filter(h => h !== hobbyId)
                : [...prev, hobbyId]
        );
    };

    const handleAvatarSelect = (avatarUrl: string) => {
        setSelectedAvatar(avatarUrl);
        setCustomAvatarUrl('');
    };

    const handleCustomAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setCustomAvatarUrl(url);
        if (url) {
            setSelectedAvatar(url);
        }
    };

    const handleNext = () => {
        if (step === 1 && !displayName.trim()) {
            // Allow empty display name if user wants to skip, but handleNext is for "Continue" button
            // If they click Continue without name, show error.
            setError('Vui lòng nhập tên hiển thị');
            return;
        }
        setError('');
        setStep(step + 1);
    };

    const handleBack = () => {
        setError('');
        setStep(step - 1);
    };

    const handleSubmit = async () => {
        if (selectedHobbies.length === 0) {
            setError('Vui lòng chọn ít nhất 1 sở thích để chúng tôi gợi ý sự kiện phù hợp');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await userApi.updateMe({
                full_name: displayName.trim(),
                avatar_url: selectedAvatar || undefined,
                hobbies: selectedHobbies,
            });

            await refreshUser();
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = () => {
        // Skip updating profile details, move to next step
        setError('');
        setStep(step + 1);
    };

    return (
        <div className="onboarding-page">
            <div className="onboarding-container">
                <div className="onboarding-header">
                    <div className="onboarding-icon">
                        <Sparkle size={32} weight="duotone" />
                    </div>
                    <h1>Chào mừng đến Ganvo!</h1>
                    <p>Hãy cá nhân hóa hồ sơ của bạn</p>
                </div>

                {/* Progress Steps */}
                <div className="onboarding-steps">
                    <div className={`step ${step >= 1 ? 'active' : ''}`}>
                        <span className="step-number">1</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 2 ? 'active' : ''}`}>
                        <span className="step-number">2</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 3 ? 'active' : ''}`}>
                        <span className="step-number">3</span>
                    </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                {/* Step 1: Display Name & Avatar */}
                {step === 1 && (
                    <div className="onboarding-step">
                        <h2>Tên hiển thị</h2>
                        <p className="step-description">Đây là tên sẽ hiển thị với mọi người</p>

                        <div className="form-group">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Nhập tên hiển thị..."
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="onboarding-actions">
                            <button className="btn btn-text" onClick={handleSkip}>
                                Bỏ qua
                            </button>
                            <button className="btn btn-primary" onClick={handleNext}>
                                Tiếp tục
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Avatar Selection */}
                {step === 2 && (
                    <div className="onboarding-step">
                        <h2>Chọn ảnh đại diện</h2>
                        <p className="step-description">Chọn một avatar hoặc nhập URL ảnh của bạn</p>

                        <div className="avatar-preview">
                            {selectedAvatar ? (
                                <img src={selectedAvatar} alt="Avatar" />
                            ) : (
                                <div className="avatar-placeholder">
                                    <Camera size={32} />
                                </div>
                            )}
                        </div>

                        <div className="avatar-grid">
                            {AVATAR_OPTIONS.map((avatar, index) => (
                                <button
                                    key={index}
                                    className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                                    onClick={() => handleAvatarSelect(avatar)}
                                >
                                    <img src={avatar} alt={`Avatar ${index + 1}`} />
                                    {selectedAvatar === avatar && (
                                        <div className="avatar-check">
                                            <Check size={16} weight="bold" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="avatar-upload-section">


                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />

                            <div className="upload-options">
                                <button
                                    className="btn btn-outline upload-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <UploadSimple size={20} />
                                    Tải ảnh lên
                                </button>

                                <div className="url-input-wrapper">
                                    <Image size={20} className="url-icon" />
                                    <input
                                        type="url"
                                        className="form-input"
                                        placeholder="Nhập URL ảnh..."
                                        value={customAvatarUrl}
                                        onChange={handleCustomAvatarChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="onboarding-actions">
                            <button className="btn btn-secondary" onClick={handleBack}>
                                Quay lại
                            </button>
                            <button className="btn btn-primary" onClick={handleNext}>
                                Tiếp tục
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Hobbies Selection */}
                {step === 3 && (
                    <div className="onboarding-step">
                        <h2>Sở thích của bạn</h2>
                        <p className="step-description">Chọn những sở thích để nhận gợi ý sự kiện phù hợp</p>

                        <div className="hobbies-grid">
                            {HOBBIES.map((hobby) => (
                                <button
                                    key={hobby.id}
                                    className={`hobby-chip ${selectedHobbies.includes(hobby.id) ? 'selected' : ''}`}
                                    onClick={() => handleHobbyToggle(hobby.id)}
                                >
                                    <span className="hobby-emoji">{hobby.emoji}</span>
                                    <span className="hobby-label">{hobby.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="selected-count">
                            Đã chọn {selectedHobbies.length} sở thích
                        </div>

                        <div className="onboarding-actions">
                            <button className="btn btn-secondary" onClick={handleBack}>
                                Quay lại
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Đang lưu...' : 'Hoàn tất'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnboardingPage;
