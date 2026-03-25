'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getPracticeSession,
  getMyRSVP,
  getSessionRSVPs,
  submitRSVP,
  getUser,
  PracticeSession,
  PracticeRSVP,
} from '@/lib/firestore';

const STATUS_LABELS: Record<string, string> = {
  GO: '出席',
  NO: '欠席',
  LATE: '遅刻',
  EARLY: '早退',
};

const STATUS_COLORS: Record<string, string> = {
  GO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  NO: 'bg-red-500/20 text-red-400 border-red-500/30',
  LATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  EARLY: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export default function PracticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [myRSVP, setMyRSVP] = useState<PracticeRSVP | null>(null);
  const [allRSVPs, setAllRSVPs] = useState<PracticeRSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [userRole, setUserRole] = useState('');
  const [status, setStatus] = useState<'GO' | 'NO' | 'LATE' | 'EARLY' | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    const mid = localStorage.getItem('memberId') || '';
    const role = localStorage.getItem('userRole') || 'member';
    setMemberId(mid);
    setUserRole(role);
    load(mid, role);
  }, [id]);

  const load = async (mid: string, role: string) => {
    const [s, rsvp] = await Promise.all([
      getPracticeSession(id),
      mid ? getMyRSVP(id, mid) : Promise.resolve(null),
    ]);
    setSession(s);
    if (rsvp) {
      setMyRSVP(rsvp);
      setStatus(rsvp.status);
      setNote(rsvp.note || '');
    }
    if (role === 'admin') {
      const rsvps = await getSessionRSVPs(id);
      setAllRSVPs(rsvps.sort((a, b) => a.name.localeCompare(b.name, 'ja')));
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!status || !memberId) return;
    setSaving(true);
    try {
      const user = await getUser(memberId);
      await submitRSVP({
        sessionId: id,
        memberId,
        name: user?.name || '',
        genre: user?.genre || '',
        generation: user?.generation || 0,
        status,
        note,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      const [rsvp, rsvps] = await Promise.all([
        getMyRSVP(id, memberId),
        userRole === 'admin' ? getSessionRSVPs(id) : Promise.resolve([]),
      ]);
      setMyRSVP(rsvp);
      if (userRole === 'admin') setAllRSVPs(rsvps.sort((a, b) => a.name.localeCompare(b.name, 'ja')));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-16">
        <p className="text-white/30 text-sm">練習が見つかりません</p>
        <Link href="/practices" className="text-blue-400 text-xs mt-2 inline-block">← 練習一覧に戻る</Link>
      </div>
    );
  }

  const goCount = allRSVPs.filter(r => r.status === 'GO').length;
  const noCount = allRSVPs.filter(r => r.status === 'NO').length;
  const lateCount = allRSVPs.filter(r => r.status === 'LATE').length;
  const earlyCount = allRSVPs.filter(r => r.status === 'EARLY').length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link href="/practices" className="text-xs text-white/30 hover:text-white/60 transition-colors">
        ← 練習一覧
      </Link>

      {/* セッション情報 */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          {session.type === 'event' ? (
            <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full">イベント練</span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">正規練</span>
          )}
        </div>
        <h1 className="text-lg font-bold text-white">{session.name}</h1>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <span className="text-xs text-white/40">
            {session.date} {session.startTime}{session.endTime ? `〜${session.endTime}` : ''}
          </span>
          {session.location && (
            <span className="text-xs text-white/30">{session.location}</span>
          )}
        </div>
        {session.note && (
          <p className="text-xs text-white/30 mt-2">{session.note}</p>
        )}
        <div className="flex gap-1 mt-3 flex-wrap">
          {session.targetGenres?.map((g: string) => (
            <span key={g} className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">{g}</span>
          ))}
          {session.targetGenerations?.map((g: number) => (
            <span key={g} className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">{g}期</span>
          ))}
        </div>
      </div>

      {/* 出欠登録フォーム */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 space-y-3">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">出欠登録</p>

        <div className="grid grid-cols-4 gap-2">
          {(['GO', 'NO', 'LATE', 'EARLY'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`py-2.5 text-xs rounded-lg border transition-all ${
                status === s
                  ? STATUS_COLORS[s] + ' border'
                  : 'bg-white/[0.04] text-white/30 border-white/[0.06] hover:text-white/60'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <textarea
          placeholder="メモ（任意）"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none"
          rows={2}
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-white/20">
            {myRSVP ? `前回: ${STATUS_LABELS[myRSVP.status]}` : '未登録'}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!status || saving}
            className={`text-xs px-5 py-2 rounded-lg font-medium transition-all ${
              saved
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-30 disabled:hover:bg-blue-500'
            }`}
          >
            {saving ? '保存中...' : saved ? '保存しました' : '登録する'}
          </button>
        </div>
      </div>

      {/* Admin: 全員の出欠一覧 */}
      {userRole === 'admin' && (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">出欠一覧</p>
            <div className="flex gap-2 text-[10px]">
              {goCount > 0 && <span className="text-emerald-400">出席 {goCount}</span>}
              {noCount > 0 && <span className="text-red-400">欠席 {noCount}</span>}
              {lateCount > 0 && <span className="text-yellow-400">遅刻 {lateCount}</span>}
              {earlyCount > 0 && <span className="text-orange-400">早退 {earlyCount}</span>}
            </div>
          </div>

          {allRSVPs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/20 text-xs">まだ登録がありません</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {allRSVPs.map(rsvp => (
                <div key={rsvp.memberId} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <span className="text-sm text-white/70">{rsvp.name}</span>
                    <span className="text-xs text-white/30 ml-2">
                      {rsvp.generation ? `${rsvp.generation}期` : ''} {rsvp.genre}
                    </span>
                    {rsvp.note && (
                      <p className="text-xs text-white/30 mt-0.5 truncate">{rsvp.note}</p>
                    )}
                  </div>
                  <span className={`ml-3 flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[rsvp.status]}`}>
                    {STATUS_LABELS[rsvp.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
