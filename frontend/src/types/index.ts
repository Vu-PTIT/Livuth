// API Types based on backend schemas

// User Types
export interface User {
    id: string;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    dob?: number;
    gender?: string;
    phone?: string;
    address?: string;
    hobbies?: string[];
    bio?: string;
    avatar_url?: string;
    participated_events?: string[];
    is_active?: boolean;
    last_login?: number;
    roles: string[];
    pending_role_upgrade?: string;
    upgrade_request_reason?: string;
    upgrade_request_date?: number;
    upgrade_rejection_reason?: string;
    created_at: number;
    updated_at: number;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    phone?: string;
    gender?: string;
    dob?: number;
    address?: string;
}

export interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_expires_in?: number;
    token_type?: string;
    user?: User;
}

// Event Types
export interface TimeInfo {
    lunar?: string;
    next_occurrence?: string;
}

export interface ContentInfo {
    intro?: string;
    history?: string;
    activities?: string[];
}

export interface MediaItem {
    url: string;
    caption?: string;
    type?: string;
}

export interface LocationInfo {
    address?: string;
    city?: string;
    province?: string;
    coordinates?: {
        type: string;
        coordinates: [number, number];
    };
}

export interface EventInfo {
    is_free?: boolean;
    ticket_price?: number;
    note?: string;
}

export interface Event {
    id: string;
    event_id?: number;
    name: string;
    creator_id?: string;
    time?: TimeInfo;
    content?: ContentInfo;
    media?: MediaItem[];
    info?: EventInfo;
    location?: LocationInfo;
    categories?: string[];
    tags?: string[];
    is_visible?: boolean;
    average_rating?: number;
    review_count?: number;
    participant_count?: number;
    tour_providers?: TourProviderListing[];
    created_at: number;
    updated_at: number;
}

export interface EventCreateRequest {
    name: string;
    event_id?: number;
    time?: TimeInfo;
    content?: ContentInfo;
    media?: MediaItem[];
    info?: EventInfo;
    location?: LocationInfo;
    categories?: string[];
    tags?: string[];
}

// Tour Provider Types
export interface TourProviderListing {
    id: string;
    event_id: string;
    event_name?: string;
    provider_id: string;
    provider_username?: string;
    company_name: string;
    business_license?: string;
    service_name: string;
    description: string;
    highlights: string[];
    price_range: string;
    price_note?: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_website?: string;
    contact_facebook?: string;
    contact_zalo?: string;
    contact_address?: string;
    status: 'pending' | 'approved' | 'rejected';
    verification_status: 'unverified' | 'verified';
    rejection_reason?: string;
    logo_url?: string;
    photos: string[];
    view_count: number;
    is_visible?: boolean;
    created_at: number;
    updated_at: number;
}

export interface TourProviderCreateRequest {
    event_id: string;
    company_name: string;
    business_license?: string;
    service_name: string;
    description: string;
    highlights?: string[];
    price_range: string;
    price_note?: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_website?: string;
    contact_facebook?: string;
    contact_zalo?: string;
    contact_address?: string;
    logo_url?: string;
    photos?: string[];
}

// Chat Types
export interface ChatConversation {
    id: string;
    user_id: string;
    title: string;
    created_at: number;
    updated_at: number;
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: number;
}

export interface ChatHistory extends ChatConversation {
    messages: ChatMessage[];
}

// API Response Types
export interface ApiResponse<T> {
    http_code: number;
    success: boolean;
    message?: string;
    data?: T;
    metadata?: {
        page?: number;
        page_size?: number;
        total?: number;
    };
}

// Role Upgrade
export interface RoleUpgradeRequest {
    requested_role: string;
    reason: string;
}

// User Roles
export const USER_ROLES = {
    ADMIN: 'Administrator',
    USER: 'Normal user',
    SPECIALIST: 'Specialist',
    TOUR_PROVIDER: 'Tour Provider',
    EVENT_PROVIDER: 'Event Provider',
    GUEST: 'Guest',
} as const;

// Review Types
export interface Review {
    id: string;
    event_id: string;
    user_id: string;
    rating: number;
    comment?: string;
    user_name?: string;
    user_avatar?: string;
    created_at: number;
    updated_at: number;
}

export interface ReviewCreateRequest {
    rating: number;
    comment?: string;
}

export interface ReviewStats {
    average_rating: number;
    total_reviews: number;
    rating_distribution: {
        [key: string]: number;
    };
}

export interface EventReviewsResponse {
    stats: ReviewStats;
    reviews: Review[];
}

// Post Types (Social Media)
export interface PostAuthor {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
}

export interface Post {
    id: string;
    author: PostAuthor;
    content: string;
    media: MediaItem[];
    location?: LocationInfo;
    tags: string[];
    like_count: number;
    comment_count: number;
    share_count: number;
    is_liked: boolean;
    visibility: 'public' | 'friends' | 'private';
    created_at: number;
    updated_at: number;
}

export interface PostCreateRequest {
    content: string;
    media?: MediaItem[];
    location?: LocationInfo;
    tags?: string[];
    visibility?: 'public' | 'friends' | 'private';
}

export interface PostListResponse {
    posts: Post[];
    total: number;
    page: number;
    page_size: number;
    has_more: boolean;
}

export interface Comment {
    id: string;
    post_id: string;
    author: PostAuthor;
    content: string;
    like_count: number;
    is_liked: boolean;
    parent_id?: string;
    reply_count: number;
    replies: Comment[];
    created_at: number;
    updated_at: number;
}

export interface CommentCreateRequest {
    content: string;
    parent_id?: string;
}

export interface CommentListResponse {
    comments: Comment[];
    total: number;
    has_more: boolean;
}
