'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/components/providers/UserContext';

export default function EditProfilePage() {
    const router = useRouter();
    const { currentUser, setCurrentUser } = useUser();
    const [name, setName] = useState(currentUser.name);
    const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await setCurrentUser({
                ...currentUser,
                name,
                avatarUrl,
            });
            router.push('/profile');
        } catch (error) {
            console.error('Failed to update profile', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center mb-6">
                <Link href="/profile" className="mr-4 text-gray-500 hover:text-white transition-colors">
                    <span>←</span>
                </Link>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    プロフィール編集
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label htmlFor="name" className="block text-sm font-medium text-[#8b98b0]">名前</label>
                    <input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="表示名を入力"
                        required
                        className="w-full px-5 py-4 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6]"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="avatarUrl" className="block text-sm font-medium text-[#8b98b0]">アバターURL</label>
                    <input
                        id="avatarUrl"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-5 py-4 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6]"
                    />
                    <p className="text-xs text-[#5a6580]">
                        ※ 画像のURLを入力してください
                    </p>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 h-12 rounded-xl font-medium transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
                    >
                        {isSubmitting ? '保存中...' : '保存する'}
                    </button>
                </div>
            </form>
        </div>
    );
}
