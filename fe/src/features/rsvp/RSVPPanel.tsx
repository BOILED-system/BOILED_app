'use client';

import { useState, useEffect } from 'react';
import { api, RSVP } from '@/lib/api';

type RSVPStatus = 'GO' | 'NO' | 'LATE' | 'EARLY';

interface RSVPPanelProps {
    eventId: string;
    isTarget?: boolean; // ハッカソン用: 常にtrueとして扱う
}

export default function RSVPPanel({ eventId }: RSVPPanelProps) {
    const [currentRSVP, setCurrentRSVP] = useState<RSVP | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<RSVPStatus | null>(null);
    const [note, setNote] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const fetchRSVP = async () => {
            try {
                const data = await api.getMyRSVP(eventId);
                if (data) {
                    setCurrentRSVP(data);
                    setSelectedStatus(data.status as RSVPStatus);
                    setNote(data.note || '');
                }
            } catch (error) {
                console.error('Failed to fetch RSVP:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRSVP();
    }, [eventId]);

    const handleSubmit = async () => {
        if (!selectedStatus) return;

        setIsSubmitting(true);
        setMessage(null);

        try {
            console.log('Submitting RSVP:', { eventId, selectedStatus, note });
            await api.submitRSVP(eventId, selectedStatus, note);
            setMessage({ type: 'success', text: '出欠を登録しました！' });

            // Update local state
            const rsvp: RSVP = {
                id: currentRSVP?.id || 'temp-id',
                eventId,
                userId: 'current-user', // This will be refreshed on reload
                status: selectedStatus,
                note,
                updatedAt: new Date().toISOString()
            };
            setCurrentRSVP(rsvp);

        } catch (error: any) {
            console.error('RSVP Submit Error:', error);
            const errorMsg = error.message || '不明なエラーが発生しました';
            setMessage({ type: 'error', text: `登録に失敗しました: ${errorMsg}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    const statusOptions: { value: RSVPStatus; label: string; icon: string; activeClass: string }[] = [
        { value: 'GO', label: '参加', icon: '⭕️', activeClass: 'bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e]' },
        { value: 'NO', label: '不参加', icon: '❌', activeClass: 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]' },
        { value: 'LATE', label: '遅刻', icon: '⏰', activeClass: 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]' },
        { value: 'EARLY', label: '早退', icon: '🏃', activeClass: 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6]' },
    ];

    if (isLoading) {
        return (
            <div className="card p-8 animate-pulse">
                <div className="h-5 bg-[#1a2438] rounded w-24 mb-6"></div>
                <div className="grid grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 bg-[#1a2438] rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card p-8">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#3b82f6]/20 flex items-center justify-center">📋</span>
                出欠登録
            </h2>

            {/* Status buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {statusOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setSelectedStatus(option.value)}
                        className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedStatus === option.value
                            ? option.activeClass
                            : 'bg-[#1a2438] border-[#2a3548] text-[#8b98b0] hover:border-[#3b82f6]'
                            }`}
                    >
                        <span className="text-2xl">{option.icon}</span>
                        <span className="text-sm font-medium">{option.label}</span>
                    </button>
                ))}
            </div>

            {/* Note input */}
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="メモ（任意）"
                className="w-full px-5 py-4 rounded-xl bg-[#0a0f1c] border border-[#2a3548] text-white placeholder-[#5a6580] focus:outline-none focus:border-[#3b82f6] resize-none"
                rows={2}
            />

            {/* Submit button */}
            <button
                onClick={handleSubmit}
                disabled={!selectedStatus || isSubmitting}
                className="mt-5 w-full py-4 rounded-xl bg-[#3b82f6] text-white font-semibold hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? '送信中...' : currentRSVP ? '出欠を更新する' : '出欠を登録する'}
            </button>

            {/* Message */}
            {message && (
                <div className={`mt-4 p-4 rounded-xl text-center ${message.type === 'success'
                    ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
                    : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
                    }`}>
                    {message.text}
                </div>
            )}
        </div>
    );
}
