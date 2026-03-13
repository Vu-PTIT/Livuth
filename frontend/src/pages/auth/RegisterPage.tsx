import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Eye, EyeSlash, UserPlus, CaretLeft } from '@phosphor-icons/react';
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

    const validateStep2 = () => {
        if (!formData.first_name || !formData.last_name) {
            setError('Vui lòng nhập họ và tên');
            return false;
        }
        if (!formData.phone) {
            setError('Vui lòng nhập số điện thoại');
            return false;
        }
        return true;
    };

    const handleStep1Submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateStep1()) setStep(2);
    };

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep2()) return;

        setIsLoading(true);
        setError('');

        try {
            const fullName = `${formData.first_name} ${formData.last_name}`.trim();

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
                <div className="auth-container auth-container--centered">
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
            <div className="auth-illustration">
                <h2>Chào mừng đến với Ganvo</h2>
                <p>Khám phá cộng đồng văn hóa và lễ hội sôi động nhất Việt Nam. Tham gia cùng chúng tôi để không bỏ lỡ những khoảnh khắc tuyệt vời.</p>
            </div>
            <div className="auth-container-wrapper">
                <div className="auth-container">
                    {/* Back button - top left corner */}
                    <div className="auth-topbar">
                        <button
                            type="button"
                            className="auth-back-btn-topbar"
                            onClick={() => step > 1 ? setStep(step - 1) : navigate('/login')}
                            title="Quay lại"
                        >
                            <CaretLeft size={24} weight="bold" />
                        </button>
                    </div>

                    {/* Center content */}
                    <div className="auth-body">
                        <div className="auth-header">
                            <img src="/logo-transparent.png" alt="Ganvo" className="logo-img" />
                            <h1>Tạo tài khoản</h1>
                        </div>

                        {/* Progress Steps - 2 steps */}
                        <div className="auth-steps">
                            {[1, 2].map((s) => (
                                <div key={s} className={`step ${step >= s ? 'active' : ''}`}></div>
                            ))}
                        </div>

                        {error && <div className="alert alert-error">{error}</div>}

                        {/* Step 1: Account info */}
                        {step === 1 && (
                            <form onSubmit={handleStep1Submit} className="auth-form">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="username">Tên đăng nhập *</label>
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
                                    <label className="form-label" htmlFor="email">Email *</label>
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
                                    <label className="form-label" htmlFor="password">Mật khẩu *</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            id="password"
                                            name="password"
                                            className="form-input"
                                            placeholder="Ít nhất 8 ký tự, có chữ hoa và số"
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
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
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
                                <button type="submit" className="btn btn-primary btn-block">Tiếp tục</button>
                            </form>
                        )}

                        {/* Step 2: Personal info */}
                        {step === 2 && (
                            <form onSubmit={handleFinalSubmit} className="auth-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="first_name">Họ *</label>
                                        <input
                                            type="text"
                                            id="first_name"
                                            name="first_name"
                                            className="form-input"
                                            placeholder="Nguyễn"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="last_name">Tên *</label>
                                        <input
                                            type="text"
                                            id="last_name"
                                            name="last_name"
                                            className="form-input"
                                            placeholder="Văn A"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="phone">Số điện thoại *</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        className="form-input"
                                        placeholder="0901234567"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="gender">Giới tính</label>
                                        <select
                                            id="gender"
                                            name="gender"
                                            className="form-select"
                                            value={formData.gender}
                                            onChange={handleChange}
                                        >
                                            <option value="">Chọn</option>
                                            <option value="Male">Nam</option>
                                            <option value="Female">Nữ</option>
                                            <option value="Other">Khác</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="dob">Ngày sinh</label>
                                        <input
                                            type="date"
                                            id="dob"
                                            name="dob"
                                            className="form-input"
                                            value={formData.dob}
                                            onChange={handleChange}
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
                                    {isLoading ? 'Đang đăng ký...' : <><UserPlus size={20} /> Đăng ký</>}
                                </button>
                            </form>
                        )}
                    </div>

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
        </div>
    );
};

export default RegisterPage;
