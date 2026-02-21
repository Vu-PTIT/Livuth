import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';
// import FacebookLogin from 'react-facebook-login';
import { Eye, EyeSlash, SignIn } from '@phosphor-icons/react';
import './Auth.css';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, loginGoogle /*, loginFacebook */ } = useAuth();

    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const from = (location.state as any)?.from?.pathname || '/';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await login(formData);
            navigate(from, { replace: true });
        } catch (err: any) {
            console.error('[Login Error]', err);
            const errorMessage = err.response?.data?.message || err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
            setError(`Lỗi: ${errorMessage} (Status: ${err.response?.status})`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setIsLoading(true);
        try {
            if (credentialResponse.credential) {
                await loginGoogle({ id_token: credentialResponse.credential });
                navigate(from, { replace: true });
            }
        } catch (err: any) {
            console.error('[Google Login Error]', err);
            const errorMessage = err.response?.data?.message || err.message || 'Đăng nhập Google thất bại';
            setError(`Lỗi Google: ${errorMessage} (Status: ${err.response?.status})`);
        } finally {
            setIsLoading(false);
        }
    };

    /* const handleFacebookResponse = async (response: any) => {
        if (response.accessToken) {
            setIsLoading(true);
            try {
                await loginFacebook({ access_token: response.accessToken });
                navigate(from, { replace: true });
            } catch (err: any) {
                setError(err.response?.data?.message || 'Đăng nhập Facebook thất bại');
            } finally {
                setIsLoading(false);
            }
        } else {
            // setError('Đăng nhập Facebook bị hủy hoặc thất bại');
        }
    }; */

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <img src="/logo-transparent.png" alt="Ganvo" className="logo-img" />
                    <h1>Đăng nhập</h1>
                    <p>Chào mừng bạn quay trở lại Ganvo</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="username">
                            Tên đăng nhập
                        </label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            className="form-input"
                            placeholder="Nhập tên đăng nhập"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            Mật khẩu
                        </label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                className="form-input"
                                placeholder="Nhập mật khẩu"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                autoComplete="current-password"
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

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            'Đang đăng nhập...'
                        ) : (
                            <>
                                <SignIn size={20} />
                                Đăng nhập
                            </>
                        )}
                    </button>
                </form>

                <div className="social-login-separator">
                    <span>Hoặc đăng nhập với</span>
                </div>

                <div className="social-login-buttons">
                    <div className="google-login-wrapper">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Đăng nhập Google thất bại')}
                            useOneTap
                        />
                    </div>

                    { /* import.meta.env.VITE_FACEBOOK_APP_ID && (
                        <div className="facebook-login-wrapper">
                            <FacebookLogin
                                appId={import.meta.env.VITE_FACEBOOK_APP_ID}
                                autoLoad={false}
                                fields="name,email,picture"
                                callback={handleFacebookResponse}
                                cssClass="btn btn-facebook"
                                icon="fa-facebook"
                                textButton=" Facebook"
                            />
                        </div>
                    ) */ }
                </div>

                <div className="auth-footer">
                    <p>
                        Chưa có tài khoản?{' '}
                        <Link to="/register" className="auth-link">
                            Đăng ký ngay
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
