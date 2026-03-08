export interface User {
    id: string;
    name: string;
    avatarUrl: string;
    role?: 'admin' | 'member';
}
