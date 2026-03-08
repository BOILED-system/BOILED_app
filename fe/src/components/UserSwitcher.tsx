'use client';

import { useUser } from '@/components/providers/UserContext';
import { useState, useRef, useEffect } from 'react';

export default function UserSwitcher() {
    const { currentUser, setCurrentUser, users } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                title="ユーザー切り替え"
            >
                <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full border border-white/20"
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-3 border-b border-white/5">
                        <p className="text-xs text-[#8b98b0] mb-1">現在のユーザー</p>
                        <div className="flex items-center gap-2">
                            <img
                                src={currentUser.avatarUrl}
                                alt={currentUser.name}
                                className="w-8 h-8 rounded-full"
                            />
                            <span className="text-white font-medium">{currentUser.name}</span>
                        </div>
                    </div>

                    <div className="p-1">
                        {users.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => {
                                    setCurrentUser(user);
                                    setIsOpen(false);
                                    // Make sure API requests use the new ID immediately by reloading optionally
                                    // But context update should handle it.
                                    // A reload might be safer for ensuring all data is refreshed
                                    window.location.reload();
                                }}
                                className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${currentUser.id === user.id
                                        ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                                        : 'text-[#8b98b0] hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <img
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    className="w-6 h-6 rounded-full"
                                />
                                {user.name}
                                {currentUser.id === user.id && (
                                    <span className="ml-auto text-xs bg-[#3b82f6]/20 px-1.5 py-0.5 rounded">
                                        選択中
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
