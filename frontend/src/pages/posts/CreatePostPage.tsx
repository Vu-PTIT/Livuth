import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreatePostForm from '../../components/CreatePostForm';
import { ArrowLeft } from '@phosphor-icons/react';
import './CreatePostPage.css';

const CreatePostPage: React.FC = () => {
    const navigate = useNavigate();

    const handlePostCreated = () => {
        // Navigate back to home or feed after creating post
        navigate('/');
    };

    return (
        <div className="create-post-page">
            <div className="container">
                <div className="create-post-header">
                    <button
                        className="back-button"
                        onClick={() => navigate(-1)}
                        aria-label="Quay lại"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1>Tạo bài viết mới</h1>
                </div>

                <div className="create-post-content">
                    <CreatePostForm onPostCreated={handlePostCreated} />
                </div>
            </div>
        </div>
    );
};

export default CreatePostPage;
