import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, setCurrentUser, clearCurrentUser } from '../utils/storage';

const AuthContext = createContext(null);

import { BACKEND_URL } from '../config';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = getCurrentUser();
        if (savedUser) {
            setUser(savedUser);
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        if (!email || !password) return { success: false, error: 'Email and password are required' };

        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (!data.success) {
                return { success: false, error: data.error || 'Login failed' };
            }

            const sessionUser = {
                id: data.user.id,
                username: data.user.username,
                email: data.user.email,
                bio: data.user.bio || '',
                profileImage: data.user.profileImage || '',
                theme: data.user.theme || 'dark',
                colorTheme: data.user.colorTheme || '#6366f1',
                createdAt: data.user.createdAt || data.user.dateJoined || new Date().toISOString(),
                accessToken: data.session?.access_token,
                refreshToken: data.session?.refresh_token,
            };

            setCurrentUser(sessionUser);
            setUser(sessionUser);
            return { success: true };
        } catch (e) {
            console.error('Login error:', e);
            return { success: false, error: 'Login failed. Please check your connection.' };
        }
    };

    const signup = async (username, email, password) => {
        if (!username || username.length < 2) return { success: false, error: 'Username must be at least 2 characters' };
        if (!email) return { success: false, error: 'Email is required' };
        if (!password || password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            const data = await res.json();

            if (!data.success) {
                return { success: false, error: data.error || 'Signup failed' };
            }

            return { success: true, needsVerification: false, message: data.message };
        } catch (e) {
            console.error('Signup error:', e);
            return { success: false, error: 'Signup failed. Please check your connection.' };
        }
    };

    const logout = () => {
        clearCurrentUser();
        // Also clear all local data caches
        try {
            const keysToKeep = ['tenx_theme', 'tenx_accent_color'];
            const allKeys = Object.keys(localStorage);
            allKeys.forEach(key => {
                if (key.startsWith('tenx_') && !keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
        } catch { }
        setUser(null);
    };

    const resetPassword = async (email, newPassword) => {
        if (!email) return { success: false, error: 'Email is required' };
        if (!newPassword || newPassword.length < 6) return { success: false, error: 'Password must be at least 6 characters' };
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/reset-password-direct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, newPassword }),
            });
            const data = await res.json();
            if (!data.success) return { success: false, error: data.error };
            return { success: true, message: data.message };
        } catch (e) {
            return { success: false, error: 'Failed to reset password. Server unavailable.' };
        }
    };

    const updatePassword = async (password) => {
        if (!user) return { success: false, error: 'Not authenticated' };
        if (!password || password.length < 6) return { success: false, error: 'Password must be 6+ characters' };

        // Try token-based update first
        if (user.accessToken) {
            try {
                const res = await fetch(`${BACKEND_URL}/api/auth/update-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.accessToken}`
                    },
                    body: JSON.stringify({ password }),
                });
                const data = await res.json();
                if (data.success) return { success: true, message: data.message };
                // If token expired, fall through to email-based reset
                console.warn('Token-based password update failed:', data.error);
            } catch (e) {
                console.warn('Token-based update failed:', e.message);
            }
        }

        // Fallback: use email-based direct reset (no token needed)
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/reset-password-direct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, newPassword: password }),
            });
            const data = await res.json();
            if (!data.success) return { success: false, error: data.error };
            return { success: true, message: data.message || 'Password updated successfully' };
        } catch (e) {
            return { success: false, error: 'Failed to update password. Server unavailable.' };
        }
    };

    const updateUser = (updates) => {
        const updated = { ...user, ...updates };
        setCurrentUser(updated);
        setUser(updated);
    };

    if (loading) return null;

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            login,
            signup,
            logout,
            resetPassword,
            updatePassword,
            updateUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
