import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { chatApi } from '../../api/endpoints';
import type { ChatConversation, ChatMessage, ChatHistory } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
    Plus,
    Trash,
    PaperPlaneRight,
    ChatCircle,
    Robot,
    User,
    List,
} from '@phosphor-icons/react';
import './ChatPage.css';

const ChatPage: React.FC = () => {
    useAuth(); // Just for auth check
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (activeConversationId) {
            fetchMessages(activeConversationId);
        }
    }, [activeConversationId]);

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const prevMessagesLength = useRef<number>(0);

    useEffect(() => {
        // Only scroll if new messages were added (not on initial load or clear)
        if (messages.length > prevMessagesLength.current && prevMessagesLength.current > 0) {
            scrollToBottom();
        }
        prevMessagesLength.current = messages.length;
    }, [messages]);

    const scrollToBottom = () => {
        // Scroll within the messages container only
        if (messagesContainerRef.current) {
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            }, 100);
        }
    };

    const fetchConversations = async () => {
        try {
            const response = await chatApi.getConversations();
            const allConvs = response.data.data || [];

            // Filter conversations created after login timestamp
            const loginTimestamp = parseFloat(localStorage.getItem('login_timestamp') || '0');
            const convs = allConvs.filter(conv => conv.created_at >= loginTimestamp);

            setConversations(convs);

            // Auto-select first conversation or create new one
            if (convs.length > 0) {
                setActiveConversationId(convs[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setIsLoadingConversations(false);
        }
    };

    const fetchMessages = async (conversationId: string) => {
        setIsLoadingMessages(true);
        try {
            const response = await chatApi.getConversationHistory(conversationId);
            const history = response.data.data as ChatHistory;
            setMessages(history.messages || []);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            setMessages([]);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleCreateConversation = async () => {
        setIsCreating(true);
        try {
            const response = await chatApi.createConversation('Cuộc trò chuyện mới');
            const newConv = response.data.data as ChatConversation;
            setConversations((prev) => [newConv, ...prev]);
            setActiveConversationId(newConv.id);
            setMessages([]);
        } catch (error) {
            console.error('Failed to create conversation:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteConversation = async (conversationId: string) => {
        try {
            await chatApi.deleteConversation(conversationId);
            setConversations((prev) => prev.filter((c) => c.id !== conversationId));

            if (activeConversationId === conversationId) {
                const remaining = conversations.filter((c) => c.id !== conversationId);
                if (remaining.length > 0) {
                    setActiveConversationId(remaining[0].id);
                } else {
                    setActiveConversationId(null);
                    setMessages([]);
                }
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newMessage.trim() || !activeConversationId || isSending) return;

        const content = newMessage.trim();
        setNewMessage('');
        setIsSending(true);

        // Optimistically add user message
        const tempUserMessage: ChatMessage = {
            id: `temp-${Date.now()}`,
            conversation_id: activeConversationId,
            role: 'user',
            content,
            created_at: Date.now() / 1000,
        };
        setMessages((prev) => [...prev, tempUserMessage]);

        try {
            const response = await chatApi.sendMessage(activeConversationId, content);
            const aiMessage = response.data.data as ChatMessage;

            // Update messages with actual response
            setMessages((prev) => [
                ...prev.filter((m) => m.id !== tempUserMessage.id),
                { ...tempUserMessage, id: `user-${Date.now()}` },
                aiMessage,
            ]);
        } catch (error) {
            console.error('Failed to send message:', error);
            // Remove temp message on error
            setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoadingConversations) {
        return (
            <div className="loading-container">
                <LoadingSpinner text="Đang tải..." />
            </div>
        );
    }

    return (
        <div className="chat-page container">
            <div className="chat-layout">
                {/* Mobile Sidebar Toggle */}
                <button
                    className="mobile-sidebar-toggle"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    <List size={24} />
                </button>

                {/* Sidebar Overlay */}
                {isSidebarOpen && (
                    <div
                        className="sidebar-overlay"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                    <div className="sidebar-header">
                        <h2>Trợ lý AI</h2>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handleCreateConversation}
                            disabled={isCreating}
                        >
                            <Plus size={18} />
                            {isCreating ? 'Đang tạo...' : 'Mới'}
                        </button>
                    </div>

                    <div className="conversations-list">
                        {conversations.length > 0 ? (
                            conversations.map((conv) => (
                                <div
                                    key={conv.id}
                                    className={`conversation-item ${activeConversationId === conv.id ? 'active' : ''}`}
                                    onClick={() => setActiveConversationId(conv.id)}
                                >
                                    <ChatCircle size={20} />
                                    <div className="conversation-info">
                                        <span className="conversation-title">{conv.title}</span>
                                        <span className="conversation-date">
                                            {new Date(conv.updated_at * 1000).toLocaleDateString('vi-VN')}
                                        </span>
                                    </div>
                                    <button
                                        className="delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteConversation(conv.id);
                                        }}
                                        title="Xóa"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="no-conversations">
                                <p>Chưa có cuộc trò chuyện nào</p>
                                <button className="btn btn-primary" onClick={handleCreateConversation}>
                                    <Plus size={18} />
                                    Bắt đầu trò chuyện
                                </button>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Chat Area */}
                <main className="chat-main">
                    {activeConversationId ? (
                        <>
                            <div className="messages-container" ref={messagesContainerRef}>
                                {isLoadingMessages ? (
                                    <div className="loading-messages">
                                        <LoadingSpinner size="small" />
                                    </div>
                                ) : messages.length > 0 ? (
                                    <div className="messages-list">
                                        {messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`message ${message.role}`}
                                            >
                                                <div className="message-avatar">
                                                    {message.role === 'user' ? (
                                                        <User size={20} />
                                                    ) : (
                                                        <Robot size={20} />
                                                    )}
                                                </div>
                                                <div className="message-content">
                                                    <div className="message-bubble">
                                                        <p>{message.content}</p>
                                                    </div>
                                                    <span className="message-time">
                                                        {formatTime(message.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {isSending && (
                                            <div className="message assistant typing">
                                                <div className="message-avatar">
                                                    <Robot size={20} />
                                                </div>
                                                <div className="message-content">
                                                    <div className="message-bubble">
                                                        <div className="typing-indicator">
                                                            <span></span>
                                                            <span></span>
                                                            <span></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                ) : (
                                    <div className="empty-messages">
                                        <Robot size={48} />
                                        <h3>Xin chào! 👋</h3>
                                        <p>Tôi là trợ lý AI của p-INNO. Hãy hỏi tôi bất cứ điều gì về lễ hội và văn hóa Việt Nam!</p>
                                    </div>
                                )}
                            </div>

                            <form className="message-input" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    placeholder="Nhập tin nhắn..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    disabled={isSending}
                                />
                                <button
                                    type="submit"
                                    className="send-btn"
                                    disabled={!newMessage.trim() || isSending}
                                >
                                    <PaperPlaneRight size={22} weight="fill" />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="no-active-chat">
                            <ChatCircle size={60} />
                            <h3>Chọn một cuộc trò chuyện</h3>
                            <p>hoặc bắt đầu cuộc trò chuyện mới</p>
                            <button className="btn btn-primary" onClick={handleCreateConversation}>
                                <Plus size={18} />
                                Cuộc trò chuyện mới
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ChatPage;
