'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getPracticeSessions,
  createPracticeSession,
  getNumberRosters,
  getUser,
} from '@/lib/api';
import type { PracticeSession, NumberRoster, TargetType } from '@/lib/api';

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
  const [form, setForm] = useState(EMPTY_FORM);

  // 個別指定
  const [addedMembers, setAddedMembers] = useState<{ id: string; name: string }[]>([]);
  const [memberInput, setMemberInput] = useState('');
  const [memberInputError, setMemberInputError] = useState('');
  const [memberInputLoading, setMemberInputLoading] = useState(false);

  // +α追加メンバー
  const [addedExtraMembers, setAddedExtraMembers] = useState<{ id: string; name: string }[]>([]);
  const [extraMemberInput, setExtraMemberInput] = useState('');
  const [extraMemberError, setExtraMemberError] = useState('');
  const [extraMemberLoading, setExtraMemberLoading] = useState(false);

  // 除外メンバー
  const [excludedMembers, setExcludedMembers] = useState<{ id: string; name: string }[]>([]);
  const [excludedMemberInput, setExcludedMemberInput] = useState('');
  const [excludedMemberError, setExcludedMemberError] = useState('');
  const [excludedMemberLoading, setExcludedMemberLoading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'member';
    const mid = localStorage.getItem('memberId') || '';
    setUserRole(role);
    setMemberId(mid);
    load(mid, role);
  }, []);

  const load = async (mid: string, role: string) => {
    try {
      const [allSessions, rosters] = await Promise.all([
        getPracticeSessions(),
        getNumberRosters(),
      ]);
      setNumberRosters(rosters);
      setSessions(allSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name) { alert('練習名は必須です'); return; }
    const validSchedules = form.schedules.filter(s => s.date && s.startTime);
    if (validSchedules.length === 0) { alert('少なくとも1つの有効な日程（日付・開始時間）を追加してください'); return; }
    if (form.targetType === 'number' && !form.targetNumberId) { alert('ナンバー名簿を選択してください'); return; }
    
    setIsCreating(true);
    await Promise.all(validSchedules.map(sch => createPracticeSession({ 
      ...form, date: sch.date, startTime: sch.startTime, endTime: sch.endTime, location: sch.location,
      additionalMemberIds: form.additionalMemberIds,
    })));
    
    setShowForm(false);
    setForm(EMPTY_FORM);
    setAddedMembers([]);
    setMemberInput('');
    setAddedExtraMembers([]);
    setExtraMemberInput('');
    setExcludedMembers([]);
    setExcludedMemberInput('');
    setIsCreating(false);
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

  const handleAddExtraMember = async () => {
    const id = extraMemberInput.trim();
    if (!id) return;
    if (addedExtraMembers.find(m => m.id === id)) { setExtraMemberError('すでに追加されています'); return; }
    setExtraMemberLoading(true); setExtraMemberError('');
    const user = await getUser(id);
    setExtraMemberLoading(false);
    if (!user) { setExtraMemberError('会員番号が見つかりません'); return; }
    setAddedExtraMembers(prev => [...prev, { id, name: user.name as string }]);
    setForm(f => ({ ...f, additionalMemberIds: [...f.additionalMemberIds, id] }));
    setExtraMemberInput('');
  };
  const handleRemoveExtraMember = (id: string) => {
    setAddedExtraMembers(prev => prev.filter(m => m.id !== id));
    setForm(f => ({ ...f, additionalMemberIds: f.additionalMemberIds.filter(mid => mid !== id) }));
  };

  const handleAddExcludedMember = async () => {
    const id = excludedMemberInput.trim();
    if (!id) return;
    if (excludedMembers.find(m => m.id === id)) { setExcludedMemberError('すでに追加されています'); return; }
    setExcludedMemberLoading(true); setExcludedMemberError('');
    const user = await getUser(id);
    setExcludedMemberLoading(false);
    if (!user) { setExcludedMemberError('会員番号が見つかりません'); return; }
    setExcludedMembers(prev => [...prev, { id, name: user.name as string }]);
    setForm(f => ({ ...f, excludedMemberIds: [...f.excludedMemberIds, id] }));
    setExcludedMemberInput('');
  };
  const handleRemoveExcludedMember = (id: string) => {
    setExcludedMembers(prev => prev.filter(m => m.id !== id));
    setForm(f => ({ ...f, excludedMemberIds: f.excludedMemberIds.filter(mid => mid !== id) }));
  };

  const toggleGenre = (genre: string) => setForm(f => ({ ...f, targetGenres: f.targetGenres.includes(genre) ? f.targetGenres.filter(g => g !== genre) : [...f.targetGenres, genre] }));
  const toggleGeneration = (gen: number) => setForm(f => ({ ...f, targetGenerations: f.targetGenerations.includes(gen) ? f.targetGenerations.filter(g => g !== gen) : [...f.targetGenerations, gen] }));

  const TargetForm = ({ f, setF, addedM, memberIn, setMemberIn, memberErr, memberLoading, onAddMember, onRemoveMember, onToggleGenre, onToggleGen, rosters, addedExtra, extraIn, setExtraIn, extraErr, extraLoading, onAddExtra, onRemoveExtra, excludedM, excludedIn, setExcludedIn, excludedErr, excludedLoading, onAddExcluded, onRemoveExcluded }: any) => (
    <div className="space-y-3">
      <label className="text-[11px] text-white/30 block mb-1">対象者の指定方法</label>
      <div className="space-y-1.5 mb-2">
        {[
          { value: 'genre_generation', label: 'ジャンル・代で絞り込む' },
          { value: 'number', label: 'ナンバー名簿から選ぶ' },
          { value: 'individual', label: '会員番号で個別指定' },
        ].map(opt => (
          <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
            <input type="radio" name={`targetType_${f.name || 'new'}`} value={opt.value}
              checked={f.targetType === opt.value}
              onChange={() => setF((prev: any) => ({ ...prev, targetType: opt.value as TargetType }))}
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
            <select value={f.targetNumberId} onChange={e => setF((prev: any) => ({ ...prev, targetNumberId: e.target.value }))}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              <option value="">名簿を選択...</option>
              {rosters.map((r: NumberRoster) => <option key={r.id} value={r.id}>{r.name}（{r.memberIds.length}人）</option>)}
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
              追加
            </button>
          </div>
          {addedM.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {addedM.map((m: any) => (
                <span key={m.id} className="flex items-center gap-1 text-xs bg-white/[0.06] text-white/60 px-2.5 py-1 rounded-full">
                  {m.name}<button type="button" onClick={() => onRemoveMember(m.id)} className="text-white/30 hover:text-red-400 ml-0.5">×</button>
              </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* +α: どの方法を選んでも追加できるメンバー */}
      <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
        <label className="text-[11px] text-white/30 block">+ 追加でメンバーを固定指定（任意）</label>
        <p className="text-[10px] text-white/20">上記の条件に加え、特定のメンバーを個別に追加できます。</p>
        <div className="flex gap-2">
          <input type="text" placeholder="会員番号（例：16199）" value={extraIn}
            onChange={e => { setExtraIn(e.target.value); }}
            onKeyDown={e => e.key === 'Enter' && onAddExtra()}
            className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none" />
          <button type="button" onClick={onAddExtra}
            disabled={extraLoading || !extraIn.trim()}
            className="text-xs px-3 py-1.5 bg-white/[0.06] text-white/60 rounded-lg hover:bg-white/[0.1] disabled:opacity-40">
            {extraLoading ? '...' : '追加'}
          </button>
        </div>
        {extraErr && <p className="text-xs text-red-400">{extraErr}</p>}
        {addedExtra.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {addedExtra.map((m: any) => (
              <span key={m.id} className="flex items-center gap-1 text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full">
                {m.name} <button type="button" onClick={() => onRemoveExtra(m.id)} className="text-white/30 hover:text-red-400 ml-0.5">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 除外メンバー */}
      <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
        <label className="text-[11px] text-white/30 block">除外するメンバー（任意）</label>
        <p className="text-[10px] text-white/20">上記の条件に該当していても、このメンバーは対象から外れます。</p>
        <div className="flex gap-2">
          <input type="text" placeholder="会員番号（例：16199）" value={excludedIn}
            onChange={e => { setExcludedIn(e.target.value); }}
            onKeyDown={e => e.key === 'Enter' && onAddExcluded()}
            className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none" />
          <button type="button" onClick={onAddExcluded}
            disabled={excludedLoading || !excludedIn.trim()}
            className="text-xs px-3 py-1.5 bg-white/[0.06] text-white/60 rounded-lg hover:bg-white/[0.1] disabled:opacity-40">
            {excludedLoading ? '...' : '除外'}
          </button>
        </div>
        {excludedErr && <p className="text-xs text-red-400">{excludedErr}</p>}
        {excludedM.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {excludedM.map((m: any) => (
              <span key={m.id} className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full">
                {m.name} <button type="button" onClick={() => onRemoveExcluded(m.id)} className="text-white/30 hover:text-red-400 ml-0.5">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const groupedSessions = sessions.reduce((acc, session) => {
    if (!acc[session.name]) acc[session.name] = [];
    acc[session.name].push(session);
    return acc;
  }, {} as Record<string, PracticeSession[]>);

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"/></div>;

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

          <TargetForm f={form} setF={(fn:any) => setForm(fn(form))} addedM={addedMembers} memberIn={memberInput}
            setMemberIn={(v:string) => { setMemberInput(v); setMemberInputError(''); }} memberErr={memberInputError} memberLoading={memberInputLoading}
            onAddMember={handleAddMember} onRemoveMember={handleRemoveMember} onToggleGenre={toggleGenre} onToggleGen={toggleGeneration} rosters={numberRosters}
            addedExtra={addedExtraMembers} extraIn={extraMemberInput} setExtraIn={(v:string) => { setExtraMemberInput(v); setExtraMemberError(''); }}
            extraErr={extraMemberError} extraLoading={extraMemberLoading} onAddExtra={handleAddExtraMember} onRemoveExtra={handleRemoveExtraMember}
            excludedM={excludedMembers} excludedIn={excludedMemberInput} setExcludedIn={(v:string) => { setExcludedMemberInput(v); setExcludedMemberError(''); }}
            excludedErr={excludedMemberError} excludedLoading={excludedMemberLoading} onAddExcluded={handleAddExcludedMember} onRemoveExcluded={handleRemoveExcludedMember} />

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setAddedMembers([]); }} className="text-xs font-bold px-4 py-2 text-white/40 hover:text-white/60 transition-colors">キャンセル</button>
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
          {Object.entries(groupedSessions).map(([groupName, groupSessions]) => {
            const hasEvent = groupSessions.some(s => s.type === 'event');
            return (
              <Link key={groupName} href={`/practices/project/${encodeURIComponent(groupName)}`} className="block bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden hover:bg-white/[0.08] hover:border-white/[0.2] transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-black/20">
                <div className="w-full flex flex-col justify-between p-5 min-h-[110px]">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {groupSessions.some(s => s.type === 'event') ? <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full">イベント練</span> : groupSessions.some(s => s.type === 'team') ? <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">チーム練</span> : <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">正規練</span>}
                      <span className="text-xs font-bold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full">{groupSessions.length}件の日程</span>
                    </div>
                    <h3 className="text-lg font-bold text-white truncate group-hover:text-blue-200 transition-colors">{groupName}</h3>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-white/30 text-xs font-medium group-hover:text-blue-400 transition-colors border-t border-white/[0.04] pt-3">
                    <span>タップして全日程を表示</span>
                    <span className="text-lg">➔</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
