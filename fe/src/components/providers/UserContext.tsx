'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types/user';
import { MOCK_USERS, DEFAULT_USER } from '@/lib/constants/users';

import { api } from '@/lib/api/client';

interface UserContextType {
    currentUser: User;
    setCurrentUser: (user: User) => void;
    users: User[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUserState] = useState<User>(DEFAULT_USER);

    // Initial load and sync
    useEffect(() => {
        const initializeUser = async () => {
            const storedUserId = localStorage.getItem('current_user_id');
            const initialUserId = storedUserId || DEFAULT_USER.id;

            try {
                // Try to fetch from API
                const apiUser = await api.getUser(initialUserId);
                if (apiUser) {
                    setCurrentUserState(apiUser);
                    return;
                }
            } catch (e) {
                // Ignore API errors, fallback to mock
                console.log('User not found in API, using mock/fallback');
            }

            // Fallback to MOCK_USERS if API failed
            const mockUser = MOCK_USERS.find((u) => u.id === initialUserId) || DEFAULT_USER;
            setCurrentUserState(mockUser);

            // Sync to backend
            try {
                await api.updateUser(mockUser.id, mockUser.name, mockUser.avatarUrl);
            } catch (e) {
                console.error('Failed to sync user to backend:', e);
            }
        };

        initializeUser();
    }, []);

    const setCurrentUser = async (user: User) => {
        setCurrentUserState(user);
        localStorage.setItem('current_user_id', user.id);

        // Sync new selection to backend
        try {
            await api.updateUser(user.id, user.name, user.avatarUrl);
        } catch (e) {
            console.error('Failed to sync user change to backend:', e);
        }
    };

    return (
        <UserContext.Provider value={{ currentUser, setCurrentUser, users: MOCK_USERS }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
