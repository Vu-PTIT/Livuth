import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { roadmapApi, eventApi } from '../../api/endpoints';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeft, Clock, ThumbsUp, Trash, PencilSimple } from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';

// Fix for default marker icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});
import { useToast } from '../../components/Toast';
import './EventDetailPage.css'; // For common styles

const RoadmapDetailPage: React.FC = () => {
    const { id, roadmapId } = useParams<{ id: string; roadmapId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [roadmap, setRoadmap] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiking, setIsLiking] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [activeWaypointId, setActiveWaypointId] = useState<string | null>(null);
    const waypointRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const mapWrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!id || !roadmapId) return;
            try {
                // Fetch event for breadcrumb/title
                try {
                    await eventApi.getById(id, false);
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

    const handleDelete = () => {
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!roadmapId || !id) return;
        
        try {
            await roadmapApi.delete(roadmapId);
            showToast('Đã xóa lộ trình thành công', 'success');
            setIsDeleteModalOpen(false);
            navigate(`/events/${id}`);
        } catch (err: any) {
            console.error('Failed to delete roadmap', err);
            showToast(err.response?.data?.message || 'Không thể xóa lộ trình. Vui lòng thử lại.', 'error');
            setIsDeleteModalOpen(false);
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
        <div className="app-content side-nav-layout" style={{ paddingTop: '1.5rem' }}>
            <aside className="nav-sidebar">
                <Link to={`/events/${id}`} className="back-btn-pill">
                    <ArrowLeft size={16} /> Quay lại sự kiện
                </Link>
            </aside>

            <main className="main-content-area">
                <div style={{ maxWidth: '800px', width: '100%' }}>
                    <div className="card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>{roadmap.title}</h1>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                    <div className="roadmap-author" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <img src={roadmap.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${roadmap.user_name || 'user'}`} alt={roadmap.user_name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
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

                        {/* Interactive Map Render */}
                        {(roadmap.days && roadmap.days.length > 0) ? (() => {
                            const days = roadmap.days || [];
                            let orderCounter = 0;

                            const mapWaypoints = days.flatMap((day: any) =>
                                (day.waypoints || []).map((wp: any, idx: number) => {
                                    const hasCoords = wp?.location?.lat && wp?.location?.lng;
                                    const id = wp.id || `wp-${day.day}-${idx}`;

                                    return {
                                        id,
                                        day: day.day,
                                        order: hasCoords ? ++orderCounter : null,
                                        name: wp.location?.name || 'Chưa rõ địa điểm',
                                        position: hasCoords
                                            ? [parseFloat(wp.location.lat as string), parseFloat(wp.location.lng as string)] as [number, number]
                                            : null,
                                        raw: wp,
                                    };
                                })
                            ).filter((item: any) => item.position);

                            const positions: [number, number][] = mapWaypoints.map((wp: any) => wp.position as [number, number]);
                            const center = positions.length > 0 ? positions[0] : null;
                            const waypointOrderMap: Record<string, number> = {};
                            mapWaypoints.forEach((wp: any) => {
                                if (wp.order != null) {
                                    waypointOrderMap[wp.id] = wp.order;
                                }
                            });

                            const handleWaypointFocus = (waypointId: string, source: 'map' | 'list' = 'map') => {
                                setActiveWaypointId(waypointId);

                                // Nếu click từ marker trên map -> cuộn đến item trong danh sách
                                if (source === 'map') {
                                    const el = waypointRefs.current[waypointId];
                                    if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                    return;
                                }

                                // Nếu click từ danh sách -> trên mobile sẽ tự cuộn viewport lên phần bản đồ
                                if (source === 'list' && typeof window !== 'undefined' && mapWrapperRef.current) {
                                    const rect = mapWrapperRef.current.getBoundingClientRect();
                                    const headerOffset = 80; // chiều cao header cố định
                                    const targetY = rect.top + window.scrollY - headerOffset;

                                    // Ưu tiên auto scroll trên mobile / tablet
                                    if (window.innerWidth < 1024) {
                                        window.scrollTo({ top: targetY, behavior: 'smooth' });
                                    }
                                }
                            };

                            return (
                                <div className="roadmap-interactive-view">
                                    {center && (
                                        <div
                                            ref={mapWrapperRef}
                                            className="roadmap-map-wrapper"
                                            style={{ height: '350px', marginBottom: '2rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}
                                        >
                                            <MapContainer center={center as [number, number]} zoom={12} style={{ height: '100%', width: '100%' }}>
                                                <TileLayer url={`https://api.maptiler.com/maps/base-v4/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`} />
                                                {mapWaypoints.map((wp: any) => {
                                                    const isActive = activeWaypointId === wp.id;
                                                    const icon = L.divIcon({
                                                        className: `numbered-marker${isActive ? ' numbered-marker-active' : ''}`,
                                                        html: `
                                                            <div class="marker-pin"></div>
                                                            <span class="marker-number">${wp.order}</span>
                                                        `,
                                                        iconSize: [30, 42],
                                                        iconAnchor: [15, 42]
                                                    });
                                                    return (
                                                        <Marker
                                                            key={wp.id}
                                                            position={wp.position as [number, number]}
                                                            icon={icon}
                                                            eventHandlers={{
                                                                click: () => handleWaypointFocus(wp.id, 'map')
                                                            }}
                                                        />
                                                    );
                                                })}
                                                {positions.length > 1 && (
                                                    <Polyline positions={positions} color="var(--primary-color)" weight={4} dashArray="5, 10" />
                                                )}
                                            </MapContainer>
                                        </div>
                                    )}

                                    <div className="roadmap-days-list">
                                        {days.map((day: any) => (
                                            <div key={day.day} style={{ marginBottom: '2rem' }}>
                                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                                    <span className="badge badge-primary">Ngày {day.day}</span>
                                                    {day.title && <span> - {day.title}</span>}
                                                </h3>
                                                <div style={{ borderLeft: '2px solid var(--border-color)', paddingLeft: '1.5rem', marginLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                    {(!day.waypoints || day.waypoints.length === 0) ? (
                                                        <p className="text-secondary" style={{ fontStyle: 'italic' }}>Chưa có hoạt động nào</p>
                                                    ) : (
                                                        day.waypoints.map((wp: any, idx: number) => {
                                                            const hasCoords = wp?.location?.lat && wp?.location?.lng;
                                                            const waypointId = wp.id || `wp-${day.day}-${idx}`;
                                                            const markerNumber = hasCoords ? waypointOrderMap[waypointId] : undefined;
                                                            const isActive = activeWaypointId === waypointId;

                                                            return (
                                                                <div
                                                                    key={waypointId}
                                                                    ref={(el) => { waypointRefs.current[waypointId] = el; }}
                                                                    className={`roadmap-waypoint-item${isActive ? ' roadmap-waypoint-active' : ''}`}
                                                                    style={{ position: 'relative' }}
                                                                    onMouseEnter={() => hasCoords && setActiveWaypointId(waypointId)}
                                                                    onMouseLeave={() => {
                                                                        if (activeWaypointId === waypointId) {
                                                                            setActiveWaypointId(null);
                                                                        }
                                                                    }}
                                                                    onClick={() => hasCoords && handleWaypointFocus(waypointId, 'list')}
                                                                >
                                                                    {!markerNumber && (
                                                                        <div style={{ 
                                                                            position: 'absolute', 
                                                                            left: '-30px', 
                                                                            top: '10px', 
                                                                            width: '10px', 
                                                                            height: '10px', 
                                                                            borderRadius: '50%', 
                                                                            backgroundColor: 'var(--primary-color)', 
                                                                            border: '2px solid var(--bg-primary)'
                                                                        }}>
                                                                        </div>
                                                                    )}
                                                                    <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                        {markerNumber && (
                                                                            <span className="roadmap-waypoint-index">
                                                                                {markerNumber}
                                                                            </span>
                                                                        )}
                                                                        {wp.location?.name || 'Chưa rõ địa điểm'}
                                                                    </h4>
                                                                    {wp.time && <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}><Clock size={14}/> {wp.time}</div>}
                                                                    {wp.description && <p style={{ fontSize: '0.95rem', margin: '0.5rem 0 0 0', lineHeight: 1.5 }}>{wp.description}</p>}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })() : (
                            <div className="roadmap-content" style={{
                                whiteSpace: 'pre-wrap',
                                lineHeight: 1.6,
                                color: 'var(--text-primary)',
                                fontSize: '1.05rem',
                                marginBottom: '2rem'
                            }}>
                                {roadmap.content}
                            </div>
                        )}

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
                                    <button className="btn btn-outline btn-sm" onClick={handleDelete} style={{ color: 'var(--error-color)', borderColor: 'var(--error-color)' }}>
                                        <Trash size={16} /> Xóa
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Xóa lộ trình" size="small">
                        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                            Bạn có chắc chắn muốn xóa lộ trình này không? Hành động này không thể hoàn tác.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline" onClick={() => setIsDeleteModalOpen(false)}>
                                Hủy
                            </button>
                            <button className="btn btn-primary" onClick={confirmDelete} style={{ backgroundColor: 'var(--error-color)', borderColor: 'var(--error-color)' }}>
                                Xác nhận xóa
                            </button>
                        </div>
                    </Modal>
                </div>
            </main>
        </div>
    );
};

export default RoadmapDetailPage;
