'use client';

import { useUser } from '@/components/providers/UserContext';
import { api, SettlementWithPayment } from '@/lib/api/client';
import { DEFAULT_CIRCLE_ID } from '@/lib/constants';
import { MOCK_USERS } from '@/lib/constants/users';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ChatPanel from '@/components/ChatPanel';

interface GamificationStats {
    totalCoins: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
    paidCount: number;
}

interface AlertItem {
    type: 'rsvp' | 'payment';
    eventId: string; // or session ID or settlement ID
    eventTitle: string;
    settlementTitle?: string;
    amount?: number;
    subTitle?: string;
    link: string;
}

function calculateStats(paid: SettlementWithPayment[]): GamificationStats {
    let totalCoins = 0;
    let totalXP = 0;

    for (const item of paid) {
        totalCoins += item.settlement.amount;
        const reportedAt = item.payment?.reportedAt;
        const dueAt = item.settlement.dueAt;
        const createdAt = item.settlement.createdAt;

        if (reportedAt && dueAt && createdAt) {
            const dueDate = new Date(dueAt).getTime();
            const reportedDate = new Date(reportedAt).getTime();
            const createdDate = new Date(createdAt).getTime();
            if (!isNaN(dueDate) && !isNaN(reportedDate) && !isNaN(createdDate)) {
                const totalWindow = Math.max(dueDate - createdDate, 1);
                const timeTaken = Math.max(reportedDate - createdDate, 0);
                const speedRatio = 1 - Math.min(timeTaken / totalWindow, 1);
                totalXP += 50 + Math.floor(speedRatio * 100);
            } else { totalXP += 50; }
        } else { totalXP += 50; }
    }

    const xpPerLevel = 200;
    const level = Math.floor(totalXP / xpPerLevel) + 1;
    const xp = totalXP % xpPerLevel;

    return { totalCoins, level, xp, xpToNextLevel: xpPerLevel, paidCount: paid.length };
}

export default function ProfilePage() {
    const { currentUser } = useUser();
    const [stats, setStats] = useState<GamificationStats | null>(null);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [allUsersStats, setAllUsersStats] = useState<{ name: string; avatarUrl: string; coins: number; level: number }[]>([]);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            const alertItems: AlertItem[] = [];
            let mySettlements: { unpaid: SettlementWithPayment[]; paid: SettlementWithPayment[] } = { unpaid: [], paid: [] };

            // 1. Settlements & Stats
            try {
                mySettlements = await api.getMySettlements();
                const calculatedStats = calculateStats(mySettlements.paid || []);
                setStats(calculatedStats);
            } catch (error) {
                console.error('Failed to fetch settlements:', error);
                setStats({ totalCoins: 0, level: 1, xp: 0, xpToNextLevel: 100, paidCount: 0 });
            }

            // 2. Event RSVPs
            try {
                const events = await api.getEvents(DEFAULT_CIRCLE_ID);
                const now = new Date();
                for (const event of events) {
                    if (new Date(event.startAt) < now) continue;

                    // Check if target user
                    if (event.rsvpTargetUserIds && event.rsvpTargetUserIds.length > 0) {
                        const knownUserIds = MOCK_USERS.map(u => u.id);
                        const hasValidTargets = event.rsvpTargetUserIds.some(id => knownUserIds.includes(id));
                        if (hasValidTargets && !event.rsvpTargetUserIds.includes(currentUser.id)) continue;
                    }

                    try {
                        const rsvp = await api.getMyRSVP(event.id);
                        if (!rsvp) {
                            alertItems.push({
                                type: 'rsvp',
                                eventId: event.id,
                                eventTitle: `【イベント】${event.title}`,
                                subTitle: new Date(event.startAt).toLocaleDateString(),
                                link: `/events/${event.id}`
                            });
                        }
                    } catch {
                        alertItems.push({
                            type: 'rsvp',
                            eventId: event.id,
                            eventTitle: `【イベント】${event.title}`,
                            subTitle: new Date(event.startAt).toLocaleDateString(),
                            link: `/events/${event.id}`
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to fetch events:', error);
            }

            // 3. Practice RSVPs
            try {
                const seriesList = await api.getPracticeSeries(DEFAULT_CIRCLE_ID);
                const now = new Date();
                for (const series of seriesList) {
                    try {
                        const detail = await api.getPracticeSeriesDetail(series.id);
                        for (const session of (detail.sessions || [])) {
                            if (session.cancelled) continue;
                            if (new Date(session.date) < now) continue;
                            const rsvp = detail.myRsvps?.find(r => r.sessionId === session.id);
                            if (!rsvp) {
                                alertItems.push({
                                    type: 'rsvp',
                                    eventId: session.id,
                                    eventTitle: `【練習】${series.name}`,
                                    subTitle: new Date(session.date).toLocaleDateString(),
                                    link: `/practices/${series.id}`
                                });
                            }
                        }
                    } catch (e) {
                        console.error('Failed to check practice rsvps:', e);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch practice series:', error);
            }

            // 4. Unpaid Settlements
            for (const item of (mySettlements.unpaid || [])) {
                if (item.settlement.eventId) {
                    try {
                        const rsvp = await api.getMyRSVP(item.settlement.eventId);
                        if (!rsvp || !['GO', 'LATE', 'EARLY'].includes(rsvp.status)) {
                            continue;
                        }
                    } catch {
                        continue;
                    }
                }
                alertItems.push({
                    type: 'payment',
                    eventId: item.settlement.id,
                    eventTitle: item.settlement.title,
                    settlementTitle: item.settlement.title,
                    amount: item.settlement.amount,
                    link: `/payments`
                });
            }

            setAlerts(alertItems);

            // 5. Ranking
            const calcStats = stats || { totalCoins: 0, level: 1 };
            const rankingData = MOCK_USERS.map((u) => {
                // Deterministic mock stats for other users based on their ID string
                let mockCoins = 0;
                let mockLevel = 1;

                if (u.id === currentUser.id) {
                    mockCoins = calcStats.totalCoins;
                    mockLevel = calcStats.level;
                } else {
                    // Simple hash function to generate stable random numbers
                    let hash = 0;
                    for (let i = 0; i < u.id.length; i++) {
                        hash = ((hash << 5) - hash) + u.id.charCodeAt(i);
                        hash |= 0; // Convert to 32bit integer
                    }
                    const seed = Math.abs(hash);
                    mockLevel = (seed % 20) + 1; // Level 1-20
                    mockCoins = (seed % 10000) * (mockLevel / 2); // Coins roughly correlated with level
                }

                return {
                    name: u.name,
                    avatarUrl: u.avatarUrl,
                    coins: Math.floor(mockCoins),
                    level: mockLevel,
                };
            });
            // Sort by Level desc, then Coins desc
            rankingData.sort((a, b) => {
                if (b.level !== a.level) return b.level - a.level;
                return b.coins - a.coins;
            });
            setAllUsersStats(rankingData);

            setLoading(false);
        };
        fetchAll();
    }, [currentUser.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    const xpPercent = stats ? Math.min((stats.xp / stats.xpToNextLevel) * 100, 100) : 0;
    const rsvpAlerts = alerts.filter(a => a.type === 'rsvp');
    const paymentAlerts = alerts.filter(a => a.type === 'payment');

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Dashboard Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column: Stats & Ranking */}
                <div className="md:col-span-2 space-y-6">
                    {/* Profile & Level Card */}
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6 animate-fade-in relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                        <div className="flex items-center gap-5 relative">
                            <img
                                src={currentUser.avatarUrl}
                                alt={currentUser.name}
                                className="w-16 h-16 rounded-full ring-2 ring-white/10"
                            />
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl font-bold text-white mb-2">{currentUser.name}</h1>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs text-white/50">
                                        <span>Lv.{stats?.level}</span>
                                        <span>Next: {stats?.xpToNextLevel ? stats.xpToNextLevel - stats.xp : 0}xp</span>
                                    </div>
                                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${xpPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/[0.06]">
                            <div>
                                <p className="text-2xl font-bold text-white tabular-nums">{stats?.totalCoins.toLocaleString()}</p>
                                <p className="text-xs text-white/30 mt-0.5">Total Coins</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white tabular-nums">{stats?.paidCount}</p>
                                <p className="text-xs text-white/30 mt-0.5">Paid Events</p>
                            </div>
                        </div>
                    </div>

                    {/* Ranking Card */}
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">サークル内順位</h2>
                            <span className="text-xs text-white/30">{allUsersStats.length}人中</span>
                        </div>
                        <div className="space-y-2">
                            {allUsersStats.map((user, index) => {
                                const isMe = user.name === currentUser.name;
                                return (
                                    <div
                                        key={user.name}
                                        className={`flex items-center gap-3 py-2 px-3 -mx-2 rounded-lg transition-colors ${isMe ? 'bg-blue-500/[0.15] border border-blue-500/20' : 'hover:bg-white/[0.02]'
                                            }`}
                                    >
                                        <div className={`w-6 text-center font-bold text-sm ${index === 0 ? 'text-yellow-400' :
                                            index === 1 ? 'text-gray-300' :
                                                index === 2 ? 'text-amber-600' : 'text-white/20'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-white/10" />
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm truncate ${isMe ? 'text-white font-medium' : 'text-white/70'}`}>
                                                {user.name}
                                            </div>
                                            <div className="text-[10px] text-white/30">Lv.{user.level}</div>
                                        </div>
                                        <div className="text-sm font-medium text-white/50 tabular-nums">
                                            {user.coins.toLocaleString()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Alerts & Notices */}
                <div className="space-y-6">
                    {/* Alerts Section */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider pl-1">アクション</h2>

                        {(rsvpAlerts.length === 0 && paymentAlerts.length === 0) ? (
                            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-8 text-center animate-fade-in">
                                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="text-xl">✓</span>
                                </div>
                                <p className="text-white/50 text-sm">現在対応が必要なものはありません</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rsvpAlerts.map((alert, i) => (
                                    <Link
                                        key={`rsvp-${i}`}
                                        href={alert.link}
                                        className="block bg-blue-500/[0.05] border border-blue-500/10 hover:border-blue-500/30 rounded-xl p-4 transition-all group animate-slide-in-right"
                                        style={{ animationDelay: `${i * 50}ms` }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">出欠未登録</span>
                                                    <span className="text-xs text-white/40">{alert.subTitle}</span>
                                                </div>
                                                <h3 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                                    {alert.eventTitle}
                                                </h3>
                                            </div>
                                            <span className="text-white/20 group-hover:translate-x-1 transition-transform">→</span>
                                        </div>
                                    </Link>
                                ))}

                                {paymentAlerts.map((alert, i) => (
                                    <Link
                                        key={`pay-${i}`}
                                        href={alert.link}
                                        className="block bg-rose-500/[0.05] border border-rose-500/10 hover:border-rose-500/30 rounded-xl p-4 transition-all group animate-slide-in-right"
                                        style={{ animationDelay: `${(rsvpAlerts.length + i) * 50}ms` }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">未払い</span>
                                                </div>
                                                <h3 className="text-sm font-medium text-white group-hover:text-rose-400 transition-colors">
                                                    {alert.settlementTitle}
                                                </h3>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-sm font-bold text-white">¥{alert.amount?.toLocaleString()}</span>
                                                <span className="text-[10px] text-white/30">期限: --/--</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ChatPanel circleId={DEFAULT_CIRCLE_ID} />
        </div>
    );
}
