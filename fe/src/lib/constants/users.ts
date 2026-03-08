import { User } from '@/types/user';

export const MOCK_USERS: User[] = [
    {
        id: 'demo-user-1',
        name: 'たなか',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        role: 'admin',
    },
    {
        id: 'demo-user-2',
        name: 'すずき',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
        role: 'member',
    },
    {
        id: 'demo-user-3',
        name: 'さとう',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bandit',
        role: 'member',
    },
    {
        id: 'demo-user-4',
        name: 'やまだ',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ginger',
        role: 'member',
    },
];

export const DEFAULT_USER = MOCK_USERS[0];
