import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tourProviderApi, eventApi } from '../../api/endpoints';
import type { TourProviderCreateRequest, Event } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ArrowLeft, Plus, X } from '@phosphor-icons/react';
import { useToast } from '../../components/Toast';
import './ProviderPages.css';

const ListingFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [isLoading, setIsLoading] = useState(isEditing);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [events, setEvents] = useState<Event[]>([]);

    const [formData, setFormData] = useState<TourProviderCreateRequest>({
        event_id: '',
        company_name: '',
        business_license: '',
        service_name: '',
        description: '',
        highlights: [],
        price_range: '',
        price_note: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        contact_website: '',
        contact_facebook: '',
        contact_zalo: '',
        contact_address: '',
        logo_url: '',
        photos: [],
    });

    const [newHighlight, setNewHighlight] = useState('');
    const [newPhotoUrl, setNewPhotoUrl] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        fetchEvents();
        if (isEditing && id) {
            fetchListing();
        }
    }, [id]);

    const fetchEvents = async () => {
        try {
            const response = await eventApi.getAll(100);
            setEvents(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch events:', err);
        }
    };

    const fetchListing = async () => {
        try {
            const response = await tourProviderApi.getById(id!);
            const listing = response.data.data;
            if (listing) {
                setFormData({
                    event_id: listing.event_id,
                    company_name: listing.company_name,
                    business_license: listing.business_license || '',
                    service_name: listing.service_name,
                    description: listing.description,
                    highlights: listing.highlights || [],
                    price_range: listing.price_range,
                    price_note: listing.price_note || '',
                    contact_name: listing.contact_name,
                    contact_phone: listing.contact_phone,
                    contact_email: listing.contact_email,
                    contact_website: listing.contact_website || '',
                    contact_facebook: listing.contact_facebook || '',
                    contact_zalo: listing.contact_zalo || '',
                    contact_address: listing.contact_address || '',
                    logo_url: listing.logo_url || '',
                    photos: listing.photos || [],
                });
            }
        } catch (err) {
            setError('Không thể tải thông tin');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const addHighlight = () => {
        if (newHighlight.trim()) {
            setFormData((prev) => ({
                ...prev,
                highlights: [...(prev.highlights || []), newHighlight.trim()],
            }));
            setNewHighlight('');
        }
    };

    const removeHighlight = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            highlights: prev.highlights?.filter((_, i) => i !== index) || [],
        }));
    };

    const addPhoto = () => {
        if (newPhotoUrl.trim()) {
            setFormData((prev) => ({
                ...prev,
                photos: [...(prev.photos || []), newPhotoUrl.trim()],
            }));
            setNewPhotoUrl('');
        }
    };

    const removePhoto = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            photos: prev.photos?.filter((_, i) => i !== index) || [],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');

        try {
            if (isEditing) {
                await tourProviderApi.update(id!, formData);
                showToast('Cập nhật dịch vụ thành công', 'success');
            } else {
                await tourProviderApi.create(formData);
                showToast('Tạo dịch vụ thành công', 'success');
            }
            navigate('/my-listings');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Không thể lưu dịch vụ');
            showToast('Lỗi khi lưu dịch vụ', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <LoadingSpinner text="Đang tải..." />
            </div>
        );
    }

    return (
        <div className="provider-page container">
            <div className="provider-form">
                <Link to="/my-listings" className="back-link">
                    <ArrowLeft size={20} weight="bold" />
                    Quay lại danh sách
                </Link>

                <h1 className="page-title">{isEditing ? 'Chỉnh sửa dịch vụ' : 'Tạo dịch vụ mới'}</h1>

                {error && <div className="alert alert-error mb-4">{error}</div>}

                <form onSubmit={handleSubmit} className="card">
                    {/* Event Selection */}
                    <div className="form-section">
                        <h3>Sự kiện</h3>
                        <div className="form-group">
                            <label className="form-label">Chọn sự kiện *</label>
                            <select
                                name="event_id"
                                className="form-select"
                                value={formData.event_id}
                                onChange={handleChange}
                                required
                                disabled={isEditing}
                            >
                                <option value="">-- Chọn sự kiện --</option>
                                {events.map((event) => (
                                    <option key={event.id} value={event.id}>
                                        {event.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Company Info */}
                    <div className="form-section">
                        <h3>Thông tin công ty</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Tên công ty *</label>
                                <input
                                    type="text"
                                    name="company_name"
                                    className="form-input"
                                    value={formData.company_name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Nhập tên công ty"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Giấy phép kinh doanh</label>
                                <input
                                    type="text"
                                    name="business_license"
                                    className="form-input"
                                    value={formData.business_license}
                                    onChange={handleChange}
                                    placeholder="Số giấy phép"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Logo URL</label>
                            <input
                                type="url"
                                name="logo_url"
                                className="form-input"
                                value={formData.logo_url}
                                onChange={handleChange}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    {/* Service Info */}
                    <div className="form-section">
                        <h3>Thông tin dịch vụ</h3>
                        <div className="form-group">
                            <label className="form-label">Tên dịch vụ *</label>
                            <input
                                type="text"
                                name="service_name"
                                className="form-input"
                                value={formData.service_name}
                                onChange={handleChange}
                                required
                                placeholder="vd: Tour trọn gói lễ hội Chùa Hương"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mô tả *</label>
                            <textarea
                                name="description"
                                className="form-textarea"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                rows={5}
                                placeholder="Chi tiết về dịch vụ..."
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Điểm nổi bật</label>
                            <div className="highlights-list">
                                {formData.highlights?.map((h, idx) => (
                                    <div key={idx} className="highlight-item">
                                        <input type="text" className="form-input" value={h} readOnly />
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => removeHighlight(idx)}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <div className="highlight-item">
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newHighlight}
                                        onChange={(e) => setNewHighlight(e.target.value)}
                                        placeholder="Thêm điểm nổi bật..."
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={addHighlight}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="form-section">
                        <h3>Giá cả</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Khoảng giá *</label>
                                <input
                                    type="text"
                                    name="price_range"
                                    className="form-input"
                                    value={formData.price_range}
                                    onChange={handleChange}
                                    required
                                    placeholder="vd: 500.000 - 1.500.000 VND"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú giá</label>
                                <input
                                    type="text"
                                    name="price_note"
                                    className="form-input"
                                    value={formData.price_note}
                                    onChange={handleChange}
                                    placeholder="vd: Giá có thể thay đổi theo mùa"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="form-section">
                        <h3>Thông tin liên hệ</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Tên liên hệ *</label>
                                <input
                                    type="text"
                                    name="contact_name"
                                    className="form-input"
                                    value={formData.contact_name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Họ tên người liên hệ"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Số điện thoại *</label>
                                <input
                                    type="tel"
                                    name="contact_phone"
                                    className="form-input"
                                    value={formData.contact_phone}
                                    onChange={handleChange}
                                    required
                                    placeholder="0901234567"
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input
                                    type="email"
                                    name="contact_email"
                                    className="form-input"
                                    value={formData.contact_email}
                                    onChange={handleChange}
                                    required
                                    placeholder="email@company.com"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Website</label>
                                <input
                                    type="url"
                                    name="contact_website"
                                    className="form-input"
                                    value={formData.contact_website}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Facebook</label>
                                <input
                                    type="url"
                                    name="contact_facebook"
                                    className="form-input"
                                    value={formData.contact_facebook}
                                    onChange={handleChange}
                                    placeholder="https://facebook.com/..."
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Zalo</label>
                                <input
                                    type="text"
                                    name="contact_zalo"
                                    className="form-input"
                                    value={formData.contact_zalo}
                                    onChange={handleChange}
                                    placeholder="Số Zalo"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Địa chỉ</label>
                            <input
                                type="text"
                                name="contact_address"
                                className="form-input"
                                value={formData.contact_address}
                                onChange={handleChange}
                                placeholder="Địa chỉ văn phòng"
                            />
                        </div>
                    </div>

                    {/* Photos */}
                    <div className="form-section">
                        <h3>Hình ảnh</h3>
                        <div className="form-group">
                            <div className="highlights-list">
                                {formData.photos?.map((photo, idx) => (
                                    <div key={idx} className="highlight-item">
                                        <input type="text" className="form-input" value={photo} readOnly />
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => removePhoto(idx)}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <div className="highlight-item">
                                    <input
                                        type="url"
                                        className="form-input"
                                        value={newPhotoUrl}
                                        onChange={(e) => setNewPhotoUrl(e.target.value)}
                                        placeholder="Nhập URL hình ảnh..."
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={addPhoto}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="form-actions">
                        <Link to="/my-listings" className="btn btn-secondary">
                            Hủy
                        </Link>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo dịch vụ'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ListingFormPage;
