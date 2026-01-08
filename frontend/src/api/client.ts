import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Use environment variable or default to local backend first
const LOCAL_API = 'http://localhost:8000/api';
const PROD_API = 'https://livuth.onrender.com/api';

// Default to env var if set, otherwise try local first
const INITIAL_API_URL = import.meta.env.VITE_API_URL || LOCAL_API;

console.log('🚀 Initializing API Client with:', INITIAL_API_URL);

// Create axios instance
const apiClient = axios.create({
    baseURL: INITIAL_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle token refresh and fallback
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryFallback?: boolean };

        // Handle Network Error - Switch to Production Fallback
        if (error.code === 'ERR_NETWORK' && apiClient.defaults.baseURL === LOCAL_API && !originalRequest._retryFallback) {
            console.warn('⚠️ Local backend unreachable. Switching to Production:', PROD_API);

            // Update default baseURL for future requests
            apiClient.defaults.baseURL = PROD_API;

            // Update current request and retry
            originalRequest.baseURL = PROD_API;
            originalRequest._retryFallback = true;
            return apiClient(originalRequest);
        }

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    // Use current baseURL for refresh
                    const response = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
                        refresh_token: refreshToken,
                    });

                    const { access_token } = response.data.data;
                    localStorage.setItem('access_token', access_token);

                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${access_token}`;
                    }

                    return apiClient(originalRequest);
                } catch (refreshError) {
                    // Refresh failed, clear tokens and redirect to login
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');

                    if (!window.location.pathname.includes('/login')) {
                        window.location.href = '/login';
                    }
                    return Promise.reject(refreshError);
                }
            } else {
                // No refresh token, clear and redirect
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');

                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
