import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eventApi, postApi } from '../api/endpoints';
import type { Event, Post } from '../types';

// Help keys for central management
export const CACHE_KEYS = {
    EVENTS_ALL: (page: number, pageSize: number) => ['events', 'all', page, pageSize],
    EVENTS_RECOMMENDED: (userId: string) => ['events', 'recommended', userId],
    EVENTS_SEARCH: (params: any) => ['events', 'search', params],
    EVENT_DETAIL: (id: string | undefined) => ['event', id],
    POSTS_FEED: (params: any) => ['posts', 'feed', params],
};

// Generic persistence functions
const saveToLocal = (key: string, data: any) => {
    try {
        localStorage.setItem(`livuth_cache_${key}`, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn('Failed to save to local storage', e);
    }
};

const getFromLocal = (key: string) => {
    try {
        const item = localStorage.getItem(`livuth_cache_${key}`);
        if (!item) return undefined;
        const { data } = JSON.parse(item);
        return data || undefined;
    } catch (e) {
        return undefined;
    }
};

/**
 * Hook for fetching all events with local caching
 */
export const useEvents = (page: number = 1, pageSize: number = 8) => {
    const key = `events_all_${page}_${pageSize}`;

    return useQuery({
        queryKey: CACHE_KEYS.EVENTS_ALL(page, pageSize),
        queryFn: async () => {
            console.log(`[useEvents] Fetching events page ${page}`);
            try {
                const response = await eventApi.getAll(page, pageSize);
                const data = response.data.data || [];
                saveToLocal(key, data);
                return data;
            } catch (err) {
                console.error('[useEvents] Fetch error:', err);
                throw err;
            }
        },
        initialData: () => getFromLocal(key),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

/**
 * Hook for recommended events
 */
export const useRecommendedEvents = (userId: string, limit: number = 4) => {
    const key = `events_recommended_${userId}`;

    return useQuery({
        queryKey: CACHE_KEYS.EVENTS_RECOMMENDED(userId),
        queryFn: async () => {
            if (!userId) return [];
            console.log(`[useRecommendedEvents] Fetching recommendations for ${userId}`);
            try {
                const response = await eventApi.getRecommendations(userId, limit);
                const data = response.data.data || [];
                saveToLocal(key, data);
                return data;
            } catch (err) {
                console.warn('[useRecommendedEvents] Fetch error:', err);
                return [];
            }
        },
        initialData: () => getFromLocal(key),
        staleTime: 1000 * 60 * 10, // 10 minutes
        enabled: !!userId,
    });
};

/**
 * Hook for searching events
 */
export const useSearchEvents = (params: {
    q?: string;
    city?: string;
    categories?: string;
    page: number;
    pageSize: number;
}) => {
    const key = `events_search_${JSON.stringify(params)}`;

    return useQuery({
        queryKey: CACHE_KEYS.EVENTS_SEARCH(params),
        queryFn: async () => {
            console.log('[useSearchEvents] Searching with params:', params);
            try {
                const response = await eventApi.search(params);
                const data = response.data.data || [];
                const total = response.data.metadata?.total || 0;
                const result = { data, total };
                saveToLocal(key, result);
                return result;
            } catch (err) {
                console.error('[useSearchEvents] Search error:', err);
                throw err;
            }
        },
        initialData: () => getFromLocal(key),
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
};

/**
 * Hook for event detail
 */
export const useEventDetail = (id: string | undefined) => {
    const key = `event_detail_${id}`;

    return useQuery({
        queryKey: CACHE_KEYS.EVENT_DETAIL(id),
        queryFn: async () => {
            if (!id) throw new Error('Event ID is required');
            console.log(`[useEventDetail] Fetching detail for ${id}`);
            try {
                const response = await eventApi.getById(id, true);
                const data = response.data.data || null;
                if (data) saveToLocal(key, data);
                return data;
            } catch (err) {
                console.error('[useEventDetail] Fetch error:', err);
                throw err;
            }
        },
        initialData: () => (id ? getFromLocal(key) : undefined),
        enabled: !!id,
        staleTime: 1000 * 60 * 15, // 15 minutes
    });
};

/**
 * Hook for posts feed
 */
export const usePostsFeed = (params: { page?: number; pageSize?: number; q?: string; city?: string; province?: string; event_id?: string } = {}) => {
    const key = `posts_feed_${JSON.stringify(params)}`;

    return useQuery({
        queryKey: CACHE_KEYS.POSTS_FEED(params),
        queryFn: async () => {
            console.log(`[usePostsFeed] Fetching feed with params:`, params);
            try {
                const response = await postApi.getFeed(params);
                const data = response.data.data || { posts: [], total: 0 };
                console.log(`[usePostsFeed] Fetched ${data.posts?.length} posts`);
                saveToLocal(key, data);
                return data;
            } catch (err) {
                console.error('[usePostsFeed] Fetch error:', err);
                throw err;
            }
        },
        initialData: () => {
            const cached = getFromLocal(key);
            if (cached) console.log('Loaded posts feed from cache');
            return cached;
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
};

/**
 * Helper to update cache manually (e.g., after updating a post or event)
 */
export const useUpdateCache = () => {
    const queryClient = useQueryClient();

    const updateEventInList = (updatedEvent: Event) => {
        // Update in any cached list
        queryClient.setQueriesData({ queryKey: ['events'] }, (oldData: any) => {
            if (!oldData) return oldData;
            if (Array.isArray(oldData)) {
                return oldData.map(e => e.id === updatedEvent.id ? updatedEvent : e);
            }
            if (oldData.data && Array.isArray(oldData.data)) {
                return {
                    ...oldData,
                    data: oldData.data.map((e: any) => e.id === updatedEvent.id ? updatedEvent : e)
                };
            }
            return oldData;
        });

        // Update detail
        queryClient.setQueryData(CACHE_KEYS.EVENT_DETAIL(updatedEvent.id), updatedEvent);
    };

    const updatePostInFeed = (updatedPost: Post) => {
        queryClient.setQueriesData({ queryKey: ['posts', 'feed'] }, (oldData: any) => {
            if (!oldData || !oldData.posts) return oldData;
            return {
                ...oldData,
                posts: oldData.posts.map((p: any) => p.id === updatedPost.id ? updatedPost : p)
            };
        });
    };

    return { updateEventInList, updatePostInFeed };
};
