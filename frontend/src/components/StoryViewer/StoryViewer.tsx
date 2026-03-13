import React, { useState, useEffect, useRef } from 'react';
import type { VibeSnap } from '../../types';
import { X, PauseCircle, MapPin } from '@phosphor-icons/react';
import './StoryViewer.css';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface StoryViewerProps {
    snaps: VibeSnap[];
    initialIndex?: number;
    onClose: () => void;
}

const VIEW_DURATION_MS = 10000; // 10 seconds per image snap

const StoryViewer: React.FC<StoryViewerProps> = ({ snaps, initialIndex = 0, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(Date.now());
    const pausedTimeRef = useRef<number>(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    const currentSnap = snaps[currentIndex];

    // Handle moving to next or previous snap
    const goToNext = () => {
        if (currentIndex < snaps.length - 1) {
            setCurrentIndex(prev => prev + 1);
            resetProgress();
        } else {
            onClose(); // Close if it's the last snap
        }
    };

    const goToPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            resetProgress();
        }
    };

    const resetProgress = () => {
        setProgress(0);
        startTimeRef.current = Date.now();
        pausedTimeRef.current = 0;
        setIsPaused(false);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        startProgress();
    };

    const startProgress = () => {
        if (currentSnap?.type === 'video') {
            // Video progress is handled by the video's timeupdate event
            return;
        }

        progressIntervalRef.current = setInterval(() => {
            if (isPaused) return;

            const now = Date.now();
            const elapsed = (now - startTimeRef.current) - pausedTimeRef.current;
            const newProgress = (elapsed / VIEW_DURATION_MS) * 100;

            if (newProgress >= 100) {
                if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                goToNext();
            } else {
                setProgress(newProgress);
            }
        }, 50);
    };

    // Pause/Resume interactions
    const handleTouchStart = () => {
        setIsPaused(true);
        if (videoRef.current) videoRef.current.pause();
    };

    const handleTouchEnd = () => {
        setIsPaused(false);
        // Adjust start time to account for paused duration
        // Actually, we keep start time but accumulate paused time. 
        // For simplicity now, just let it resume.
        if (videoRef.current) videoRef.current.play();
    };

    // Update video progress
    const handleVideoTimeUpdate = () => {
        if (videoRef.current) {
            const { currentTime, duration } = videoRef.current;
            if (duration) {
                setProgress((currentTime / duration) * 100);
            }
        }
    };

    const handleVideoEnded = () => {
        goToNext();
    };

    // Click navigation (left 30% for prev, right 70% for next)
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const { clientX } = e;
        const { innerWidth } = window;
        if (clientX < innerWidth * 0.3) {
            goToPrev();
        } else {
            goToNext();
        }
    };

    // Lifecycle
    useEffect(() => {
        resetProgress();
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps


    if (!currentSnap) return null;
    // Check if created_at is in seconds (10 digits) or ms (13 digits)
    const createdAtMs = currentSnap.created_at < 10000000000 ? currentSnap.created_at * 1000 : currentSnap.created_at;
    const timeAgo = formatDistanceToNow(new Date(createdAtMs), { addSuffix: true, locale: vi });

    return (
        <div className="story-viewer-overlay">
            <div className="story-viewer-container" 
                 onMouseDown={handleTouchStart} 
                 onMouseUp={handleTouchEnd}
                 onMouseLeave={handleTouchEnd}
                 onTouchStart={handleTouchStart}
                 onTouchEnd={handleTouchEnd}
                 onClick={handleClick}
            >
                {/* Progress Bars */}
                <div className="story-progress-container">
                    {snaps.map((_, i) => (
                        <div key={i} className="story-progress-bar-bg">
                            <div 
                                className="story-progress-bar-fill"
                                style={{
                                    width: i === currentIndex ? `${progress}%` : i < currentIndex ? '100%' : '0%'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header Information */}
                <div className="story-header" onClick={(e) => e.stopPropagation()}>
                    <div className="story-user-info">
                        <img 
                            src={currentSnap.user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentSnap.user.username}`} 
                            alt={currentSnap.user.username} 
                            className="story-avatar" 
                        />
                        <div className="story-text-info">
                            <div className="story-username">{currentSnap.user.full_name || currentSnap.user.username}</div>
                            <div className="story-meta">
                                <span>{timeAgo}</span>
                                {currentSnap.event_id && (
                                    <>
                                        <span className="story-dot">•</span>
                                        <MapPin size={12} weight="fill" />
                                        <span>Tại sự kiện</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        type="button"
                        className="story-close-btn" 
                        onClick={(e) => { 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            onClose(); 
                        }}
                        onTouchEnd={(e) => { 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            onClose(); 
                        }}
                    >
                        <X size={24} weight="bold" />
                    </button>
                </div>

                {/* Content */}
                <div className="story-content">
                    {currentSnap.type === 'video' ? (
                        <video
                            ref={videoRef}
                            src={currentSnap.media_url}
                            autoPlay
                            playsInline
                            webkit-playsinline="true"
                            muted // Start muted for autoplay polish in browsers
                            onTimeUpdate={handleVideoTimeUpdate}
                            onEnded={handleVideoEnded}
                            className="story-media"
                        />
                    ) : (
                        <img src={currentSnap.media_url} alt="Vibe Snap" className="story-media" />
                    )}
                </div>

                {/* Paused Indicator Overlay */}
                {isPaused && (
                    <div className="story-paused-overlay">
                        {currentSnap.type === 'video' ? <PauseCircle size={48} weight="fill" /> : <PauseCircle size={48} weight="fill" />}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryViewer;
