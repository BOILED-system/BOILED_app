'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DEFAULT_CIRCLE_ID, DEFAULT_USER_ID } from '@/lib/constants';
import { MOCK_USERS } from '@/lib/constants/users';
import Link from 'next/link';
import { User } from '@/lib/api/types';

export default function CreateEventPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [members, setMembers] = useState<User[]>([]);

    const [titleInput, setTitleInput] = useState('');
    const [formData, setFormData] = useState({
        startAt: '',
        location: '',
        coverImageUrl: '',
    });
    const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
    const [isAllTarget, setIsAllTarget] = useState(true);

    // Settlement fields
    const [enableSettlement, setEnableSettlement] = useState(false);
    const [settlementTitle, setSettlementTitle] = useState('参加費');
    const [settlementAmount, setSettlementAmount] = useState<number>(0);
    const [settlementDueDays, setSettlementDueDays] = useState(7);

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const data = await api.getMembers(DEFAULT_CIRCLE_ID);
                // Use API data if sufficient, otherwise fallback to MOCK_USERS
                const users = (data && data.length > 1) ? data : MOCK_USERS;
                setMembers(users);
                setTargetUserIds(users.map(u => u.id));
            } catch (e) {
                console.error('Failed to fetch members', e);
                // Fallback to MOCK_USERS
                setMembers(MOCK_USERS);
                setTargetUserIds(MOCK_USERS.map(u => u.id));
            }
        };
        fetchMembers();
    }, []);

    const handleToggleUser = (userId: string) => {
        if (targetUserIds.includes(userId)) {
            setTargetUserIds(targetUserIds.filter(id => id !== userId));
            setIsAllTarget(false);
        } else {
            const newTargets = [...targetUserIds, userId];
            setTargetUserIds(newTargets);
            if (newTargets.length === members.length) setIsAllTarget(true);
        }
    };

    const handleToggleAll = () => {
        if (isAllTarget) {
            setTargetUserIds([]);
            setIsAllTarget(false);
        } else {
            setTargetUserIds(members.map(u => u.id));
            setIsAllTarget(true);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titleInput || !formData.startAt) {
            setError('タイトルと日時は必須です');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const result = await api.createEvent({
                circleId: DEFAULT_CIRCLE_ID,
                title: titleInput,
                startAt: new Date(formData.startAt).toISOString(),
                location: formData.location || undefined,
                coverImageUrl: formData.coverImageUrl || undefined,
                rsvpTargetUserIds: targetUserIds,
                createdBy: DEFAULT_USER_ID,
            });

            // Auto-create settlement if enabled
            if (enableSettlement && settlementAmount > 0) {
                try {
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + settlementDueDays);
                    await api.createSettlement({
                        circleId: DEFAULT_CIRCLE_ID,
                        eventId: result.id,
                        title: settlementTitle || '参加費',
                        amount: settlementAmount,
                        dueAt: dueDate.toISOString(),
                        targetUserIds: targetUserIds,
                    });
                } catch (settlementErr) {
                    console.error('Settlement creation failed:', settlementErr);
                }
            }

            router.push(`/events/${result.id}`);
        } catch (err) {
            setError('作成に失敗しました。APIが起動しているか確認してください。');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto pb-20">
            {/* Back Link */}
            <Link href="/events" className="text-[#8b98b0] hover:text-[#3b82f6] inline-flex items-center gap-2 transition-colors animate-slide-in mb-8">
                <span>←</span> イベント一覧に戻る
            </Link>

            {/* Header */}
            <div className="mb-8 animate-fade-in">
                <p className="section-title mb-3">新規作成</p>
                <h1 className="text-4xl font-black text-white tracking-tight">イベント作成</h1>
                <div className="accent-bar mt-4" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="card p-8 animate-fade-in space-y-8">
                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-[#8b98b0] mb-2">
                        タイトル <span className="text-[#ef4444]">*</span>
                    </label>
                    <input
                        type="text"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        placeholder="例: 春季テニス大会"
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
                        value={formData.startAt}
                        onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
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
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="例: 東京都立公園テニスコート"
                        className="w-full px-5 py-4 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6]"
                    />
                </div>

                {/* RSVP Targets */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-[#8b98b0]">
                            出欠登録の対象者
                        </label>
                        <button
                            type="button"
                            onClick={handleToggleAll}
                            className="text-xs text-[#3b82f6] hover:text-[#2563eb]"
                        >
                            {isAllTarget ? '全解除' : '全選択'}
                        </button>
                    </div>
                    <div className="bg-[#0a0f1c] border border-[#2a3548] rounded-xl p-4 grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {members.map(member => (
                            <label key={member.id} className="flex items-center gap-3 p-2 hover:bg-white/[0.02] rounded-lg cursor-pointer transition-colors">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${targetUserIds.includes(member.id)
                                    ? 'bg-[#3b82f6] border-[#3b82f6]'
                                    : 'border-[#2a3548]'
                                    }`}>
                                    {targetUserIds.includes(member.id) && (
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={targetUserIds.includes(member.id)}
                                    onChange={() => handleToggleUser(member.id)}
                                />
                                <div className="flex items-center gap-2">
                                    <img src={member.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                                    <span className="text-sm text-white/80">{member.name}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-[#5a6580] mt-2">
                        選択されたメンバーのホーム画面に「出欠未登録」アラートが表示されます。
                    </p>
                </div>

                {/* Cover Image URL */}
                <div>
                    <label className="block text-sm font-medium text-[#8b98b0] mb-2">
                        カバー画像URL
                    </label>
                    <input
                        type="url"
                        value={formData.coverImageUrl}
                        onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-5 py-4 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6]"
                    />
                </div>

                {/* Settlement / Fee Section */}
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enableSettlement}
                                onChange={(e) => setEnableSettlement(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#2a3548] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3b82f6]"></div>
                        </label>
                        <span className="text-sm font-medium text-[#8b98b0]">参加費を設定する</span>
                    </div>

                    {enableSettlement && (
                        <div className="bg-[#0a0f1c] border border-[#2a3548] rounded-xl p-4 space-y-4">
                            <div>
                                <label className="block text-xs text-[#5a6580] mb-1">費目</label>
                                <input
                                    type="text"
                                    value={settlementTitle}
                                    onChange={(e) => setSettlementTitle(e.target.value)}
                                    placeholder="参加費"
                                    className="w-full px-4 py-3 rounded-lg bg-[#0d1424] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6] text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-[#5a6580] mb-1">金額 (円)</label>
                                <input
                                    type="number"
                                    value={settlementAmount || ''}
                                    onChange={(e) => setSettlementAmount(Number(e.target.value))}
                                    placeholder="1000"
                                    min={0}
                                    className="w-full px-4 py-3 rounded-lg bg-[#0d1424] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6] text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-[#5a6580] mb-1">支払期限 (イベント作成日から何日後)</label>
                                <select
                                    value={settlementDueDays}
                                    onChange={(e) => setSettlementDueDays(Number(e.target.value))}
                                    className="w-full px-4 py-3 rounded-lg bg-[#0d1424] border border-[#2a3548] text-white focus:outline-none focus:border-[#3b82f6] text-sm"
                                >
                                    <option value={3}>3日後</option>
                                    <option value={7}>7日後</option>
                                    <option value={14}>14日後</option>
                                    <option value={30}>30日後</option>
                                </select>
                            </div>
                            <p className="text-xs text-[#5a6580]">
                                対象者のホーム画面に「未清算」アラートが表示されます。
                            </p>
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="p-4 rounded-xl bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30">
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl bg-[#3b82f6] text-white font-semibold hover:bg-[#2563eb] transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? '作成中...' : 'イベントを作成'}
                </button>
            </form>
        </div>
    );
}
