import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { eventApi } from '../../api/endpoints';
import type { EventCreateRequest } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import LocationPicker from '../../components/LocationPicker';
import '../../components/LocationPicker.css';
import { ArrowLeft, Plus, X } from '@phosphor-icons/react';
import './ProviderPages.css';

const CATEGORIES = [
    'Văn hóa', 'Tâm linh', 'Ẩm thực', 'Âm nhạc', 'Thể thao', 'Nghệ thuật', 'Du lịch', 'Công nghệ'
];

const EventFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    useAuth(); // Just for auth check
    const isEditing = !!id;

    const [isLoading, setIsLoading] = useState(isEditing);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<EventCreateRequest>({
        name: '',
        time: { lunar: '', next_occurrence: '' },
        content: { intro: '', history: '', activities: [] },
        media: [],
        info: { is_free: true, ticket_price: undefined, note: '' },
        location: { address: '', city: '', province: '' },
        categories: [],
        tags: [],
    });

    const [newActivity, setNewActivity] = useState('');
    const [newMediaUrl, setNewMediaUrl] = useState('');

    useEffect(() => {
        if (isEditing && id) {
            fetchEvent();
        }
    }, [id]);

    const fetchEvent = async () => {
        try {
            const response = await eventApi.getById(id!, false);
            const event = response.data.data;
            if (event) {
                setFormData({
                    name: event.name,
                    time: event.time || { lunar: '', next_occurrence: '' },
                    content: event.content || { intro: '', history: '', activities: [] },
                    media: event.media || [],
                    info: event.info || { is_free: true },
                    location: event.location || {},
                    categories: event.categories || [],
                    tags: event.tags || [],
                });
            }
        } catch (err) {
            setError('Không thể tải thông tin sự kiện');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData((prev) => ({
                ...prev,
                [parent]: {
                    ...(prev as any)[parent],
                    [child]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
                },
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const toggleCategory = (cat: string) => {
        setFormData((prev) => ({
            ...prev,
            categories: prev.categories?.includes(cat)
                ? prev.categories.filter((c) => c !== cat)
                : [...(prev.categories || []), cat],
        }));
    };

    const addActivity = () => {
        if (newActivity.trim()) {
            setFormData((prev) => ({
                ...prev,
                content: {
                    ...prev.content,
                    activities: [...(prev.content?.activities || []), newActivity.trim()],
                },
            }));
            setNewActivity('');
        }
    };

    const removeActivity = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            content: {
                ...prev.content,
                activities: prev.content?.activities?.filter((_, i) => i !== index) || [],
            },
        }));
    };

    const addMedia = () => {
        if (newMediaUrl.trim()) {
            setFormData((prev) => ({
                ...prev,
                media: [...(prev.media || []), { url: newMediaUrl.trim() }],
            }));
            setNewMediaUrl('');
        }
    };

    const removeMedia = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            media: prev.media?.filter((_, i) => i !== index) || [],
        }));
    };

    const handleLocationChange = (coords: { lat: number; lng: number } | null) => {
        setFormData((prev) => ({
            ...prev,
            location: {
                ...prev.location,
                coordinates: coords
                    ? {
                        type: 'Point',
                        coordinates: [coords.lng, coords.lat], // GeoJSON format: [lng, lat]
                    }
                    : undefined,
            },
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');

        try {
            if (isEditing) {
                await eventApi.update(id!, formData);
            } else {
                await eventApi.create(formData);
            }
            navigate('/my-events');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Không thể lưu sự kiện');
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
                <Link to="/my-events" className="back-link">
                    <ArrowLeft size={20} weight="bold" />
                    Quay lại danh sách
                </Link>

                <h1 className="page-title">{id ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}</h1>

                {error && <div className="alert alert-error mb-4">{error}</div>}

                <form onSubmit={handleSubmit} className="card">
                    {/* Basic Info */}
                    <div className="form-section">
                        <h3>Thông tin cơ bản</h3>
                        <div className="form-group">
                            <label className="form-label">Tên sự kiện *</label>
                            <input
                                type="text"
                                name="name"
                                className="form-input"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Nhập tên sự kiện"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Danh mục</label>
                            <div className="category-chips">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        className={`chip ${formData.categories?.includes(cat) ? 'active' : ''}`}
                                        onClick={() => toggleCategory(cat)}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Time */}
                    <div className="form-section">
                        <h3>Thời gian</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Ngày âm lịch</label>
                                <input
                                    type="text"
                                    name="time.lunar"
                                    className="form-input"
                                    value={formData.time?.lunar || ''}
                                    onChange={handleChange}
                                    placeholder="vd: 10/3 âm lịch"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Lần tổ chức tiếp theo</label>
                                <input
                                    type="text"
                                    name="time.next_occurrence"
                                    className="form-input"
                                    value={formData.time?.next_occurrence || ''}
                                    onChange={handleChange}
                                    placeholder="vd: 15/04/2024"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="form-section">
                        <h3>Địa điểm</h3>
                        <div className="form-group">
                            <label className="form-label">Địa chỉ</label>
                            <input
                                type="text"
                                name="location.address"
                                className="form-input"
                                value={formData.location?.address || ''}
                                onChange={handleChange}
                                placeholder="Địa chỉ cụ thể"
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Thành phố</label>
                                <input
                                    type="text"
                                    name="location.city"
                                    className="form-input"
                                    value={formData.location?.city || ''}
                                    onChange={handleChange}
                                    placeholder="vd: Hà Nội"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tỉnh/Thành</label>
                                <input
                                    type="text"
                                    name="location.province"
                                    className="form-input"
                                    value={formData.location?.province || ''}
                                    onChange={handleChange}
                                    placeholder="vd: Hà Nội"
                                />
                            </div>
                        </div>

                        {/* Map-based Location Picker */}
                        <div className="form-group">
                            <label className="form-label">Vị trí trên bản đồ</label>
                            <LocationPicker
                                coordinates={
                                    formData.location?.coordinates?.coordinates
                                        ? {
                                            lat: formData.location.coordinates.coordinates[1],
                                            lng: formData.location.coordinates.coordinates[0],
                                        }
                                        : null
                                }
                                address={formData.location?.address}
                                city={formData.location?.city}
                                province={formData.location?.province}
                                onLocationChange={handleLocationChange}
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="form-section">
                        <h3>Nội dung</h3>
                        <div className="form-group">
                            <label className="form-label">Giới thiệu</label>
                            <textarea
                                name="content.intro"
                                className="form-textarea"
                                value={formData.content?.intro || ''}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Giới thiệu về sự kiện..."
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Lịch sử</label>
                            <textarea
                                name="content.history"
                                className="form-textarea"
                                value={formData.content?.history || ''}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Lịch sử, nguồn gốc của sự kiện..."
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Hoạt động</label>
                            <div className="highlights-list">
                                {formData.content?.activities?.map((act, idx) => (
                                    <div key={idx} className="highlight-item">
                                        <input type="text" className="form-input" value={act} readOnly />
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => removeActivity(idx)}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <div className="highlight-item">
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newActivity}
                                        onChange={(e) => setNewActivity(e.target.value)}
                                        placeholder="Thêm hoạt động..."
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={addActivity}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="form-section">
                        <h3>Giá vé</h3>
                        <div className="form-group">
                            <label className="form-label">
                                <input
                                    type="checkbox"
                                    name="info.is_free"
                                    checked={formData.info?.is_free}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        info: { ...prev.info, is_free: e.target.checked }
                                    }))}
                                />
                                {' '}Miễn phí
                            </label>
                        </div>
                        {!formData.info?.is_free && (
                            <div className="form-group">
                                <label className="form-label">Giá vé (VND)</label>
                                <input
                                    type="number"
                                    name="info.ticket_price"
                                    className="form-input"
                                    value={formData.info?.ticket_price || ''}
                                    onChange={handleChange}
                                    placeholder="0"
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Ghi chú</label>
                            <input
                                type="text"
                                name="info.note"
                                className="form-input"
                                value={formData.info?.note || ''}
                                onChange={handleChange}
                                placeholder="Ghi chú về giá vé..."
                            />
                        </div>
                    </div>

                    {/* Media */}
                    <div className="form-section">
                        <h3>Hình ảnh</h3>
                        <div className="form-group">
                            <div className="highlights-list">
                                {formData.media?.map((item, idx) => (
                                    <div key={idx} className="highlight-item">
                                        <input type="text" className="form-input" value={item.url} readOnly />
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => removeMedia(idx)}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <div className="highlight-item">
                                    <input
                                        type="url"
                                        className="form-input"
                                        value={newMediaUrl}
                                        onChange={(e) => setNewMediaUrl(e.target.value)}
                                        placeholder="Nhập URL hình ảnh..."
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={addMedia}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="form-actions">
                        <Link to="/my-events" className="btn btn-secondary">
                            Hủy
                        </Link>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo sự kiện'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventFormPage;
