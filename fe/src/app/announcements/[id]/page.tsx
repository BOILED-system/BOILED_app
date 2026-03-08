'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, AnnouncementDetail } from '@/lib/api/client';
import { useUser } from '@/components/providers/UserContext';

export default function AnnouncementDetailPage() {
    const params = useParams();
    const announcementId = params.id as string;
    const { currentUser } = useUser();

    const [detail, setDetail] = useState<AnnouncementDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const data = await api.getAnnouncement(announcementId, currentUser.id);
                setDetail(data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchDetail();
    }, [announcementId, currentUser.id]);

    if (loading) {
        return (
            <div className="max-w-lg mx-auto space-y-3">
                <div className="h-6 bg-white/[0.03] rounded w-24 animate-pulse" />
                <div className="h-48 bg-white/[0.03] rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="text-center py-20">
                <p className="text-white/40 text-sm">お知らせが見つかりません</p>
                <Link href="/announcements" className="text-blue-400 text-sm mt-2 inline-block">← 戻る</Link>
            </div>
        );
    }

    const { announcement, attendance, payments } = detail;
    const createdDate = new Date(announcement.createdAt);
    const formattedDate = `${createdDate.getFullYear()}/${createdDate.getMonth() + 1}/${createdDate.getDate()}`;

    return (
        <div className="max-w-lg mx-auto space-y-3">
            <Link href="/announcements" className="text-white/30 hover:text-white/60 text-xs inline-flex items-center gap-1 transition-colors">
                ← お知らせ一覧
            </Link>

            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden animate-fade-in">
                {announcement.imageUrl && (
                    <div className="relative h-48 overflow-hidden">
                        <img src={announcement.imageUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                )}
                <div className="p-5">
                    <p className="text-xs text-white/25 mb-2">{formattedDate}</p>
                    <h1 className="text-lg font-semibold text-white mb-4">{announcement.title}</h1>
                    <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{announcement.body}</p>
                </div>
            </div>

            {attendance && (
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">出欠</p>
                    <span className={`text-sm ${attendance.status === 'GO' ? 'text-emerald-400' :
                        attendance.status === 'NO' ? 'text-white/30' :
                            'text-amber-400'
                        }`}>
                        {attendance.status === 'GO' ? '出席' :
                            attendance.status === 'NO' ? '欠席' :
                                attendance.status === 'LATE' ? '遅刻' :
                                    attendance.status === 'EARLY' ? '早退' : attendance.status}
                    </span>
                </div>
            )}

            {payments && payments.length > 0 && (
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">精算</p>
                    <div className="space-y-2">
                        {payments.map(p => (
                            <div key={p.id} className="flex items-center justify-between py-2">
                                <span className="text-sm text-white/60">{p.description}</span>
                                <div className="text-right">
                                    <span className="text-sm font-medium text-white">¥{p.amount.toLocaleString()}</span>
                                    <span className={`text-[10px] ml-2 ${p.isPaid ? 'text-emerald-400' : 'text-white/25'}`}>
                                        {p.isPaid ? '済' : '未払'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {announcement.eventId && (
                <Link href={`/events/${announcement.eventId}`}
                    className="block py-3 text-center text-xs text-white/30 hover:text-white/60 bg-white/[0.02] border border-white/[0.06] rounded-xl transition-colors">
                    イベント詳細・出欠入力へ →
                </Link>
            )}
        </div>
    );
}
