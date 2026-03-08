'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DEFAULT_CIRCLE_ID, DEFAULT_USER_ID } from '@/lib/constants';
import { User } from '@/lib/api';
import Link from 'next/link';

export default function NewSettlementPage() {
    const router = useRouter();

    // Form State
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [bankInfo, setBankInfo] = useState('');
    const [paypayInfo, setPaypayInfo] = useState('');

    // User Selection State
    const [members, setMembers] = useState<User[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [isAllSelected, setIsAllSelected] = useState(true);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadMembers = async () => {
        setIsLoading(true);
        try {
            const data = await api.getMembers(DEFAULT_CIRCLE_ID);
            setMembers(data || []);
            // Default to all selected
            if (data.length > 0) {
                // Only verify if we should select all. 
                // For now, let's select all found.
                setSelectedUserIds(new Set(data.map(u => u.id)));
                setIsAllSelected(true);
            }
        } catch (err) {
            console.error(err);
            setError('メンバーリストの取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMembers();
    }, []);

    const addDemoMembers = async () => {
        setIsLoading(true);
        try {
            const demoUsers = [
                { id: "user1", name: "山田太郎", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=user1" },
                { id: "user2", name: "鈴木花子", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=user2" },
                { id: "user3", name: "佐藤次郎", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=user3" },
            ];

            for (const u of demoUsers) {
                // Ensure user exists (create/update)
                await api.updateUser(u.id, u.name, u.avatarUrl);
                // Add to circle
                await api.addMember(DEFAULT_CIRCLE_ID, u.id);
            }
            alert('デモ用メンバーを追加しました！');
            await loadMembers();
        } catch (e) {
            console.error(e);
            alert('追加に失敗しました');
            setIsLoading(false);
        }
    };

    const toggleUser = (userId: string) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(userId)) {
            newSet.delete(userId);
            setIsAllSelected(false);
        } else {
            newSet.add(userId);
            if (newSet.size === members.length) {
                setIsAllSelected(true);
            }
        }
        setSelectedUserIds(newSet);
    };

    const toggleAll = () => {
        if (isAllSelected) {
            setSelectedUserIds(new Set());
            setIsAllSelected(false);
        } else {
            setSelectedUserIds(new Set(members.map(u => u.id)));
            setIsAllSelected(true);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !amount || !dueDate) {
            setError('必須項目を入力してください');
            return;
        }
        if (selectedUserIds.size === 0) {
            setError('対象者を選択してください');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await api.createSettlement({
                circleId: DEFAULT_CIRCLE_ID,
                eventId: '', // General settlement
                title: title.trim(),
                amount: parseInt(amount),
                dueAt: new Date(dueDate).toISOString(),
                targetUserIds: Array.from(selectedUserIds),
                bankInfo: bankInfo.trim(),
                paypayInfo: paypayInfo.trim(),
            });
            router.push('/payments');
            router.refresh();
        } catch (err) {
            console.error(err);
            setError('請求の作成に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 pb-20">
            <div className="mb-8">
                <Link href="/payments" className="text-sm text-[#8b98b0] hover:text-white transition-colors flex items-center gap-1 mb-4">
                    <span>←</span> 支払い一覧に戻る
                </Link>
                <h1 className="text-3xl font-bold text-white">請求を作成</h1>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">基本情報</h2>

                    <div className="space-y-2">
                        <label htmlFor="title" className="block text-sm font-medium text-[#8b98b0]">
                            請求タイトル (理由) <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="例: 練習コート代、飲み会代"
                            className="w-full bg-[#151d2e] border border-[#2a3548] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/20"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="amount" className="block text-sm font-medium text-[#8b98b0]">
                                金額 (一人あたり) <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">¥</span>
                                <input
                                    id="amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="1000"
                                    className="w-full bg-[#151d2e] border border-[#2a3548] text-white rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/20"
                                    required
                                    min="1"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="dueDate" className="block text-sm font-medium text-[#8b98b0]">
                                期限 <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="dueDate"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full bg-[#151d2e] border border-[#2a3548] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Target Users */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h2 className="text-lg font-semibold text-white">対象者 ({selectedUserIds.size}名)</h2>
                        <div className="flex gap-4">
                            {/* Hidden feature for demo: Add dummy members if only 1 exists */}
                            {members.length <= 1 && (
                                <button
                                    type="button"
                                    onClick={addDemoMembers}
                                    disabled={isLoading || isSubmitting}
                                    className="text-xs text-[#8b98b0] hover:text-white underline"
                                >
                                    デモ用メンバー追加
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={toggleAll}
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                {isAllSelected ? '全解除' : '全選択'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {members.map(user => (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() => toggleUser(user.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedUserIds.has(user.id)
                                    ? 'bg-blue-500/10 border-blue-500/50 text-white'
                                    : 'bg-[#151d2e] border-[#2a3548] text-[#8b98b0] hover:bg-[#1a2438]'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedUserIds.has(user.id)
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-white/20'
                                    }`}>
                                    {selectedUserIds.has(user.id) && <span className="text-white text-xs">✓</span>}
                                </div>
                                <img
                                    src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                                    alt={user.name}
                                    className="w-8 h-8 rounded-full bg-white/10"
                                />
                                <span className="truncate">{user.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payment Info */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">振込先情報 (任意)</h2>
                    <p className="text-xs text-[#8b98b0]">※ 未入力の場合は、以前の履歴などが使われることはなく、空欄として表示されます。</p>

                    <div className="space-y-2">
                        <label htmlFor="bankInfo" className="block text-sm font-medium text-[#8b98b0]">
                            銀行口座情報
                        </label>
                        <textarea
                            id="bankInfo"
                            value={bankInfo}
                            onChange={(e) => setBankInfo(e.target.value)}
                            placeholder="例: 〇〇銀行 〇〇支店 普通 1234567 ヤマダ タロウ"
                            className="w-full bg-[#151d2e] border border-[#2a3548] text-white rounded-xl px-4 py-3 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/20 resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="paypayInfo" className="block text-sm font-medium text-[#8b98b0]">
                            PayPayリンク / ID
                        </label>
                        <input
                            id="paypayInfo"
                            type="text"
                            value={paypayInfo}
                            onChange={(e) => setPaypayInfo(e.target.value)}
                            placeholder="例: paypay.ne.jp/..."
                            className="w-full bg-[#151d2e] border border-[#2a3548] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/20"
                        />
                    </div>
                </div>

                <div className="pt-4 flex gap-4">
                    <Link
                        href="/payments"
                        className="flex-1 py-3 bg-[#151d2e] hover:bg-[#1f2937] text-white rounded-xl font-medium transition-all text-center"
                    >
                        キャンセル
                    </Link>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            '請求する'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
