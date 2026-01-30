import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Use environment variable or default to production backend
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://livuth.onrender.com/api');

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
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

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
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
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    // Only redirect if not already on login/register/landing page
                    if (!['/', '/login', '/register'].includes(window.location.pathname)) {
                        window.location.href = '/login';
                    }
                    return Promise.reject(refreshError);
                }
            } else {
                // No refresh token or auth check failed, just clear tokens
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                // Only redirect if not already on public pages
                if (!['/', '/login', '/register'].includes(window.location.pathname)) {
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
