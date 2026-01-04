import React from 'react';
import { Link } from 'react-router-dom';
import {
    CalendarBlank,
    Users,
    Sparkle,
    CheckCircle,
    ArrowRight,
    Robot,
    MapPin,
} from '@phosphor-icons/react';
import './LandingPage.css';

const FEATURES = [
    {
        icon: CalendarBlank,
        title: 'Khám phá sự kiện',
        description: 'Tìm hiểu và tham gia hàng trăm lễ hội, sự kiện văn hóa truyền thống độc đáo trên khắp Việt Nam.',
    },
    {
        icon: Sparkle,
        title: 'Gợi ý cá nhân hóa',
        description: 'Nhận gợi ý sự kiện phù hợp với sở thích và mối quan tâm của bạn dựa trên AI.',
    },
    {
        icon: Users,
        title: 'Kết nối dịch vụ tour',
        description: 'Tìm và kết nối với các nhà cung cấp dịch vụ tour du lịch uy tín.',
    },
];

const BENEFITS = [
    'Truy cập hàng trăm sự kiện văn hóa',
    'Gợi ý sự kiện theo sở thích cá nhân',
    'Trợ lý AI hỗ trợ 24/7',
    'Bản đồ sự kiện trực quan',
    'Kết nối với tour provider',
    'Hoàn toàn miễn phí',
];

const LandingPage: React.FC = () => {
    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="landing-hero">
                <div className="landing-hero-content container">
                    <h1 className="landing-title">
                        Khám phá <span className="gradient-text">Văn hóa</span><br />
                        và Lễ hội Việt Nam
                    </h1>
                    <p className="landing-subtitle">
                        Nền tảng khám phá, tìm kiếm và trải nghiệm những lễ hội truyền thống
                        độc đáo trên khắp đất nước. Đăng nhập để bắt đầu hành trình của bạn.
                    </p>
                    <div className="landing-cta">
                        <Link to="/register" className="btn btn-primary btn-lg">
                            Đăng ký miễn phí
                            <ArrowRight size={20} />
                        </Link>
                        <Link to="/login" className="btn btn-outline btn-lg">
                            Đăng nhập
                        </Link>
                    </div>
                </div>
                <div className="landing-hero-decoration"></div>
            </section>

            {/* Highlight Features - Chatbot & Map */}
            <section className="landing-highlights">
                <div className="container">
                    <div className="highlights-grid">
                        {/* Chatbot Highlight */}
                        <div className="highlight-card highlight-chatbot">
                            <div className="highlight-icon">
                                <Robot size={48} weight="duotone" />
                            </div>
                            <div className="highlight-content">
                                <h3>🤖 Trợ lý AI Chatbot</h3>
                                <p className="highlight-description">
                                    Hỏi bất cứ điều gì về lễ hội, văn hóa Việt Nam! Chatbot AI thông minh
                                    được đào tạo chuyên biệt sẵn sàng hỗ trợ bạn 24/7.
                                </p>
                                <ul className="highlight-features">
                                    <li><CheckCircle size={18} weight="fill" /> Trả lời câu hỏi về văn hóa, lễ hội</li>
                                    <li><CheckCircle size={18} weight="fill" /> Gợi ý địa điểm tham quan</li>
                                    <li><CheckCircle size={18} weight="fill" /> Hỗ trợ lên kế hoạch du lịch</li>
                                </ul>
                            </div>
                        </div>

                        {/* Map Highlight */}
                        <div className="highlight-card highlight-map">
                            <div className="highlight-icon">
                                <MapPin size={48} weight="duotone" />
                            </div>
                            <div className="highlight-content">
                                <h3>🗺️ Bản đồ Trực quan</h3>
                                <p className="highlight-description">
                                    Xem tất cả sự kiện trên bản đồ tương tác. Tìm kiếm sự kiện gần bạn,
                                    lọc theo khu vực và khám phá lễ hội khắp 63 tỉnh thành.
                                </p>
                                <ul className="highlight-features">
                                    <li><CheckCircle size={18} weight="fill" /> Bản đồ tương tác thời gian thực</li>
                                    <li><CheckCircle size={18} weight="fill" /> Tìm sự kiện gần vị trí của bạn</li>
                                    <li><CheckCircle size={18} weight="fill" /> Lọc theo tỉnh/thành phố</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="landing-features">
                <div className="container">
                    <div className="section-header text-center">
                        <h2>Tính năng khác</h2>
                        <p className="section-subtitle">
                            Khám phá thêm những gì bạn có thể làm với Ganvo
                        </p>
                    </div>
                    <div className="features-grid">
                        {FEATURES.map((feature, index) => (
                            <div key={index} className="feature-card">
                                <div className="feature-icon">
                                    <feature.icon size={32} weight="duotone" />
                                </div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="landing-benefits">
                <div className="container">
                    <div className="benefits-content">
                        <div className="benefits-text">
                            <h2>Tại sao chọn Ganvo?</h2>
                            <p className="benefits-description">
                                Ganvo là nền tảng toàn diện giúp bạn khám phá và trải nghiệm
                                văn hóa, lễ hội Việt Nam một cách dễ dàng và thuận tiện nhất.
                            </p>
                            <ul className="benefits-list">
                                {BENEFITS.map((benefit, index) => (
                                    <li key={index}>
                                        <CheckCircle size={24} weight="fill" className="check-icon" />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="benefits-image">
                            <div className="benefits-card">
                                <div className="benefits-card-header">
                                    <span className="emoji">🎭</span>
                                    <span className="emoji">🎉</span>
                                    <span className="emoji">🏮</span>
                                </div>
                                <h3>Hàng trăm sự kiện</h3>
                                <p>Lễ hội truyền thống từ khắp 63 tỉnh thành</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="landing-cta-section">
                <div className="container">
                    <div className="cta-box">
                        <h2>Sẵn sàng khám phá?</h2>
                        <p>Tạo tài khoản miễn phí và bắt đầu hành trình khám phá văn hóa Việt Nam ngay hôm nay.</p>
                        <div className="cta-buttons">
                            <Link to="/register" className="btn btn-primary btn-lg">
                                Bắt đầu ngay
                                <ArrowRight size={20} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
