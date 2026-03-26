'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getPracticeSessions,
  getMyRSVP,
  createPracticeSession,
  updatePracticeSession,
  deletePracticeSession,
  getNumberRosters,
  getUser,
  isSessionForMember,
  PracticeSession,
  NumberRoster,
  TargetType,
} from '@/lib/firestore';

const GENRES = ['Break', 'Girls', 'Hiphop', 'House', 'Lock', 'Pop', 'Waack'];

const addTwoHours = (time: string): string => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return `${String((h + 2) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
const GENERATIONS = [16, 17];

const STATUS_LABELS: Record<string, string> = { GO: '出席', NO: '欠席', LATE: '遅刻', EARLY: '早退' };
const STATUS_COLORS: Record<string, string> = {
  GO: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  NO: 'bg-red-500/20 text-red-400 border border-red-500/30',
  LATE: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  EARLY: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
};

const EMPTY_FORM = {
  name: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  note: '',
  type: 'regular' as 'regular' | 'event',
  targetType: 'genre_generation' as TargetType,
  targetGenres: [] as string[],
  targetGenerations: [] as number[],
  targetNumberId: '',
  targetMemberIds: [] as string[],
};

export default function PracticesPage() {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [myRSVPs, setMyRSVPs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [memberId, setMemberId] = useState('');
  const [numberRosters, setNumberRosters] = useState<NumberRoster[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);

  // 個別指定
  const [addedMembers, setAddedMembers] = useState<{ id: string; name: string }[]>([]);
  const [memberInput, setMemberInput] = useState('');
  const [memberInputError, setMemberInputError] = useState('');
  const [memberInputLoading, setMemberInputLoading] = useState(false);

  // 編集モーダル
  const [editingSession, setEditingSession] = useState<PracticeSession | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editAddedMembers, setEditAddedMembers] = useState<{ id: string; name: string }[]>([]);
  const [editMemberInput, setEditMemberInput] = useState('');
  const [editMemberError, setEditMemberError] = useState('');
  const [editMemberLoading, setEditMemberLoading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'member';
    const mid = localStorage.getItem('memberId') || '';
    setUserRole(role);
    setMemberId(mid);
    load(mid, role);
  }, []);

  const load = async (mid: string, role: string) => {
    try {
      const [allSessions, rosters, user] = await Promise.all([
        getPracticeSessions(),
        getNumberRosters(),
        mid ? getUser(mid) : Promise.resolve(null),
      ]);
      setNumberRosters(rosters);

      const genre = user?.genre || '';
      const generation = user?.generation || 0;

      const filtered = role === 'admin'
        ? allSessions
        : allSessions.filter(s => isSessionForMember(s, mid, genre, generation, rosters));

      const sorted = filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setSessions(sorted);

      if (mid) {
        const rsvpMap: Record<string, string> = {};
        await Promise.all(sorted.map(async s => {
          const rsvp = await getMyRSVP(s.id, mid);
          if (rsvp) rsvpMap[s.id] = rsvp.status;
        }));
        setMyRSVPs(rsvpMap);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ===== 作成 =====

  const handleCreate = async () => {
    if (!form.name || !form.date || !form.startTime || !form.location) {
      alert('練習名・日付・開始時間・場所は必須です');
      return;
    }
    if (form.targetType === 'number' && !form.targetNumberId) {
      alert('ナンバー名簿を選択してください');
      return;
    }
    await createPracticeSession({ ...form });
    setShowForm(false);
    setForm(EMPTY_FORM);
    setAddedMembers([]);
    setMemberInput('');
    load(memberId, userRole);
  };

  const handleAddMember = async () => {
    const id = memberInput.trim();
    if (!id) return;
    if (addedMembers.find(m => m.id === id)) { setMemberInputError('すでに追加されています'); return; }
    setMemberInputLoading(true); setMemberInputError('');
    const user = await getUser(id);
    setMemberInputLoading(false);
    if (!user) { setMemberInputError('会員番号が見つかりません'); return; }
    setAddedMembers(prev => [...prev, { id, name: user.name as string }]);
    setForm(f => ({ ...f, targetMemberIds: [...f.targetMemberIds, id] }));
    setMemberInput('');
  };

  const handleRemoveMember = (id: string) => {
    setAddedMembers(prev => prev.filter(m => m.id !== id));
    setForm(f => ({ ...f, targetMemberIds: f.targetMemberIds.filter(mid => mid !== id) }));
  };

  const toggleGenre = (genre: string) =>
    setForm(f => ({ ...f, targetGenres: f.targetGenres.includes(genre) ? f.targetGenres.filter(g => g !== genre) : [...f.targetGenres, genre] }));

  const toggleGeneration = (gen: number) =>
    setForm(f => ({ ...f, targetGenerations: f.targetGenerations.includes(gen) ? f.targetGenerations.filter(g => g !== gen) : [...f.targetGenerations, gen] }));

  // ===== 編集 =====

  const openEdit = (s: PracticeSession) => {
    setEditingSession(s);
    setEditForm({
      name: s.name, date: s.date, startTime: s.startTime, endTime: s.endTime || '',
      location: s.location || '', note: s.note || '', type: s.type || 'regular',
      targetType: s.targetType || 'genre_generation',
      targetGenres: s.targetGenres || [], targetGenerations: s.targetGenerations || [],
      targetNumberId: s.targetNumberId || '', targetMemberIds: s.targetMemberIds || [],
    });
    if (s.targetType === 'individual' && s.targetMemberIds?.length) {
      Promise.all(s.targetMemberIds.map(async mid => {
        const u = await getUser(mid);
        return { id: mid, name: u?.name as string || mid };
      })).then(setEditAddedMembers);
    } else {
      setEditAddedMembers([]);
    }
    setEditMemberInput(''); setEditMemberError('');
  };

  const handleEditSave = async () => {
    if (!editingSession) return;
    if (!editForm.name || !editForm.date || !editForm.startTime) {
      alert('練習名・日付・開始時間は必須です');
      return;
    }
    setEditSaving(true);
    await updatePracticeSession(editingSession.id, {
      name: editForm.name, date: editForm.date, startTime: editForm.startTime,
      endTime: editForm.endTime, location: editForm.location, note: editForm.note,
      type: editForm.type, targetType: editForm.targetType,
      targetGenres: editForm.targetGenres, targetGenerations: editForm.targetGenerations,
      targetNumberId: editForm.targetNumberId, targetMemberIds: editForm.targetMemberIds,
    });
    setSessions(prev => prev.map(s => s.id === editingSession.id ? { ...s, ...editForm } : s));
    setEditSaving(false);
    setEditingSession(null);
  };

  const handleDelete = async (s: PracticeSession) => {
    if (!confirm(`「${s.name}」を削除しますか？`)) return;
    await deletePracticeSession(s.id);
    setSessions(prev => prev.filter(x => x.id !== s.id));
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

  // ===== ターゲット選択フォーム（作成・編集共通） =====
  const TargetForm = ({
    f, setF, addedM, memberIn, setMemberIn, memberErr, memberLoading,
    onAddMember, onRemoveMember, onToggleGenre, onToggleGen, rosters,
  }: {
    f: typeof EMPTY_FORM;
    setF: (fn: (prev: typeof EMPTY_FORM) => typeof EMPTY_FORM) => void;
    addedM: { id: string; name: string }[];
    memberIn: string; setMemberIn: (v: string) => void;
    memberErr: string; memberLoading: boolean;
    onAddMember: () => void; onRemoveMember: (id: string) => void;
    onToggleGenre: (g: string) => void; onToggleGen: (g: number) => void;
    rosters: NumberRoster[];
  }) => (
    <div className="space-y-3">
      <label className="text-[11px] text-white/30 block">対象者の指定方法</label>
      <div className="space-y-1.5">
        {[
          { value: 'genre_generation', label: 'ジャンル・代で絞り込む' },
          { value: 'number', label: 'ナンバー名簿から選ぶ' },
          { value: 'individual', label: '会員番号で個別指定' },
        ].map(opt => (
          <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
            <input type="radio" name={`targetType_${f.name}`} value={opt.value}
              checked={f.targetType === opt.value}
              onChange={() => setF(prev => ({ ...prev, targetType: opt.value as TargetType }))}
              className="accent-blue-500" />
            <span className="text-sm text-white/60">{opt.label}</span>
          </label>
        ))}
      </div>

      {f.targetType === 'genre_generation' && (
        <div className="pl-5 space-y-3">
          <div>
            <label className="text-[11px] text-white/30 block mb-2">対象ジャンル</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g => (
                <button key={g} type="button" onClick={() => onToggleGenre(g)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${f.targetGenres.includes(g) ? 'bg-blue-500 text-white' : 'bg-white/[0.06] text-white/50 hover:text-white/80'}`}>
                  {g}
                </button>
              ))}
            </div>
            {f.targetGenres.length === 0 && <p className="text-[11px] text-red-400/60 mt-1">未選択 = 対象なし</p>}
          </div>
          <div>
            <label className="text-[11px] text-white/30 block mb-2">対象代</label>
            <div className="flex flex-wrap gap-2">
              {GENERATIONS.map(gen => (
                <button key={gen} type="button" onClick={() => onToggleGen(gen)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${f.targetGenerations.includes(gen) ? 'bg-purple-500 text-white' : 'bg-white/[0.06] text-white/50 hover:text-white/80'}`}>
                  {gen}代
                </button>
              ))}
            </div>
            {f.targetGenerations.length === 0 && <p className="text-[11px] text-red-400/60 mt-1">未選択 = 対象なし</p>}
          </div>
        </div>
      )}

      {f.targetType === 'number' && (
        <div className="pl-5 space-y-2">
          {rosters.length === 0 ? (
            <p className="text-xs text-white/30">名簿がまだありません。<a href="/numbers" className="text-blue-400 ml-1">名簿を作成 →</a></p>
          ) : (
            <select value={f.targetNumberId}
              onChange={e => setF(prev => ({ ...prev, targetNumberId: e.target.value }))}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              <option value="">名簿を選択...</option>
              {rosters.map(r => <option key={r.id} value={r.id}>{r.name}（{r.memberIds.length}人）</option>)}
            </select>
          )}
        </div>
      )}

      {f.targetType === 'individual' && (
        <div className="pl-5 space-y-2">
          <div className="flex gap-2">
            <input type="text" placeholder="会員番号（例：16199）" value={memberIn}
              onChange={e => { setMemberIn(e.target.value); }}
              onKeyDown={e => e.key === 'Enter' && onAddMember()}
              className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none" />
            <button type="button" onClick={onAddMember}
              disabled={memberLoading || !memberIn.trim()}
              className="text-xs px-3 py-1.5 bg-white/[0.06] text-white/60 rounded-lg hover:bg-white/[0.1] disabled:opacity-40">
              {memberLoading ? '...' : '追加'}
            </button>
          </div>
          {memberErr && <p className="text-xs text-red-400">{memberErr}</p>}
          {addedM.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {addedM.map(m => (
                <span key={m.id} className="flex items-center gap-1 text-xs bg-white/[0.06] text-white/60 px-2.5 py-1 rounded-full">
                  {m.name}
                  <button type="button" onClick={() => onRemoveMember(m.id)} className="text-white/30 hover:text-red-400 ml-0.5">×</button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/20">まだ誰も追加されていません</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">練習</h1>
        {userRole === 'admin' && (
          <div className="flex gap-2">
            <Link href="/numbers"
              className="text-xs px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.08] text-white/50 rounded-lg transition-colors">
              名簿管理
            </Link>
            <button onClick={() => setShowForm(!showForm)}
              className="text-xs px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors">
              + 練習を追加
            </button>
          </div>
        )}
      </div>

      {/* 作成フォーム */}
      {showForm && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-4">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">練習を作成</p>

          {/* 種別選択をフォーム内に */}
          <div className="flex gap-2">
            {(['regular', 'event'] as const).map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${form.type === t ? (t === 'regular' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30') : 'bg-white/[0.04] text-white/40 border-white/[0.08]'}`}>
                {t === 'regular' ? '正規練' : 'イベント練'}
              </button>
            ))}
          </div>

          <input type="text"
            placeholder={form.type === 'regular' ? '例：Hiphop正規練' : '例：新歓イベ Hiphopナンバー練'}
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50" />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-white/30 block mb-1">日付</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-white/30 block mb-1">開始</label>
              <input type="time" value={form.startTime} onChange={e => {
                const start = e.target.value;
                setForm({ ...form, startTime: start, endTime: addTwoHours(start) });
              }} className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-white/30 block mb-1">終了</label>
              <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
          </div>

          <input type="text" placeholder="場所（例：マイスタ4B）" value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50" />

          <textarea placeholder="メモ（任意）" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none" rows={2} />

          <TargetForm
            f={form} setF={fn => setForm(fn(form))}
            addedM={addedMembers} memberIn={memberInput}
            setMemberIn={v => { setMemberInput(v); setMemberInputError(''); }}
            memberErr={memberInputError} memberLoading={memberInputLoading}
            onAddMember={handleAddMember} onRemoveMember={handleRemoveMember}
            onToggleGenre={toggleGenre} onToggleGen={toggleGeneration}
            rosters={numberRosters}
          />

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setAddedMembers([]); setMemberInput(''); }}
              className="text-xs px-3 py-1.5 text-white/40 hover:text-white/60">キャンセル</button>
            <button onClick={handleCreate}
              className="text-xs px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
              作成
            </button>
          </div>
        </div>
      )}

      {/* 練習一覧 */}
      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/30 text-sm">練習がまだありません</p>
          {userRole === 'admin' && <p className="text-white/20 text-xs mt-1">「+ 練習を追加」から作成してください</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => {
            const myStatus = myRSVPs[session.id];
            return (
              <div key={session.id} className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
                <Link href={`/practices/${session.id}`}
                  className="block p-4 hover:bg-white/[0.06] transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {session.type === 'event' ? (
                          <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full">イベント練</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">正規練</span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-white truncate">{session.name}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-white/40">{session.date} {session.startTime}{session.endTime ? `〜${session.endTime}` : ''}</span>
                        {session.location && <span className="text-xs text-white/30 truncate">{session.location}</span>}
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {(!session.targetType || session.targetType === 'genre_generation') && (
                          <>
                            {session.targetGenres?.map(g => (
                              <span key={g} className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">{g}</span>
                            ))}
                            {session.targetGenerations?.map(g => (
                              <span key={g} className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">{g}代</span>
                            ))}
                          </>
                        )}
                        {session.targetType === 'number' && (
                          <span className="text-[10px] px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded-full">
                            {numberRosters.find(r => r.id === session.targetNumberId)?.name || 'ナンバー名簿'}
                          </span>
                        )}
                        {session.targetType === 'individual' && (
                          <span className="text-[10px] px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded-full">
                            個別指定 {session.targetMemberIds?.length || 0}人
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {myStatus ? (
                        <span className={`text-[11px] px-2.5 py-1 rounded-full ${STATUS_COLORS[myStatus]}`}>
                          {STATUS_LABELS[myStatus]}
                        </span>
                      ) : (
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] text-white/20 border border-white/[0.06]">
                          未登録
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Admin: 編集・削除 */}
                {userRole === 'admin' && (
                  <div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-white/[0.04]">
                    <button onClick={() => openEdit(session)}
                      className="text-xs text-white/30 hover:text-blue-400 transition-colors">
                      編集
                    </button>
                    <button onClick={() => handleDelete(session)}
                      className="text-xs text-white/20 hover:text-red-400 transition-colors">
                      削除
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== 編集モーダル ===== */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingSession(null)} />
          <div className="relative w-full max-w-lg bg-[#1a1f2e] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-white">練習を編集</h2>

            <div className="flex gap-2">
              {(['regular', 'event'] as const).map(t => (
                <button key={t} type="button" onClick={() => setEditForm(f => ({ ...f, type: t }))}
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
                <input type="time" value={editForm.startTime} onChange={e => {
                  const start = e.target.value;
                  setEditForm(f => ({ ...f, startTime: start, endTime: addTwoHours(start) }));
                }} className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
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

            <TargetForm
              f={editForm} setF={fn => setEditForm(fn(editForm))}
              addedM={editAddedMembers} memberIn={editMemberInput}
              setMemberIn={v => { setEditMemberInput(v); setEditMemberError(''); }}
              memberErr={editMemberError} memberLoading={editMemberLoading}
              onAddMember={handleEditAddMember} onRemoveMember={handleEditRemoveMember}
              onToggleGenre={toggleEditGenre} onToggleGen={toggleEditGen}
              rosters={numberRosters}
            />

            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditingSession(null)}
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
