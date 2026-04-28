"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getUser,
  getUpcomingUnregisteredSessions,
  getMyUnpaidSettlements,
  submitRSVP,
  createUser,
} from "@/lib/api";
import type { PracticeSession, Settlement } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = { GO: '出席', NO: '欠席', LATE: '遅刻', EARLY: '早退' };
const GENRES = ['Break', 'Girls', 'Hiphop', 'House', 'Lock', 'Pop', 'Waack'];

export default function ProfilePage() {
  const [user, setUser] = useState<{
    name: string;
    genre: string;
    generation: number;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [unregistered, setUnregistered] = useState<PracticeSession[]>([]);
  const [unpaidSettlements, setUnpaidSettlements] = useState<Settlement[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    memberId: '',
    name: '',
    genre: GENRES[0],
    generation: '',
    role: 'member' as 'admin' | 'member',
  });
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');

  useEffect(() => {
    const memberId = localStorage.getItem("memberId");
    if (!memberId) { window.location.href = "/"; return; }
    setMemberId(memberId);

    getUser(memberId).then((u) => {
      if (!u) { window.location.href = "/"; return; }
      setUser(u as any);
      setLoading(false);

      // 非同期で通知データを並行取得
      Promise.all([
        getUpcomingUnregisteredSessions(memberId),
        getMyUnpaidSettlements(memberId),
      ]).then(([sessions, settlements]) => {
        setUnregistered(sessions);
        setUnpaidSettlements(settlements);
      }).catch(console.error);
    }).catch(() => setLoading(false));
  }, []);

  const handleAddMember = async () => {
    setAddMemberError('');
    const memberId = newMember.memberId.trim();
    const name = newMember.name.trim();
    const generation = parseInt(newMember.generation, 10);
    if (!memberId || !name) {
      setAddMemberError('会員番号と名前は必須です');
      return;
    }
    if (!Number.isFinite(generation) || generation <= 0) {
      setAddMemberError('代数は正の数で入力してください');
      return;
    }
    setAddingMember(true);
    try {
      await createUser({
        memberId,
        name,
        role: newMember.role,
        genre: newMember.genre,
        generation,
      });
      setShowAddMember(false);
      setNewMember({ memberId: '', name: '', genre: GENRES[0], generation: '', role: 'member' });
      alert(`${name} さんを追加しました`);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('409')) {
        setAddMemberError('その会員番号は既に登録されています');
      } else {
        setAddMemberError('追加に失敗しました');
      }
    } finally {
      setAddingMember(false);
    }
  };

  const handleRSVP = async (session: PracticeSession, status: 'GO' | 'NO' | 'LATE' | 'EARLY') => {
    if (!user || !memberId) return;
    setSubmitting(session.id);
    try {
      await submitRSVP({
        sessionId: session.id,
        memberId,
        name: (user as any).name,
        genre: (user as any).genre,
        generation: (user as any).generation,
        status,
        note: '',
      });
      setUnregistered(prev => prev.filter(s => s.id !== session.id));
    } catch (e) {
      console.error(e);
      alert('登録に失敗しました');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const totalAlerts = unregistered.length + unpaidSettlements.length;

  return (
    <div className="max-w-2xl mx-auto pb-20 space-y-6">
      {/* プロフィールカード */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center text-xl font-bold text-blue-300">
            {user?.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{user?.name}</h1>
            <p className="text-white/50 text-sm mt-0.5">
              {user?.generation}代 {user?.genre}
            </p>
            {user?.role === "admin" && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded mt-1 inline-block">
                Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Admin: 会員追加 */}
      {user?.role === "admin" && (
        <button
          onClick={() => setShowAddMember(true)}
          className="w-full bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 rounded-xl py-3 text-sm font-bold transition-colors"
        >
          ＋ 会員を追加
        </button>
      )}

      {/* 通知エリア */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider">
          {totalAlerts > 0 ? `要対応 (${totalAlerts})` : '通知'}
        </h2>

        {totalAlerts === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-8 text-center">
            <p className="text-white/30 text-sm">現在対応が必要なものはありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 出欠未登録 */}
            {unregistered.map(session => (
              <div key={session.id} className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 space-y-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-yellow-400 uppercase tracking-wide">出欠未登録</p>
                  <p className="text-sm font-bold text-white mt-0.5">{session.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {session.date} {session.startTime}{session.endTime ? `〜${session.endTime}` : ''}
                    {session.location && ` · ${session.location}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {(['GO', 'NO', 'LATE', 'EARLY'] as const).map(s => (
                    <button key={s}
                      disabled={submitting === session.id}
                      onClick={() => handleRSVP(session, s)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors disabled:opacity-40 ${
                        s === 'GO'    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' :
                        s === 'NO'    ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' :
                                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30'
                      }`}>
                      {submitting === session.id ? '…' : STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* 未払い精算 */}
            {unpaidSettlements.map(s => {
              const isOverdue = new Date(s.dueDate) < new Date();
              return (
                <Link
                  key={s.id}
                  href="/payments"
                  className={`flex items-center justify-between rounded-xl p-4 transition-colors group border ${isOverdue ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15' : 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15'}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-medium uppercase tracking-wide ${isOverdue ? 'text-red-400' : 'text-orange-400'}`}>
                      {isOverdue ? '期限超過・未払い' : '未払い'}
                    </p>
                    <p className="text-sm text-white/80 mt-0.5 truncate">{s.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {s.createdByName} より · 期限 {s.dueDate}
                    </p>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <p className={`text-sm font-bold ${isOverdue ? 'text-red-400' : 'text-orange-400'}`}>
                      ¥{s.amount.toLocaleString()}
                    </p>
                    <p className={`text-xs mt-0.5 group-hover:opacity-100 opacity-60 transition-opacity ${isOverdue ? 'text-red-400' : 'text-orange-400'}`}>支払い →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 会員追加モーダル */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">会員を追加</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 block mb-1">会員番号</label>
                <input
                  type="text"
                  value={newMember.memberId}
                  onChange={e => setNewMember({ ...newMember, memberId: e.target.value.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) })}
                  placeholder="例：16199"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">名前</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 block mb-1">代</label>
                  <input
                    type="number"
                    value={newMember.generation}
                    onChange={e => setNewMember({ ...newMember, generation: e.target.value })}
                    placeholder="例：53"
                    className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">ジャンル</label>
                  <select
                    value={newMember.genre}
                    onChange={e => setNewMember({ ...newMember, genre: e.target.value })}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                  >
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">役割</label>
                <select
                  value={newMember.role}
                  onChange={e => setNewMember({ ...newMember, role: e.target.value as 'admin' | 'member' })}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>
            {addMemberError && <p className="text-red-400 text-xs">{addMemberError}</p>}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setShowAddMember(false); setAddMemberError(''); }}
                disabled={addingMember}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl border border-white/10 text-white/50 hover:bg-white/[0.04] transition-colors disabled:opacity-40"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddMember}
                disabled={addingMember}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {addingMember ? '追加中…' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
