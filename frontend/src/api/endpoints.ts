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
} from '../types';

// ============ AUTH API ============
export const authApi = {
    login: (data: LoginRequest) =>
        apiClient.post<ApiResponse<TokenResponse>>('/auth/login', data),

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

