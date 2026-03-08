'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { DEFAULT_CIRCLE_ID } from '@/lib/constants';
import { RSVP } from '@/lib/api/client';

interface CreateSettlementFormProps {
    eventId: string;
    onCreated: () => void;
}

export default function CreateSettlementForm({ eventId, onCreated }: CreateSettlementFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        dueAt: '',
        bankInfo: '',
        paypayInfo: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.amount || !formData.dueAt) return;

        setIsSubmitting(true);
        try {
            // Fetch RSVPs and filter to only attending users (GO/LATE/EARLY)
            const rsvps = await api.getEventRSVPs(eventId);
            const targetUserIds = rsvps
                .filter((r: RSVP) => ['GO', 'LATE', 'EARLY'].includes(r.status))
                .map((r: RSVP) => r.userId);

            if (targetUserIds.length === 0) {
                alert('参加者がいないため、清算を作成できません。');
                setIsSubmitting(false);
                return;
            }

            await api.createSettlement({
                circleId: DEFAULT_CIRCLE_ID,
                eventId,
                title: formData.title,
                amount: parseInt(formData.amount),
                dueAt: new Date(formData.dueAt).toISOString(),
                targetUserIds,
                bankInfo: formData.bankInfo || undefined,
                paypayInfo: formData.paypayInfo || undefined,
            });
            setFormData({ title: '', amount: '', dueAt: '', bankInfo: '', paypayInfo: '' });
            setIsOpen(false);
            onCreated();
        } catch (error) {
            console.error('Failed to create settlement:', error);
            alert('清算の作成に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full py-4 rounded-xl border-2 border-dashed border-[#2a3548] text-[#8b98b0] hover:border-[#22c55e] hover:text-[#22c55e] transition-colors flex items-center justify-center gap-2"
            >
                <span>+</span> 清算を追加
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
                <span>💰</span> 新しい清算
            </h3>

            <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="タイトル（例: 参加費）"
                className="w-full px-4 py-3 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6]"
            />

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-[#5a6580] block mb-1">金額</label>
                    <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="5000"
                        className="w-full px-4 py-3 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6]"
                    />
                </div>
                <div>
                    <label className="text-xs text-[#5a6580] block mb-1">期限</label>
                    <input
                        type="date"
                        value={formData.dueAt}
                        onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white focus:outline-none focus:border-[#3b82f6]"
                    />
                </div>
            </div>

            <div>
                <label className="text-xs text-[#5a6580] block mb-1">銀行振込先（任意）</label>
                <textarea
                    value={formData.bankInfo}
                    onChange={(e) => setFormData({ ...formData, bankInfo: e.target.value })}
                    placeholder={"三菱UFJ銀行 渋谷支店\n普通 1234567\nヤマダ タロウ"}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6] resize-none"
                />
            </div>

            <div>
                <label className="text-xs text-[#5a6580] block mb-1">PayPay ID（任意）</label>
                <input
                    type="text"
                    value={formData.paypayInfo}
                    onChange={(e) => setFormData({ ...formData, paypayInfo: e.target.value })}
                    placeholder="例: circle-tanaka"
                    className="w-full px-4 py-3 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6]"
                />
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-[#1a2438] text-[#8b98b0] hover:text-white transition-colors"
                >
                    キャンセル
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || !formData.title || !formData.amount || !formData.dueAt}
                    className="flex-1 py-3 rounded-xl bg-[#22c55e] text-white font-medium hover:bg-[#16a34a] transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? '作成中...' : '作成'}
                </button>
            </div>
        </form>
    );
}
