'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getPracticeSessions,
  getMyRSVPs,
  updatePracticeSession,
  deletePracticeSession,
  createPracticeSession,
  getNumberRosters,
  getAllUsers,
  getUser,
  submitRSVP,
} from '@/lib/api';
import type { PracticeSession, NumberRoster, TargetType, FEUser } from '@/lib/api';
import MemberSelectDropdown from '@/components/MemberSelectDropdown';

const GENRES = ['Break', 'Girls', 'Hiphop', 'House', 'Lock', 'Pop', 'Waack'];
const GENERATIONS = [16, 17];
const STATUS_LABELS: Record<string, string> = { GO: '出席', NO: '欠席', LATE: '遅刻', EARLY: '早退' };
const STATUS_COLORS: Record<string, string> = {
  GO: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  NO: 'bg-red-500/20 text-red-400 border border-red-500/30',
  LATE: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  EARLY: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
};

const addTwoHours = (time: string): string => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return `${String((h + 2) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const EMPTY_FORM = {
  name: '', date: '', startTime: '', endTime: '', location: '', note: '',
  type: 'regular' as 'regular' | 'event' | 'team', targetType: 'genre_generation' as TargetType,
  targetGenres: [] as string[], targetGenerations: [] as number[],
  targetNumberId: '', targetMemberIds: [] as string[],
  additionalMemberIds: [] as string[],
  excludedMemberIds: [] as string[],
};

export default function ProjectRSVPPage({ params }: { params: { name: string } }) {
  const router = useRouter();
  const groupName = decodeURIComponent(params.name);

  const [groupSessions, setGroupSessions] = useState<PracticeSession[]>([]);
  const [myRSVPs, setMyRSVPs] = useState<Record<string, { status: string; note: string }>>({});
  const [loading, setLoading] = useState(true);
  const [editingRSVPs, setEditingRSVPs] = useState<Record<string, { status: string; note: string }>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  
  const [userRole, setUserRole] = useState('');
  const [memberId, setMemberId] = useState('');
  const [numberRosters, setNumberRosters] = useState<NumberRoster[]>([]);
  const [allUsers, setAllUsers] = useState<FEUser[]>([]);

  // 編集モーダルステート（日程単位の編集：日時・場所のみ）
  const [editingSession, setEditingSession] = useState<PracticeSession | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

  // 日程追加モーダルステート
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [addScheduleForm, setAddScheduleForm] = useState({ date: '', startTime: '19:00', endTime: '21:00', location: '' });
  const [addScheduleSaving, setAddScheduleSaving] = useState(false);

  // プロジェクト全体の対象者編集ステート
  const [showProjectMembers, setShowProjectMembers] = useState(false);
  const [projectTargetType, setProjectTargetType] = useState<TargetType>('genre_generation');
  const [projectTargetGenres, setProjectTargetGenres] = useState<string[]>([]);
  const [projectTargetGenerations, setProjectTargetGenerations] = useState<number[]>([]);
  const [projectTargetNumberId, setProjectTargetNumberId] = useState('');
  const [projectTargetMembers, setProjectTargetMembers] = useState<{ id: string; name: string }[]>([]);
  const [projectAdditional, setProjectAdditional] = useState<{ id: string; name: string }[]>([]);
  const [projectExcluded, setProjectExcluded] = useState<{ id: string; name: string }[]>([]);
  const [projectSaving, setProjectSaving] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'member';
    const mid = localStorage.getItem('memberId') || '';
    setUserRole(role);
    setMemberId(mid);
    load(mid);
  }, [groupName]);

  const load = async (mid: string) => {
    try {
      const [allSessions, rosters, users] = await Promise.all([
        getPracticeSessions(),
        getNumberRosters(),
        getAllUsers(),
      ]);
      setNumberRosters(rosters);
      setAllUsers(users);

      const matched = allSessions
        .filter(s => s.name === groupName)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setGroupSessions(matched);

      if (mid && matched.length > 0) {
        const allRSVPs = await getMyRSVPs(mid);
        const rsvpMap: Record<string, { status: string; note: string }> = {};
        for (const s of matched) {
          const rsvp = allRSVPs[s.id];
          if (rsvp) rsvpMap[s.id] = { status: rsvp.status, note: rsvp.note || '' };
        }
        setMyRSVPs(rsvpMap);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRSVPChange = (sessionId: string, status: string, note: string) => {
    setEditingRSVPs(prev => {
      if (prev[sessionId]?.status === status) {
        // 同じ未保存の選択を再クリック → 取り消し
        const next = { ...prev };
        delete next[sessionId];
        return next;
      }
      // 保存済みと同じ状態かつ未編集なら何もしない
      if (!prev[sessionId] && myRSVPs[sessionId]?.status === status) {
        return prev;
      }
      return { ...prev, [sessionId]: { status, note } };
    });
  };

  const saveBulkRSVPs = async () => {
    const changedSessionIds = groupSessions.map(s => s.id).filter(id => editingRSVPs[id]);
    if (changedSessionIds.length === 0) return;

    setBulkSaving(true);
    try {
      const user = await getUser(memberId);
      if (!user) return;
      await Promise.all(changedSessionIds.map(id =>
        submitRSVP({
          sessionId: id,
          memberId: memberId,
          name: user.name,
          genre: user.genre,
          generation: user.generation,
          status: editingRSVPs[id].status as any,
          note: editingRSVPs[id].note,
        })
      ));
      setMyRSVPs(prev => {
        const next = { ...prev };
        changedSessionIds.forEach(id => { next[id] = editingRSVPs[id]; });
        return next;
      });
      setEditingRSVPs(prev => {
        const next = { ...prev };
        changedSessionIds.forEach(id => delete next[id]);
        return next;
      });
      alert('一括保存しました');
    } catch (e) {
      console.error(e);
      alert('保存に失敗しました');
    } finally {
      setBulkSaving(false);
    }
  };

  // ===== 編集・削除 =====
  const openEdit = (s: PracticeSession) => {
    setEditingSession(s);
    setEditForm({
      name: s.name, date: s.date, startTime: s.startTime, endTime: s.endTime || '',
      location: s.location || '', note: s.note || '', type: s.type || 'regular',
      targetType: s.targetType || 'genre_generation',
      targetGenres: s.targetGenres || [], targetGenerations: s.targetGenerations || [],
      targetNumberId: s.targetNumberId || '', targetMemberIds: s.targetMemberIds || [],
      additionalMemberIds: s.additionalMemberIds || [],
      excludedMemberIds: s.excludedMemberIds || [],
    });
  };

  const handleEditSave = async () => {
    if (!editingSession) return;
    if (!editForm.name || !editForm.date || !editForm.startTime) { alert('必須項目が不足しています'); return; }
    setEditSaving(true);
    // 日時・場所のみを更新（対象者はプロジェクト全体編集で管理）
    await updatePracticeSession(editingSession.id, {
      name: editForm.name, date: editForm.date, startTime: editForm.startTime,
      endTime: editForm.endTime, location: editForm.location, note: editForm.note,
    });
    setGroupSessions(prev => prev.map(s => s.id === editingSession.id ? {
      ...s,
      name: editForm.name, date: editForm.date, startTime: editForm.startTime,
      endTime: editForm.endTime, location: editForm.location, note: editForm.note,
    } : s));
    setEditSaving(false);
    setEditingSession(null);
  };

  const handleDelete = async (s: PracticeSession) => {
    if (!confirm(`「${s.date}」の日程を削除しますか？`)) return;
    try {
      await deletePracticeSession(s.id);
      const next = groupSessions.filter(x => x.id !== s.id);
      setGroupSessions(next);
      if (next.length === 0) router.back();
    } catch (e: any) {
      console.error('[handleDelete]', e);
      alert(`削除に失敗しました: ${e?.message || e}`);
    }
  };

  const handleAddSchedule = async () => {
    if (!addScheduleForm.date || !addScheduleForm.startTime) { alert('日付と開始時間は必須です'); return; }
    setAddScheduleSaving(true);
    try {
      const base = groupSessions[0];
      const createdBy = memberId;
      const createdByName = localStorage.getItem('userName') || '';
      const payload = {
        name: groupName,
        date: addScheduleForm.date,
        startTime: addScheduleForm.startTime,
        endTime: addScheduleForm.endTime,
        location: addScheduleForm.location,
        note: base?.note || '',
        type: base?.type || 'regular' as const,
        targetType: base?.targetType || 'genre_generation' as const,
        targetGenres: base?.targetGenres || [],
        targetGenerations: base?.targetGenerations || [],
        targetNumberId: base?.targetNumberId || '',
        targetMemberIds: base?.targetMemberIds || [],
        additionalMemberIds: base?.additionalMemberIds || [],
        excludedMemberIds: base?.excludedMemberIds || [],
        createdBy,
        createdByName,
      };
      const newId = await createPracticeSession(payload);
      const newSession: PracticeSession = { id: newId, createdAt: new Date().toISOString(), ...payload };
      setGroupSessions(prev =>
        [...prev, newSession].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      );
      setAddScheduleForm({ date: '', startTime: '19:00', endTime: '21:00', location: '' });
      setShowAddSchedule(false);
    } catch (e: any) {
      console.error('[handleAddSchedule]', e);
      alert(`追加に失敗しました: ${e?.message || e}`);
    } finally {
      setAddScheduleSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`プロジェクト「${groupName}」の日程をすべて削除しますか？この操作は取り消せません。`)) return;
    try {
      await Promise.all(groupSessions.map(s => deletePracticeSession(s.id)));
      router.back();
    } catch (e: any) {
      console.error('[handleDeleteProject]', e);
      alert(`削除に失敗しました: ${e?.message || e}`);
    }
  };

  const openProjectMembers = () => {
    const toMember = (id: string) => {
      const u = allUsers.find(u => u.memberId === id);
      return { id, name: u?.name || id };
    };
    const base = groupSessions[0];
    setProjectTargetType(base?.targetType || 'genre_generation');
    setProjectTargetGenres(base?.targetGenres || []);
    setProjectTargetGenerations(base?.targetGenerations || []);
    setProjectTargetNumberId(base?.targetNumberId || '');
    const memberIds = Array.from(new Set(groupSessions.flatMap(s => s.targetMemberIds || [])));
    setProjectTargetMembers(memberIds.map(toMember));
    const additionalIds = Array.from(new Set(groupSessions.flatMap(s => s.additionalMemberIds || [])));
    const excludedIds = Array.from(new Set(groupSessions.flatMap(s => s.excludedMemberIds || [])));
    setProjectAdditional(additionalIds.map(toMember));
    setProjectExcluded(excludedIds.map(toMember));
    setShowProjectMembers(true);
  };

  const handleSaveProjectMembers = async () => {
    setProjectSaving(true);
    try {
      const updates = {
        targetType: projectTargetType,
        targetGenres: projectTargetGenres,
        targetGenerations: projectTargetGenerations,
        targetNumberId: projectTargetNumberId,
        targetMemberIds: projectTargetMembers.map(m => m.id),
        additionalMemberIds: projectAdditional.map(m => m.id),
        excludedMemberIds: projectExcluded.map(m => m.id),
      };
      await Promise.all(groupSessions.map(s => updatePracticeSession(s.id, updates)));
      setGroupSessions(prev => prev.map(s => ({ ...s, ...updates })));
      setShowProjectMembers(false);
    } catch (e: any) {
      console.error('[handleSaveProjectMembers]', e);
      alert(`保存に失敗しました: ${e?.message || e}`);
    } finally {
      setProjectSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin"/></div>;
  }

  // プロジェクト全体の primary target を計算（全セッションの union）
  const projectPrimaryTargetIds = (() => {
    const ids = new Set<string>();
    for (const s of groupSessions) {
      const tt = s.targetType || 'genre_generation';
      if (tt === 'genre_generation') {
        allUsers.forEach(u => {
          const genreOk = !s.targetGenres?.length || s.targetGenres.includes(u.genre as string);
          const genOk = !s.targetGenerations?.length || s.targetGenerations.includes(u.generation as number);
          if (genreOk && genOk && (s.targetGenres?.length || s.targetGenerations?.length)) {
            ids.add(u.memberId);
          }
        });
      } else if (tt === 'number') {
        const roster = numberRosters.find(r => r.id === s.targetNumberId);
        roster?.memberIds.forEach(id => ids.add(id));
      } else if (tt === 'individual') {
        s.targetMemberIds?.forEach(id => ids.add(id));
      }
    }
    return ids;
  })();
  // 追加: primary target に未所属のメンバーのみ
  const projectUsersForAdditional = allUsers.filter(u => !projectPrimaryTargetIds.has(u.memberId));
  // 除外: 現状メンバー（primary target ∪ 追加リスト）のみ
  const projectCurrentMemberIds = new Set<string>([
    ...Array.from(projectPrimaryTargetIds),
    ...projectAdditional.map(m => m.id),
  ]);
  const projectUsersForExcluded = allUsers.filter(u => projectCurrentMemberIds.has(u.memberId));

  return (
    <div className="max-w-3xl mx-auto space-y-6 overflow-x-hidden pb-10">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-white/40 hover:text-white transition-colors">← 戻る</button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-white truncate">{groupName}</h1>
        {(userRole === 'admin' || !groupSessions[0]?.createdBy || groupSessions[0]?.createdBy === memberId) && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setShowAddSchedule(true)} className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors px-2.5 py-1 rounded-lg whitespace-nowrap">
              + 日程を追加
            </button>
            <button onClick={openProjectMembers} className="text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors px-2.5 py-1 rounded-lg whitespace-nowrap">
              対象者を編集
            </button>
            <button onClick={handleDeleteProject} className="text-xs text-red-400/60 hover:text-red-400 transition-colors px-2 py-1 whitespace-nowrap">
              プロジェクトを削除
            </button>
          </div>
        )}
      </div>

      <div className="bg-[#141824] border border-white/[0.08] rounded-xl overflow-hidden p-4 space-y-6">
        
        {/* CSV出力と全体共有情報 */}
        <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-lg border border-white/[0.04]">
          <div className="text-xs text-white/60">
            プロジェクトへの出欠を一括で提出できます。<br/>メンバー全体の出欠状況を見たい場合は一覧へ。
          </div>
          <Link href={`/practices/group/${encodeURIComponent(groupName)}`} className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-2 rounded-lg transition-colors border border-emerald-500/30 font-bold whitespace-nowrap">
            📋 出欠一覧・CSV出力
          </Link>
        </div>

        {(() => {
          const todayJST = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
          const upcoming = groupSessions.filter(s => s.date >= todayJST);
          const past = [...groupSessions.filter(s => s.date < todayJST)].reverse();

          const renderSession = (session: typeof groupSessions[0], index: number, dimmed = false) => {
            const currentRSVP = myRSVPs[session.id];
            const editedRSVP = editingRSVPs[session.id];
            const status = editedRSVP?.status || currentRSVP?.status || '';
            const note = editedRSVP?.note ?? (currentRSVP?.note || '');
            return (
              <div key={session.id} className={`${index > 0 ? 'border-t border-white/[0.04] pt-6' : ''} ${dimmed ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      {session.date} <span className="text-white/60 text-sm ml-2">{session.startTime}{session.endTime ? `〜${session.endTime}` : ''}</span>
                    </h2>
                    {session.location && (
                      <p className="text-sm font-semibold text-white/80 mt-1 bg-white/[0.06] inline-block px-2 py-0.5 rounded-md">
                        {session.location}
                      </p>
                    )}
                  </div>
                  {(userRole === 'admin' || !session.createdBy || session.createdBy === memberId) && (
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <button onClick={() => openEdit(session)} className="text-xs bg-white/[0.06] text-white/60 px-3 py-1.5 rounded-lg hover:bg-white/[0.1] whitespace-nowrap">編集</button>
                      <button onClick={() => handleDelete(session)} className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 whitespace-nowrap">削除</button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {(['GO', 'NO', 'LATE', 'EARLY']).map(s => (
                      <button key={s} onClick={() => handleBulkRSVPChange(session.id, s, note)}
                        className={`flex-1 py-2 text-[13px] font-bold rounded-lg border transition-colors ${status === s ? STATUS_COLORS[s] : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:bg-white/[0.08]'}`}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  {(status === 'LATE' || status === 'EARLY' || status === 'NO') && (
                    <input type="text" placeholder="理由（任意）" value={note}
                      onChange={e => handleBulkRSVPChange(session.id, status, e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none" />
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-6">
              {upcoming.map((s, i) => renderSession(s, i))}
              {past.length > 0 && (
                <>
                  <div className="border-t border-white/[0.08] pt-4 mt-4">
                    <p className="text-[11px] font-bold text-white/20 uppercase tracking-wider mb-4">過去の日程</p>
                    <div className="space-y-6">
                      {past.map((s, i) => renderSession(s, i, true))}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* 一括保存ボタン */}
        <div className="pt-6 mt-6 border-t border-white/[0.08] flex justify-end sticky bottom-4">
          <button
            onClick={saveBulkRSVPs}
            disabled={bulkSaving || !groupSessions.some(s => editingRSVPs[s.id])}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-blue-900 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-2xl shadow-blue-500/20 transition-all"
          >
            {bulkSaving ? '保存中...' : '変更をすべて保存'}
          </button>
        </div>
      </div>

      {/* 日程追加モーダル */}
      {showAddSchedule && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddSchedule(false)} />
          <div className="relative w-full max-w-lg bg-[#1a1f2e] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">日程を追加</h2>
              <button type="button" onClick={() => setShowAddSchedule(false)} aria-label="閉じる"
                className="text-white/30 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-lg">×</button>
            </div>
            <p className="text-[11px] text-white/40">対象者・ターゲット設定はプロジェクトの既存日程から引き継ぎます。</p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-white/30 block mb-1">日付 <span className="text-red-400">*</span></label>
                <input type="date" value={addScheduleForm.date}
                  onChange={e => setAddScheduleForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-white/30 block mb-1">開始 <span className="text-red-400">*</span></label>
                <input type="time" value={addScheduleForm.startTime}
                  onChange={e => { const t = e.target.value; setAddScheduleForm(f => ({ ...f, startTime: t, endTime: addTwoHours(t) })); }}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-white/30 block mb-1">終了</label>
                <input type="time" value={addScheduleForm.endTime}
                  onChange={e => setAddScheduleForm(f => ({ ...f, endTime: e.target.value }))}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
            </div>

            <input type="text" placeholder="場所（任意）" value={addScheduleForm.location}
              onChange={e => setAddScheduleForm(f => ({ ...f, location: e.target.value }))}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none" />

            <div className="flex gap-2 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setShowAddSchedule(false)}
                className="flex-1 py-2.5 text-sm text-white/40 hover:text-white/60 bg-white/[0.04] rounded-xl">
                キャンセル
              </button>
              <button onClick={handleAddSchedule} disabled={addScheduleSaving}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl">
                {addScheduleSaving ? '追加中...' : '追加する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingSession(null)} />
          <div className="relative w-full max-w-lg bg-[#1a1f2e] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-base font-bold text-white">日程を編集</h2>
            
            <input type="text" placeholder="練習名" value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none" />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-white/30 block mb-1">日付</label>
                <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-white/30 block mb-1">開始</label>
                <input type="time" value={editForm.startTime} onChange={e => {
                  const start = e.target.value; setEditForm(f => ({ ...f, startTime: start, endTime: addTwoHours(start) }));
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

            <p className="text-[11px] text-white/30">対象者の追加・除外はプロジェクト上部の「対象者を編集」から行えます。</p>

            <div className="flex gap-2 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setEditingSession(null)}
                className="flex-1 py-2.5 text-sm text-white/40 hover:text-white/60 bg-white/[0.04] rounded-xl">
                キャンセル
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-xl">
                {editSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プロジェクト全体の対象者編集モーダル */}
      {showProjectMembers && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProjectMembers(false)} />
          <div className="relative w-full max-w-lg bg-[#1a1f2e] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">対象者を編集</h2>
              <button type="button" onClick={() => setShowProjectMembers(false)} aria-label="閉じる"
                className="text-white/30 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-lg">×</button>
            </div>
            <p className="text-[11px] text-white/40">ここでの変更はこのプロジェクトの<strong className="text-white/70">全日程</strong>に反映されます。</p>

            {/* 対象者の指定方法 */}
            <div className="space-y-2">
              <label className="text-[11px] text-white/30 block">対象者の指定方法</label>
              {([
                { value: 'genre_generation', label: 'ジャンル・代で絞り込む' },
                { value: 'number', label: 'ナンバー名簿から選ぶ' },
                { value: 'individual', label: 'メンバーを個別指定' },
              ] as const).map(opt => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" name="projectTargetType" value={opt.value}
                    checked={projectTargetType === opt.value}
                    onChange={() => setProjectTargetType(opt.value)}
                    className="accent-blue-500" />
                  <span className="text-sm text-white/60">{opt.label}</span>
                </label>
              ))}
            </div>

            {projectTargetType === 'genre_generation' && (
              <div className="pl-4 space-y-3">
                <div>
                  <label className="text-[11px] text-white/30 block mb-2">対象ジャンル</label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map(g => (
                      <button key={g} type="button"
                        onClick={() => setProjectTargetGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${projectTargetGenres.includes(g) ? 'bg-blue-500 text-white' : 'bg-white/[0.06] text-white/50 hover:text-white/80'}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-white/30 block mb-2">対象代</label>
                  <div className="flex flex-wrap gap-2">
                    {GENERATIONS.map(gen => (
                      <button key={gen} type="button"
                        onClick={() => setProjectTargetGenerations(prev => prev.includes(gen) ? prev.filter(x => x !== gen) : [...prev, gen])}
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${projectTargetGenerations.includes(gen) ? 'bg-purple-500 text-white' : 'bg-white/[0.06] text-white/50 hover:text-white/80'}`}>
                        {gen}代
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {projectTargetType === 'number' && (
              <div className="pl-4">
                {numberRosters.length === 0 ? (
                  <p className="text-xs text-white/30">名簿がまだありません。</p>
                ) : (
                  <select value={projectTargetNumberId} onChange={e => setProjectTargetNumberId(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                    <option value="">名簿を選択...</option>
                    {numberRosters.map(r => <option key={r.id} value={r.id}>{r.name}（{r.memberIds.length}人）</option>)}
                  </select>
                )}
              </div>
            )}

            {projectTargetType === 'individual' && (
              <div className="pl-4">
                <MemberSelectDropdown
                  allUsers={allUsers}
                  selected={projectTargetMembers}
                  onAdd={m => setProjectTargetMembers(prev => [...prev, m])}
                  onRemove={id => setProjectTargetMembers(prev => prev.filter(m => m.id !== id))}
                  chipColor="green"
                  placeholder="対象メンバーを選択..."
                />
              </div>
            )}

            <div className="border-t border-white/[0.06] pt-3 space-y-3">
              <div className="space-y-2">
                <label className="text-[11px] text-white/30 block">追加メンバー（任意）</label>
                <MemberSelectDropdown
                  allUsers={allUsers}
                  selected={projectAdditional}
                  onAdd={m => setProjectAdditional(prev => [...prev, m])}
                  onRemove={id => setProjectAdditional(prev => prev.filter(m => m.id !== id))}
                  chipColor="green"
                  placeholder="追加するメンバーを選択..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-white/30 block">除外メンバー（任意）</label>
                <MemberSelectDropdown
                  allUsers={allUsers}
                  selected={projectExcluded}
                  onAdd={m => setProjectExcluded(prev => [...prev, m])}
                  onRemove={id => setProjectExcluded(prev => prev.filter(m => m.id !== id))}
                  chipColor="red"
                  placeholder="除外するメンバーを選択..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-white/[0.08]">
              <button onClick={() => setShowProjectMembers(false)}
                className="flex-1 py-2.5 text-sm text-white/40 hover:text-white/60 bg-white/[0.04] rounded-xl">
                キャンセル
              </button>
              <button onClick={handleSaveProjectMembers} disabled={projectSaving}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-xl">
                {projectSaving ? '保存中...' : '全日程に反映して保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
