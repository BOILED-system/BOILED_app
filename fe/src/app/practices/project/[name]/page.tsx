'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getPracticeSessions,
  getMyRSVPs,
  updatePracticeSession,
  deletePracticeSession,
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

  // 編集モーダルステート
  const [editingSession, setEditingSession] = useState<PracticeSession | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editAddedMembers, setEditAddedMembers] = useState<{ id: string; name: string }[]>([]);
  const [editAdditionalMembers, setEditAdditionalMembers] = useState<{ id: string; name: string }[]>([]);
  const [editExcludedMembers, setEditExcludedMembers] = useState<{ id: string; name: string }[]>([]);
  const [editMemberInput, setEditMemberInput] = useState('');
  const [editMemberError, setEditMemberError] = useState('');
  const [editMemberLoading, setEditMemberLoading] = useState(false);

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
    setEditingRSVPs(prev => ({ ...prev, [sessionId]: { status, note } }));
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
    const toMember = (id: string) => {
      const u = allUsers.find(u => u.memberId === id);
      return { id, name: u?.name || id };
    };
    setEditForm({
      name: s.name, date: s.date, startTime: s.startTime, endTime: s.endTime || '',
      location: s.location || '', note: s.note || '', type: s.type || 'regular',
      targetType: s.targetType || 'genre_generation',
      targetGenres: s.targetGenres || [], targetGenerations: s.targetGenerations || [],
      targetNumberId: s.targetNumberId || '', targetMemberIds: s.targetMemberIds || [],
      additionalMemberIds: s.additionalMemberIds || [],
      excludedMemberIds: s.excludedMemberIds || [],
    });
    if (s.targetType === 'individual' && s.targetMemberIds?.length) {
      setEditAddedMembers(s.targetMemberIds.map(toMember));
    } else {
      setEditAddedMembers([]);
    }
    setEditAdditionalMembers((s.additionalMemberIds || []).map(toMember));
    setEditExcludedMembers((s.excludedMemberIds || []).map(toMember));
    setEditMemberInput(''); setEditMemberError('');
  };

  const handleEditSave = async () => {
    if (!editingSession) return;
    if (!editForm.name || !editForm.date || !editForm.startTime) { alert('必須項目が不足しています'); return; }
    setEditSaving(true);
    await updatePracticeSession(editingSession.id, {
      name: editForm.name, date: editForm.date, startTime: editForm.startTime,
      endTime: editForm.endTime, location: editForm.location, note: editForm.note,
      type: editForm.type, targetType: editForm.targetType,
      targetGenres: editForm.targetGenres, targetGenerations: editForm.targetGenerations,
      targetNumberId: editForm.targetNumberId, targetMemberIds: editForm.targetMemberIds,
      additionalMemberIds: editForm.additionalMemberIds,
      excludedMemberIds: editForm.excludedMemberIds,
    });
    setGroupSessions(prev => prev.map(s => s.id === editingSession.id ? { ...s, ...editForm } : s));
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
    } catch {
      alert('削除に失敗しました。もう一度お試しください。');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`プロジェクト「${groupName}」の日程をすべて削除しますか？この操作は取り消せません。`)) return;
    try {
      await Promise.all(groupSessions.map(s => deletePracticeSession(s.id)));
      router.back();
    } catch {
      alert('削除に失敗しました。もう一度お試しください。');
    }
  };

  const handleEditAddMember = async () => { /* 略 */
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

  const toggleEditGenre = (g: string) => setEditForm(f => ({ ...f, targetGenres: f.targetGenres.includes(g) ? f.targetGenres.filter(x => x !== g) : [...f.targetGenres, g] }));
  const toggleEditGen = (g: number) => setEditForm(f => ({ ...f, targetGenerations: f.targetGenerations.includes(g) ? f.targetGenerations.filter(x => x !== g) : [...f.targetGenerations, g] }));


  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin"/></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 overflow-x-hidden pb-10">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-white/40 hover:text-white transition-colors">← 戻る</button>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white truncate">{groupName}</h1>
        <button onClick={handleDeleteProject} className="text-xs text-red-400/60 hover:text-red-400 transition-colors px-2 py-1">
          プロジェクトを削除
        </button>
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

        <div className="space-y-6">
          {groupSessions.map((session, index) => {
            const currentRSVP = myRSVPs[session.id];
            const editedRSVP = editingRSVPs[session.id];
            const status = editedRSVP?.status || currentRSVP?.status || '';
            const note = editedRSVP?.note ?? (currentRSVP?.note || '');

            return (
              <div key={session.id} className={`${index > 0 ? 'border-t border-white/[0.04] pt-6' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      {session.date} <span className="text-white/60 text-sm ml-2">{session.startTime}{session.endTime ? `〜${session.endTime}` : ''}</span>
                    </h2>
                    {session.location && <p className="text-xs text-white/30 mt-1">{session.location}</p>}
                  </div>
                  {(!session.createdBy || session.createdBy === memberId) && (
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <button onClick={() => openEdit(session)} className="text-xs bg-white/[0.06] text-white/60 px-3 py-1.5 rounded-lg hover:bg-white/[0.1] whitespace-nowrap">編集</button>
                    <button onClick={() => handleDelete(session)} className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 whitespace-nowrap">削除</button>
                  </div>
                  )}
                </div>

                {/* 出欠入力UI */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {(['GO', 'NO', 'LATE', 'EARLY']).map(s => (
                      <button
                        key={s}
                        onClick={() => handleBulkRSVPChange(session.id, s, note)}
                        className={`flex-1 py-2 text-[13px] font-bold rounded-lg border transition-colors ${status === s ? STATUS_COLORS[s] : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:bg-white/[0.08]'}`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  {(status === 'LATE' || status === 'EARLY' || status === 'NO') && (
                    <input type="text" placeholder={`理由（任意）`} value={note}
                      onChange={e => handleBulkRSVPChange(session.id, status, e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

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

            <div className="space-y-2 border-t border-white/[0.08] pt-4">
              <label className="text-[11px] text-white/30 block">追加メンバー（任意）</label>
              <p className="text-[10px] text-white/20">対象外でも個別に追加できます</p>
              <MemberSelectDropdown
                allUsers={allUsers.filter(u => !editAdditionalMembers.find(m => m.id === u.memberId))}
                selected={editAdditionalMembers}
                onAdd={m => {
                  setEditAdditionalMembers(prev => [...prev, m]);
                  setEditForm(f => ({ ...f, additionalMemberIds: [...f.additionalMemberIds, m.id] }));
                }}
                onRemove={id => {
                  setEditAdditionalMembers(prev => prev.filter(m => m.id !== id));
                  setEditForm(f => ({ ...f, additionalMemberIds: f.additionalMemberIds.filter(x => x !== id) }));
                }}
                chipColor="green"
                placeholder="追加するメンバーを選択..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-white/30 block">除外メンバー（任意）</label>
              <p className="text-[10px] text-white/20">対象でも個別に外せます</p>
              <MemberSelectDropdown
                allUsers={allUsers.filter(u => !editExcludedMembers.find(m => m.id === u.memberId))}
                selected={editExcludedMembers}
                onAdd={m => {
                  setEditExcludedMembers(prev => [...prev, m]);
                  setEditForm(f => ({ ...f, excludedMemberIds: [...f.excludedMemberIds, m.id] }));
                }}
                onRemove={id => {
                  setEditExcludedMembers(prev => prev.filter(m => m.id !== id));
                  setEditForm(f => ({ ...f, excludedMemberIds: f.excludedMemberIds.filter(x => x !== id) }));
                }}
                chipColor="red"
                placeholder="除外するメンバーを選択..."
              />
            </div>

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
    </div>
  );
}
