'use client';

import { useState } from 'react';
import { AnnouncementPayment } from '@/lib/api';

interface Props {
    payments: AnnouncementPayment[];
}

export default function PaymentInfo({ payments }: Props) {
    const [activeTab, setActiveTab] = useState<'bank' | 'paypay'>('bank');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copyToClipboard = async (text: string, paymentId: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(paymentId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const unpaidPayments = payments.filter(p => !p.isPaid);
    const paidPayments = payments.filter(p => p.isPaid);

    if (payments.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                💰 清算情報
            </h3>

            {/* Unpaid Section */}
            {unpaidPayments.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-1">
                        ⚠️ 未払い ({unpaidPayments.length}件)
                    </h4>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mb-4">
                        <button
                            onClick={() => setActiveTab('bank')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'bank'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            🏦 銀行振込
                        </button>
                        <button
                            onClick={() => setActiveTab('paypay')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'paypay'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📱 PayPay
                        </button>
                    </div>

                    {unpaidPayments.map((payment) => (
                        <div key={payment.id} className="bg-gray-50 rounded-lg p-4 mb-3">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-gray-800">{payment.description}</span>
                                <span className="text-lg font-bold text-indigo-600">
                                    ¥{payment.amount.toLocaleString()}
                                </span>
                            </div>

                            {activeTab === 'bank' ? (
                                <div className="mt-3">
                                    <p className="text-sm text-gray-600 mb-2">振込先情報:</p>
                                    <div className="bg-white p-3 rounded border border-gray-200">
                                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {payment.bankInfo || '振込先情報が設定されていません'}
                                        </pre>
                                    </div>
                                    {payment.bankInfo && (
                                        <button
                                            onClick={() => copyToClipboard(payment.bankInfo, `bank-${payment.id}`)}
                                            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                        >
                                            {copiedId === `bank-${payment.id}` ? '✓ コピーしました' : '📋 振込先をコピー'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-3">
                                    <p className="text-sm text-gray-600 mb-2">PayPay送金手順:</p>
                                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside bg-white p-3 rounded border border-gray-200">
                                        <li>PayPayアプリを開く</li>
                                        <li>「送る」をタップ</li>
                                        <li>送金先ID: <span className="font-mono font-bold">{payment.paypayInfo || '未設定'}</span></li>
                                        <li>金額を入力して送金</li>
                                    </ol>
                                    {payment.paypayInfo && (
                                        <button
                                            onClick={() => copyToClipboard(payment.paypayInfo, `paypay-${payment.id}`)}
                                            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                        >
                                            {copiedId === `paypay-${payment.id}` ? '✓ コピーしました' : '📋 送金先IDをコピー'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Paid Section */}
            {paidPayments.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-green-600 mb-3 flex items-center gap-1">
                        ✅ 支払い済み ({paidPayments.length}件)
                    </h4>
                    {paidPayments.map((payment) => (
                        <div key={payment.id} className="bg-green-50 rounded-lg p-3 mb-2 flex justify-between items-center">
                            <span className="text-gray-700">{payment.description}</span>
                            <span className="font-medium text-green-600">
                                ¥{payment.amount.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
