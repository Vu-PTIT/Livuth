import axios, { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse, type AxiosRequestConfig } from 'axios';
import { Capacitor, CapacitorHttp, type HttpResponse } from '@capacitor/core';

// Use environment variable or default to production backend
// Use environment variable or default to production backend
// On Android Emulator, localhost is 10.0.2.2
const isAndroidEmulator = import.meta.env.DEV && Capacitor.getPlatform() === 'android';
const API_BASE_URL = import.meta.env.VITE_API_URL ||
    (isAndroidEmulator ? 'http://10.0.2.2:8000/api' :
        (import.meta.env.DEV ? '/api' : 'https://livuth.onrender.com/api'));

// Custom adapter for Capacitor to bypass CORS on native
const capacitorAdapter = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const { url, method, headers, data, params } = config;

    // Construct full URL if needed
    const fullUrl = url?.startsWith('http') ? url : `${config.baseURL}${url}`;

    const response: HttpResponse = await CapacitorHttp.request({
        url: fullUrl!,
        method: method?.toUpperCase() || 'GET',
        headers: headers as any,
        data: data,
        params: params,
    });

    const axiosResponse: AxiosResponse = {
        data: response.data,
        status: response.status,
        statusText: '', // CapacitorHttp doesn't return status text
        headers: response.headers as any,
        config: config as InternalAxiosRequestConfig,
        request: {},
    };

    return axiosResponse;
};

console.log('--- CAPACITOR DEBUG ---');
console.log('isNativePlatform:', Capacitor.isNativePlatform());
console.log('getPlatform:', Capacitor.getPlatform());
console.log('Window Location:', window.location.href);

// Robust check for Capacitor environment
// 1. Standard native check
// 2. Platform check
// 3. URL Heuristic: https://localhost (without port) is strictly Capacitor Android
const isStandardNative = Capacitor.isNativePlatform();
const isPlatformNative = Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios';
const isCapacitorUrl = window.location.hostname === 'localhost' &&
    window.location.protocol === 'https:' &&
    (window.location.port === '' || window.location.port === '443');

const shouldUseNativeAdapter = isStandardNative || isPlatformNative || isCapacitorUrl;

console.log('Final Decision - Use Native Adapter:', shouldUseNativeAdapter);

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    // Use custom adapter on native
    adapter: shouldUseNativeAdapter ? capacitorAdapter : undefined,
    validateStatus: function (status) {
        return status >= 200 && status < 300;
    },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('access_token');
        console.log(`[API] Request to ${config.url}`, { title: 'API Request', body: config.data });
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            console.warn('[API] 401 Unauthorized encountered', { url: originalRequest.url });
            // Skip refresh attempt for auth-check endpoint to prevent loops
            const isAuthCheck = originalRequest.url?.includes('/users/me');

            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken && !isAuthCheck) {
                try {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refresh_token: refreshToken,
                    });

                    const { access_token } = response.data.data;
                    localStorage.setItem('access_token', access_token);

                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${access_token}`;
                    }

                    return apiClient(originalRequest);
                } catch (refreshError) {
                    // Refresh failed, clear tokens
                    console.error('[API] Refresh failed', refreshError);
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');

                    // Dispatch logout event to notify AuthProvider
                    window.dispatchEvent(new Event('auth:logout'));

                    // Only redirect if not already on login/register/landing page
                    if (!['/', '/login', '/register'].includes(window.location.pathname)) {
                        window.location.href = '#/login';
                    }
                    return Promise.reject(refreshError);
                }
            } else {
                // No refresh token or auth check failed, just clear tokens
                console.warn('[API] No refresh token or auth check failed, clearing tokens');
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');

                // Dispatch logout event to notify AuthProvider
                window.dispatchEvent(new Event('auth:logout'));

                // Only redirect if not already on public pages
                if (!['/', '/login', '/register'].includes(window.location.pathname)) {
                    window.location.href = '#/login'; // Use hash routing if applicable, or just rely on AuthProvider
                }
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
