import apiClient from './client';
import type {
    User,
    Event,
    TourProviderListing,
    ChatConversation,
    ChatMessage,
    ChatHistory,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    EventCreateRequest,
    TourProviderCreateRequest,
    RoleUpgradeRequest,
    ApiResponse,
    Review,
    ReviewCreateRequest,
    EventReviewsResponse,
    Post,
    PostCreateRequest,
    PostListResponse,
    Comment,
    CommentCreateRequest,
    CommentListResponse,
} from '../types';

// ============ AUTH API ============
export const authApi = {
    login: (data: LoginRequest) =>
        apiClient.post<ApiResponse<TokenResponse>>('/auth/login', data),

    loginGoogle: (data: import('../types').GoogleLoginRequest) =>
        apiClient.post<ApiResponse<TokenResponse>>('/auth/google', data),

    loginFacebook: (data: import('../types').FacebookLoginRequest) =>
        apiClient.post<ApiResponse<TokenResponse>>('/auth/facebook', data),

    register: (data: RegisterRequest) =>
        apiClient.post<ApiResponse<User>>('/auth/register', data),

    refresh: (refresh_token: string) =>
        apiClient.post<ApiResponse<TokenResponse>>('/auth/refresh', { refresh_token }),

    getMe: () =>
        apiClient.get<ApiResponse<User>>('/auth/me'),
};

// ============ USER API ============
export const userApi = {
    getAll: () =>
        apiClient.get<ApiResponse<User[]>>('/users/all'),

    getById: (userId: string) =>
        apiClient.get<ApiResponse<User>>(`/users/${userId}`),

    update: (userId: string, data: Partial<User>) =>
        apiClient.put<ApiResponse<User>>(`/users/${userId}`, data),

    updateMe: (data: Partial<User>) =>
        apiClient.put<ApiResponse<User>>('/users/me/profile', data),

    delete: (userId: string) =>
        apiClient.delete(`/users/${userId}`),

    addHobby: (userId: string, hobby: string) =>
        apiClient.post<ApiResponse<User>>(`/users/${userId}/hobbies?hobby=${encodeURIComponent(hobby)}`),

    removeHobby: (userId: string, hobby: string) =>
        apiClient.delete<ApiResponse<User>>(`/users/${userId}/hobbies/${encodeURIComponent(hobby)}`),

    addParticipatedEvent: (userId: string, eventId: string) =>
        apiClient.post<ApiResponse<User>>(`/users/${userId}/events/${eventId}`),

    removeParticipatedEvent: (userId: string, eventId: string) =>
        apiClient.delete<ApiResponse<User>>(`/users/${userId}/events/${eventId}`),

    requestUpgrade: (data: RoleUpgradeRequest) =>
        apiClient.post<ApiResponse<User>>('/users/me/request-upgrade', data),

    getPendingUpgrades: () =>
        apiClient.get<ApiResponse<User[]>>('/users/admin/pending-upgrades'),

    approveUpgrade: (userId: string) =>
        apiClient.patch<ApiResponse<User>>(`/users/admin/${userId}/approve-upgrade`),

    rejectUpgrade: (userId: string, reason: string) =>
        apiClient.patch<ApiResponse<User>>(`/users/admin/${userId}/reject-upgrade?reason=${encodeURIComponent(reason)}`),

    // Social Graph
    follow: (userId: string) =>
        apiClient.post<ApiResponse<{ success: boolean }>>(`/users/${userId}/follow`),

    unfollow: (userId: string) =>
        apiClient.delete<ApiResponse<{ success: boolean }>>(`/users/${userId}/follow`),

    getFollowers: (userId: string, page: number = 1, pageSize: number = 20) =>
        apiClient.get<ApiResponse<User[]>>(`/users/${userId}/followers`, { params: { page, page_size: pageSize } }),

    getFollowing: (userId: string, page: number = 1, pageSize: number = 20) =>
        apiClient.get<ApiResponse<User[]>>(`/users/${userId}/following`, { params: { page, page_size: pageSize } }),

    checkIsFollowing: (userId: string) =>
        apiClient.get<ApiResponse<{ is_following: boolean }>>(`/users/${userId}/is-following`),
};

// ============ EVENT API ============
export const eventApi = {
    getAll: (limit?: number) =>
        apiClient.get<ApiResponse<Event[]>>('/events/all', { params: { limit } }),

    getById: (eventId: string, includeTours: boolean = true) =>
        apiClient.get<ApiResponse<Event>>(`/events/${eventId}`, { params: { include_tours: includeTours } }),

    search: (params: {
        q?: string;
        city?: string;
        province?: string;
        categories?: string;
        limit?: number;
    }) =>
        apiClient.get<ApiResponse<Event[]>>('/events/search', { params }),

    getByCategory: (category: string) =>
        apiClient.get<ApiResponse<Event[]>>(`/events/category/${encodeURIComponent(category)}`),

    getRecommendations: (userId: string, limit: number = 10) =>
        apiClient.get<ApiResponse<Event[]>>(`/events/recommendations/${userId}`, { params: { limit } }),

    getNearby: (lat: number, lng: number, radiusKm: number = 10, limit: number = 20) =>
        apiClient.get<ApiResponse<Event[]>>('/events/nearby', {
            params: { lat, lng, radius_km: radiusKm, limit },
        }),

    create: (data: EventCreateRequest) =>
        apiClient.post<ApiResponse<Event>>('/events', data),

    update: (eventId: string, data: Partial<EventCreateRequest>) =>
        apiClient.put<ApiResponse<Event>>(`/events/${eventId}`, data),

    delete: (eventId: string) =>
        apiClient.delete(`/events/${eventId}`),

    toggleVisibility: (eventId: string, isVisible: boolean) =>
        apiClient.patch<ApiResponse<Event>>(`/events/${eventId}/visibility?is_visible=${isVisible}`),

    getMyEvents: () =>
        apiClient.get<ApiResponse<Event[]>>('/events/my/events'),
};

// ============ TOUR PROVIDER API ============
export const tourProviderApi = {
    getByEvent: (eventId: string) =>
        apiClient.get<ApiResponse<TourProviderListing[]>>(`/tour-providers/event/${eventId}`),

    getById: (listingId: string) =>
        apiClient.get<ApiResponse<TourProviderListing>>(`/tour-providers/${listingId}`),

    search: (params: { q?: string; event_id?: string; limit?: number }) =>
        apiClient.get<ApiResponse<TourProviderListing[]>>('/tour-providers/search', { params }),

    getMyListings: () =>
        apiClient.get<ApiResponse<TourProviderListing[]>>('/tour-providers/my-listings'),

    create: (data: TourProviderCreateRequest) =>
        apiClient.post<ApiResponse<TourProviderListing>>('/tour-providers', data),

    update: (listingId: string, data: Partial<TourProviderCreateRequest>) =>
        apiClient.put<ApiResponse<TourProviderListing>>(`/tour-providers/${listingId}`, data),

    delete: (listingId: string) =>
        apiClient.delete(`/tour-providers/${listingId}`),

    // Admin endpoints
    getPending: () =>
        apiClient.get<ApiResponse<TourProviderListing[]>>('/tour-providers/admin/pending'),

    getAll: (status?: string) =>
        apiClient.get<ApiResponse<TourProviderListing[]>>('/tour-providers/admin/all', {
            params: { status_filter: status },
        }),

    approve: (listingId: string) =>
        apiClient.patch<ApiResponse<TourProviderListing>>(`/tour-providers/${listingId}/approve`),

    reject: (listingId: string, reason: string) =>
        apiClient.patch<ApiResponse<TourProviderListing>>(
            `/tour-providers/${listingId}/reject?reason=${encodeURIComponent(reason)}`
        ),

    verify: (listingId: string) =>
        apiClient.patch<ApiResponse<TourProviderListing>>(`/tour-providers/${listingId}/verify`),

    toggleVisibility: (listingId: string, isVisible: boolean) =>
        apiClient.patch<ApiResponse<TourProviderListing>>(`/tour-providers/${listingId}/visibility?is_visible=${isVisible}`),
};

// ============ CHAT API ============
export const chatApi = {
    getConversations: () =>
        apiClient.get<ApiResponse<ChatConversation[]>>('/chat/conversations'),

    createConversation: (title?: string) =>
        apiClient.post<ApiResponse<ChatConversation>>('/chat/conversations', { title }),

    getConversationHistory: (conversationId: string) =>
        apiClient.get<ApiResponse<ChatHistory>>(`/chat/conversations/${conversationId}`),

    sendMessage: (conversationId: string, content: string) =>
        apiClient.post<ApiResponse<ChatMessage>>(`/chat/conversations/${conversationId}/messages`, {
            content,
        }),

    deleteConversation: (conversationId: string) =>
        apiClient.delete(`/chat/conversations/${conversationId}`),

    clearAllConversations: async () => {
        const response = await apiClient.get<ApiResponse<ChatConversation[]>>('/chat/conversations');
        const conversations = response.data.data || [];
        await Promise.all(
            conversations.map((conv) => apiClient.delete(`/chat/conversations/${conv.id}`))
        );
    },
};

// ============ REVIEW API ============
export const reviewApi = {
    getEventReviews: (eventId: string) =>
        apiClient.get<ApiResponse<EventReviewsResponse>>(`/reviews/event/${eventId}`),

    getMyReview: (eventId: string) =>
        apiClient.get<ApiResponse<Review | null>>(`/reviews/event/${eventId}/my-review`),

    createReview: (eventId: string, data: ReviewCreateRequest) =>
        apiClient.post<ApiResponse<Review>>(`/reviews/event/${eventId}`, data),

    updateReview: (reviewId: string, data: Partial<ReviewCreateRequest>) =>
        apiClient.put<ApiResponse<Review>>(`/reviews/${reviewId}`, data),

    deleteReview: (reviewId: string) =>
        apiClient.delete(`/reviews/${reviewId}`),

    getEventStats: (eventId: string) =>
        apiClient.get<ApiResponse<{ average_rating: number; total_reviews: number }>>(`/reviews/event/${eventId}/stats`),
};

// ============ POST API (Social Media) ============
export const postApi = {
    // Posts CRUD
    getFeed: (page: number = 1, pageSize: number = 10) =>
        apiClient.get<ApiResponse<PostListResponse>>('/posts', { params: { page, page_size: pageSize } }),

    getUserPosts: (userId: string, page: number = 1, pageSize: number = 10) =>
        apiClient.get<ApiResponse<PostListResponse>>(`/posts/user/${userId}`, { params: { page, page_size: pageSize } }),

    getById: (postId: string) =>
        apiClient.get<ApiResponse<Post>>(`/posts/${postId}`),

    create: (data: PostCreateRequest) =>
        apiClient.post<ApiResponse<Post>>('/posts', data),

    update: (postId: string, data: Partial<PostCreateRequest>) =>
        apiClient.put<ApiResponse<Post>>(`/posts/${postId}`, data),

    delete: (postId: string) =>
        apiClient.delete(`/posts/${postId}`),

    // Like
    toggleLike: (postId: string) =>
        apiClient.post<ApiResponse<{ is_liked: boolean; like_count: number }>>(`/posts/${postId}/like`),

    // Comments
    getComments: (postId: string, page: number = 1, pageSize: number = 20) =>
        apiClient.get<ApiResponse<CommentListResponse>>(`/posts/${postId}/comments`, { params: { page, page_size: pageSize } }),

    createComment: (postId: string, data: CommentCreateRequest) =>
        apiClient.post<ApiResponse<Comment>>(`/posts/${postId}/comments`, data),

    toggleCommentLike: (postId: string, commentId: string) =>
        apiClient.post<ApiResponse<{ is_liked: boolean; like_count: number }>>(`/posts/${postId}/comments/${commentId}/like`),

    deleteComment: (postId: string, commentId: string) =>
        apiClient.delete(`/posts/${postId}/comments/${commentId}`),
};

// ============ NOTIFICATION API ============
export const notificationApi = {
    getAll: (page: number = 1, pageSize: number = 20) =>
        apiClient.get<ApiResponse<{
            notifications: Array<{
                id: string;
                user_id: string;
                actor: { id: string; username: string; full_name?: string; avatar_url?: string };
                type: string;
                message: string;
                post_id?: string;
                comment_id?: string;
                read: boolean;
                created_at: number;
            }>;
            total: number;
            unread_count: number;
            page: number;
            page_size: number;
            has_more: boolean;
        }>>('/notifications', { params: { page, page_size: pageSize } }),

    getUnreadCount: () =>
        apiClient.get<ApiResponse<{ unread_count: number }>>('/notifications/unread-count'),

    markAsRead: (notificationId: string) =>
        apiClient.patch<ApiResponse<{ success: boolean }>>(`/notifications/${notificationId}/read`),

    markAllAsRead: () =>
        apiClient.patch<ApiResponse<{ modified_count: number }>>('/notifications/read-all'),

    delete: (notificationId: string) =>
        apiClient.delete(`/notifications/${notificationId}`),
};

// ============ UPLOAD API ============
export const uploadApi = {
    uploadFile: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post<ApiResponse<{ url: string; filename: string; content_type: string }>>('/upload/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    uploadMultipleFiles: (files: File[]) => {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        return apiClient.post<ApiResponse<Array<{ url: string; filename: string; content_type: string }>>>('/upload/multiple', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};
