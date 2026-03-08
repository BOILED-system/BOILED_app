'use client';

import { useState, useEffect } from 'react';
import { api, SettlementWithPayment, Settlement } from '@/lib/api';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { useUser } from '@/components/providers/UserContext';

export default function PaymentsPage() {
    const [unpaidSettlements, setUnpaidSettlements] = useState<SettlementWithPayment[]>([]);
    const [paidSettlements, setPaidSettlements] = useState<SettlementWithPayment[]>([]);
    const [activeTab, setActiveTab] = useState<'unpaid' | 'paid'>('unpaid');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { currentUser } = useUser(); // Need current user for optimistic update

    // Payment Modal State
    const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'BANK' | 'PAYPAY'>('BANK');
    const [paymentStep, setPaymentStep] = useState<'SELECT' | 'DETAILS'>('SELECT');
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

    useEffect(() => {
        const fetchSettlements = async () => {
            try {
                const data = await api.getMySettlements();
                setUnpaidSettlements(data.unpaid || []);
                setPaidSettlements(data.paid || []);
            } catch (err) {
                setError('APIサーバーに接続できません');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettlements();
    }, []);

    const settlements = activeTab === 'unpaid' ? unpaidSettlements : paidSettlements;

    const openPaymentModal = (settlement: Settlement) => {
        setSelectedSettlement(settlement);
        setPaymentStep('SELECT');
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
            // Move from unpaid to paid locally
            setUnpaidSettlements(prev => prev.filter(s => s.settlement.id !== selectedSettlement.id));

            const paidItem = unpaidSettlements.find(s => s.settlement.id === selectedSettlement.id);
            if (paidItem) {
                setPaidSettlements(prev => [{
                    ...paidItem,
                    payment: {
                        id: 'temp',
                        settlementId: paidItem.settlement.id,
                        userId: currentUser?.id || '',
                        status: 'PAID_REPORTED',
                        method: paymentMethod,
                        note: '',
                        reportedAt: new Date().toISOString()
                    }
                }, ...prev]);
            }
            setSelectedSettlement(null);
        } catch (error) {
            console.error('Failed to report payment:', error);
            alert('支払いの報告に失敗しました');
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto relative">
            {/* Big outline text */}
            <div className="outline-text select-none hidden lg:block">PAYMENT</div>

            {/* Header */}
            <div className="mb-12 animate-slide-in relative z-10 flex items-end justify-between">
                <div>
                    <p className="section-title mb-3">清算管理</p>
                    <h1 className="text-4xl font-black text-white tracking-tight">支払い</h1>
                    <div className="accent-bar mt-4" />
                </div>
                <Link
                    href="/settlements/new"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                >
                    <span>＋</span> 請求作成
                </Link>
            </div>

            {/* Tabs */}
            <div className="bg-[#151d2e] rounded-xl p-1.5 mb-8 flex gap-1 animate-fade-in border border-[#2a3548]">
                <button
                    onClick={() => setActiveTab('unpaid')}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'unpaid'
                        ? 'bg-[#0a0f1c] text-[#ef4444]'
                        : 'text-[#8b98b0] hover:text-white'
                        }`}
                >
                    <span>💸</span> 未払い
                    {unpaidSettlements.length > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-[#ef4444] text-white rounded-full">
                            {unpaidSettlements.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('paid')}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'paid'
                        ? 'bg-[#0a0f1c] text-[#22c55e]'
                        : 'text-[#8b98b0] hover:text-white'
                        }`}
                >
                    <span>✅</span> 済み
                    {paidSettlements.length > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-[#22c55e] text-white rounded-full">
                            {paidSettlements.length}
                        </span>
                    )}
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="card p-6 animate-pulse">
                            <div className="h-4 bg-[#1a2438] rounded w-1/2 mb-3"></div>
                            <div className="h-6 bg-[#1a2438] rounded w-1/4"></div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="card p-12 text-center animate-fade-in">
                    <span className="text-5xl mb-6 block opacity-30">⚠️</span>
                    <p className="text-[#8b98b0]">{error}</p>
                </div>
            ) : settlements.length === 0 ? (
                <div className="card p-16 text-center animate-fade-in">
                    <span className="text-6xl mb-6 block opacity-20">{activeTab === 'unpaid' ? '✨' : '📝'}</span>
                    <h2 className="text-xl font-semibold text-white mb-2">
                        {activeTab === 'unpaid' ? '未払いの清算はありません' : '支払い履歴はありません'}
                    </h2>
                    <p className="text-[#8b98b0]">
                        {activeTab === 'unpaid' ? 'すべての支払いが完了しています！' : '支払いを完了すると、ここに表示されます'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4 relative z-10">
                    {settlements.map((item, index) => (
                        <div key={item.settlement.id} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                            <PaymentCard item={item} isPaid={activeTab === 'paid'} onPay={openPaymentModal} />
                        </div>
                    ))}
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
                        {/* Step 1: Select Method */}
                        {paymentStep === 'SELECT' && (
                            <>
                                <div className="text-center mb-6">
                                    <p className="text-sm text-white/60 mb-2">支払い方法を選択してください</p>
                                    <p className="text-2xl font-bold text-white">¥{selectedSettlement.amount.toLocaleString()}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleSelectMethod('BANK')}
                                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex flex-col items-center gap-2 group"
                                    >
                                        <span className="text-2xl group-hover:scale-110 transition-transform">🏦</span>
                                        <span className="text-sm font-medium text-white">銀行振込</span>
                                    </button>
                                    <button
                                        onClick={() => handleSelectMethod('PAYPAY')}
                                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex flex-col items-center gap-2 group"
                                    >
                                        <span className="text-2xl group-hover:scale-110 transition-transform">📱</span>
                                        <span className="text-sm font-medium text-white">PayPay</span>
                                    </button>
                                </div>
                                <button
                                    onClick={() => setSelectedSettlement(null)}
                                    className="w-full mt-4 py-3 text-white/40 hover:text-white transition-colors text-sm"
                                    disabled={isSubmittingPayment}
                                >
                                    キャンセル
                                </button>
                            </>
                        )}

                        {/* Step 2: Details */}
                        {paymentStep === 'DETAILS' && (
                            <>
                                {/* Amount & Title */}
                                <div className="bg-white/5 rounded-xl p-4 text-center">
                                    <p className="text-sm text-white/60 mb-1">{selectedSettlement.title}</p>
                                    <p className="text-3xl font-bold text-white">¥{selectedSettlement.amount.toLocaleString()}</p>
                                    <p className="text-xs text-white/40 mt-2">期限: {new Date(selectedSettlement.dueAt).toLocaleDateString('ja')}</p>
                                </div>

                                {/* Payment Method Details */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-white/80 border-l-2 border-blue-500 pl-2">
                                            {paymentMethod === 'BANK' ? '振込先口座' : 'PayPay送金先'}
                                        </h4>
                                        <button
                                            onClick={() => setPaymentStep('SELECT')}
                                            className="text-xs text-blue-400 hover:text-blue-300"
                                            disabled={isSubmittingPayment}
                                        >
                                            変更する
                                        </button>
                                    </div>

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
                                        disabled={isSubmittingPayment}
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
                            </>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}

function PaymentCard({ item, isPaid, onPay }: { item: SettlementWithPayment; isPaid: boolean; onPay: (s: Settlement) => void }) {
    const { settlement, payment } = item;

    return (
        <div className="card p-6">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-semibold text-white text-lg">{settlement.title}</h3>
                    <p className="text-sm text-[#8b98b0] mt-1">
                        期限: {new Date(settlement.dueAt).toLocaleDateString('ja-JP')}
                    </p>
                </div>
                <span className={`text-2xl font-bold ${isPaid ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                    ¥{settlement.amount.toLocaleString()}
                </span>
            </div>

            {isPaid && payment && (
                <div className="mt-4 pt-4 border-t border-[#2a3548]">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#22c55e]/20 text-[#22c55e] rounded-lg text-sm">
                        <span>✓</span>
                        {payment.method === 'BANK' ? '銀行振込' : 'PayPay'}で報告済み
                    </span>
                </div>
            )}

            {!isPaid && (
                <div className="mt-4 flex gap-2">
                    {!settlement.bankInfo && !settlement.paypayInfo && (
                        <button onClick={() => onPay(settlement)}
                            className="flex-1 py-2 rounded-lg text-xs text-white/50 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors">
                            支払い報告
                        </button>
                    )}
                    {(settlement.bankInfo || settlement.paypayInfo) && (
                        <button onClick={() => onPay(settlement)}
                            className="flex-1 py-2 rounded-lg text-xs font-medium text-white/80 bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 transition-colors">
                            支払いへ進む
                        </button>
                    )}
                    {settlement.eventId && (
                        <Link
                            href={`/events/${settlement.eventId}`}
                            className="flex-1 py-2 rounded-lg text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-1"
                        >
                            詳細 <span>→</span>
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
