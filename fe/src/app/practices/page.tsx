'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getPracticeSessions,
  createPracticeSession,
  getNumberRosters,
  getAllUsers,
  getUser,
  isSessionForMember,
} from '@/lib/api';
import type { PracticeSession, NumberRoster, TargetType, FEUser } from '@/lib/api';
import MemberSelectDropdown from '@/components/MemberSelectDropdown';

const GENRES = ['Break', 'Girls', 'Hiphop', 'House', 'Lock', 'Pop', 'Waack'];
const GENERATIONS = [16, 17];
const addTwoHours = (time: string): string => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return `${String((h + 2) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const EMPTY_FORM = {
  name: '',
  schedules: [{ date: '', startTime: '19:00', endTime: '21:00', location: '' }],
  note: '',
  type: 'regular' as 'regular' | 'event' | 'team',
  targetType: 'genre_generation' as TargetType,
  targetGenres: [] as string[],
  targetGenerations: [] as number[],
  targetNumberId: '',
  targetMemberIds: [] as string[],
  additionalMemberIds: [] as string[],
  excludedMemberIds: [] as string[],
};

export default function PracticesPage() {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [memberId, setMemberId] = useState('');
  const [numberRosters, setNumberRosters] = useState<NumberRoster[]>([]);
  const [allUsers, setAllUsers] = useState<FEUser[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);

  // 個別指定・追加・除外（ドロップダウンで選択するので name も保持）
  const [targetMembers, setTargetMembers] = useState<{ id: string; name: string }[]>([]);
  const [extraMembers, setExtraMembers] = useState<{ id: string; name: string }[]>([]);
  const [excludedMembers, setExcludedMembers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'member';
    const mid = localStorage.getItem('memberId') || '';
    setUserRole(role);
    setMemberId(mid);
    load(mid);
  }, []);

  const load = async (mid: string) => {
    try {
      const [allSessions, rosters, users, user] = await Promise.all([
        getPracticeSessions(),
        getNumberRosters(),
        getAllUsers(),
        mid ? getUser(mid) : Promise.resolve(null),
      ]);
      setNumberRosters(rosters);
      setAllUsers(users);
      const genre = user?.genre || '';
      const generation = user?.generation || 0;
      const filtered = allSessions.filter(s => isSessionForMember(s, mid, genre, generation, rosters));
      setSessions(filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setTargetMembers([]);
    setExtraMembers([]);
    setExcludedMembers([]);
  };

  const handleCreate = async () => {
    if (!form.name) { alert('練習名は必須です'); return; }
    const validSchedules = form.schedules.filter(s => s.date && s.startTime);
    if (validSchedules.length === 0) { alert('少なくとも1つの有効な日程（日付・開始時間）を追加してください'); return; }
    if (form.targetType === 'number' && !form.targetNumberId) { alert('ナンバー名簿を選択してください'); return; }
    setIsCreating(true);
    const createdBy = memberId;
    const createdByName = localStorage.getItem('userName') || '';
    await Promise.all(validSchedules.map(sch => createPracticeSession({
      ...form, date: sch.date, startTime: sch.startTime, endTime: sch.endTime, location: sch.location,
      createdBy, createdByName,
    })));
    resetForm();
    setIsCreating(false);
    load(memberId);
  };

  const toggleGenre = (genre: string) => setForm(f => ({
    ...f, targetGenres: f.targetGenres.includes(genre) ? f.targetGenres.filter(g => g !== genre) : [...f.targetGenres, genre],
  }));
  const toggleGeneration = (gen: number) => setForm(f => ({
    ...f, targetGenerations: f.targetGenerations.includes(gen) ? f.targetGenerations.filter(g => g !== gen) : [...f.targetGenerations, gen],
  }));

  const handleAddTarget = (m: { id: string; name: string }) => {
    setTargetMembers(prev => [...prev, m]);
    setForm(f => ({ ...f, targetMemberIds: [...f.targetMemberIds, m.id] }));
  };
  const handleRemoveTarget = (id: string) => {
    setTargetMembers(prev => prev.filter(m => m.id !== id));
    setForm(f => ({ ...f, targetMemberIds: f.targetMemberIds.filter(x => x !== id) }));
  };

  const handleAddExtra = (m: { id: string; name: string }) => {
    setExtraMembers(prev => [...prev, m]);
    setForm(f => ({ ...f, additionalMemberIds: [...f.additionalMemberIds, m.id] }));
  };
  const handleRemoveExtra = (id: string) => {
    setExtraMembers(prev => prev.filter(m => m.id !== id));
    setForm(f => ({ ...f, additionalMemberIds: f.additionalMemberIds.filter(x => x !== id) }));
  };

  const handleAddExcluded = (m: { id: string; name: string }) => {
    setExcludedMembers(prev => [...prev, m]);
    setForm(f => ({ ...f, excludedMemberIds: [...f.excludedMemberIds, m.id] }));
  };
  const handleRemoveExcluded = (id: string) => {
    setExcludedMembers(prev => prev.filter(m => m.id !== id));
    setForm(f => ({ ...f, excludedMemberIds: f.excludedMemberIds.filter(x => x !== id) }));
  };

  const groupedSessions = sessions.reduce((acc, session) => {
    if (!acc[session.name]) acc[session.name] = [];
    acc[session.name].push(session);
    return acc;
  }, {} as Record<string, PracticeSession[]>);

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"/></div>;

  // Compute primary target set for smart dropdown filtering
  const primaryTargetIds: Set<string> | null = (() => {
    if (form.targetType === 'number' && form.targetNumberId) {
      const roster = numberRosters.find(r => r.id === form.targetNumberId);
      if (roster) return new Set(roster.memberIds);
    }
    if (form.targetType === 'genre_generation' && form.targetGenres.length > 0 && form.targetGenerations.length > 0) {
      return new Set(
        allUsers
          .filter(u => form.targetGenres.includes(u.genre as string) && form.targetGenerations.includes(u.generation as number))
          .map(u => u.memberId)
      );
    }
    return null;
  })();
  const usersForAdditional = primaryTargetIds ? allUsers.filter(u => !primaryTargetIds.has(u.memberId)) : allUsers;
  const usersForExcluded = primaryTargetIds ? allUsers.filter(u => primaryTargetIds.has(u.memberId)) : allUsers;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">練習</h1>
        <div className="flex gap-2">
          <Link href="/numbers" className="text-xs px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.08] text-white/50 rounded-lg transition-colors">
            名簿管理
          </Link>
          <button onClick={() => setShowForm(!showForm)} className="text-xs px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors font-bold shadow-lg shadow-blue-500/20">
            + プロジェクトを追加
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <button type="button" onClick={resetForm}
              className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1">
              ← 練習一覧に戻る
            </button>
            <button type="button" onClick={resetForm}
              aria-label="閉じる"
              className="text-white/30 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08] transition-colors text-lg">
              ×
            </button>
          </div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">新規練習プロジェクトの作成</p>

          <div className="flex gap-2">
            {(['regular', 'event', 'team'] as const).map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${form.type === t ? (t === 'regular' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : t === 'event' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30') : 'bg-white/[0.04] text-white/40 border-white/[0.08]'}`}>
                {t === 'regular' ? '正規練' : t === 'event' ? 'イベント練' : 'チーム練'}
              </button>
            ))}
          </div>

          <input type="text" placeholder={form.type === 'regular' ? 'プロジェクト名（例：Hiphop正規練）' : 'プロジェクト名（例：新歓Hiphop）'} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />

          <div className="space-y-3 bg-black/20 p-4 rounded-lg border border-white/[0.04]">
            <label className="text-[11px] text-white/30 block mb-1">【日程・場所の一括追加】</label>
            {form.schedules.map((sch, i) => (
              <div key={i} className="flex flex-col gap-2 items-start border-b border-white/[0.04] pb-3 last:border-0 last:pb-0 mb-3">
                <div className="flex gap-2 w-full items-start">
                  <div className="flex-1">
                    <input type="date" value={sch.date} onChange={e => {
                      const next = [...form.schedules]; next[i].date = e.target.value; setForm({ ...form, schedules: next });
                    }} className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-2 text-sm text-white focus:outline-none" />
                  </div>
                  <div className="w-[80px]">
                    <input type="time" value={sch.startTime} onChange={e => {
                      const next = [...form.schedules]; next[i].startTime = e.target.value; next[i].endTime = addTwoHours(e.target.value); setForm({ ...form, schedules: next });
                    }} className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-2 text-sm text-white focus:outline-none" />
                  </div>
                  <span className="text-white/30 pt-2">〜</span>
                  <div className="w-[80px]">
                    <input type="time" value={sch.endTime} onChange={e => {
                      const next = [...form.schedules]; next[i].endTime = e.target.value; setForm({ ...form, schedules: next });
                    }} className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-2 text-sm text-white focus:outline-none" />
                  </div>
                  {form.schedules.length > 1 && (
                    <button onClick={() => setForm({ ...form, schedules: form.schedules.filter((_, idx) => idx !== i) })} className="pt-2 px-1 text-white/20 hover:text-red-400">×</button>
                  )}
                </div>
                <div className="w-full">
                  <input type="text" placeholder="場所（例：マイスタ4B） / 任意" value={sch.location} onChange={e => {
                    const next = [...form.schedules]; next[i].location = e.target.value; setForm({ ...form, schedules: next });
                  }} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50" />
                </div>
              </div>
            ))}
            <button onClick={() => setForm({ ...form, schedules: [...form.schedules, { date: '', startTime: '19:00', endTime: '21:00', location: '' }] })} className="text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-lg w-full transition-colors mt-2">
              + 別の日程枠を追加
            </button>
          </div>

          <textarea placeholder="メモ（任意）" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none" rows={2} />

          {/* 対象者設定 */}
          <div className="space-y-3">
            <label className="text-[11px] text-white/30 block">対象者の指定方法</label>
            <div className="space-y-1.5">
              {[
                { value: 'genre_generation', label: 'ジャンル・代で絞り込む' },
                { value: 'number', label: 'ナンバー名簿から選ぶ' },
                { value: 'individual', label: 'メンバーを個別指定' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" name="targetType_new" value={opt.value}
                    checked={form.targetType === opt.value}
                    onChange={() => setForm(f => ({ ...f, targetType: opt.value as TargetType }))}
                    className="accent-blue-500" />
                  <span className="text-sm text-white/60">{opt.label}</span>
                </label>
              ))}
            </div>

            {form.targetType === 'genre_generation' && (
              <div className="pl-5 space-y-3">
                <div>
                  <label className="text-[11px] text-white/30 block mb-2">対象ジャンル</label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map(g => (
                      <button key={g} type="button" onClick={() => toggleGenre(g)}
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${form.targetGenres.includes(g) ? 'bg-blue-500 text-white' : 'bg-white/[0.06] text-white/50 hover:text-white/80'}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                  {form.targetGenres.length === 0 && <p className="text-[11px] text-red-400/60 mt-1">未選択 = 対象なし</p>}
                </div>
                <div>
                  <label className="text-[11px] text-white/30 block mb-2">対象代</label>
                  <div className="flex flex-wrap gap-2">
                    {GENERATIONS.map(gen => (
                      <button key={gen} type="button" onClick={() => toggleGeneration(gen)}
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${form.targetGenerations.includes(gen) ? 'bg-purple-500 text-white' : 'bg-white/[0.06] text-white/50 hover:text-white/80'}`}>
                        {gen}代
                      </button>
                    ))}
                  </div>
                  {form.targetGenerations.length === 0 && <p className="text-[11px] text-red-400/60 mt-1">未選択 = 対象なし</p>}
                </div>
              </div>
            )}

            {form.targetType === 'number' && (
              <div className="pl-5">
                {numberRosters.length === 0 ? (
                  <p className="text-xs text-white/30">名簿がまだありません。<a href="/numbers" className="text-blue-400 ml-1">名簿を作成 →</a></p>
                ) : (
                  <select value={form.targetNumberId} onChange={e => setForm(f => ({ ...f, targetNumberId: e.target.value }))}
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                    <option value="">名簿を選択...</option>
                    {numberRosters.map(r => <option key={r.id} value={r.id}>{r.name}（{r.memberIds.length}人）</option>)}
                  </select>
                )}
              </div>
            )}

            {form.targetType === 'individual' && (
              <div className="pl-5">
                <MemberSelectDropdown
                  allUsers={allUsers}
                  selected={targetMembers}
                  onAdd={handleAddTarget}
                  onRemove={handleRemoveTarget}
                  chipColor="green"
                  placeholder="対象メンバーを選択..."
                />
              </div>
            )}

            {/* 追加メンバー */}
            <div className="pt-3 border-t border-white/[0.06] space-y-1.5">
              <label className="text-[11px] text-white/30 block">+ 追加でメンバーを固定指定（任意）</label>
              <p className="text-[10px] text-white/20">上記の条件に加え、特定のメンバーを個別に追加できます。</p>
              <MemberSelectDropdown
                allUsers={usersForAdditional}
                selected={extraMembers}
                onAdd={handleAddExtra}
                onRemove={handleRemoveExtra}
                chipColor="green"
                placeholder="追加するメンバーを選択..."
              />
            </div>

            {/* 除外メンバー */}
            <div className="pt-3 border-t border-white/[0.06] space-y-1.5">
              <label className="text-[11px] text-white/30 block">除外するメンバー（任意）</label>
              <p className="text-[10px] text-white/20">上記の条件に該当していても、このメンバーは対象から外れます。</p>
              <MemberSelectDropdown
                allUsers={usersForExcluded}
                selected={excludedMembers}
                onAdd={handleAddExcluded}
                onRemove={handleRemoveExcluded}
                chipColor="red"
                placeholder="除外するメンバーを選択..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
            <button onClick={resetForm} className="text-xs font-bold px-4 py-2 text-white/40 hover:text-white/60 transition-colors">キャンセル</button>
            <button onClick={handleCreate} disabled={isCreating} className="text-xs font-bold px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-900 disabled:opacity-50 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20">{isCreating ? '作成中...' : '作成する'}</button>
          </div>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/30 text-sm">練習プロジェクトがまだありません</p>
          <p className="text-white/20 text-xs mt-2">「+ プロジェクトを追加」ボタンから作成できます</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
            <Link key={groupName} href={`/practices/project/${encodeURIComponent(groupName)}`} className="block bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden hover:bg-white/[0.08] hover:border-white/[0.2] transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-black/20">
              <div className="w-full flex flex-col justify-between p-5 min-h-[110px]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {groupSessions.some(s => s.type === 'event') ? <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full">イベント練</span> : groupSessions.some(s => s.type === 'team') ? <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">チーム練</span> : <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">正規練</span>}
                    <span className="text-xs font-bold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full">{groupSessions.length}件の日程</span>
                  </div>
                  <h3 className="text-lg font-bold text-white truncate">{groupName}</h3>
                </div>
                <div className="mt-4 flex items-center justify-between text-white/30 text-xs font-medium border-t border-white/[0.04] pt-3">
                  <span>タップして全日程を表示</span>
                  <span className="text-lg">➔</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
