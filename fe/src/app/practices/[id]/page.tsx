'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, PracticeSeriesDetail, PracticeRSVP } from '@/lib/api/client';
import { useUser } from '@/components/providers/UserContext';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function PracticeDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { currentUser } = useUser();
    const [detail, setDetail] = useState<PracticeSeriesDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [rsvpMap, setRsvpMap] = useState<Record<string, 'GO' | 'NO'>>({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Admin: add session
    const [showAddSession, setShowAddSession] = useState(false);
    const [newSessionDate, setNewSessionDate] = useState('');

    const load = useCallback(async () => {
        try {
            const data = await api.getPracticeSeriesDetail(id);
            setDetail(data);

            // Build RSVP map from existing RSVPs
            const map: Record<string, 'GO' | 'NO'> = {};
            if (data.myRsvps) {
                data.myRsvps.forEach((r: PracticeRSVP) => {
                    map[r.sessionId] = r.status;
                });
            }
            setRsvpMap(map);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const toggleRSVP = (sessionId: string) => {
        setRsvpMap(prev => {
            const current = prev[sessionId];
            if (current === 'GO') return { ...prev, [sessionId]: 'NO' };
            return { ...prev, [sessionId]: 'GO' };
        });
        setSaved(false);
    };

    const handleBulkSave = async () => {
        if (!detail) return;
        setSaving(true);
        try {
            const rsvps = Object.entries(rsvpMap).map(([sessionId, status]) => ({
                sessionId,
                status,
            }));
            if (rsvps.length > 0) {
                await api.bulkPracticeRSVP(id, rsvps);
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            // ignore
        } finally {
            setSaving(false);
        }
    };

    const handleAddSession = async () => {
        if (!newSessionDate) return;
        await api.createPracticeSession(id, { date: new Date(newSessionDate).toISOString() });
        setNewSessionDate('');
        setShowAddSession(false);
        load();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="text-center py-16">
                <p className="text-white/30 text-sm">シリーズが見つかりません</p>
                <Link href="/practices" className="text-blue-400 text-xs mt-2 inline-block">← 練習一覧に戻る</Link>
            </div>
        );
    }

    const { series, sessions } = detail;
    const goCount = Object.values(rsvpMap).filter(s => s === 'GO').length;
    const totalFee = goCount * (series.fee || 0);

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            {/* Back */}
            <Link href="/practices" className="text-xs text-white/30 hover:text-white/60 transition-colors">
                ← 練習一覧
            </Link>

            {/* Series Info */}
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
                <h1 className="text-lg font-bold text-white">{series.name}</h1>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                    <span className="text-xs text-white/40">
                        {DAY_LABELS[series.dayOfWeek]}曜 {series.startTime}
                    </span>
                    {series.location && (
                        <span className="text-xs text-white/30">{series.location}</span>
                    )}
                    {series.fee > 0 && (
                        <span className="text-xs text-white/40">¥{series.fee.toLocaleString()}/回</span>
                    )}
                </div>
            </div>

            {/* Attendance List */}
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">出欠登録</p>
                    <button
                        onClick={() => setShowAddSession(!showAddSession)}
                        className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
                    >
                        + セッション追加
                    </button>
                </div>

                {/* Add Session Form */}
                {showAddSession && (
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                        <input
                            type="date"
                            value={newSessionDate}
                            onChange={e => setNewSessionDate(e.target.value)}
                            className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                        />
                        <button
                            onClick={handleAddSession}
                            className="text-xs px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                        >
                            追加
                        </button>
                    </div>
                )}

                {sessions && sessions.length > 0 ? (
                    <div className="divide-y divide-white/[0.04]">
                        {sessions.map(session => {
                            const date = new Date(session.date);
                            const status = rsvpMap[session.id];
                            const isGo = status === 'GO';
                            const isNo = status === 'NO';
                            const isPast = date < new Date();

                            return (
                                <div
                                    key={session.id}
                                    className={`flex items-center justify-between px-4 py-3 ${session.cancelled ? 'opacity-40' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-sm font-mono ${isPast ? 'text-white/30' : 'text-white/70'}`}>
                                            {date.getMonth() + 1}/{date.getDate()}
                                        </span>
                                        <span className="text-xs text-white/20">
                                            ({DAY_LABELS[date.getDay()]})
                                        </span>
                                        {session.cancelled && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-white/[0.06] text-white/30 rounded">中止</span>
                                        )}
                                        {session.note && (
                                            <span className="text-[10px] text-white/20">{session.note}</span>
                                        )}
                                    </div>

                                    {!session.cancelled && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => toggleRSVP(session.id)}
                                                className={`text-[11px] px-3 py-1 rounded-l-lg transition-colors ${isGo
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-white/[0.04] text-white/25 border border-white/[0.06] hover:text-white/50'
                                                    }`}
                                            >
                                                出席
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setRsvpMap(prev => ({ ...prev, [session.id]: 'NO' }));
                                                    setSaved(false);
                                                }}
                                                className={`text-[11px] px-3 py-1 rounded-r-lg transition-colors ${isNo
                                                    ? 'bg-white/[0.08] text-white/60 border border-white/[0.15]'
                                                    : 'bg-white/[0.04] text-white/25 border border-white/[0.06] hover:text-white/50'
                                                    }`}
                                            >
                                                欠席
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-white/20 text-xs">セッションがありません</p>
                    </div>
                )}
            </div>

            {/* Save Button + Fee Summary */}
            <div className="flex items-center justify-between bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3">
                <div>
                    {series.fee > 0 && (
                        <p className="text-xs text-white/40">
                            出席 {goCount}回 × ¥{series.fee.toLocaleString()} = <span className="text-white font-medium">¥{totalFee.toLocaleString()}</span>
                        </p>
                    )}
                    {series.fee === 0 && (
                        <p className="text-xs text-white/40">出席 {goCount}回</p>
                    )}
                </div>
                <button
                    onClick={handleBulkSave}
                    disabled={saving || Object.keys(rsvpMap).length === 0}
                    className={`text-xs px-5 py-2 rounded-lg font-medium transition-all ${saved
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-30 disabled:hover:bg-blue-500'
                        }`}
                >
                    {saving ? '保存中...' : saved ? '保存しました' : '一括保存'}
                </button>
            </div>

            {/* Admin Actions */}
            <div className="flex justify-end pt-4 border-t border-white/[0.06]">
                <button
                    onClick={async () => {
                        if (!confirm('今月の参加費請求を作成しますか？\n（出席者全員に未払い設定で作成されます）')) return;
                        const month = new Date().toISOString().slice(0, 7); // YYYY-MM
                        try {
                            await api.createPracticeSettlements(id, month);
                            alert('請求を作成しました');
                        } catch (e) {
                            alert('作成に失敗しました');
                        }
                    }}
                    className="text-xs text-white/40 hover:text-white/60 underline decoration-white/20 hover:decoration-white/40 underline-offset-4 transition-colors"
                >
                    今月の参加費を請求する
                </button>
            </div>
        </div>
    );
}
