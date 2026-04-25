'use client';

import { useState, useEffect } from 'react';
import {
  getPracticeSessions,
  getMyRSVPs,
  getNumberRosters,
  getUser,
  getEvents,
  isSessionForMember,
} from '@/lib/api';
import CalendarView, { type CalendarItem } from '@/components/CalendarView';

const STATUS_COLORS: Record<string, string> = {
  GO: '#10b981',
  NO: '#ef4444',
  LATE: '#eab308',
  EARLY: '#f97316',
};

const PRACTICE_COLOR = '#3b82f6'; // blue
const EVENT_COLOR = '#ec4899';    // pink

const buildDateTime = (date: string, time: string): string => {
  if (!date) return '';
  if (!time) return date;
  return `${date}T${time}:00`;
};

const addHours = (time: string, hours: number): string => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + hours * 60;
  const hh = Math.floor((total / 60) % 24);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

export default function CalendarPage() {
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showICalModal, setShowICalModal] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    const mid = localStorage.getItem('memberId') || '';
    setMemberId(mid);
    setBaseUrl(window.location.origin);
    load(mid);
  }, []);

  const load = async (mid: string) => {
    try {
      const [allSessions, rosters, user, myRSVPsMap, events] = await Promise.all([
        getPracticeSessions(),
        getNumberRosters(),
        mid ? getUser(mid) : Promise.resolve(null),
        mid ? getMyRSVPs(mid) : Promise.resolve({} as Record<string, any>),
        getEvents(),
      ]);

      const genre = user?.genre || '';
      const generation = user?.generation || 0;

      const targetedSessions = allSessions.filter(s =>
        isSessionForMember(s, mid, genre, generation, rosters)
      );

      const practiceItems: CalendarItem[] = targetedSessions.map(session => {
        const rsvp = myRSVPsMap[session.id] ?? null;
        const color = rsvp ? STATUS_COLORS[rsvp.status] : PRACTICE_COLOR;
        const endTime = session.endTime || addHours(session.startTime, 2);
        const title = session.location ? `${session.name} / ${session.location}` : session.name;
        return {
          id: session.id,
          title,
          start: buildDateTime(session.date, session.startTime),
          end: endTime ? buildDateTime(session.date, endTime) : undefined,
          type: 'practice',
          url: `/practices/project/${encodeURIComponent(session.name)}`,
          color,
        };
      });

      const eventItems: CalendarItem[] = events.map(ev => {
        const startT = ev.meetingTime || '10:00';
        const endT = addHours(startT, 2);
        const loc = ev.location || ev.meetingLocation || '';
        const title = loc ? `${ev.title} / ${loc}` : ev.title;
        return {
          id: `ev-${ev.id}`,
          title,
          start: buildDateTime(ev.date, startT),
          end: buildDateTime(ev.date, endT),
          type: 'event',
          url: `/events/${ev.id}`,
          color: EVENT_COLOR,
        };
      });

      setCalendarItems([...practiceItems, ...eventItems]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || baseUrl).replace(/\/$/, '');
  const practicesICalUrl = memberId ? `${apiBase}/api/calendar/practices.ics?memberId=${memberId}` : '';
  const eventsICalUrl = `${apiBase}/api/calendar/events.ics`;
  const practicesGCalUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(practicesICalUrl.replace(/^https?:\/\//, 'webcal://'))}`;
  const eventsGCalUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(eventsICalUrl.replace(/^https?:\/\//, 'webcal://'))}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">カレンダー</h1>
        <button
          onClick={() => setShowICalModal(true)}
          className="text-xs px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
        >
          Googleカレンダーに追加
        </button>
      </div>

      <div className="flex gap-4 text-xs text-white/40 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />出席</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />欠席</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />遅刻</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />早退</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />未登録の練習</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" />イベント</span>
      </div>

      <div className="animate-fade-in">
        <CalendarView items={calendarItems} />
      </div>

      {showICalModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">Googleカレンダーに追加</h2>
              <button onClick={() => setShowICalModal(false)} aria-label="閉じる"
                className="text-white/30 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-lg">
                ×
              </button>
            </div>
            <p className="text-white/40 text-xs">
              自分が対象者になっている練習プロジェクトと、すべてのイベントを Google カレンダーに追加できます。練習はブルー、イベントはピンクで表示されます（追加後 Google カレンダーで色を変更できます）。
            </p>
            <p className="text-white/30 text-xs">
              一度追加すると自動で購読され、新しい練習・イベントは最大24時間以内に自動反映されます。
            </p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-blue-400">📘 練習プロジェクト（自分が対象）</p>
              <a href={practicesGCalUrl} target="_blank" rel="noopener noreferrer"
                className="block w-full text-center py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors">
                練習をGoogleカレンダーに追加
              </a>
              <button onClick={() => navigator.clipboard.writeText(practicesICalUrl)}
                className="block w-full text-center py-2 bg-white/[0.04] hover:bg-white/[0.08] text-white/50 text-xs rounded-lg transition-colors">
                iCal URLをコピー
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-pink-400">🎉 イベント</p>
              <a href={eventsGCalUrl} target="_blank" rel="noopener noreferrer"
                className="block w-full text-center py-2.5 bg-pink-500 hover:bg-pink-600 text-white text-sm rounded-lg transition-colors">
                イベントをGoogleカレンダーに追加
              </a>
              <button onClick={() => navigator.clipboard.writeText(eventsICalUrl)}
                className="block w-full text-center py-2 bg-white/[0.04] hover:bg-white/[0.08] text-white/50 text-xs rounded-lg transition-colors">
                iCal URLをコピー
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
