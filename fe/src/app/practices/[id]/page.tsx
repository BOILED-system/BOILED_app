'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  getPracticeSession,
  getMyRSVP,
  getSessionRSVPs,
  submitRSVP,
  updatePracticeSession,
  deletePracticeSession,
  getNumberRosters,
  getUser,
} from '@/lib/api';
import type { PracticeSession, PracticeRSVP, NumberRoster, TargetType } from '@/lib/api';

const GENRES = ['Break', 'Girls', 'Hiphop', 'House', 'Lock', 'Pop', 'Waack'];
const GENERATIONS = [16, 17];

const STATUS_LABELS: Record<string, string> = { GO: '出席', NO: '欠席', LATE: '遅刻', EARLY: '早退' };
const STATUS_COLORS: Record<string, string> = {
  GO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  NO: 'bg-red-500/20 text-red-400 border-red-500/30',
  LATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  EARLY: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export default function PracticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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
  const [numberRosters, setNumberRosters] = useState<NumberRoster[]>([]);

  // 編集モーダル
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', date: '', startTime: '', endTime: '', location: '', note: '',
    type: 'regular' as 'regular' | 'event',
    targetType: 'genre_generation' as TargetType,
    targetGenres: [] as string[],
    targetGenerations: [] as number[],
    targetNumberId: '',
    targetMemberIds: [] as string[],
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editAddedMembers, setEditAddedMembers] = useState<{ id: string; name: string }[]>([]);
  const [editMemberInput, setEditMemberInput] = useState('');
  const [editMemberError, setEditMemberError] = useState('');
  const [editMemberLoading, setEditMemberLoading] = useState(false);

  useEffect(() => {
    const mid = localStorage.getItem('memberId') || '';
    const role = localStorage.getItem('userRole') || 'member';
    setMemberId(mid);
    setUserRole(role);
    load(mid, role);
  }, [id]);

  const load = async (mid: string, role: string) => {
    const [s, rsvp, rosters] = await Promise.all([
      getPracticeSession(id),
      mid ? getMyRSVP(id, mid) : Promise.resolve(null),
      getNumberRosters(),
    ]);
    setSession(s);
    setNumberRosters(rosters);
    if (rsvp) { setMyRSVP(rsvp); setStatus(rsvp.status); setNote(rsvp.note || ''); }
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
      await submitRSVP({ sessionId: id, memberId, name: user?.name || '', genre: user?.genre || '', generation: user?.generation || 0, status, note });
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

  // ===== 編集 =====

  const openEdit = () => {
    if (!session) return;
    setEditForm({
      name: session.name, date: session.date, startTime: session.startTime,
      endTime: session.endTime || '', location: session.location || '',
      note: session.note || '', type: session.type || 'regular',
      targetType: session.targetType || 'genre_generation',
      targetGenres: session.targetGenres || [],
      targetGenerations: session.targetGenerations || [],
      targetNumberId: session.targetNumberId || '',
      targetMemberIds: session.targetMemberIds || [],
    });
    // 個別指定メンバーの名前を復元
    if (session.targetType === 'individual' && session.targetMemberIds?.length) {
      Promise.all(session.targetMemberIds.map(async mid => {
        const u = await getUser(mid);
        return { id: mid, name: u?.name as string || mid };
      })).then(setEditAddedMembers);
    } else {
      setEditAddedMembers([]);
    }
    setEditMemberInput('');
    setEditMemberError('');
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    if (!editForm.name || !editForm.date || !editForm.startTime) {
      alert('練習名・日付・開始時間は必須です');
      return;
    }
    setEditSaving(true);
    await updatePracticeSession(id, {
      name: editForm.name, date: editForm.date, startTime: editForm.startTime,
      endTime: editForm.endTime, location: editForm.location, note: editForm.note,
      type: editForm.type, targetType: editForm.targetType,
      targetGenres: editForm.targetGenres, targetGenerations: editForm.targetGenerations,
      targetNumberId: editForm.targetNumberId, targetMemberIds: editForm.targetMemberIds,
    });
    setSession(prev => prev ? { ...prev, ...editForm } : prev);
    setEditSaving(false);
    setShowEdit(false);
  };

  const handleDelete = async () => {
    if (!session) return;
    if (!confirm(`「${session.name}」を削除しますか？`)) return;
    await deletePracticeSession(id);
    router.push('/practices');
  };

  const toggleEditGenre = (g: string) =>
    setEditForm(f => ({ ...f, targetGenres: f.targetGenres.includes(g) ? f.targetGenres.filter(x => x !== g) : [...f.targetGenres, g] }));

  const toggleEditGen = (g: number) =>
    setEditForm(f => ({ ...f, targetGenerations: f.targetGenerations.includes(g) ? f.targetGenerations.filter(x => x !== g) : [...f.targetGenerations, g] }));

  const handleEditAddMember = async () => {
    const mid = editMemberInput.trim();
    if (!mid) return;
    if (editAddedMembers.find(m => m.id === mid)) { setEditMemberError('すでに追加されています'); return; }
    setEditMemberLoading(true); setEditMemberError('');
    const user = await getUser(mid);
    setEditMemberLoading(false);
    if (!user) { setEditMemberError('会員番号が見つかりません'); return; }
    setEditAddedMembers(prev => [...prev, { id: mid, name: user.name as string }]);
    setEditForm(f => ({ ...f, targetMemberIds: [...f.targetMemberIds, mid] }));
    setEditMemberInput('');
  };

  const handleEditRemoveMember = (mid: string) => {
    setEditAddedMembers(prev => prev.filter(m => m.id !== mid));
    setEditForm(f => ({ ...f, targetMemberIds: f.targetMemberIds.filter(x => x !== mid) }));
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
      <div className="flex items-center justify-between">
        <Link href="/practices" className="text-xs text-white/30 hover:text-white/60 transition-colors">
          ← 練習一覧
        </Link>
        {userRole === 'admin' && (
          <button onClick={openEdit}
            className="text-xs px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.08] text-white/50 rounded-lg transition-colors">
            編集
          </button>
        )}
      </div>

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
          {session.location && <span className="text-xs text-white/30">{session.location}</span>}
        </div>
        {session.note && <p className="text-xs text-white/30 mt-2">{session.note}</p>}
        <div className="flex gap-1 mt-3 flex-wrap">
          {session.targetGenres?.map((g: string) => (
            <span key={g} className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">{g}</span>
          ))}
          {session.targetGenerations?.map((g: number) => (
            <span key={g} className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">{g}代</span>
          ))}
        </div>
      </div>

      {/* 出欠登録フォーム */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 space-y-3">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">出欠登録</p>
        <div className="grid grid-cols-4 gap-2">
          {(['GO', 'NO', 'LATE', 'EARLY'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`py-2.5 text-xs rounded-lg border transition-all ${status === s ? STATUS_COLORS[s] + ' border' : 'bg-white/[0.04] text-white/30 border-white/[0.06] hover:text-white/60'}`}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <textarea placeholder="メモ（任意）" value={note} onChange={e => setNote(e.target.value)}
          className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none" rows={2} />
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/20">{myRSVP ? `前回: ${STATUS_LABELS[myRSVP.status]}` : '未登録'}</span>
          <button onClick={handleSubmit} disabled={!status || saving}
            className={`text-xs px-5 py-2 rounded-lg font-medium transition-all ${saved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-30'}`}>
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
                    <span className="text-xs text-white/30 ml-2">{rsvp.generation ? `${rsvp.generation}代` : ''} {rsvp.genre}</span>
                    {rsvp.note && <p className="text-xs text-white/30 mt-0.5 truncate">{rsvp.note}</p>}
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

      {/* Admin: 削除 */}
      {userRole === 'admin' && (
        <div className="flex justify-end">
          <button onClick={handleDelete} className="text-xs text-white/20 hover:text-red-400 transition-colors">
            この練習を削除
          </button>
        </div>
      )}

      {/* ===== 編集モーダル ===== */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEdit(false)} />
          <div className="relative w-full max-w-lg bg-[#1a1f2e] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-white">練習を編集</h2>

            <div className="flex gap-2">
              {(['regular', 'event'] as const).map(t => (
                <button key={t} onClick={() => setEditForm(f => ({ ...f, type: t }))}
                  className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${editForm.type === t ? (t === 'regular' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30') : 'bg-white/[0.04] text-white/40 border-white/[0.08]'}`}>
                  {t === 'regular' ? '正規練' : 'イベント練'}
                </button>
              ))}
            </div>

            <input type="text" placeholder="練習名" value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50" />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-white/30 block mb-1">日付</label>
                <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-white/30 block mb-1">開始</label>
                <input type="time" value={editForm.startTime} onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-white/30 block mb-1">終了</label>
                <input type="time" value={editForm.endTime} onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
            </div>

            <input type="text" placeholder="場所" value={editForm.location}
              onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none" />

            <textarea placeholder="メモ（任意）" value={editForm.note}
              onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none" rows={2} />

            {/* 対象者 */}
            <div className="space-y-3">
              <label className="text-[11px] text-white/30 block">対象者の指定方法</label>
              <div className="space-y-1.5">
                {[{ value: 'genre_generation', label: 'ジャンル・代' }, { value: 'number', label: 'ナンバー名簿' }, { value: 'individual', label: '個別指定' }].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="editTargetType" value={opt.value}
                      checked={editForm.targetType === opt.value}
                      onChange={() => setEditForm(f => ({ ...f, targetType: opt.value as TargetType }))}
                      className="accent-blue-500" />
                    <span className="text-sm text-white/60">{opt.label}</span>
                  </label>
                ))}
              </div>

              {editForm.targetType === 'genre_generation' && (
                <div className="pl-5 space-y-3">
                  <div>
                    <label className="text-[11px] text-white/30 block mb-2">ジャンル（空=全員）</label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map(g => (
                        <button key={g} onClick={() => toggleEditGenre(g)}
                          className={`text-xs px-3 py-1 rounded-full transition-colors ${editForm.targetGenres.includes(g) ? 'bg-blue-500 text-white' : 'bg-white/[0.06] text-white/50'}`}>{g}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/30 block mb-2">代（空=全員）</label>
                    <div className="flex flex-wrap gap-2">
                      {GENERATIONS.map(gen => (
                        <button key={gen} onClick={() => toggleEditGen(gen)}
                          className={`text-xs px-3 py-1 rounded-full transition-colors ${editForm.targetGenerations.includes(gen) ? 'bg-purple-500 text-white' : 'bg-white/[0.06] text-white/50'}`}>{gen}代</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {editForm.targetType === 'number' && (
                <div className="pl-5">
                  {numberRosters.length === 0 ? (
                    <p className="text-xs text-white/30">名簿がまだありません</p>
                  ) : (
                    <select value={editForm.targetNumberId} onChange={e => setEditForm(f => ({ ...f, targetNumberId: e.target.value }))}
                      className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                      <option value="">名簿を選択...</option>
                      {numberRosters.map(r => <option key={r.id} value={r.id}>{r.name}（{r.memberIds.length}人）</option>)}
                    </select>
                  )}
                </div>
              )}

              {editForm.targetType === 'individual' && (
                <div className="pl-5 space-y-2">
                  <div className="flex gap-2">
                    <input type="text" placeholder="会員番号（例：16199）" value={editMemberInput}
                      onChange={e => { setEditMemberInput(e.target.value); setEditMemberError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleEditAddMember()}
                      className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none" />
                    <button onClick={handleEditAddMember} disabled={editMemberLoading || !editMemberInput.trim()}
                      className="text-xs px-3 py-1.5 bg-white/[0.06] text-white/60 rounded-lg hover:bg-white/[0.1] disabled:opacity-40">
                      {editMemberLoading ? '...' : '追加'}
                    </button>
                  </div>
                  {editMemberError && <p className="text-xs text-red-400">{editMemberError}</p>}
                  {editAddedMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {editAddedMembers.map(m => (
                        <span key={m.id} className="flex items-center gap-1 text-xs bg-white/[0.06] text-white/60 px-2.5 py-1 rounded-full">
                          {m.name}
                          <button onClick={() => handleEditRemoveMember(m.id)} className="text-white/30 hover:text-red-400 ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowEdit(false)}
                className="flex-1 py-2.5 text-sm text-white/40 hover:text-white/60 bg-white/[0.04] rounded-xl transition-colors">
                キャンセル
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-xl transition-colors">
                {editSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
