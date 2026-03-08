'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, Event } from '@/lib/api/client';
import { useUser } from '@/components/providers/UserContext';
import Link from 'next/link';
import { format } from 'date-fns';

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = params.id as string;
    const { currentUser } = useUser();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [title, setTitle] = useState('');
    const [startAt, setStartAt] = useState('');
    const [location, setLocation] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [rsvpTargetUserIds, setRsvpTargetUserIds] = useState<string[]>([]);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const event = await api.getEvent(eventId);
                if (!event) {
                    setError('イベントが見つかりませんでした');
                    return;
                }

                // No permission check for hackathon demo

                setTitle(event.title);
                // Format for datetime-local input: YYYY-MM-DDThh:mm
                const date = new Date(event.startAt);
                const isoString = date.toISOString().slice(0, 16); // Remove seconds and Z
                setStartAt(isoString);

                setLocation(event.location || '');
                setCoverImageUrl(event.coverImageUrl || '');
                setRsvpTargetUserIds(event.rsvpTargetUserIds || []);
            } catch (err) {
                setError('イベントの読み込みに失敗しました');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        if (eventId) {
            fetchEvent();
        }
    }, [eventId, currentUser.id, currentUser.role]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !startAt) {
            setError('タイトルと日時は必須です');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await api.updateEvent(eventId, {
                title,
                startAt: new Date(startAt).toISOString(),
                location,
                coverImageUrl,
                rsvpTargetUserIds,
            });
            router.push(`/events/${eventId}`);
        } catch (err) {
            setError('更新に失敗しました');
            console.error(err);
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('本当に削除しますか？この操作は取り消せません。')) {
            return;
        }

        setIsSubmitting(true);
        try {
            await api.deleteEvent(eventId);
            router.push('/events');
        } catch (err) {
            setError('削除に失敗しました');
            console.error(err);
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-[#8b98b0]">読み込み中...</div>;
    }

    if (error && !title) {
        return (
            <div className="max-w-2xl mx-auto p-8">
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 mb-4">
                    {error}
                </div>
                <Link href={`/events/${eventId}`} className="text-[#3b82f6] hover:underline">
                    ← イベント詳細に戻る
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Back Link */}
            <Link href={`/events/${eventId}`} className="text-[#8b98b0] hover:text-[#3b82f6] inline-flex items-center gap-2 transition-colors animate-slide-in mb-8">
                <span>←</span> キャンセルして戻る
            </Link>

            {/* Header */}
            <div className="mb-8 animate-fade-in">
                <h1 className="text-3xl font-black text-white tracking-tight">イベント編集</h1>
                <div className="accent-bar mt-4" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="card p-8 animate-fade-in space-y-6">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-sm">
                        {error}
                    </div>
                )}
                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-[#8b98b0] mb-2">
                        タイトル <span className="text-[#ef4444]">*</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-5 py-4 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6]"
                    />
                </div>

                {/* Date */}
                <div>
                    <label className="block text-sm font-medium text-[#8b98b0] mb-2">
                        日時 <span className="text-[#ef4444]">*</span>
                    </label>
                    <input
                        type="datetime-local"
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                        className="w-full px-5 py-4 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white focus:outline-none focus:border-[#3b82f6]"
                    />
                </div>

                {/* Location */}
                <div>
                    <label className="block text-sm font-medium text-[#8b98b0] mb-2">
                        場所
                    </label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-5 py-4 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6]"
                    />
                </div>

                {/* Cover Image URL */}
                <div>
                    <label className="block text-sm font-medium text-[#8b98b0] mb-2">
                        カバー画像URL
                    </label>
                    <input
                        type="url"
                        value={coverImageUrl}
                        onChange={(e) => setCoverImageUrl(e.target.value)}
                        className="w-full px-5 py-4 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6]"
                    />
                </div>

                {/* Actions */}
                <div className="pt-4 flex flex-col gap-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 rounded-xl bg-[#3b82f6] text-white font-semibold hover:bg-[#2563eb] transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? '保存中...' : '変更を保存'}
                    </button>

                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        className="w-full py-4 rounded-xl bg-[#ef4444]/10 text-[#ef4444] font-semibold hover:bg-[#ef4444]/20 transition-colors disabled:opacity-50 border border-[#ef4444]/20"
                    >
                        イベントを削除
                    </button>
                </div>
            </form>
        </div>
    );
}
