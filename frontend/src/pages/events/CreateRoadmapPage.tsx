import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { roadmapApi, eventApi } from '../../api/endpoints';
import { ArrowLeft, PaperPlaneRight, Plus, MapPin, Trash, Clock, MapTrifold, Robot, MagicWand } from '@phosphor-icons/react';
import { useToast } from '../../components/Toast';
import LocationPicker from '../../components/LocationPicker';
import type { RoadmapDay, Waypoint } from '../../types';
import './CreateRoadmapPage.css';

const CreateRoadmapPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    
    // Event info (for context-aware map + AI)
    const [eventName, setEventName] = useState('');
    const [eventCenter, setEventCenter] = useState<{ lat: number; lng: number } | null>(null);
    const [eventAddress, setEventAddress] = useState<string>('');
    
    // Structured Roadmap Data
    const [days, setDays] = useState<RoadmapDay[]>([{ day: 1, title: '', waypoints: [] }]);
    
    // UI State for Waypoint Form
    const [addingWaypointToDay, setAddingWaypointToDay] = useState<number | null>(null);
    const [newWaypoint, setNewWaypoint] = useState<Partial<Waypoint>>({
        location: { name: '', lat: undefined, lng: undefined, address: '' },
        time: '',
        description: '',
        activity_type: 'Sightseeing'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // AI Generation State
    const [aiLocation, setAiLocation] = useState('');
    const [aiDuration, setAiDuration] = useState('2');
    const [aiInterests, setAiInterests] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch event details for location context
    useEffect(() => {
        if (!id) return;
        eventApi.getById(id, false).then(res => {
            const evt = res.data.data;
            if (!evt) return;
            setEventName(evt.name || '');
            // Auto-fill AI location from event name
            setAiLocation(evt.name || '');
            // Build address hint from location info
            const loc = evt.location;
            const addr = [loc?.address, loc?.city, loc?.province].filter(Boolean).join(', ');
            setEventAddress(addr);
            // If event has GeoJSON coordinates [lng, lat], center the map there
            const coords = loc?.coordinates?.coordinates;
            if (coords && coords.length === 2) {
                // GeoJSON format: [longitude, latitude]
                setEventCenter({ lat: coords[1], lng: coords[0] });
            }
        }).catch(() => {/* silently ignore */});
    }, [id]);

    const handleGenerateAI = async () => {
        if (!aiLocation.trim() || !aiInterests.trim()) {
            showToast('Vui lòng nhập địa điểm và sở thích', 'error');
            return;
        }

        setIsGenerating(true);
        try {
            const res = await roadmapApi.generate({
                location: aiLocation,
                duration_days: parseInt(aiDuration) || 2,
                interests: aiInterests,
                event_id: id
            });
            
            if (res.data.data) {
                const generated = res.data.data;
                if (generated.title) setTitle(generated.title);
                if (generated.duration) setDuration(generated.duration);
                if (generated.days && generated.days.length > 0) {
                    // Inject IDs for new waypoints because backend gemini output won't have it
                    const formattedDays = generated.days.map((d: any) => ({
                        day: d.day,
                        title: d.title || `Ngày ${d.day}`,
                        waypoints: d.waypoints.map((wp: any) => ({
                            ...wp,
                            id: `wp-ai-${Math.random().toString(36).substr(2, 9)}`
                        }))
                    }));
                    setDays(formattedDays);
                    showToast('Tạo lộ trình tự động thành công!', 'success');
                }
            }
        } catch (err: any) {
            console.error('Failed to generate AI roadmap', err);
            showToast(err.response?.data?.message || 'Có lỗi xảy ra khi gọi AI. Vui lòng thử lại.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddDay = () => {
        setDays([...days, { day: days.length + 1, title: '', waypoints: [] }]);
    };

    const handleRemoveDay = (dayIndex: number) => {
        const updatedDays = [...days];
        updatedDays.splice(dayIndex, 1);
        // Re-index days
        const reindexedDays = updatedDays.map((d, idx) => ({ ...d, day: idx + 1 }));
        setDays(reindexedDays);
    };

    const handleDayTitleChange = (dayIndex: number, newTitle: string) => {
        const updatedDays = [...days];
        updatedDays[dayIndex].title = newTitle;
        setDays(updatedDays);
    };

    const openWaypointForm = (dayNumber: number) => {
        setAddingWaypointToDay(dayNumber);
        setNewWaypoint({
            location: { name: '', lat: undefined, lng: undefined, address: '' },
            time: '',
            description: '',
            activity_type: 'Sightseeing'
        });
    };

    const cancelWaypointForm = () => {
        setAddingWaypointToDay(null);
    };

    const saveWaypoint = () => {
        if (!newWaypoint.location?.name) {
            showToast('Chưa nhập tên địa điểm', 'error');
            return;
        }

        const wpId = `wp-${Date.now()}`;
        const wp: Waypoint = {
            id: wpId,
            location: {
                name: newWaypoint.location.name,
                address: newWaypoint.location.address,
                lat: newWaypoint.location.lat,
                lng: newWaypoint.location.lng,
            },
            time: newWaypoint.time,
            description: newWaypoint.description,
            activity_type: newWaypoint.activity_type
        };

        const updatedDays = days.map(d => {
            if (d.day === addingWaypointToDay) {
                return { ...d, waypoints: [...d.waypoints, wp] };
            }
            return d;
        });

        setDays(updatedDays);
        setAddingWaypointToDay(null);
    };

    const handleRemoveWaypoint = (dayNumber: number, wpId: string) => {
        const updatedDays = days.map(d => {
            if (d.day === dayNumber) {
                return { ...d, waypoints: d.waypoints.filter(wp => wp.id !== wpId) };
            }
            return d;
        });
        setDays(updatedDays);
    };

    const handleLocationChange = (coords: { lat: number; lng: number } | null) => {
        setNewWaypoint({
            ...newWaypoint,
            location: {
                ...newWaypoint.location!,
                lat: coords?.lat,
                lng: coords?.lng,
            }
        });
    };

    const generateMarkdownContent = (): string => {
        let md = '';
        days.forEach(day => {
            md += `### Ngày ${day.day}` + (day.title ? `: ${day.title}` : '') + '\n\n';
            if (day.waypoints.length === 0) {
                md += '*Chưa có lịch trình*\n\n';
            } else {
                day.waypoints.forEach(wp => {
                    md += `- **${wp.time || 'Thời gian tự do'} - ${wp.location.name}**\n`;
                    if (wp.description) {
                        md += `  *${wp.description}*\n`;
                    }
                });
                md += '\n';
            }
        });
        return md;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        if (!title.trim() || !duration.trim()) {
            setError('Vui lòng điền đầy đủ tiêu đề và thời lượng lộ trình.');
            return;
        }
        
        // Validation: At least one day with one waypoint
        const hasWaypoints = days.some(day => day.waypoints.length > 0);
        if (!hasWaypoints) {
            setError('Vui lòng thêm ít nhất một địa điểm trong lộ trình.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
            const generatedContent = generateMarkdownContent();
            
            await roadmapApi.create(id, {
                title,
                duration,
                tags,
                content: generatedContent,
                days: days
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
        <div className="container app-content" style={{ maxWidth: '900px', margin: '0 auto', paddingTop: '2rem', paddingBottom: '4rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <Link to={`/events/${id}`} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={16} /> Quay lại sự kiện
                </Link>
            </div>

            <div className="card">
                <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapTrifold size={28} color="var(--primary-color)" /> Tạo lộ trình tương tác
                </h2>
                <p className="text-secondary" style={{ marginBottom: '2rem' }}>
                    Xây dựng lịch trình chi tiết và thêm các điểm đến trên bản đồ để chia sẻ chuyến đi tuyệt vời của bạn!
                </p>

                {error && (
                    <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '1.5rem' }}>
                        {error}
                    </div>
                )}

                <div className="card" style={{ marginBottom: '2rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--primary-color)' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Robot size={24} weight="fill" /> Tạo Tự Động Bằng AI
                    </h3>
                    <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                        Nhập thông tin bên dưới, Ganvo AI sẽ tự động lên lịch trình chi tiết và điền vào form cho bạn.
                    </p>
                    
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Địa điểm / Tên sự kiện <span style={{ color: 'red' }}>*</span></label>
                            <input type="text" className="form-input" placeholder="VD: Đà Lạt" value={aiLocation} onChange={(e) => setAiLocation(e.target.value)} disabled={isGenerating} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Số ngày <span style={{ color: 'red' }}>*</span></label>
                            <input type="number" min="1" max="10" className="form-input" value={aiDuration} onChange={(e) => setAiDuration(e.target.value)} disabled={isGenerating} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Sở thích / Nhu cầu <span style={{ color: 'red' }}>*</span></label>
                            <input type="text" className="form-input" placeholder="VD: Sống ảo, Ăn đặc sản" value={aiInterests} onChange={(e) => setAiInterests(e.target.value)} disabled={isGenerating} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-primary" onClick={handleGenerateAI} disabled={isGenerating || !aiLocation || !aiInterests} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isGenerating ? 'Đang tạo...' : <><MagicWand size={18} weight="fill" /> Tạo lịch trình tự động</>}
                        </button>
                    </div>
                </div>

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

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
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
                        <label htmlFor="tags">Thẻ phân loại</label>
                        <input
                            type="text"
                            id="tags"
                            className="form-input"
                            placeholder="Ví dụ: Tiết kiệm, Cặp đôi..."
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                        />
                    </div>
                </div>

                <hr style={{ margin: '2rem 0', borderColor: 'var(--border-color)' }} />
                
                <h3 style={{ marginBottom: '1.5rem' }}>Lịch trình chi tiết</h3>

                <div className="roadmap-builder-container">
                    {days.map((day, index) => (
                        <div key={index} className="roadmap-day-card">
                            <div className="roadmap-day-header">
                                <div className="roadmap-day-title">
                                    <span className="badge badge-primary" style={{ fontSize: '1.1rem', padding: '0.2rem 0.6rem' }}>Ngày {day.day}</span>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        style={{ width: '300px', marginLeft: '0.5rem', backgroundColor: 'transparent', border: '1px solid transparent', borderBottom: '1px dashed var(--border-color)', borderRadius: 0, padding: '0.2rem 0.5rem' }}
                                        placeholder="Tiêu đề ngày (không bắt buộc)" 
                                        value={day.title || ''}
                                        onChange={(e) => handleDayTitleChange(index, e.target.value)}
                                    />
                                </div>
                                {days.length > 1 && (
                                    <button onClick={() => handleRemoveDay(index)} className="btn btn-icon btn-outline btn-sm text-danger" title="Xóa ngày này">
                                        <Trash size={18} />
                                    </button>
                                )}
                            </div>

                            <div className="roadmap-waypoints">
                                {day.waypoints.length === 0 && <p className="text-secondary" style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>Chưa có địa điểm nào.</p>}
                                
                                {day.waypoints.map(wp => (
                                    <div key={wp.id} className="roadmap-waypoint-item">
                                        <div className="waypoint-header">
                                            <div className="waypoint-info">
                                                <h4><MapPin size={16} style={{ verticalAlign: 'middle', marginRight: '4px', color: 'var(--primary-color)' }}/> {wp.location.name}</h4>
                                                {wp.time && <span className="waypoint-time"><Clock size={14} /> {wp.time}</span>}
                                            </div>
                                            <button onClick={() => handleRemoveWaypoint(day.day, wp.id)} className="btn btn-icon btn-sm text-danger" style={{ border: 'none', background: 'transparent' }}>
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                        {wp.description && <p className="waypoint-desc">{wp.description}</p>}
                                        {(wp.location.lat && wp.location.lng) && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                                📍 Đã ghim trên bản đồ
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {addingWaypointToDay === day.day ? (
                                    <div className="waypoint-form">
                                        <h5 style={{ margin: '0 0 1rem 0' }}>Thêm địa điểm mới</h5>
                                        <div className="form-group">
                                            <label>Tên địa điểm / Tên hoạt động <span style={{ color: 'red' }}>*</span></label>
                                            <input 
                                                type="text" 
                                                className="form-input" 
                                                value={newWaypoint.location?.name || ''}
                                                onChange={(e) => setNewWaypoint({...newWaypoint, location: {...newWaypoint.location!, name: e.target.value}})}
                                                placeholder="VD: Quán Cà phê, Vịnh Hạ Long..."
                                                autoFocus
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                                            <div className="form-group">
                                                <label>Thời gian</label>
                                                <input 
                                                    type="text" 
                                                    className="form-input" 
                                                    value={newWaypoint.time || ''}
                                                    onChange={(e) => setNewWaypoint({...newWaypoint, time: e.target.value})}
                                                    placeholder="VD: 08:00, Sáng..."
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Ghi chú</label>
                                                <input 
                                                    type="text" 
                                                    className="form-input" 
                                                    value={newWaypoint.description || ''}
                                                    onChange={(e) => setNewWaypoint({...newWaypoint, description: e.target.value})}
                                                    placeholder="Mô tả trải nghiệm của bạn..."
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <MapPin size={16} /> Ghim vị trí trên bản đồ
                                            </label>
                                            <LocationPicker 
                                                coordinates={newWaypoint.location?.lat && newWaypoint.location?.lng ? { lat: newWaypoint.location.lat, lng: newWaypoint.location.lng } : null}
                                                initialCenter={eventCenter || undefined}
                                                searchHint={eventAddress || eventName}
                                                onLocationChange={handleLocationChange}
                                            />
                                        </div>

                                        <div className="waypoint-form-actions">
                                            <button type="button" className="btn btn-outline btn-sm" onClick={cancelWaypointForm}>Hủy</button>
                                            <button type="button" className="btn btn-primary btn-sm" onClick={saveWaypoint}>Lưu địa điểm</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        type="button" 
                                        className="btn btn-outline btn-sm add-waypoint-btn"
                                        onClick={() => openWaypointForm(day.day)}
                                    >
                                        <Plus size={16} style={{ marginRight: '0.5rem' }} /> Thêm địa điểm / Hoạt động
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={handleAddDay}
                        style={{ alignSelf: 'center', marginTop: '1rem', padding: '0.75rem 2rem' }}
                    >
                        <Plus size={18} style={{ marginRight: '0.5rem' }} /> Thêm Ngày Mới
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        style={{ padding: '0.75rem 2.5rem', fontSize: '1.1rem' }}
                    >
                        {isSubmitting ? 'Đang lưu...' : (
                            <>
                                <PaperPlaneRight size={20} style={{ marginRight: '0.5rem' }} /> Đăng lộ trình
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateRoadmapPage;
