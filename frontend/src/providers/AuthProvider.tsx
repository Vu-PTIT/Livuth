import React, { useState, useEffect, type ReactNode } from 'react';
import type { User, TokenResponse, LoginRequest, RegisterRequest } from '../types';
import { authApi } from '../api/endpoints';
import { AuthContext, type AuthContextType } from '../contexts/AuthContext';

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!user;

    // Check for existing token on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('access_token');
            console.log('[AuthProvider] initAuth started', { hasToken: !!token });

            if (token) {
                try {
                    const response = await authApi.getMe();
                    console.log('[AuthProvider] getMe success', response.data);
                    setUser(response.data.data || null);
                } catch (error) {
                    console.error('[AuthProvider] getMe failed', error);
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    setUser(null);
                }
            } else {
                console.log('[AuthProvider] No token found, skipping getMe');
            }
            console.log('[AuthProvider] Setting isLoading to false');
            setIsLoading(false);
        };
        initAuth();
    }, []);

    // Listen for auth:logout events from API client
    useEffect(() => {
        const handleLogoutEvent = () => {
            console.log('[AuthProvider] Received auth:logout event');
            logout();
        };

        window.addEventListener('auth:logout', handleLogoutEvent);
        return () => window.removeEventListener('auth:logout', handleLogoutEvent);
    }, []);

    const login = async (data: LoginRequest) => {
        const response = await authApi.login(data);
        const tokenData = response.data.data as TokenResponse;
        handleLoginSuccess(tokenData);
    };

    const loginGoogle = async (data: import('../types').GoogleLoginRequest) => {
        const response = await authApi.loginGoogle(data);
        const tokenData = response.data.data as TokenResponse;
        handleLoginSuccess(tokenData);
    };

    const loginFacebook = async (data: import('../types').FacebookLoginRequest) => {
        const response = await authApi.loginFacebook(data);
        const tokenData = response.data.data as TokenResponse;
        handleLoginSuccess(tokenData);
    };

    const handleLoginSuccess = (tokenData: TokenResponse) => {
        localStorage.setItem('access_token', tokenData.access_token);
        if (tokenData.refresh_token) {
            localStorage.setItem('refresh_token', tokenData.refresh_token);
        }

        // Save login timestamp
        localStorage.setItem('login_timestamp', String(Date.now() / 1000));

        if (tokenData.user) {
            setUser(tokenData.user);
        } else {
            refreshUser();
        }
    };

    const register = async (data: RegisterRequest) => {
        await authApi.register(data);
        // After registration, user needs to login
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const response = await authApi.getMe();
            setUser(response.data.data || null);
        } catch (error) {
            setUser(null);
        }
    };

    const hasRole = (role: string): boolean => {
        return user?.roles?.includes(role) || false;
    };

    const isAdmin = hasRole('Administrator');
    const isEventProvider = hasRole('Event Provider') || isAdmin;
    const isTourProvider = hasRole('Tour Provider') || isAdmin;

    const value: AuthContextType = {
        user,
        isAuthenticated,
        isLoading,
        login,
        loginGoogle,
        loginFacebook,
        register,
        logout,
        refreshUser,
        hasRole,
        isAdmin,
        isEventProvider,
        isTourProvider,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
