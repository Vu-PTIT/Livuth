import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { roadmapApi, eventApi } from '../../api/endpoints';
import { ArrowLeft, Clock, ThumbsUp, Plus } from '@phosphor-icons/react';
import LoadingSpinner from '../../components/LoadingSpinner';
import './EventDetailPage.css'; // Reusing some base styles

const EventRoadmapsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [roadmaps, setRoadmaps] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [eventTitle, setEventTitle] = useState('Sự kiện');

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                // Fetch event details for title
                const evtRes = await eventApi.getById(id, false);
                if (evtRes.data.data) {
                    setEventTitle(evtRes.data.data.name);
                }

                // Fetch real roadmaps
                const res = await roadmapApi.getEventRoadmaps(id);
                setRoadmaps(res.data.data?.roadmaps || []);
            } catch (err) {
                console.error('Failed to fetch roadmaps', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id]);

    return (
        <div className="app-content" style={{ paddingTop: '1.5rem', position: 'relative' }}>
            {/* Back button aligned to far left logo area */}
            <div style={{ padding: '0 2rem', marginBottom: '1rem' }}>
                <Link to={`/events/${id}`} className="back-btn-pill">
                    <ArrowLeft size={16} /> Quay lại sự kiện
                </Link>
            </div>

            <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Lộ trình tham khảo</h2>
                    <p className="text-secondary" style={{ marginTop: '0.25rem' }}>Các lịch trình từ cộng đồng cho {eventTitle}</p>
                </div>

                <Link to={`/events/${id}/roadmaps/create`} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> Tạo lộ trình mới
                </Link>
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <LoadingSpinner />
                </div>
            ) : roadmaps.length === 0 ? (
                <div className="card text-center" style={{ padding: '3rem 1rem' }}>
                    <h3 className="text-secondary" style={{ marginBottom: '1rem' }}>Chưa có lộ trình nào được chia sẻ</h3>
                    <p>Hãy là người đầu tiên chia sẻ lịch trình tuyệt vời của bạn cho sự kiện này nhé!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {roadmaps.map(roadmap => (
                        <Link
                            to={`/events/${id}/roadmaps/${roadmap.id}`}
                            key={roadmap.id}
                            className="roadmap-card"
                            style={{ width: '100%' }} // Override horizontal list fixed width
                        >
                            <div className="roadmap-card-header">
                                <h4 className="roadmap-title" title={roadmap.title}>{roadmap.title}</h4>
                                <div className="roadmap-author">
                                    <img src={roadmap.user_avatar || 'https://i.pravatar.cc/150'} alt={roadmap.user_name || 'Người dùng'} />
                                    <span>{roadmap.user_name || 'Người dùng ẩn danh'}</span>
                                </div>
                            </div>
                            <div className="roadmap-card-body">
                                <div className="roadmap-meta">
                                    <span className="meta-badge"><Clock size={14} /> {roadmap.duration}</span>
                                    <span className="meta-badge like-badge"><ThumbsUp size={14} /> {roadmap.like_count || 0}</span>
                                </div>
                                <div className="roadmap-tags">
                                    {(roadmap.tags || []).map((tag: string, idx: number) => (
                                        <span key={idx} className="roadmap-tag">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    </div>
    );
};

export default EventRoadmapsPage;
