"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getUser,
  getUpcomingUnregisteredSessions,
  getMyUnpaidSettlements,
  submitRSVP,
  createUser,
  deleteUser,
  getAllUsers,
} from "@/lib/api";
import type { FEUser, PracticeSession, Settlement } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = { GO: '出席', NO: '欠席', LATE: '遅刻', EARLY: '早退' };
const REASON_REQUIRED = new Set(['NO', 'LATE', 'EARLY']);
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
  const [reasonModal, setReasonModal] = useState<{
    session: PracticeSession;
    status: 'NO' | 'LATE' | 'EARLY';
  } | null>(null);
  const [reasonText, setReasonText] = useState('');
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
  const [addMode, setAddMode] = useState<'single' | 'bulk' | 'delete'>('single');
  const [bulkText, setBulkText] = useState('');
  const [bulkResults, setBulkResults] = useState<{ row: number; memberId: string; name: string; ok: boolean; error?: string }[]>([]);
  const [allMembers, setAllMembers] = useState<FEUser[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<FEUser | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const memberId = localStorage.getItem("memberId");
    if (!memberId) { window.location.href = "/"; return; }
    setMemberId(memberId);

    getUser(memberId).then((u) => {
      if (!u) { window.location.href = "/"; return; }
      setUser(u as any);
      setLoading(false);

      Promise.all([
        getUpcomingUnregisteredSessions(memberId),
        getMyUnpaidSettlements(memberId),
      ]).then(([sessions, settlements]) => {
        setUnregistered(sessions);
        setUnpaidSettlements(settlements);
      }).catch(console.error);
    }).catch(() => setLoading(false));
  }, []);

  const openDeleteTab = async () => {
    setAddMode('delete');
    setAddMemberError('');
    try {
      const users = await getAllUsers();
      setAllMembers(users);
    } catch {
      setAddMemberError('メンバー一覧の取得に失敗しました');
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText.trim() !== deleteTarget.name) {
      setAddMemberError('名前が一致しません');
      return;
    }
    setDeleting(true);
    setAddMemberError('');
    try {
      await deleteUser(deleteTarget.memberId);
      setAllMembers(prev => prev.filter(m => m.memberId !== deleteTarget.memberId));
      setDeleteTarget(null);
      setDeleteConfirmText('');
      alert(`${deleteTarget.name} さんを削除しました`);
    } catch {
      setAddMemberError('削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkAdd = async () => {
    setAddMemberError('');
    setBulkResults([]);
    const lines = bulkText.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    if (lines.length === 0) {
      setAddMemberError('1行以上入力してください');
      return;
    }
    const parsed: { row: number; memberId: string; name: string; generation: number; genre: string; role: 'admin' | 'member'; error?: string }[] = [];
    lines.forEach((line, i) => {
      if (i === 0 && /会員番号|memberId/i.test(line)) return;
      const sep = line.includes('\t') ? '\t' : ',';
      const cols = line.split(sep).map(c => c.trim());
      if (cols.length < 4) {
        parsed.push({ row: i + 1, memberId: '', name: '', generation: 0, genre: '', role: 'member', error: '列数が足りません（4列以上必要）' });
        return;
      }
      const [memberId, name, genStr, genre, roleStr] = cols;
      const generation = parseInt(genStr.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)), 10);
      if (!memberId || !name) {
        parsed.push({ row: i + 1, memberId, name, generation: 0, genre: '', role: 'member', error: '会員番号と名前は必須' });
        return;
      }
      if (!Number.isFinite(generation) || generation <= 0) {
        parsed.push({ row: i + 1, memberId, name, generation: 0, genre: '', role: 'member', error: '代が不正' });
        return;
      }
      if (!GENRES.includes(genre)) {
        parsed.push({ row: i + 1, memberId, name, generation, genre, role: 'member', error: `ジャンルは ${GENRES.join('/')} のいずれか` });
        return;
      }
      const role = (roleStr === 'admin' ? 'admin' : 'member') as 'admin' | 'member';
      parsed.push({ row: i + 1, memberId, name, generation, genre, role });
    });

    setAddingMember(true);
    const results: typeof bulkResults = [];
    for (const p of parsed) {
      if (p.error) {
        results.push({ row: p.row, memberId: p.memberId, name: p.name, ok: false, error: p.error });
        continue;
      }
      try {
        await createUser({ memberId: p.memberId, name: p.name, role: p.role, genre: p.genre, generation: p.generation });
        results.push({ row: p.row, memberId: p.memberId, name: p.name, ok: true });
      } catch (e: any) {
        const msg = String(e?.message || '');
        results.push({ row: p.row, memberId: p.memberId, name: p.name, ok: false, error: msg.includes('409') ? '既に登録済み' : '登録失敗' });
      }
      setBulkResults([...results]);
    }
    setAddingMember(false);
  };

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

  const handleRSVP = async (session: PracticeSession, status: 'GO' | 'NO' | 'LATE' | 'EARLY', note = '') => {
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
        note,
      });
      setUnregistered(prev => prev.filter(s => s.id !== session.id));
    } catch (e) {
      console.error(e);
      alert('登録に失敗しました');
    } finally {
      setSubmitting(null);
    }
  };

  const handleStatusClick = (session: PracticeSession, status: 'GO' | 'NO' | 'LATE' | 'EARLY') => {
    if (REASON_REQUIRED.has(status)) {
      setReasonModal({ session, status: status as 'NO' | 'LATE' | 'EARLY' });
      setReasonText('');
    } else {
      handleRSVP(session, status);
    }
  };

  const handleReasonSubmit = async () => {
    if (!reasonModal || !reasonText.trim()) return;
    await handleRSVP(reasonModal.session, reasonModal.status, reasonText.trim());
    setReasonModal(null);
    setReasonText('');
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
                      onClick={() => handleStatusClick(session, s)}
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
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">会員を追加</h3>

            {/* タブ切り替え */}
            <div className="flex gap-1 p-1 bg-white/[0.04] rounded-lg">
              <button
                onClick={() => { setAddMode('single'); setAddMemberError(''); setBulkResults([]); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${addMode === 'single' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
              >
                個別追加
              </button>
              <button
                onClick={() => { setAddMode('bulk'); setAddMemberError(''); setBulkResults([]); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${addMode === 'bulk' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
              >
                一括追加
              </button>
              <button
                onClick={openDeleteTab}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${addMode === 'delete' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
              >
                削除
              </button>
            </div>

            {addMode === 'single' && (
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
            )}
            {addMode === 'bulk' && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-white/50 mb-2">
                    1行に1人。スプレッドシートからそのままコピペ可。列の順番は <span className="text-white/70">会員番号・名前・代・ジャンル・役割</span>。役割は省略可（デフォルトmember）。
                  </p>
                  <p className="text-[10px] text-white/40 mb-2">
                    ジャンル: {GENRES.join('/')}
                  </p>
                  <textarea
                    rows={8}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder={`16199,田中太郎,53,Hiphop,member\n16200,鈴木花子,53,House,admin\n16201,佐藤次郎,54,Break`}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 font-mono resize-none focus:outline-none focus:border-white/20"
                  />
                </div>
                {bulkResults.length > 0 && (
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                    <p className="text-[10px] text-white/50 mb-1">
                      成功 {bulkResults.filter(r => r.ok).length} / 失敗 {bulkResults.filter(r => !r.ok).length}
                    </p>
                    {bulkResults.map((r, i) => (
                      <div key={i} className="text-xs flex items-center gap-2">
                        <span className={r.ok ? 'text-emerald-400' : 'text-red-400'}>
                          {r.ok ? '✓' : '✗'}
                        </span>
                        <span className="text-white/40">行{r.row}</span>
                        <span className="text-white/80 truncate">
                          {r.memberId || '?'} {r.name || ''}
                        </span>
                        {r.error && <span className="text-red-400 text-[10px]">{r.error}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {addMode === 'delete' && (
              <div className="space-y-3">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-[11px] text-red-300">
                  ⚠ 削除すると会員情報・出欠記録・支払い記録・名簿登録がすべて消えます。元に戻せません。
                </div>
                <input
                  type="text"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="名前または会員番号で検索"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                />
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg max-h-72 overflow-y-auto">
                  {allMembers
                    .filter(m => {
                      const q = memberSearch.trim().toLowerCase();
                      if (!q) return true;
                      return m.name.toLowerCase().includes(q) || m.memberId.toLowerCase().includes(q);
                    })
                    .sort((a, b) => (b.generation ?? 0) - (a.generation ?? 0) || a.name.localeCompare(b.name))
                    .map(m => (
                      <div key={m.memberId} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/5 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white/90 truncate">{m.name}</p>
                          <p className="text-[10px] text-white/40">
                            {m.memberId} · {m.generation}代 {m.genre}
                            {m.role === 'admin' && <span className="ml-1 text-amber-400">admin</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => { setDeleteTarget(m); setDeleteConfirmText(''); setAddMemberError(''); }}
                          disabled={m.memberId === memberId}
                          className="text-xs font-bold text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1"
                        >
                          {m.memberId === memberId ? '自分' : '削除'}
                        </button>
                      </div>
                    ))}
                  {allMembers.length === 0 && (
                    <p className="text-xs text-white/40 text-center py-4">読み込み中…</p>
                  )}
                </div>
              </div>
            )}

            {addMemberError && <p className="text-red-400 text-xs">{addMemberError}</p>}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setShowAddMember(false); setAddMemberError(''); setBulkResults([]); setBulkText(''); setMemberSearch(''); }}
                disabled={addingMember}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl border border-white/10 text-white/50 hover:bg-white/[0.04] transition-colors disabled:opacity-40"
              >
                {bulkResults.length > 0 ? '閉じる' : addMode === 'delete' ? '閉じる' : 'キャンセル'}
              </button>
              {addMode !== 'delete' && (
                <button
                  onClick={addMode === 'single' ? handleAddMember : handleBulkAdd}
                  disabled={addingMember}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  {addingMember ? '追加中…' : addMode === 'single' ? '追加' : '一括追加'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 会員削除 確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div>
              <p className="text-xs font-medium text-red-400 uppercase tracking-wide">会員を削除</p>
              <p className="text-sm font-bold text-white mt-1">{deleteTarget.name}</p>
              <p className="text-[11px] text-white/50 mt-0.5">
                {deleteTarget.memberId} · {deleteTarget.generation}代 {deleteTarget.genre}
              </p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-[11px] text-red-300 space-y-1">
              <p>以下が完全に削除されます（取り消し不可）:</p>
              <ul className="list-disc list-inside text-red-300/80">
                <li>会員情報</li>
                <li>すべての出欠登録</li>
                <li>すべての支払い記録</li>
                <li>名簿への登録</li>
              </ul>
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1">
                確認のため <span className="text-white font-bold">{deleteTarget.name}</span> と入力してください
              </label>
              <input
                type="text"
                autoFocus
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/40"
              />
            </div>
            {addMemberError && <p className="text-red-400 text-xs">{addMemberError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); setAddMemberError(''); }}
                disabled={deleting}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl border border-white/10 text-white/60 hover:bg-white/[0.04] disabled:opacity-40"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteMember}
                disabled={deleting || deleteConfirmText.trim() !== deleteTarget.name}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? '削除中…' : '完全に削除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 理由入力モーダル */}
      {reasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div>
              <p className="text-xs font-medium text-yellow-400 uppercase tracking-wide">
                {STATUS_LABELS[reasonModal.status]}の理由
              </p>
              <p className="text-sm font-bold text-white mt-1">{reasonModal.session.name}</p>
            </div>
            <textarea
              autoFocus
              rows={3}
              placeholder="理由を入力してください"
              value={reasonText}
              onChange={e => setReasonText(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/20"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setReasonModal(null); setReasonText(''); }}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl border border-white/10 text-white/50 hover:bg-white/[0.04] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleReasonSubmit}
                disabled={!reasonText.trim() || submitting === reasonModal.session.id}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting === reasonModal.session.id ? '送信中…' : '送信'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
