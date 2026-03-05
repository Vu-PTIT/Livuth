import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { roadmapApi, eventApi } from '../../api/endpoints';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeft, Clock, ThumbsUp, Trash, PencilSimple } from '@phosphor-icons/react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';
import './EventDetailPage.css'; // For common styles

const RoadmapDetailPage: React.FC = () => {
    const { id, roadmapId } = useParams<{ id: string; roadmapId: string }>();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [roadmap, setRoadmap] = useState<any>(null);
    const [eventTitle, setEventTitle] = useState('Sự kiện');
    const [isLoading, setIsLoading] = useState(true);
    const [isLiking, setIsLiking] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id || !roadmapId) return;
            try {
                // Fetch event for breadcrumb/title
                try {
                    const evtRes = await eventApi.getById(id, false);
                    if (evtRes.data.data) {
                        setEventTitle(evtRes.data.data.name);
                    }
                } catch (e) {
                    console.error("Could not fetch event name");
                }

                // Fetch roadmap details
                const res = await roadmapApi.getById(roadmapId);
                setRoadmap(res.data.data);
            } catch (err) {
                console.error('Failed to fetch roadmap', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id, roadmapId]);

    const handleLike = async () => {
        if (!user || !roadmap || isLiking) return;
        setIsLiking(true);
        try {
            const res = await roadmapApi.toggleLike(roadmap.id);
            if (!res.data.data) return;
            const { is_liked, like_count } = res.data.data;

            // Optimistic UI update
            setRoadmap((prev: any) => {
                if (!prev) return prev;
                const newLikes = is_liked
                    ? [...(prev.likes || []), user.id]
                    : (prev.likes || []).filter((uid: string) => uid !== user.id);
                return { ...prev, like_count, likes: newLikes };
            });

        } catch (err) {
            console.error('Failed to toggle like', err);
            showToast('Không thể thực hiện thao tác. Vui lòng thử lại.', 'error');
        } finally {
            setIsLiking(false);
        }
    };

    if (isLoading) {
        return <div className="loading-container"><LoadingSpinner text="Đang tải lộ trình..." /></div>;
    }

    if (!roadmap) {
        return (
            <div className="container app-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <h2 className="text-secondary">Không tìm thấy lộ trình</h2>
                <Link to={`/events/${id}`} className="btn btn-primary" style={{ marginTop: '1rem' }}>Về trang sự kiện</Link>
            </div>
        );
    }

    const isOwner = user?.id === roadmap.user_id;
    const isLiked = user && (roadmap.likes || []).includes(user.id);

    return (
        <div className="container app-content" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <Link to={`/events/${id}`} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <ArrowLeft size={16} /> Quay lại {eventTitle}
                </Link>
            </div>

            <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>{roadmap.title}</h1>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <div className="roadmap-author" style={{ fontSize: '1rem' }}>
                                <img src={roadmap.user_avatar || 'https://i.pravatar.cc/150'} alt={roadmap.user_name} style={{ width: '32px', height: '32px' }} />
                                <strong>{roadmap.user_name || 'Người dùng ẩn danh'}</strong>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                                <Clock size={18} />
                                <span>{roadmap.duration}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {(roadmap.tags || []).map((tag: string, idx: number) => (
                                    <span key={idx} className="roadmap-tag" style={{ margin: 0 }}>{tag}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="roadmap-content" style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                    fontSize: '1.05rem',
                    marginBottom: '2rem'
                }}>
                    {roadmap.content}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <button
                        className={`btn ${isLiked ? 'btn-primary' : 'btn-outline'}`}
                        onClick={handleLike}
                        disabled={!user || isLiking}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <ThumbsUp size={18} weight={isLiked ? 'fill' : 'regular'} />
                        {roadmap.like_count || 0} Thích
                    </button>

                    {isOwner && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-outline btn-sm" style={{ color: 'var(--text-secondary)' }}>
                                <PencilSimple size={16} /> Sửa
                            </button>
                            <button className="btn btn-outline btn-sm" style={{ color: 'var(--error-color)', borderColor: 'var(--error-color)' }}>
                                <Trash size={16} /> Xóa
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoadmapDetailPage;
