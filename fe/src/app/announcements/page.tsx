'use client';

import { useState, useEffect } from 'react';
import { api, Announcement } from '@/lib/api';
import { DEFAULT_CIRCLE_ID } from '@/lib/constants';
import Link from 'next/link';
import AnnouncementCard from '@/components/AnnouncementCard';
import ChatPanel from '@/components/ChatPanel';

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<any[]>([]); // Use any for now or import type
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        try {
            const data = await api.getAnnouncements(DEFAULT_CIRCLE_ID);
            console.log('Announcements loaded:', data?.length, data);
            setAnnouncements(data || []);
        } catch (err) {
            setError('APIサーバーに接続できません');
            console.error('Announcements load error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('本当に削除しますか？')) return;
        try {
            await api.deleteAnnouncement(id);
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            alert('削除に失敗しました');
        }
    };

    return (
        <>
            <div className="max-w-6xl mx-auto relative px-4">
                {/* Big outline text */}
                <div className="outline-text select-none hidden lg:block">NEWS</div>

                {/* Header */}
                <div className="mb-12 animate-slide-in relative z-10 flex items-end justify-between">
                    <div>
                        <p className="section-title mb-3">お知らせ</p>
                        <h1 className="text-4xl font-black text-white tracking-tight">最新ニュース</h1>
                        <div className="accent-bar mt-4" />
                    </div>
                    <Link
                        href="/announcements/new"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                    >
                        <span>＋</span> お知らせ作成
                    </Link>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="card h-72 animate-pulse">
                                <div className="h-48 bg-[#1a2438]"></div>
                                <div className="p-5">
                                    <div className="h-4 bg-[#1a2438] rounded w-2/3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="card p-12 text-center animate-fade-in">
                        <span className="text-5xl mb-6 block opacity-30">⚠️</span>
                        <p className="text-[#8b98b0] mb-2">{error}</p>
                        <p className="text-sm text-[#5a6580]">APIサーバー（Go）を起動してください</p>
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="card p-16 text-center animate-fade-in">
                        <span className="text-6xl mb-6 block opacity-20">📭</span>
                        <h2 className="text-xl font-semibold text-white mb-2">お知らせはまだありません</h2>
                        <p className="text-[#8b98b0]">お知らせが作成されると、ここに表示されます</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                        {announcements.map((ann, index) => (
                            <div key={ann.id} className="relative group" style={{ animationDelay: `${index * 100}ms` }}>
                                <AnnouncementCard announcement={ann} />
                                <button
                                    onClick={(e) => handleDelete(e, ann.id)}
                                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
                                    title="削除"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ChatPanel />
        </>
    );
}
