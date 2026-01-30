import React, { useState, useRef, useEffect } from 'react';
import { Image, MapPin, X, PaperPlaneTilt, Ticket } from '@phosphor-icons/react';
import { useAuth } from '../hooks/useAuth';
import { postApi, eventApi, uploadApi } from '../api/endpoints';
import type { Post, PostCreateRequest, MediaItem, Event } from '../types';
import './CreatePostForm.css';

interface CreatePostFormProps {
    onPostCreated?: (post: Post) => void;
}

interface LocalMediaItem extends MediaItem {
    file?: File;
}

const CreatePostForm: React.FC<CreatePostFormProps> = ({ onPostCreated }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [media, setMedia] = useState<LocalMediaItem[]>([]);
    const [location, setLocation] = useState<{ city?: string; province?: string } | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [checkinEvent, setCheckinEvent] = useState<Event | null>(null);
    const [showCheckinSearch, setShowCheckinSearch] = useState(false);
    const [eventQuery, setEventQuery] = useState('');
    const [foundEvents, setFoundEvents] = useState<Event[]>([]);
    const [isSearchingEvents, setIsSearchingEvents] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Click outside to collapse if empty
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (formRef.current && !formRef.current.contains(event.target as Node)) {
                if (!content.trim() && media.length === 0 && tags.length === 0 && !location) {
                    setIsExpanded(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [content, media, tags, location]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content]);

    // Search events effect
    useEffect(() => {
        if (showCheckinSearch) {
            const searchEvents = async () => {
                setIsSearchingEvents(true);
                try {
                    const response = await eventApi.search({ q: eventQuery, limit: 5 });
                    if (response.data.data) {
                        setFoundEvents(response.data.data);
                    }
                } catch (error) {
                    console.error("Error searching events", error);
                } finally {
                    setIsSearchingEvents(false);
                }
            };

            const timeoutId = setTimeout(searchEvents, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [showCheckinSearch, eventQuery]);

    const handleSubmit = async () => {
        if (!content.trim() && media.length === 0) return;
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            // Upload files first
            const uploadedMedia: MediaItem[] = [];
            const filesToUpload: File[] = [];
            const fileIndices: number[] = [];

            // Separate already uploaded (if any logic changed) vs new files
            // Currently all are new files in this form
            for (let i = 0; i < media.length; i++) {
                if (media[i].file) {
                    filesToUpload.push(media[i].file!);
                    fileIndices.push(i);
                } else {
                    uploadedMedia.push({ url: media[i].url, type: media[i].type });
                }
            }

            if (filesToUpload.length > 0) {
                const uploadResponse = await uploadApi.uploadMultipleFiles(filesToUpload);
                if (uploadResponse.data.data) {
                    uploadResponse.data.data.forEach(fileData => {
                        // Determine type based on mimetype or filename extension logic from backend
                        // Backend returns filename and content_type
                        const type = fileData.content_type.startsWith('video') ? 'video' : 'image';
                        uploadedMedia.push({
                            url: fileData.url, // This is the persistent URL
                            type: type
                        });
                    });
                }
            }

            const postData: PostCreateRequest = {
                content: content.trim(),
                media: uploadedMedia,
                tags,
                visibility: 'public',
            };

            if (location) {
                postData.location = location;
            }

            if (checkinEvent) {
                postData.event_id = checkinEvent.id;
            }

            const response = await postApi.create(postData);
            if (response.data.data && onPostCreated) {
                onPostCreated(response.data.data);
            }

            // Reset form
            setContent('');
            setMedia([]);
            setLocation(null);
            setTags([]);
            setCheckinEvent(null);
            setShowCheckinSearch(false);
            setIsExpanded(false);
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        } catch (error) {
            console.error('Failed to create post:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tag = tagInput.trim().replace(/^#/, '');
            if (tag && !tags.includes(tag) && tags.length < 5) {
                setTags([...tags, tag]);
                setTagInput('');
            }
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newMedia: LocalMediaItem[] = [];
        for (let i = 0; i < files.length && media.length + newMedia.length < 4; i++) {
            const file = files[i];
            const url = URL.createObjectURL(file); // Preview URL
            newMedia.push({
                url,
                type: file.type.startsWith('video') ? 'video' : 'image',
                file
            });
        }
        setMedia(prev => [...prev, ...newMedia]);
        setIsExpanded(true);
        // Clear value to allow re-uploading same file if needed
        e.target.value = '';
    };

    const removeMedia = (index: number) => {
        setMedia(prev => prev.filter((_, i) => i !== index));
    };

    const handleFocus = () => {
        setIsExpanded(true);
    };

    return (
        <div className="create-post-form" ref={formRef}>
            <div className="create-post-main">
                {/* Avatar */}
                <div className="create-post-avatar">
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} />
                    ) : (
                        <span>{user?.full_name?.[0] || user?.username?.[0] || 'U'}</span>
                    )}
                </div>

                {/* Content Area */}
                <div className="create-post-content">
                    {/* Author Info */}
                    <div className="create-post-author">
                        <span className="author-name">{user?.full_name || user?.username}</span>
                    </div>

                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onFocus={handleFocus}
                        placeholder="Bạn đang nghĩ gì?"
                        className="create-post-textarea"
                        rows={1}
                    />

                    {/* Tags Display */}
                    {tags.length > 0 && (
                        <div className="create-post-tags">
                            {tags.map((tag, index) => (
                                <span key={index} className="create-post-tag">
                                    #{tag}
                                    <button onClick={() => removeTag(tag)}>
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Media Preview */}
                    {media.length > 0 && (
                        <div className="create-post-media-preview">
                            {media.map((item, index) => (
                                <div key={index} className="media-preview-item">
                                    <img src={item.url} alt="" />
                                    <button
                                        className="media-remove-btn"
                                        onClick={() => removeMedia(index)}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Location display */}
                    {location && (
                        <div className="create-post-location">
                            <MapPin size={16} />
                            <span>{[location.city, location.province].filter(Boolean).join(', ')}</span>
                            <button onClick={() => setLocation(null)}>
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {/* Check-in display */}
                    {checkinEvent && (
                        <div className="checkin-tag">
                            <Ticket size={16} />
                            <span>Check-in: {checkinEvent.name}</span>
                            <button onClick={() => setCheckinEvent(null)}>
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {/* Actions Row */}
                    <div className="create-post-actions">
                        <div className="create-post-tools">
                            <label className="tool-btn" title="Thêm ảnh/video">
                                <Image size={20} />
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    hidden
                                />
                            </label>
                            <button
                                className="tool-btn"
                                title="Thêm vị trí"
                                onClick={() => setLocation({ city: 'Đà Lạt', province: 'Lâm Đồng' })}
                            >
                                <MapPin size={20} />
                            </button>

                            <div style={{ position: 'relative' }}>
                                <button
                                    className={`tool-btn ${showCheckinSearch ? 'active' : ''}`}
                                    title="Check-in sự kiện"
                                    onClick={() => setShowCheckinSearch(!showCheckinSearch)}
                                >
                                    <Ticket size={20} />
                                </button>

                                {showCheckinSearch && (
                                    <div className="checkin-dropdown">
                                        <input
                                            type="text"
                                            value={eventQuery}
                                            onChange={(e) => setEventQuery(e.target.value)}
                                            placeholder="Tìm sự kiện..."
                                            autoFocus
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                border: 'none',
                                                borderBottom: '1px solid #eee',
                                                outline: 'none'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        {isSearchingEvents ? (
                                            <div className="loading-dots">Đang tìm...</div>
                                        ) : (
                                            foundEvents.map(event => (
                                                <div
                                                    key={event.id}
                                                    className="checkin-item"
                                                    onClick={() => {
                                                        setCheckinEvent(event);
                                                        setShowCheckinSearch(false);
                                                    }}
                                                >
                                                    {event.media && event.media.length > 0 && (
                                                        <img src={event.media[0].url} alt="" />
                                                    )}
                                                    <div className="checkin-item-info">
                                                        <div className="checkin-item-name">{event.name}</div>
                                                        <div className="checkin-item-date">{event.time?.next_occurrence || event.time?.lunar}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {!isSearchingEvents && foundEvents.length === 0 && (
                                            <div className="loading-dots">Không tìm thấy sự kiện</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="create-post-tag-input">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    placeholder="# Thêm hashtag"
                                    maxLength={20}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    className="create-post-submit"
                    onClick={handleSubmit}
                    disabled={!content.trim() || isSubmitting}
                >
                    <PaperPlaneTilt size={20} weight="fill" />
                </button>
            </div>
        </div>
    );
};

export default CreatePostForm;
