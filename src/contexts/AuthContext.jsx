import { createContext, useContext, useState } from 'react';
import { getUsers, saveUsers, getCurrentUser, setCurrentUser, clearCurrentUser } from '../utils/storage';
import { simpleHash } from '../utils/helpers';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getCurrentUser());

    const signup = (username, password) => {
        if (!username || !password) return { success: false, error: 'All fields are required' };
        if (username.length < 3) return { success: false, error: 'Username must be at least 3 characters' };
        if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

        const users = getUsers();
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return { success: false, error: 'Username already taken' };
        }

        const newUser = {
            username,
            passwordHash: simpleHash(password),
            createdAt: new Date().toISOString(),
        };

        users.push(newUser);
        saveUsers(users);

        const sessionUser = { username: newUser.username, createdAt: newUser.createdAt };
        setCurrentUser(sessionUser);
        setUser(sessionUser);

        return { success: true };
    };

    const login = (username, password) => {
        if (!username || !password) return { success: false, error: 'All fields are required' };

        const users = getUsers();
        const found = users.find(u => u.username.toLowerCase() === username.toLowerCase());

        if (!found) return { success: false, error: 'Username not found' };
        if (found.passwordHash !== simpleHash(password)) return { success: false, error: 'Incorrect password' };

        const sessionUser = { username: found.username, createdAt: found.createdAt };
        setCurrentUser(sessionUser);
        setUser(sessionUser);

        return { success: true };
    };

    const logout = () => {
        clearCurrentUser();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
