import React, { useRef, useState } from 'react';
import { Camera, Spinner } from '@phosphor-icons/react';
import { useToast } from '../Toast';
import './CameraCapture.css';

interface CameraCaptureProps {
    onCaptureComplete: (file: File) => Promise<void> | void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCaptureComplete }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const toast = useToast();

    const handleCameraClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        try {
            // Check file size (e.g., max 50MB for video, 10MB for image)
            const isVideo = file.type.startsWith('video/');
            const maxSize = (isVideo ? 50 : 10) * 1024 * 1024;
            
            if (file.size > maxSize) {
                toast.error(`Kích thước file quá lớn. Tối đa ${isVideo ? '50MB' : '10MB'}.`);
                return;
            }

            await onCaptureComplete(file);
            toast.success('Đã chia sẻ Vibe Snap của bạn!');

        } catch (error) {
            console.error('Error capturing snap:', error);
            toast.error('Không thể chia sẻ Vibe Snap. Vui lòng thử lại.');
        } finally {
            setIsUploading(false);
            // Reset input so the same file can be selected again
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="camera-capture-container">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment" /* Prefer back camera on mobile */
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            
            <button 
                type="button"
                className={`camera-fab ${isUploading ? 'uploading' : ''}`}
                onClick={handleCameraClick}
                disabled={isUploading}
                aria-label="Capture Vibe Snap"
            >
                {isUploading ? (
                    <Spinner size={32} className="camera-spinner" />
                ) : (
                    <div className="camera-icon-wrapper">
                        <Camera size={32} weight="fill" />
                    </div>
                )}
            </button>
        </div>
    );
};

export default CameraCapture;
