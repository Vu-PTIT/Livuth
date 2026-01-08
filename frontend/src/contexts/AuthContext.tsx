import { createContext } from 'react';
import type { User, LoginRequest, RegisterRequest } from '../types';

export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    hasRole: (role: string) => boolean;
    isAdmin: boolean;
    isEventProvider: boolean;
    isTourProvider: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
