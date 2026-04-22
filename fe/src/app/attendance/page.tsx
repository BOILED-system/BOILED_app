'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getPracticeSessions,
  getMyRSVPs,
  getSessionRSVPs,
  submitRSVP,
  getUser,
} from '@/lib/api';
import type { PracticeSession, PracticeRSVP } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  GO: '出席',
  NO: '欠席',
  LATE: '遅刻',
  EARLY: '早退',
};

const STATUS_COLORS: Record<string, string> = {
  GO: 'bg-emerald-500/20 text-emerald-400',
  NO: 'bg-red-500/20 text-red-400',
  LATE: 'bg-yellow-500/20 text-yellow-400',
  EARLY: 'bg-orange-500/20 text-orange-400',
};

interface SessionRow {
  session: PracticeSession;
  myRSVP: PracticeRSVP | null;
  allRSVPs: PracticeRSVP[];
}

export default function AttendancePage() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [userRole, setUserRole] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const mid = localStorage.getItem('memberId') || '';
    const role = localStorage.getItem('userRole') || 'member';
    setMemberId(mid);
    setUserRole(role);
    load(mid, role);
  }, []);

  const load = async (mid: string, role: string) => {
    try {
      const sessions = await getPracticeSessions();
      const today = new Date().toISOString().split('T')[0];
      const upcoming = sessions
        .filter(s => s.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
      const past = sessions
        .filter(s => s.date < today)
        .sort((a, b) => b.date.localeCompare(a.date));
      const sorted = [...upcoming, ...past];

      const myRSVPsMap = mid ? await getMyRSVPs(mid) : {};
      const result = await Promise.all(
        sorted.map(async session => {
          const myRSVP = myRSVPsMap[session.id] ?? null;
          const allRSVPs = role === 'admin' ? await getSessionRSVPs(session.id) : [];
          return { session, myRSVP, allRSVPs };
        })
      );

      setRows(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRSVP = async (sessionId: string, status: 'GO' | 'NO') => {
    if (!memberId) return;
    setSaving(sessionId);
    try {
      const user = await getUser(memberId);
      await submitRSVP({
        sessionId,
        memberId,
        name: user?.name || '',
        genre: user?.genre || '',
        generation: user?.generation || 0,
        status,
        note: '',
      });
      const newRSVP: PracticeRSVP = {
        memberId,
        name: user?.name || '',
        genre: user?.genre || '',
        generation: user?.generation || 0,
        status,
        note: '',
        updatedAt: new Date(),
      };
      setRows(prev => prev.map(row =>
        row.session.id === sessionId
          ? {
              ...row,
              myRSVP: newRSVP,
              allRSVPs: userRole === 'admin'
                ? [...row.allRSVPs.filter(r => r.memberId !== memberId), newRSVP]
                : row.allRSVPs,
            }
          : row
      ));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-white">出欠</h1>

      {rows.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/30 text-sm">練習がまだありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ session, myRSVP, allRSVPs }) => {
            const isUpcoming = session.date >= today;
            const isExpanded = expandedId === session.id;
            const goCount = allRSVPs.filter(r => r.status === 'GO').length;
            const noCount = allRSVPs.filter(r => r.status === 'NO').length;
            const lateCount = allRSVPs.filter(r => r.status === 'LATE').length;
            const earlyCount = allRSVPs.filter(r => r.status === 'EARLY').length;

            return (
              <div
                key={session.id}
                className={`bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden transition-opacity ${!isUpcoming ? 'opacity-50' : ''}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* セッション情報 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          session.type === 'event'
                            ? 'bg-orange-500/20 text-orange-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {session.type === 'event' ? 'イベント練' : '正規練'}
                        </span>
                        {!isUpcoming && (
                          <span className="text-[10px] text-white/20">終了</span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-white">{session.name}</h3>
                      <p className="text-xs text-white/40 mt-0.5">
                        {session.date} {session.startTime}
                        {session.location && ` · ${session.location}`}
                      </p>
                    </div>

                    {/* Member: 自分のRSVP */}
                    {userRole !== 'admin' && (
                      <div className="flex-shrink-0">
                        {myRSVP ? (
                          <Link href={`/practices/${session.id}`}>
                            <span className={`text-[11px] px-2.5 py-1 rounded-lg ${STATUS_COLORS[myRSVP.status]}`}>
                              {STATUS_LABELS[myRSVP.status]}
                            </span>
                          </Link>
                        ) : isUpcoming ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleQuickRSVP(session.id, 'GO')}
                              disabled={saving === session.id}
                              className="text-[11px] px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 disabled:opacity-40 transition-colors"
                            >
                              出席
                            </button>
                            <button
                              onClick={() => handleQuickRSVP(session.id, 'NO')}
                              disabled={saving === session.id}
                              className="text-[11px] px-2.5 py-1 bg-white/[0.06] text-white/40 rounded-lg hover:bg-white/[0.08] disabled:opacity-40 transition-colors"
                            >
                              欠席
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-white/20">未登録</span>
                        )}
                      </div>
                    )}

                    {/* Admin: 集計バッジ */}
                    {userRole === 'admin' && (
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <div className="flex gap-1.5 text-[10px]">
                          {goCount > 0 && <span className="text-emerald-400">出 {goCount}</span>}
                          {noCount > 0 && <span className="text-red-400">欠 {noCount}</span>}
                          {lateCount > 0 && <span className="text-yellow-400">遅 {lateCount}</span>}
                          {earlyCount > 0 && <span className="text-orange-400">早 {earlyCount}</span>}
                          {allRSVPs.length === 0 && <span className="text-white/20">未登録</span>}
                        </div>
                        {allRSVPs.length > 0 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : session.id)}
                            className="text-[11px] text-white/30 hover:text-white/60 transition-colors ml-1"
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 詳細リンク */}
                  <div className="mt-2.5 flex items-center justify-between">
                    {userRole === 'admin' && myRSVP && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[myRSVP.status]}`}>
                        自分: {STATUS_LABELS[myRSVP.status]}
                      </span>
                    )}
                    {userRole === 'admin' && !myRSVP && isUpcoming && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleQuickRSVP(session.id, 'GO')}
                          disabled={saving === session.id}
                          className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 disabled:opacity-40 transition-colors"
                        >
                          出席
                        </button>
                        <button
                          onClick={() => handleQuickRSVP(session.id, 'NO')}
                          disabled={saving === session.id}
                          className="text-[10px] px-2 py-0.5 bg-white/[0.06] text-white/30 rounded hover:bg-white/[0.08] disabled:opacity-40 transition-colors"
                        >
                          欠席
                        </button>
                      </div>
                    )}
                    {(!myRSVP || !isUpcoming) && <span />}
                    <Link
                      href={`/practices/${session.id}`}
                      className="text-[11px] text-white/20 hover:text-blue-400 transition-colors"
                    >
                      詳細・変更 →
                    </Link>
                  </div>
                </div>

                {/* Admin: 展開時の全員一覧 */}
                {userRole === 'admin' && isExpanded && allRSVPs.length > 0 && (
                  <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
                    {allRSVPs
                      .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
                      .map(rsvp => (
                        <div key={rsvp.memberId} className="flex items-center justify-between px-4 py-2">
                          <div>
                            <span className="text-xs text-white/60">{rsvp.name}</span>
                            <span className="text-[10px] text-white/30 ml-1.5">
                              {rsvp.generation ? `${rsvp.generation}代` : ''} {rsvp.genre}
                            </span>
                            {rsvp.note && (
                              <p className="text-[10px] text-white/25 mt-0.5">{rsvp.note}</p>
                            )}
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[rsvp.status]}`}>
                            {STATUS_LABELS[rsvp.status]}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
