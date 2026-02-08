import apiClient from './client';
import type { ApiResponse } from '../types';

// ============ CHECKIN TYPES ============
export interface CheckInCreateRequest {
    wallet_address: string;
    nft_object_id: string;
    tx_digest: string;
}

export interface CheckInResponse {
    id: string;
    user_id: string;
    event_id: string;
    wallet_address: string;
    nft_object_id: string;
    tx_digest: string;
    checked_in_at: number;
    created_at: number;
    event_name?: string;
    event_image?: string;
    user_name?: string;
}

export interface CheckInVerifyResponse {
    has_checked_in: boolean;
    checkin?: CheckInResponse;
}

export interface CheckInListResponse {
    checkins: CheckInResponse[];
    total: number;
    page: number;
    page_size: number;
    has_more: boolean;
}

// ============ CHECKIN API ============
export const checkinApi = {
    /**
     * Record a check-in after NFT has been minted
     */
    create: (eventId: string, data: CheckInCreateRequest) =>
        apiClient.post<ApiResponse<CheckInResponse>>(`/checkin/${eventId}`, data),

    /**
     * Get current user's check-ins
     */
    getMyCheckins: (page: number = 1, pageSize: number = 20) =>
        apiClient.get<ApiResponse<CheckInListResponse>>('/checkin/my', {
            params: { page, page_size: pageSize }
        }),

    /**
     * Get all check-ins for an event
     */
    getEventCheckins: (eventId: string, page: number = 1, pageSize: number = 20) =>
        apiClient.get<ApiResponse<CheckInListResponse>>(`/checkin/event/${eventId}`, {
            params: { page, page_size: pageSize }
        }),

    /**
     * Verify if current user has checked in to an event
     */
    verify: (eventId: string) =>
        apiClient.get<ApiResponse<CheckInVerifyResponse>>(`/checkin/verify/${eventId}`),
};
