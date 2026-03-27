'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getEvent, deleteEvent, BoiledEvent } from '@/lib/firestore';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<BoiledEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole') || 'member');
    getEvent(id).then(e => {
      setEvent(e);
      setLoading(false);
    });
  }, [id]);

  const handleDelete = async () => {
    if (!event) return;
    if (!confirm(`「${event.title}」を削除しますか？`)) return;
    await deleteEvent(id);
    router.push('/events');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <p className="text-white/30 text-sm">イベントが見つかりません</p>
        <Link href="/events" className="text-blue-400 text-xs mt-2 inline-block">← イベント一覧に戻る</Link>
      </div>
    );
  }

  const date = new Date(event.date);
  const dateStr = `${date.getMonth() + 1}月${date.getDate()}日（${DAY_LABELS[date.getDay()]}）`;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link href="/events" className="text-xs text-white/30 hover:text-white/60 transition-colors">
        ← イベント一覧
      </Link>

      {/* メインカード */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">{event.title}</h1>
            <p className="text-white/50 text-sm mt-1">{dateStr}</p>
          </div>
          {userRole === 'admin' && (
            <Link href={`/events/${id}/edit`}
              className="text-xs px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.08] text-white/50 rounded-lg transition-colors shrink-0">
              編集
            </Link>
          )}
        </div>

        {/* 基本情報グリッド */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {event.location && (
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">会場</p>
              <p className="text-sm text-white/80">{event.location}</p>
            </div>
          )}
          {event.meetingTime && (
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">集合時間</p>
              <p className="text-sm text-white/80">{event.meetingTime}</p>
            </div>
          )}
          {event.meetingLocation && (
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">集合場所</p>
              <p className="text-sm text-white/80">{event.meetingLocation}</p>
            </div>
          )}
        </div>

        {/* タイムテーブル */}
        {(event.timetableImageUrl || (event.timetable && event.timetable.length > 0)) && (
          <div>
            <p className="text-[11px] text-white/30 uppercase tracking-wider mb-3">タイムテーブル</p>
            {event.timetableImageUrl ? (
              <img src={event.timetableImageUrl} alt="タイムテーブル" className="w-full rounded-lg" />
            ) : (
              <div>
                {event.timetable.map((row, i) => (
                  <div key={i} className="flex items-start gap-4 py-2.5 border-b border-white/[0.05] last:border-0">
                    <span className="text-sm font-mono text-white/40 w-12 shrink-0 pt-0.5">{row.time}</span>
                    <span className="text-sm text-white/80">{row.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* メモ */}
        {event.note && (
          <div>
            <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1">備考</p>
            <p className="text-sm text-white/60 whitespace-pre-wrap">{event.note}</p>
          </div>
        )}
      </div>

      {/* 画像ギャラリー */}
      {event.imageUrls && event.imageUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {event.imageUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="block aspect-video rounded-xl overflow-hidden bg-white/[0.04] hover:opacity-90 transition-opacity">
              <img src={url} alt="" className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {/* Admin: 削除 */}
      {userRole === 'admin' && (
        <div className="flex justify-end">
          <button
            onClick={handleDelete}
            className="text-xs text-white/30 hover:text-red-400 transition-colors underline decoration-white/20 underline-offset-4"
          >
            このイベントを削除
          </button>
        </div>
      )}
    </div>
  );
}
