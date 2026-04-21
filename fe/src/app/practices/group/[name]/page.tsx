'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getPracticeSessions,
  getAllUsers,
  getSessionRSVPs,
  getNumberRosters,
  isSessionForMember,
} from '@/lib/api';
import type { PracticeSession, FEUser, PracticeRSVP } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = { GO: '出席', NO: '欠席', LATE: '遅刻', EARLY: '早退' };
const STATUS_SHORT: Record<string, string> = { GO: '○', NO: '×', LATE: '遅', EARLY: '早' };
const STATUS_COLORS: Record<string, string> = {
  GO: 'text-emerald-400',
  NO: 'text-red-400',
  LATE: 'text-yellow-400',
  EARLY: 'text-orange-400',
};

export default function GroupMatrixPage({ params }: { params: { name: string } }) {
  const router = useRouter();
  const groupName = decodeURIComponent(params.name);
  
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [users, setUsers] = useState<FEUser[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, Record<string, PracticeRSVP>>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [allSessions, allUsers, rosters] = await Promise.all([
        getPracticeSessions(),
        getAllUsers(),
        getNumberRosters(),
      ]);

      const matchedSessions = allSessions
        .filter(s => s.name === groupName)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (matchedSessions.length === 0) {
        setLoading(false);
        return;
      }
      setSessions(matchedSessions);

      // Determine targeted users. 
      // Simplest logic: if a user is targeted in ANY session of this group, they appear.
      const targetedUsers = allUsers.filter(u => 
        matchedSessions.some(s => isSessionForMember(s, u.memberId, u.genre, u.generation, rosters))
      ).sort((a, b) => parseInt(a.memberId) - parseInt(b.memberId));

      setUsers(targetedUsers);

      // Fetch RSVPs for all these sessions
      const rsvpsBySessionAndMember: Record<string, Record<string, PracticeRSVP>> = {};
      await Promise.all(matchedSessions.map(async (s) => {
        const sessionRsvps = await getSessionRSVPs(s.id);
        const mapForSession: Record<string, PracticeRSVP> = {};
        sessionRsvps.forEach(r => { mapForSession[r.memberId] = r; });
        rsvpsBySessionAndMember[s.id] = mapForSession;
      }));
      setRsvps(rsvpsBySessionAndMember);

    } catch (e) {
      console.error(e);
      alert('データ読み込みエラー');
    } finally {
      setLoading(false);
    }
  }, [groupName]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExportCSV = () => {
    let csv = `\uFEFF会員番号,名前,ジャンル,期,${sessions.map(s => `${s.date}(${s.startTime})`).join(',')}\n`;
    
    users.forEach(u => {
      let row = `${u.memberId},${u.name},${u.genre},${u.generation}`;
      sessions.forEach(s => {
        const rsvp = rsvps[s.id]?.[u.memberId];
        const stat = rsvp ? STATUS_LABELS[rsvp.status] : '未';
        const note = rsvp?.note ? ` (${rsvp.note.replace(/,/g, ' ')})` : '';
        row += `,${stat}${note}`;
      });
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${groupName}_出欠表.csv`;
    link.click();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin"/></div>;
  }

  if (sessions.length === 0) {
    return <div className="p-8 text-center text-white/50">該当する練習が見つかりません。</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/40 hover:text-white transition-colors">
            ← 戻る
          </button>
          <h1 className="text-xl font-bold text-white truncate max-w-[200px] sm:max-w-xs">{groupName} 出欠表</h1>
        </div>
        <button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
          <span>📋</span> CSV出力
        </button>
      </div>

      <div className="bg-[#141824] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/80 whitespace-nowrap">
            <thead className="bg-white/[0.04] text-xs uppercase text-white/50 border-b border-white/[0.08]">
              <tr>
                <th className="px-4 py-3 font-medium bg-[#1a1f2e] sticky left-0 z-10 w-20">会員番号</th>
                <th className="px-4 py-3 font-medium bg-[#1a1f2e] border-r border-white/[0.04] sticky left-[80px] z-10 min-w-[120px]">名前</th>
                <th className="px-4 py-3 font-medium">ジャンル</th>
                {sessions.map(s => (
                  <th key={s.id} className="px-4 py-3 font-medium text-center border-l border-white/[0.04]">
                    <div>{s.date.split('-').slice(1).join('/')}</div>
                    <div className="text-[10px] text-white/30">{s.startTime}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map(u => (
                <tr key={u.memberId} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2 font-mono text-xs text-white/40 bg-[#141824] sticky left-0 z-10">{u.memberId}</td>
                  <td className="px-4 py-2 font-medium bg-[#141824] sticky left-[80px] z-10 border-r border-white/[0.04]">{u.name}</td>
                  <td className="px-4 py-2 text-xs text-white/50">{u.genre} {u.generation}代</td>
                  
                  {sessions.map(s => {
                    const rsvp = rsvps[s.id]?.[u.memberId];
                    if (!rsvp) return <td key={s.id} className="px-4 py-2 text-center text-white/20 border-l border-white/[0.04] text-xs">-</td>;
                    
                    return (
                      <td key={s.id} className="px-4 py-2 text-center border-l border-white/[0.04]">
                        <div className={`font-bold \${STATUS_COLORS[rsvp.status]}`}>{STATUS_SHORT[rsvp.status]}</div>
                        {rsvp.note && <div className="text-[9px] text-white/40 mt-0.5 truncate max-w-[60px]" title={rsvp.note}>{rsvp.note}</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={sessions.length + 3} className="px-4 py-8 text-center text-white/30 text-sm">
                    対象メンバーがいません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
