import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { chatApi } from '../../api/endpoints';
import type { ChatConversation, ChatMessage, ChatHistory } from '../../types';
import LoadingSpinner from '../LoadingSpinner';
import {
    Plus,
    Trash,
    PaperPlaneRight,
    ChatCircleDots,
    Robot,
    List,
    X,
    CaretLeft
} from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './FloatingChatWidget.css';

const FloatingChatWidget: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const prevMessagesLength = useRef<number>(0);

    const [hasFetched, setHasFetched] = useState(false);

    useEffect(() => {
        if (isOpen && !hasFetched) {
            fetchConversations();
            setHasFetched(true);
        }
    }, [isOpen, hasFetched]);

    useEffect(() => {
        if (activeConversationId && isOpen) {
            fetchMessages(activeConversationId);
            setShowSidebar(false);
        }
    }, [activeConversationId, isOpen]);

    useEffect(() => {
        if (messages.length > prevMessagesLength.current && prevMessagesLength.current > 0) {
            scrollToBottom();
        }
        prevMessagesLength.current = messages.length;
    }, [messages]);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            }, 100);
        }
    };

    const fetchConversations = async () => {
        setIsLoadingConversations(true);
        try {
            const response = await chatApi.getConversations();
            const allConvs = response.data.data || [];
            const loginTimestamp = parseFloat(localStorage.getItem('login_timestamp') || '0');
            const convs = allConvs.filter(conv => conv.created_at >= loginTimestamp);
            setConversations(convs);

            if (convs.length > 0) {
                setActiveConversationId(convs[0].id);
            } else {
                handleCreateConversation();
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
            setTimeout(scrollToBottom, 200);
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
            setShowSidebar(false);
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

        const tempUserMessage: ChatMessage = {
            id: `temp-${Date.now()}`,
            conversation_id: activeConversationId,
            role: 'user',
            content,
            created_at: Date.now() / 1000,
        };
        setMessages((prev) => [...prev, tempUserMessage]);
        setTimeout(scrollToBottom, 50);

        try {
            const response = await chatApi.sendMessage(activeConversationId, content);
            const aiMessage = response.data.data as ChatMessage;

            setMessages((prev) => [
                ...prev.filter((m) => m.id !== tempUserMessage.id),
                { ...tempUserMessage, id: `user-${Date.now()}` },
                aiMessage,
            ]);
            setTimeout(scrollToBottom, 50);
        } catch (error) {
            console.error('Failed to send message:', error);
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

    const suggestedQuestions = [
        "Lễ hội Chùa Hương diễn ra khi nào?",
        "Lễ hội Đền Hùng đặc sắc ra sao?",
        "Nên đi lịch trình thế nào khi đến Hội An?"
    ];

    if (!isAuthenticated) return null;

    return (
        <div className={`floating-chat-container ${isOpen ? 'open' : ''}`}>
            {/* Toggle Button */}
            <button 
                className="floating-chat-toggle"
                onClick={() => setIsOpen(!isOpen)}
                title="Trợ lý AI"
            >
                {isOpen ? <X size={28} weight="bold" /> : <ChatCircleDots size={32} weight="fill" />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="floating-chat-window">
                    <div className="fc-header">
                        {!showSidebar && (
                            <button className="fc-icon-btn" onClick={() => setShowSidebar(true)}>
                                <List size={22} />
                            </button>
                        )}
                        {showSidebar && (
                            <button className="fc-icon-btn" onClick={() => setShowSidebar(false)}>
                                <CaretLeft size={22} />
                            </button>
                        )}
                        <h3 className="fc-title">{showSidebar ? 'Lịch sử' : 'Trợ lý AI'}</h3>
                        <div style={{ width: 34 }}></div> {/* Balance title centering */}
                    </div>

                    <div className="fc-body">
                        {showSidebar ? (
                            <div className="fc-sidebar">
                                <div className="fc-sidebar-header">
                                    <button
                                        className="btn btn-primary btn-sm fc-new-chat-btn"
                                        onClick={handleCreateConversation}
                                        disabled={isCreating}
                                    >
                                        <Plus size={16} />
                                        {isCreating ? 'Đang tạo...' : 'Cuộc trò chuyện mới'}
                                    </button>
                                </div>
                                <div className="fc-conversations">
                                    {isLoadingConversations ? (
                                        <div className="fc-loading">
                                            <LoadingSpinner size="small" />
                                        </div>
                                    ) : conversations.length > 0 ? (
                                        conversations.map((conv) => (
                                            <div
                                                key={conv.id}
                                                className={`fc-conversation-item ${activeConversationId === conv.id ? 'active' : ''}`}
                                                onClick={() => setActiveConversationId(conv.id)}
                                            >
                                                <div className="fc-conv-info">
                                                    <span className="fc-conv-title">{conv.title}</span>
                                                    <span className="fc-conv-date">
                                                        {new Date(conv.updated_at * 1000).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </div>
                                                <button
                                                    className="fc-conv-delete"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteConversation(conv.id);
                                                    }}
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="fc-no-conversations">
                                            <p>Chưa có cuộc trò chuyện nào</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="fc-chat-area">
                                {isLoadingConversations ? (
                                    <div className="fc-loading">
                                        <LoadingSpinner size="small" />
                                    </div>
                                ) : activeConversationId ? (
                                    <>
                                        <div className="fc-messages" ref={messagesContainerRef}>
                                            {isLoadingMessages ? (
                                                <div className="fc-loading">
                                                    <LoadingSpinner size="small" />
                                                </div>
                                            ) : messages.length > 0 ? (
                                                <div className="fc-messages-list">
                                                    {messages.map((message) => (
                                                        <div key={message.id} className={`fc-message ${message.role}`}>
                                                            {message.role === 'assistant' && (
                                                                <div className="fc-avatar bot">
                                                                    <Robot size={18} />
                                                                </div>
                                                            )}
                                                            <div className="fc-message-content">
                                                                <div className="fc-bubble markdown-body">
                                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                        {message.content}
                                                                    </ReactMarkdown>
                                                                </div>
                                                                <span className="fc-time">{formatTime(message.created_at)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {isSending && (
                                                        <div className="fc-message assistant">
                                                            <div className="fc-avatar bot">
                                                                <Robot size={18} />
                                                            </div>
                                                            <div className="fc-message-content">
                                                                <div className="fc-bubble">
                                                                    <div className="fc-typing">
                                                                        <span></span><span></span><span></span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div ref={messagesEndRef} />
                                                </div>
                                            ) : (
                                                <div className="fc-empty">
                                                    <Robot size={40} />
                                                    <h4>Xin chào! 👋</h4>
                                                    <p>Tôi là trợ lý AI Ganvo. Hỏi tôi bất cứ điều gì!</p>
                                                    <div className="fc-suggestions">
                                                        {suggestedQuestions.map((q, idx) => (
                                                            <button 
                                                                key={idx} 
                                                                className="fc-suggestion-chip"
                                                                onClick={() => setNewMessage(q)}
                                                                disabled={isSending}
                                                            >
                                                                {q}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <form className="fc-input-area" onSubmit={handleSendMessage}>
                                            <input
                                                type="text"
                                                placeholder="Nhập tin nhắn..."
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                disabled={isSending}
                                            />
                                            <button
                                                type="submit"
                                                className="fc-send-btn"
                                                disabled={!newMessage.trim() || isSending}
                                            >
                                                <PaperPlaneRight size={20} weight="fill" />
                                            </button>
                                        </form>
                                    </>
                                ) : (
                                    <div className="fc-empty">
                                        <p>Đang tải...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FloatingChatWidget;
