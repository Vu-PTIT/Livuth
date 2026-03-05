import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { roadmapApi } from '../../api/endpoints';
import { ArrowLeft, PaperPlaneRight } from '@phosphor-icons/react';
import { useToast } from '../../components/Toast';

const CreateRoadmapPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        if (!title.trim() || !duration.trim() || !content.trim()) {
            setError('Vui lòng điền đầy đủ tiêu đề, thời lượng và nội dung lộ trình.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
            await roadmapApi.create(id, {
                title,
                duration,
                tags,
                content
            });

            showToast('Tạo lộ trình thành công!', 'success');
            navigate(`/events/${id}`);
        } catch (err: any) {
            console.error('Failed to create roadmap', err);
            setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo lộ trình. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container app-content" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <Link to={`/events/${id}`} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={16} /> Quay lại sự kiện
                </Link>
            </div>

            <div className="card">
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>✍️ Chia sẻ lộ trình của bạn</h2>
                <p className="text-secondary" style={{ marginBottom: '2rem' }}>
                    Hãy viết lại lịch trình, kinh nghiệm và những địa điểm thú vị mà bạn đã trải qua để cộng đồng cùng tham khảo nhé!
                </p>

                {error && (
                    <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '1.5rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label htmlFor="title">Tiêu đề lộ trình <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            id="title"
                            className="form-input"
                            placeholder="Ví dụ: Khám phá trọn vẹn 2 ngày 1 đêm cực chất"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={150}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="duration">Thời lượng <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            id="duration"
                            className="form-input"
                            placeholder="Ví dụ: 2 Ngày 1 Đêm, 1 Ngày..."
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            maxLength={50}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="tags">Thẻ phân loại (cách nhau bởi dấu phẩy)</label>
                        <input
                            type="text"
                            id="tags"
                            className="form-input"
                            placeholder="Ví dụ: Tiết kiệm, Cặp đôi, Sống ảo..."
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="content">Nội dung chi tiết <span style={{ color: 'red' }}>*</span></label>
                        <textarea
                            id="content"
                            className="form-textarea"
                            rows={12}
                            placeholder="Ngày 1:&#10;8h00: Di chuyển đến...&#10;10h00: Tham quan...&#10;&#10;Ngày 2:&#10;..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        ></textarea>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                            style={{ padding: '0.75rem 2rem' }}
                        >
                            {isSubmitting ? 'Đang đăng...' : (
                                <>
                                    <PaperPlaneRight size={20} style={{ marginRight: '0.5rem' }} /> Đăng lộ trình
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRoadmapPage;
