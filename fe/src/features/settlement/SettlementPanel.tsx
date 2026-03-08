'use client';

import { useState, useEffect } from 'react';
import { api, Settlement } from '@/lib/api';

type PaymentMethod = 'BANK' | 'PAYPAY';

interface SettlementPanelProps {
    eventId: string;
    isTarget?: boolean; // ハッカソン用: 常にtrueとして扱う
}

export default function SettlementPanel({ eventId }: SettlementPanelProps) {
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [paidSettlementIds, setPaidSettlementIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [eventSettlements, mySettlements] = await Promise.all([
                    api.getEventSettlements(eventId),
                    api.getMySettlements()
                ]);
                setSettlements(eventSettlements || []);

                // Extract IDs of paid settlements
                const paidIds = new Set(mySettlements.paid.map(item => item.settlement.id));
                setPaidSettlementIds(paidIds);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [eventId]);

    if (settlements.length === 0 && !isLoading) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="card p-8 animate-pulse">
                <div className="h-5 bg-[#1a2438] rounded w-24 mb-6"></div>
                <div className="h-40 bg-[#1a2438] rounded"></div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {settlements.map((settlement) => (
                <SettlementCard
                    key={settlement.id}
                    settlement={settlement}
                    initialIsPaid={paidSettlementIds.has(settlement.id)}
                />
            ))}
        </div>
    );
}

function SettlementCard({ settlement, initialIsPaid }: { settlement: Settlement; initialIsPaid: boolean }) {
    const [activeTab, setActiveTab] = useState<PaymentMethod>('BANK');
    const [isReporting, setIsReporting] = useState(false);
    const [isReported, setIsReported] = useState(initialIsPaid);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Update local state if prop changes (e.g. re-fetch)
    useEffect(() => {
        setIsReported(initialIsPaid);
    }, [initialIsPaid]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setMessage({ type: 'success', text: 'コピーしました！' });
        setTimeout(() => setMessage(null), 2000);
    };

    const handleReport = async () => {
        setIsReporting(true);
        setMessage(null);

        try {
            await api.reportPayment(settlement.id, activeTab);
            setIsReported(true);
            setMessage({ type: 'success', text: '支払い報告完了！' });
        } catch (error) {
            setMessage({ type: 'error', text: '報告に失敗しました' });
        } finally {
            setIsReporting(false);
        }
    };

    return (
        <div className="card p-8">
            <div className="flex justify-between items-start mb-5">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-[#3b82f6]/20 flex items-center justify-center">💰</span>
                        {settlement.title}
                    </h2>
                    <p className="text-sm text-[#8b98b0] mt-1">
                        期限: {new Date(settlement.dueAt).toLocaleDateString('ja-JP')}
                    </p>
                </div>
                <span className="text-2xl font-bold text-white">
                    ¥{settlement.amount.toLocaleString()}
                </span>
            </div>

            {isReported ? (
                <div className="p-6 rounded-xl bg-[#22c55e]/20 border border-[#22c55e]/30 text-center">
                    <span className="text-3xl mb-2 block">✅</span>
                    <p className="text-[#22c55e] font-semibold">支払い報告済み</p>
                </div>
            ) : (
                <>
                    {/* Tabs */}
                    <div className="bg-[#0a0f1c] rounded-xl p-1.5 mb-5 flex gap-1 border border-[#2a3548]">
                        <button
                            onClick={() => setActiveTab('BANK')}
                            className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'BANK'
                                ? 'bg-[#151d2e] text-white'
                                : 'text-[#8b98b0] hover:text-white'
                                }`}
                        >
                            <span>🏦</span> 銀行振込
                        </button>
                        <button
                            onClick={() => setActiveTab('PAYPAY')}
                            className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'PAYPAY'
                                ? 'bg-[#151d2e] text-white'
                                : 'text-[#8b98b0] hover:text-white'
                                }`}
                        >
                            <span>📱</span> PayPay
                        </button>
                    </div>

                    {/* Content */}
                    {activeTab === 'BANK' ? (
                        <div className="space-y-3">
                            <div className="p-5 rounded-xl bg-[#0a0f1c] border border-[#2a3548]">
                                <p className="text-xs text-[#5a6580] mb-2">振込先</p>
                                <p className="text-white whitespace-pre-wrap">{settlement.bankInfo || '情報がありません'}</p>
                            </div>
                            {settlement.bankInfo && (
                                <button
                                    onClick={() => handleCopy(settlement.bankInfo!)}
                                    className="w-full py-3 rounded-xl bg-[#1a2438] border border-[#2a3548] text-[#8b98b0] hover:text-white hover:border-[#3b82f6] transition-colors flex items-center justify-center gap-2"
                                >
                                    <span>📋</span> 振込先をコピー
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="p-5 rounded-xl bg-[#0a0f1c] border border-[#2a3548]">
                                <p className="text-xs text-[#5a6580] mb-2">送金手順</p>
                                <ol className="text-white space-y-1">
                                    <li>1. PayPayアプリを開く</li>
                                    <li>2. 「送る」を選択</li>
                                    <li>3. 下記IDを検索して送金</li>
                                </ol>
                            </div>
                            <div className="p-5 rounded-xl bg-[#0a0f1c] border border-[#2a3548]">
                                <p className="text-xs text-[#5a6580] mb-2">送金先ID</p>
                                <p className="text-xl font-mono text-white">{settlement.paypayInfo || '情報がありません'}</p>
                            </div>
                            {settlement.paypayInfo && (
                                <button
                                    onClick={() => handleCopy(settlement.paypayInfo!)}
                                    className="w-full py-3 rounded-xl bg-[#1a2438] border border-[#2a3548] text-[#8b98b0] hover:text-white hover:border-[#3b82f6] transition-colors flex items-center justify-center gap-2"
                                >
                                    <span>📋</span> 送金先IDをコピー
                                </button>
                            )}
                        </div>
                    )}

                    {/* Report button */}
                    <button
                        onClick={handleReport}
                        disabled={isReporting}
                        className="mt-5 w-full py-4 rounded-xl bg-[#22c55e] text-white font-semibold hover:bg-[#16a34a] transition-colors disabled:opacity-50"
                    >
                        {isReporting ? '送信中...' : '支払いを報告する'}
                    </button>
                </>
            )}

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
