import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Eye, EyeSlash, UserPlus } from '@phosphor-icons/react';
import './Auth.css';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        first_name: '',
        last_name: '',
        full_name: '',
        phone: '',
        gender: '',
        dob: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    const validateStep1 = () => {
        if (formData.username.length < 3) {
            setError('Tên đăng nhập phải có ít nhất 3 ký tự');
            return false;
        }
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.username)) {
            setError('Tên đăng nhập phải bắt đầu bằng chữ cái và chỉ chứa chữ, số, dấu gạch dưới');
            return false;
        }
        if (!formData.email.includes('@')) {
            setError('Email không hợp lệ');
            return false;
        }
        if (formData.password.length < 8) {
            setError('Mật khẩu phải có ít nhất 8 ký tự');
            return false;
        }
        if (!/[A-Z]/.test(formData.password)) {
            setError('Mật khẩu phải có ít nhất 1 chữ in hoa');
            return false;
        }
        if (!/[a-z]/.test(formData.password)) {
            setError('Mật khẩu phải có ít nhất 1 chữ thường');
            return false;
        }
        if (!/[0-9]/.test(formData.password)) {
            setError('Mật khẩu phải có ít nhất 1 số');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return false;
        }
        return true;
    };

    const handleStep1Submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateStep1()) {
            setStep(2);
        }
    };

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const fullName = formData.full_name || `${formData.first_name} ${formData.last_name}`.trim();

            await register({
                username: formData.username,
                email: formData.email,
                password: formData.password,
                first_name: formData.first_name || undefined,
                last_name: formData.last_name || undefined,
                full_name: fullName || undefined,
                phone: formData.phone || undefined,
                gender: formData.gender || undefined,
                dob: formData.dob ? new Date(formData.dob).getTime() : undefined,
            });

            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-success">
                        <div className="success-icon">✓</div>
                        <h2>Đăng ký thành công!</h2>
                        <p>Đang chuyển hướng đến trang đăng nhập...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <img src="/logo-transparent.png" alt="Ganvo" className="logo-img" />
                    <h1>Tạo tài khoản</h1>
                    <p>Tham gia cộng đồng Ganvo</p>
                </div>

                {/* Progress Steps */}
                <div className="auth-steps">
                    <div className={`step ${step >= 1 ? 'active' : ''}`}>
                        <span className="step-number">1</span>
                        <span className="step-label">Tài khoản</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 2 ? 'active' : ''}`}>
                        <span className="step-number">2</span>
                        <span className="step-label">Thông tin</span>
                    </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                {step === 1 && (
                    <form onSubmit={handleStep1Submit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label" htmlFor="username">
                                Tên đăng nhập *
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                className="form-input"
                                placeholder="vd: nguyenvana"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="email">
                                Email *
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className="form-input"
                                placeholder="vd: email@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="password">
                                Mật khẩu *
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    className="form-input"
                                    placeholder="Ít nhất 8 ký tự"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <small className="form-hint">
                                Bao gồm chữ hoa, chữ thường và số
                            </small>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="confirmPassword">
                                Xác nhận mật khẩu *
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                className="form-input"
                                placeholder="Nhập lại mật khẩu"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-block">
                            Tiếp tục
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleFinalSubmit} className="auth-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="first_name">
                                    Họ *
                                </label>
                                <input
                                    type="text"
                                    id="first_name"
                                    name="first_name"
                                    className="form-input"
                                    placeholder="vd: Nguyễn"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="last_name">
                                    Tên *
                                </label>
                                <input
                                    type="text"
                                    id="last_name"
                                    name="last_name"
                                    className="form-input"
                                    placeholder="vd: Văn A"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="phone">
                                Số điện thoại *
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                className="form-input"
                                placeholder="vd: 0901234567"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="gender">
                                Giới tính *
                            </label>
                            <select
                                id="gender"
                                name="gender"
                                className="form-select"
                                value={formData.gender}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Chọn giới tính</option>
                                <option value="Male">Nam</option>
                                <option value="Female">Nữ</option>
                                <option value="Other">Khác</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="dob">
                                Ngày sinh *
                            </label>
                            <input
                                type="date"
                                id="dob"
                                name="dob"
                                className="form-input"
                                value={formData.dob}
                                onChange={handleChange}
                                max={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setStep(1)}
                            >
                                Quay lại
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    'Đang đăng ký...'
                                ) : (
                                    <>
                                        <UserPlus size={20} />
                                        Đăng ký
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                <div className="auth-footer">
                    <p>
                        Đã có tài khoản?{' '}
                        <Link to="/login" className="auth-link">
                            Đăng nhập
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
