'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, Event, Announcement, RSVP, Settlement, Payment } from '@/lib/api/client';
import { useUser } from '@/components/providers/UserContext';
import CreateAnnouncementForm from '@/features/announcement/CreateAnnouncementForm';
import CreateSettlementForm from '@/features/settlement/CreateSettlementForm';
import Modal from '@/components/Modal';

interface SettlementWithStatus extends Settlement {
    myPayment?: Payment | null;
}

export default function EventDetailPage() {
    const params = useParams();
    const eventId = params.id as string;
    const { currentUser } = useUser();

    const [event, setEvent] = useState<Event | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [settlements, setSettlements] = useState<SettlementWithStatus[]>([]);
    const [myRsvp, setMyRsvp] = useState<RSVP | null>(null);
    const [allRsvps, setAllRsvps] = useState<RSVP[]>([]);
    const [loading, setLoading] = useState(true);

    const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
    const [showSettlementForm, setShowSettlementForm] = useState(false);

    // Payment Modal State
    const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'BANK' | 'PAYPAY'>('BANK');
    const [paymentStep, setPaymentStep] = useState<'SELECT' | 'DETAILS'>('SELECT');
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
    const [rsvpNote, setRsvpNote] = useState('');
    const [showSettlements, setShowSettlements] = useState(false);

    useEffect(() => { fetchData(); }, [eventId, currentUser.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [eventData, announcementData, settlementData, rsvpData, allRsvpData] = await Promise.all([
                api.getEvent(eventId),
                api.getEventAnnouncements(eventId).catch(() => []),
                api.getEventSettlements(eventId).catch(() => []),
                api.getMyRSVP(eventId).catch(() => null),
                api.getEventRSVPs(eventId).catch(() => []),
            ]);
            setEvent(eventData);
            setAnnouncements(announcementData || []);
            setAllRsvps(allRsvpData || []);
            setMyRsvp(rsvpData);

            const mySettlements = await api.getMySettlements().catch(() => ({ unpaid: [], paid: [] }));
            const settlementWithStatus = (settlementData || []).map(s => {
                const unpaid = mySettlements.unpaid?.find(u => u.settlement.id === s.id);
                const paid = mySettlements.paid?.find(p => p.settlement.id === s.id);
                return { ...s, myPayment: paid?.payment || unpaid?.payment || null };
            });
            setSettlements(settlementWithStatus);

            if (rsvpData && ['GO', 'LATE', 'EARLY'].includes(rsvpData.status)) {
                setShowSettlements(true);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const [rsvpSuccess, setRsvpSuccess] = useState(false);

    const handleRsvp = async (status: string) => {
        setRsvpSubmitting(true);
        setRsvpSuccess(false);
        try {
            const result = await api.submitRSVP(eventId, status, rsvpNote);
            setMyRsvp(result);
            setRsvpNote('');
            setRsvpSuccess(true);
            setTimeout(() => setRsvpSuccess(false), 3000);

            setShowSettlements(['GO', 'LATE', 'EARLY'].includes(status));
            const allRsvpData = await api.getEventRSVPs(eventId).catch(() => []);
            setAllRsvps(allRsvpData || []);
        } catch (err) { console.error(err); }
        finally { setRsvpSubmitting(false); }
    };

    const openPaymentModal = (settlement: Settlement) => {
        setSelectedSettlement(settlement);
        setPaymentStep('SELECT');
        // Default to BANK if user skips step (though they shouldn't with new UI)
        setPaymentMethod('BANK');
    };

    const handleSelectMethod = (method: 'BANK' | 'PAYPAY') => {
        setPaymentMethod(method);
        setPaymentStep('DETAILS');
    };



    const handleReportPayment = async () => {
        if (!selectedSettlement) return;

        setIsSubmittingPayment(true);
        try {
            await api.reportPayment(selectedSettlement.id, paymentMethod);
            // Optimistic update
            setSettlements(prev => prev.map(s => {
                if (s.id === selectedSettlement.id) {
                    return {
                        ...s,
                        myPayment: {
                            id: 'temp',
                            settlementId: s.id,
                            userId: currentUser.id,
                            status: 'PAID_REPORTED',
                            method: paymentMethod,
                            note: '',
                            reportedAt: new Date().toISOString()
                        }
                    };
                }
                return s;
            }));
            setSelectedSettlement(null);
        } catch (error) {
            console.error('Failed to report payment:', error);
            alert('支払いの報告に失敗しました');
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-lg mx-auto space-y-3">
                <div className="h-6 bg-white/[0.03] rounded w-24 animate-pulse" />
                <div className="h-32 bg-white/[0.03] rounded-2xl animate-pulse" />
                <div className="h-24 bg-white/[0.03] rounded-xl animate-pulse" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="text-center py-20">
                <p className="text-white/40 text-sm">イベントが見つかりません</p>
                <Link href="/events" className="text-blue-400 text-sm mt-2 inline-block">← 戻る</Link>
            </div>
        );
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getMonth() + 1}/${date.getDate()} (${['日', '月', '火', '水', '木', '金', '土'][date.getDay()]}) ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const goCount = allRsvps.filter(r => ['GO', 'LATE', 'EARLY'].includes(r.status)).length;
    const noCount = allRsvps.filter(r => r.status === 'NO').length;

    const rsvpOptions = [
        { status: 'GO', label: '出席', active: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
        { status: 'EARLY', label: '早退', active: 'bg-blue-500/15 border-blue-500/30 text-blue-400' },
        { status: 'LATE', label: '遅刻', active: 'bg-amber-500/15 border-amber-500/30 text-amber-400' },
        { status: 'NO', label: '欠席', active: 'bg-white/[0.06] border-white/10 text-white/40' },
    ];

    return (
        <div className="max-w-lg mx-auto space-y-3">
            {/* Back */}
            <Link href="/events" className="text-white/30 hover:text-white/60 text-xs inline-flex items-center gap-1 transition-colors">
                ← イベント一覧
            </Link>

            {/* Event Info */}
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden animate-fade-in">
                {event.coverImageUrl && (
                    <div className="relative h-36 overflow-hidden">
                        <img src={event.coverImageUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                )}
                <div className="p-4">
                    <h1 className="text-lg font-semibold text-white">{event.title}</h1>
                    <div className="flex gap-4 mt-2 text-xs text-white/40">
                        <span>{formatDate(event.startAt)}</span>
                        {event.location && <span>{event.location}</span>}
                    </div>
                    {currentUser.role === 'admin' && (
                        <Link href={`/events/${event.id}/edit`} className="text-[11px] text-white/20 hover:text-white/50 mt-2 inline-block transition-colors">
                            編集
                        </Link>
                    )}
                </div>
            </div>


            {/* RSVP */}
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 animate-fade-in" style={{ animationDelay: '50ms' }}>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">出欠</p>
                    <span className="text-[11px] text-white/25">出席 {goCount} · 欠席 {noCount}</span>
                </div>

                {rsvpSuccess && (
                    <div className="mb-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        出欠を更新しました
                    </div>
                )}

                {myRsvp && !rsvpSuccess && (
                    <p className="text-xs text-white/30 mb-2">
                        現在: {rsvpOptions.find(b => b.status === myRsvp.status)?.label}
                    </p>
                )}

                <div className="grid grid-cols-4 gap-2 mb-3">
                    {rsvpOptions.map(btn => {
                        const isActive = myRsvp?.status === btn.status;
                        return (
                            <button
                                key={btn.status}
                                onClick={() => handleRsvp(btn.status)}
                                disabled={rsvpSubmitting}
                                className={`py-2.5 rounded-lg border text-xs font-medium text-center transition-all disabled:opacity-50 ${isActive ? btn.active : 'bg-transparent border-white/[0.06] text-white/30 hover:border-white/15 hover:text-white/50'
                                    }`}
                            >{btn.label}</button>
                        );
                    })}
                </div>

                <input
                    type="text"
                    value={rsvpNote}
                    onChange={(e) => setRsvpNote(e.target.value)}
                    placeholder="メモ（任意）"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/15"
                />
            </div>

            {/* Settlements - auto-shown for attendees */}
            {showSettlements && settlements.length > 0 && (
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">集金</p>
                    <div className="space-y-2">
                        {settlements.map(settlement => {
                            const isPaid = settlement.myPayment && settlement.myPayment.status !== 'UNPAID';
                            return (
                                <div key={settlement.id} className={`p-3 rounded-lg border ${isPaid ? 'border-emerald-500/10 bg-emerald-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-white/80">{settlement.title}</p>
                                            <p className="text-[11px] text-white/25 mt-0.5">期限: {new Date(settlement.dueAt).toLocaleDateString('ja')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-white">¥{settlement.amount.toLocaleString()}</p>
                                            {isPaid && <span className="text-[10px] text-emerald-400">支払済</span>}
                                        </div>
                                    </div>
                                    {!isPaid && (
                                        <div className="mt-3">
                                            <button onClick={() => openPaymentModal(settlement)}
                                                className="w-full py-2 rounded-lg text-xs font-medium text-white/80 bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 transition-colors">
                                                支払いへ進む
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Admin: Add Settlement */}
            {currentUser.role === 'admin' && myRsvp && ['GO', 'LATE', 'EARLY'].includes(myRsvp.status) && (
                <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                    <button onClick={() => setShowSettlementForm(!showSettlementForm)}
                        className="w-full py-2 rounded-xl text-xs text-white/30 hover:text-white/50 bg-white/[0.02] border border-dashed border-white/[0.08] hover:border-white/15 transition-all">
                        {showSettlementForm ? '閉じる' : '+ 集金を追加'}
                    </button>
                    {showSettlementForm && (
                        <div className="mt-3">
                            <CreateSettlementForm eventId={eventId} onCreated={() => { setShowSettlementForm(false); fetchData(); }} />
                        </div>
                    )}
                </div>
            )}

            {/* Announcements */}
            {announcements.length > 0 && (
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">お知らせ</p>
                    <div className="space-y-1">
                        {announcements.map(a => (
                            <Link key={a.id} href={`/announcements/${a.id}`}
                                className="block py-2.5 px-3 -mx-1 rounded-lg hover:bg-white/[0.04] transition-colors group">
                                <p className="text-sm text-white/70 group-hover:text-white transition-colors truncate">{a.title}</p>
                                <p className="text-xs text-white/20 mt-0.5 line-clamp-1">{a.body}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Admin: Add Announcement */}
            {currentUser.role === 'admin' && (
                <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
                    <button onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                        className="w-full py-2 rounded-xl text-xs text-white/30 hover:text-white/50 bg-white/[0.02] border border-dashed border-white/[0.08] hover:border-white/15 transition-all">
                        {showAnnouncementForm ? '閉じる' : '+ お知らせを追加'}
                    </button>
                    {showAnnouncementForm && (
                        <div className="mt-3">
                            <CreateAnnouncementForm eventId={eventId} onCreated={() => { setShowAnnouncementForm(false); fetchData(); }} />
                        </div>
                    )}
                </div>
            )}

            {/* Attendees */}
            {allRsvps.length > 0 && (
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">参加者</p>
                    <div className="grid grid-cols-2 gap-1">
                        {allRsvps.map(rsvp => {
                            const statusLabel: Record<string, { text: string; cls: string }> = {
                                'GO': { text: '出席', cls: 'text-emerald-400' },
                                'LATE': { text: '遅刻', cls: 'text-amber-400' },
                                'EARLY': { text: '早退', cls: 'text-blue-400' },
                                'NO': { text: '欠席', cls: 'text-white/25' },
                            };
                            const s = statusLabel[rsvp.status] || { text: rsvp.status, cls: 'text-white/30' };
                            return (
                                <div key={rsvp.id} className="flex items-center justify-between py-2 px-3 rounded-lg text-xs">
                                    <span className="text-white/60">{rsvp.userId.replace('demo-user-', 'ユーザー')}</span>
                                    <span className={s.cls}>{s.text}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}


            {/* Payment Modal */}
            <Modal
                isOpen={!!selectedSettlement}
                onClose={() => setSelectedSettlement(null)}
                title="お支払い詳細"
            >
                {selectedSettlement && (
                    <div className="space-y-6">
                        {/* Amount & Title */}
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <p className="text-sm text-white/60 mb-1">{selectedSettlement.title}</p>
                            <p className="text-3xl font-bold text-white">¥{selectedSettlement.amount.toLocaleString()}</p>
                            <p className="text-xs text-white/40 mt-2">期限: {new Date(selectedSettlement.dueAt).toLocaleDateString('ja')}</p>
                        </div>

                        {/* Payment Method Details */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-white/80 border-l-2 border-blue-500 pl-2">
                                {paymentMethod === 'BANK' ? '振込先口座' : 'PayPay送金先'}
                            </h4>

                            <div className="bg-white/5 rounded-lg p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap select-all">
                                {paymentMethod === 'BANK'
                                    ? (selectedSettlement.bankInfo || '口座情報が登録されていません')
                                    : (selectedSettlement.paypayInfo || 'PayPay情報が登録されていません')
                                }
                            </div>

                            <p className="text-xs text-white/40">
                                ※ 上記の宛先に送金後、下のボタンを押してください。
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setSelectedSettlement(null)}
                                className="flex-1 py-3 rounded-xl font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleReportPayment}
                                disabled={isSubmittingPayment}
                                className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmittingPayment ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    '支払いを完了したとして報告'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
