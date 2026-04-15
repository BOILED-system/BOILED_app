'use client';

import { useState, useEffect } from 'react';
import { getPracticeSessions, getMyRSVP, getNumberRosters, getUser, isSessionForMember } from '@/lib/api';
import CalendarView from '@/components/CalendarView';

const GENRES = ['Break', 'Girls', 'Hiphop', 'House', 'Lock', 'Pop', 'Waack'];

const STATUS_COLORS: Record<string, string> = {
  GO: '#10b981',
  NO: '#ef4444',
  LATE: '#eab308',
  EARLY: '#f97316',
};

export default function CalendarPage() {
  const [calendarItems, setCalendarItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showICalModal, setShowICalModal] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    const memberId = localStorage.getItem('memberId') || '';
    setBaseUrl(window.location.origin);
    load(memberId);
  }, []);

  const load = async (memberId: string) => {
    try {
      const [allSessions, rosters, user] = await Promise.all([
        getPracticeSessions(),
        getNumberRosters(),
        memberId ? getUser(memberId) : Promise.resolve(null),
      ]);

      const role = localStorage.getItem('userRole') || 'member';
      const genre = user?.genre || '';
      const generation = user?.generation || 0;

      const sessions = role === 'admin'
        ? allSessions
        : allSessions.filter(s => isSessionForMember(s, memberId, genre, generation, rosters));

      const items = await Promise.all(
        sessions.map(async (session: any) => {
          const rsvp = memberId ? await getMyRSVP(session.id, memberId) : null;
          const color = rsvp ? STATUS_COLORS[rsvp.status] : undefined;
          return {
            id: session.id,
            title: session.name,
            start: session.date,
            type: session.type === 'event' ? 'event' : 'practice',
            url: `/practices/${session.id}`,
            color,
          };
        })
      );
      setCalendarItems(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getICalUrl = (genre: string) => {
    const params = new URLSearchParams();
    if (genre) params.set('genre', genre);
    return `${baseUrl}/api/calendar?${params.toString()}`;
  };

  const getGoogleCalendarUrl = (genre: string) => {
    const icalUrl = getICalUrl(genre).replace(/^https?:\/\//, 'webcal://');
    return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(icalUrl)}`;
  };

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
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />未登録</span>
      </div>

      <div className="animate-fade-in">
        <CalendarView items={calendarItems} />
      </div>

      {showICalModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-white font-bold text-lg">Googleカレンダーに追加</h2>
            <p className="text-white/40 text-xs">自分のジャンルを選ぶと、そのジャンルの練習だけが追加されます。</p>

            <div className="space-y-2">
              <label className="text-xs text-white/30">ジャンルを選択</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedGenre('')}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${!selectedGenre ? 'bg-white text-black' : 'bg-white/[0.06] text-white/50'}`}
                >
                  全て
                </button>
                {GENRES.map(g => (
                  <button
                    key={g}
                    onClick={() => setSelectedGenre(g)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors ${selectedGenre === g ? 'bg-blue-500 text-white' : 'bg-white/[0.06] text-white/50'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <a
                href={getGoogleCalendarUrl(selectedGenre)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
              >
                Googleカレンダーに追加
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(getICalUrl(selectedGenre))}
                className="block w-full text-center py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white/60 text-sm rounded-lg transition-colors"
              >
                iCal URLをコピー（他のカレンダーアプリ用）
              </button>
            </div>

            <button onClick={() => setShowICalModal(false)} className="text-xs text-white/30 hover:text-white/50 w-full text-center">
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
