'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getEvent, deleteEvent, getLineMessages, linkLineMessageToEvent } from '@/lib/api';
import type { BoiledEvent, LineMessage } from '@/lib/api';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function formatDateTime(createdAt: any): string {
  if (!createdAt) return '';
  const d = new Date(typeof createdAt === 'object' && createdAt._seconds
    ? createdAt._seconds * 1000
    : createdAt);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<BoiledEvent | null>(null);
  const [lineMessages, setLineMessages] = useState<LineMessage[]>([]);
  const [allLineMessages, setAllLineMessages] = useState<LineMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [memberId, setMemberId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole') || 'member');
    setMemberId(localStorage.getItem('memberId') || '');
    Promise.all([
      getEvent(id),
      getLineMessages(id).catch(() => [] as LineMessage[]),
    ]).then(([ev, msgs]) => {
      setEvent(ev);
      setLineMessages(msgs);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [id]);

  // 管理者用: 未紐付けメッセージ一覧を取得
  const loadAllMessages = async () => {
    const msgs = await getLineMessages();
    setAllLineMessages(msgs.filter(m => !m.linkedEventId));
    setShowLinkPanel(true);
  };

  const handleLink = async (msgId: string) => {
    setLinking(msgId);
    await linkLineMessageToEvent(msgId, id);
    const [linked, all] = await Promise.all([getLineMessages(id), getLineMessages()]);
    setLineMessages(linked);
    setAllLineMessages(all.filter(m => !m.linkedEventId));
    setLinking(null);
  };

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
  const dateStr = event.endDate
    ? (() => {
        const end = new Date(event.endDate);
        return `${date.getMonth() + 1}月${date.getDate()}日（${DAY_LABELS[date.getDay()]}）〜${end.getMonth() + 1}月${end.getDate()}日（${DAY_LABELS[end.getDay()]}）`;
      })()
    : `${date.getMonth() + 1}月${date.getDate()}日（${DAY_LABELS[date.getDay()]}）`;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24">
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
          {userRole === 'admin' && (!event.createdBy || event.createdBy === memberId) && (
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

      {/* ─── LINEメッセージ履歴 ────────────────────── */}
      {(lineMessages.length > 0 || userRole === 'admin') && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-green-400">LINE 連絡履歴</span>
              {lineMessages.length > 0 && (
                <span className="text-[11px] text-white/20 bg-white/[0.06] px-1.5 py-0.5 rounded-full">
                  {lineMessages.length}件
                </span>
              )}
            </div>
            <span className={`text-white/25 text-xs transition-transform ${showHistory ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {showHistory && (
            <div className="border-t border-white/[0.06]">
              {lineMessages.length === 0 ? (
                <p className="text-xs text-white/25 px-4 py-3">このイベントに紐付けられたLINEメッセージはありません</p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {lineMessages.map(msg => (
                    <div key={msg.id} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded font-medium">LINE</span>
                        <span className="text-[11px] text-white/25">{formatDateTime(msg.createdAt)}</span>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 管理者: 未紐付けメッセージをここに紐付ける */}
              {userRole === 'admin' && (
                <div className="border-t border-white/[0.06] px-4 py-3">
                  {!showLinkPanel ? (
                    <button
                      onClick={loadAllMessages}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                      + LINEメッセージをこのイベントに紐付ける
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-white/30">未紐付けのLINEメッセージ</p>
                      {allLineMessages.length === 0 ? (
                        <p className="text-xs text-white/20">紐付け可能なメッセージがありません</p>
                      ) : (
                        allLineMessages.map(msg => (
                          <div key={msg.id} className="flex items-start gap-3 bg-white/[0.03] rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-white/25 mb-0.5">{formatDateTime(msg.createdAt)}</p>
                              <p className="text-xs text-white/50 truncate">{msg.text}</p>
                            </div>
                            <button
                              onClick={() => handleLink(msg.id)}
                              disabled={linking === msg.id}
                              className="text-[11px] px-2.5 py-1 bg-green-500/15 text-green-400 rounded-lg hover:bg-green-500/25 disabled:opacity-50 shrink-0 transition-colors"
                            >
                              {linking === msg.id ? '...' : '紐付け'}
                            </button>
                          </div>
                        ))
                      )}
                      <button onClick={() => setShowLinkPanel(false)} className="text-[11px] text-white/20 hover:text-white/40">
                        閉じる
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin: 削除 */}
      {userRole === 'admin' && (!event.createdBy || event.createdBy === memberId) && (
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
