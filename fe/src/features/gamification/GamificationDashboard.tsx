'use client';

import { useEffect, useState } from 'react';
import { api, SettlementWithPayment } from '@/lib/api/client';

interface GamificationStats {
    totalCoins: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
    paidCount: number;
    avgSpeedDays: number;
    rank: string;
}

function calculateStats(paid: SettlementWithPayment[]): GamificationStats {
    let totalCoins = 0;
    let totalXP = 0;
    let totalSpeedDays = 0;
    let speedCount = 0; // Only count items where we can calculate speed

    for (const item of paid) {
        // Coins = settlement amount
        totalCoins += item.settlement.amount;

        // XP bonus based on payment speed
        const reportedAt = item.payment?.reportedAt;
        const dueAt = item.settlement.dueAt;
        const createdAt = item.settlement.createdAt;

        if (reportedAt && dueAt && createdAt) {
            const dueDate = new Date(dueAt).getTime();
            const reportedDate = new Date(reportedAt).getTime();
            const createdDate = new Date(createdAt).getTime();

            // Guard against invalid dates
            if (!isNaN(dueDate) && !isNaN(reportedDate) && !isNaN(createdDate)) {
                const totalWindow = Math.max(dueDate - createdDate, 1);
                const timeTaken = Math.max(reportedDate - createdDate, 0);
                const speedRatio = 1 - Math.min(timeTaken / totalWindow, 1); // 1 = instant, 0 = at deadline

                const daysToPayment = Math.max(0, (reportedDate - createdDate) / (1000 * 60 * 60 * 24));
                totalSpeedDays += daysToPayment;
                speedCount++;

                // Base XP: 50 per payment + speed bonus up to 100
                const speedBonus = Math.floor(speedRatio * 100);
                totalXP += 50 + speedBonus;
            } else {
                totalXP += 50;
            }
        } else {
            totalXP += 50;
        }
    }

    // Level calculation: 200 XP per level
    const xpPerLevel = 200;
    const level = Math.floor(totalXP / xpPerLevel) + 1;
    const xp = totalXP % xpPerLevel;
    const xpToNextLevel = xpPerLevel;

    const avgSpeedDays = speedCount > 0 ? totalSpeedDays / speedCount : 0;

    // Rank title based on level
    let rank = '🥉 ブロンズ';
    if (level >= 10) rank = '💎 ダイヤモンド';
    else if (level >= 7) rank = '🥇 ゴールド';
    else if (level >= 4) rank = '🥈 シルバー';

    return { totalCoins, level, xp, xpToNextLevel, paidCount: paid.length, avgSpeedDays, rank };
}

export default function GamificationDashboard() {
    const [stats, setStats] = useState<GamificationStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const mySettlements = await api.getMySettlements();
                const calculatedStats = calculateStats(mySettlements.paid || []);
                setStats(calculatedStats);
            } catch (error) {
                console.error('Failed to fetch gamification data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-white/5 rounded w-1/3 mb-4"></div>
                <div className="h-24 bg-white/5 rounded"></div>
            </div>
        );
    }

    if (!stats) return null;

    const xpPercent = Math.min((stats.xp / stats.xpToNextLevel) * 100, 100);

    return (
        <div className="bg-gradient-to-br from-[#1a1f2e] to-[#0f1420] border border-white/10 rounded-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    支払いダッシュボード
                </h2>
                <span className="text-sm px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30">
                    {stats.rank}
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
                {/* Coins */}
                <div className="bg-black/30 rounded-xl p-4 text-center border border-white/5">
                    <div className="text-2xl mb-1">🪙</div>
                    <p className="text-2xl font-bold text-yellow-400">{stats.totalCoins.toLocaleString()}</p>
                    <p className="text-xs text-[#8b98b0] mt-1">コイン</p>
                </div>

                {/* Level */}
                <div className="bg-black/30 rounded-xl p-4 text-center border border-white/5">
                    <div className="text-2xl mb-1">⚡</div>
                    <p className="text-2xl font-bold text-blue-400">Lv.{stats.level}</p>
                    <p className="text-xs text-[#8b98b0] mt-1">レベル</p>
                </div>

                {/* Paid Count */}
                <div className="bg-black/30 rounded-xl p-4 text-center border border-white/5">
                    <div className="text-2xl mb-1">✅</div>
                    <p className="text-2xl font-bold text-green-400">{stats.paidCount}</p>
                    <p className="text-xs text-[#8b98b0] mt-1">支払い回数</p>
                </div>
            </div>

            {/* XP Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs">
                    <span className="text-[#8b98b0]">次のレベルまで</span>
                    <span className="text-blue-400 font-medium">{stats.xp} / {stats.xpToNextLevel} XP</span>
                </div>
                <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${xpPercent}%` }}
                    />
                </div>
            </div>

            {/* Speed Badge */}
            {stats.paidCount > 0 && (
                <div className="flex items-center gap-3 bg-black/20 rounded-xl p-3 border border-white/5">
                    <span className="text-xl">🚀</span>
                    <div className="flex-1">
                        <p className="text-sm text-white font-medium">平均支払い速度</p>
                        <p className="text-xs text-[#8b98b0]">
                            {stats.avgSpeedDays < 1
                                ? '即日支払い！🔥'
                                : `約 ${Math.round(stats.avgSpeedDays)} 日`
                            }
                        </p>
                    </div>
                    {stats.avgSpeedDays < 3 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                            速い！
                        </span>
                    )}
                </div>
            )}

            {/* How it works */}
            <div className="text-xs text-[#5a6580] pt-2 border-t border-white/5">
                💡 支払い金額がコインに。早く払うほどXPボーナスが増えてレベルアップ！
            </div>
        </div>
    );
}
