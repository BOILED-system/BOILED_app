'use client';

import { useState, useEffect } from 'react';
import {
  getSettlements,
  getSettlementPayments,
  createSettlement,
  updateSettlement,
  updatePaymentStatus,
  reportPayment,
  deleteSettlement,
  addPaymentRecord,
  getNumberRosters,
  getAllUsers,
  getUser,
} from '@/lib/api';
import type {
  Settlement,
  PaymentRecord,
  PaymentStatus,
  PaymentMethod,
  CashCollector,
  NumberRoster,
  TargetType,
  FEUser,
} from '@/lib/api';
import MemberSelectDropdown from '@/components/MemberSelectDropdown';

const GENRES = ['Break', 'Girls', 'Hiphop', 'House', 'Lock', 'Pop', 'Waack'];
const GENERATIONS = [16, 17];

const METHOD_LABELS: Record<PaymentMethod, string> = {
  bank: '振込',
  paypay: 'PayPay',
  cash: '現金手渡し',
};
const METHOD_COLORS: Record<PaymentMethod, string> = {
  bank: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  paypay: 'bg-red-500/20 text-red-400 border-red-500/30',
  cash: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const EMPTY_FORM = {
  title: '',
  amount: '',
  dueDate: '',
  note: '',
  targetType: 'genre_generation' as TargetType,
  targetGenres: [] as string[],
  targetGenerations: [] as number[],
  targetNumberId: '',
  targetMemberIds: [] as string[],
  additionalMemberIds: [] as string[],
  excludedMemberIds: [] as string[],
  paymentMethods: [] as PaymentMethod[],
  bankInfo: '',
  paypayInfo: '',
  cashCollectors: [] as CashCollector[],
  requiresConfirmation: false,
};

export default function PaymentsPage() {
  const [tab, setTab] = useState<'incoming' | 'created'>('incoming');
  const [incomingSubTab, setIncomingSubTab] = useState<'unpaid' | 'reported' | 'done'>('unpaid');
  const [allSettlements, setAllSettlements] = useState<Settlement[]>([]);
  const [myRecords, setMyRecords] = useState<Record<string, PaymentRecord | null>>({});
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [userName, setUserName] = useState('');

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [numberRosters, setNumberRosters] = useState<NumberRoster[]>([]);
  const [allUsers, setAllUsers] = useState<FEUser[]>([]);
  const [targetMembers, setTargetMembers] = useState<{ id: string; name: string }[]>([]);
  const [extraMembers, setExtraMembers] = useState<{ id: string; name: string }[]>([]);
  const [excludedMembers, setExcludedMembers] = useState<{ id: string; name: string }[]>([]);
  const [cashCollectorInput, setCashCollectorInput] = useState('');
  const [cashCollectorError, setCashCollectorError] = useState('');
  const [cashCollectorLoading, setCashCollectorLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  const [editForm, setEditForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [editNewMembers, setEditNewMembers] = useState<{ id: string; name: string }[]>([]);
  const [editRemovedMemberIds, setEditRemovedMemberIds] = useState<string[]>([]);
  const [editCashCollectorInput, setEditCashCollectorInput] = useState('');
  const [editCashCollectorError, setEditCashCollectorError] = useState('');
  const [editCashCollectorLoading, setEditCashCollectorLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Report modal
  const [reportingSettlement, setReportingSettlement] = useState<Settlement | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedCollector, setSelectedCollector] = useState<CashCollector | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  // Creator's expanded settlements
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentsCache, setPaymentsCache] = useState<Record<string, PaymentRecord[]>>({});
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  useEffect(() => {
    const mid = localStorage.getItem('memberId') || '';
    const name = localStorage.getItem('userName') || '';
    setMemberId(mid);
    setUserName(name);
    load(mid);
  }, []);

  const load = async (mid: string) => {
    try {
      const [settlements, rosters, users] = await Promise.all([
        getSettlements(),
        getNumberRosters(),
        getAllUsers(),
      ]);
      setAllSettlements(settlements);
      setNumberRosters(rosters);
      setAllUsers(users);

      const incoming = settlements.filter(s => s.resolvedMemberIds?.includes(mid));
      const statusMap: Record<string, PaymentRecord | null> = {};
      await Promise.all(
        incoming.map(async s => {
          const payments = await getSettlementPayments(s.id);
          statusMap[s.id] = payments.find(p => p.memberId === mid) ?? null;
        })
      );
      setMyRecords(statusMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const incomingSettlements = allSettlements
    .filter(s => s.resolvedMemberIds?.includes(memberId))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const unpaidSettlements = incomingSettlements.filter(
    s => !myRecords[s.id] || myRecords[s.id]?.status === 'unpaid'
  );
  // 報告済み = 確認必要な請求でメンバーが報告済みだが作成者未確認
  const reportedSettlements = incomingSettlements.filter(
    s => myRecords[s.id]?.status === 'reported'
  );
  // 完了 = confirmed（確認不要の即完了 or 作成者確認済み）
  const doneSettlements = incomingSettlements.filter(
    s => myRecords[s.id]?.status === 'confirmed'
  );

  const createdSettlements = allSettlements
    .filter(s => s.createdBy === memberId)
    .sort((a, b) => new Date(b.createdAt?.toDate?.() ?? b.createdAt).getTime() - new Date(a.createdAt?.toDate?.() ?? a.createdAt).getTime());

  // ===== Create form helpers =====

  const toggleGenre = (genre: string) =>
    setForm(f => ({ ...f, targetGenres: f.targetGenres.includes(genre) ? f.targetGenres.filter(g => g !== genre) : [...f.targetGenres, genre] }));

  const toggleGeneration = (gen: number) =>
    setForm(f => ({ ...f, targetGenerations: f.targetGenerations.includes(gen) ? f.targetGenerations.filter(g => g !== gen) : [...f.targetGenerations, gen] }));

  const togglePaymentMethod = (m: PaymentMethod) =>
    setForm(f => ({ ...f, paymentMethods: f.paymentMethods.includes(m) ? f.paymentMethods.filter(x => x !== m) : [...f.paymentMethods, m] }));

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

  const handleAddCashCollector = async () => {
    const id = cashCollectorInput.trim();
    if (!id) return;
    if (form.cashCollectors.find(c => c.memberId === id)) { setCashCollectorError('すでに追加されています'); return; }
    setCashCollectorLoading(true); setCashCollectorError('');
    const user = await getUser(id);
    setCashCollectorLoading(false);
    if (!user) { setCashCollectorError('会員番号が見つかりません'); return; }
    setForm(f => ({ ...f, cashCollectors: [...f.cashCollectors, { memberId: id, name: user.name as string, genre: user.genre as string | undefined, generation: user.generation as number | undefined }] }));
    setCashCollectorInput('');
  };

  const handleCreate = async () => {
    if (!form.title || !form.amount || !form.dueDate) { alert('タイトル・金額・期限は必須です'); return; }
    if (form.paymentMethods.length === 0) { alert('支払い方法を1つ以上選択してください'); return; }
    if (form.targetType === 'number' && !form.targetNumberId) { alert('ナンバー名簿を選択してください'); return; }
    if (form.targetType === 'individual' && targetMembers.length === 0) { alert('対象者を1人以上追加してください'); return; }

    setCreating(true);
    try {
      let payments: { memberId: string; name: string }[] = [];
      let resolvedMemberIds: string[] = [];

      if (form.targetType === 'genre_generation') {
        const targets = allUsers.filter(u => {
          const genreOk = !form.targetGenres.length || form.targetGenres.includes(u.genre as string);
          const genOk = !form.targetGenerations.length || form.targetGenerations.includes(u.generation as number);
          return genreOk && genOk;
        });
        payments = targets.map(u => ({ memberId: u.memberId as string, name: u.name as string }));
        resolvedMemberIds = targets.map(u => u.memberId as string);
      } else if (form.targetType === 'number') {
        const roster = numberRosters.find(r => r.id === form.targetNumberId);
        if (roster) {
          const members = await Promise.all(roster.memberIds.map(id => getUser(id)));
          payments = members.filter(Boolean).map(u => ({ memberId: u!.memberId as string, name: u!.name as string }));
          resolvedMemberIds = roster.memberIds;
        }
      } else {
        payments = targetMembers.map(m => ({ memberId: m.id, name: m.name }));
        resolvedMemberIds = targetMembers.map(m => m.id);
      }

      // additionalMemberIds を追加（重複除外）
      for (const extra of extraMembers) {
        if (!resolvedMemberIds.includes(extra.id)) {
          resolvedMemberIds = [...resolvedMemberIds, extra.id];
          payments = [...payments, { memberId: extra.id, name: extra.name }];
        }
      }
      // excludedMemberIds を除外
      const excludedSet = new Set(form.excludedMemberIds);
      resolvedMemberIds = resolvedMemberIds.filter(id => !excludedSet.has(id));
      payments = payments.filter(p => !excludedSet.has(p.memberId));

      await createSettlement(
        { title: form.title, amount: Number(form.amount), dueDate: form.dueDate, note: form.note, createdBy: memberId, createdByName: userName, targetType: form.targetType, targetGenres: form.targetGenres, targetGenerations: form.targetGenerations, targetNumberId: form.targetNumberId, targetMemberIds: form.targetMemberIds, additionalMemberIds: form.additionalMemberIds, excludedMemberIds: form.excludedMemberIds, resolvedMemberIds, paymentMethods: form.paymentMethods, bankInfo: form.bankInfo, paypayInfo: form.paypayInfo, cashCollectors: form.cashCollectors, requiresConfirmation: form.requiresConfirmation },
        payments,
      );

      setShowForm(false); setForm(EMPTY_FORM); setTargetMembers([]); setExtraMembers([]); setExcludedMembers([]); setCashCollectorInput('');
      load(memberId);
    } finally {
      setCreating(false);
    }
  };

  // ===== Edit settlement =====

  const openEditModal = (s: Settlement) => {
    setEditingSettlement(s);
    setEditForm({
      title: s.title, amount: String(s.amount), dueDate: s.dueDate, note: s.note ?? '',
      targetType: s.targetType, targetGenres: s.targetGenres ?? [], targetGenerations: s.targetGenerations ?? [],
      targetNumberId: s.targetNumberId ?? '', targetMemberIds: s.targetMemberIds ?? [],
      additionalMemberIds: s.additionalMemberIds ?? [], excludedMemberIds: s.excludedMemberIds ?? [],
      paymentMethods: s.paymentMethods ?? [], bankInfo: s.bankInfo ?? '', paypayInfo: s.paypayInfo ?? '',
      cashCollectors: s.cashCollectors ?? [], requiresConfirmation: s.requiresConfirmation ?? false,
    });
    setEditNewMembers([]);
    setEditRemovedMemberIds([]);
    setEditCashCollectorInput(''); setEditCashCollectorError('');
  };

  const handleAddEditCashCollector = async () => {
    const id = editCashCollectorInput.trim();
    if (!id) return;
    if (editForm.cashCollectors.find(c => c.memberId === id)) { setEditCashCollectorError('すでに追加されています'); return; }
    setEditCashCollectorLoading(true); setEditCashCollectorError('');
    const user = await getUser(id);
    setEditCashCollectorLoading(false);
    if (!user) { setEditCashCollectorError('会員番号が見つかりません'); return; }
    setEditForm(f => ({ ...f, cashCollectors: [...f.cashCollectors, { memberId: id, name: user.name as string, genre: user.genre as string | undefined, generation: user.generation as number | undefined }] }));
    setEditCashCollectorInput('');
  };

  const handleSaveEdit = async () => {
    if (!editingSettlement) return;
    if (!editForm.title || !editForm.amount || !editForm.dueDate) { alert('タイトル・金額・期限は必須です'); return; }
    setSaving(true);
    try {
      const existingIds = editingSettlement.resolvedMemberIds ?? [];
      const newResolvedIds = editNewMembers.map(m => m.id).filter(id => !existingIds.includes(id));
      const finalResolvedIds = existingIds
        .filter(id => !editRemovedMemberIds.includes(id))
        .concat(newResolvedIds);
      await updateSettlement(editingSettlement.id, {
        title: editForm.title, amount: Number(editForm.amount), dueDate: editForm.dueDate, note: editForm.note,
        paymentMethods: editForm.paymentMethods, bankInfo: editForm.bankInfo, paypayInfo: editForm.paypayInfo,
        cashCollectors: editForm.cashCollectors, requiresConfirmation: editForm.requiresConfirmation,
        resolvedMemberIds: finalResolvedIds,
      });
      await Promise.all(
        editNewMembers
          .filter(m => newResolvedIds.includes(m.id))
          .map(m => addPaymentRecord(editingSettlement.id, m.id, m.name))
      );
      setAllSettlements(prev => prev.map(s =>
        s.id === editingSettlement.id
          ? {
              ...s,
              title: editForm.title, amount: Number(editForm.amount), dueDate: editForm.dueDate, note: editForm.note,
              paymentMethods: editForm.paymentMethods, bankInfo: editForm.bankInfo, paypayInfo: editForm.paypayInfo,
              cashCollectors: editForm.cashCollectors, requiresConfirmation: editForm.requiresConfirmation,
              resolvedMemberIds: finalResolvedIds,
            }
          : s
      ));
      setPaymentsCache(prev => {
        if (!prev[editingSettlement.id]) return prev;
        const newPayments = editNewMembers
          .filter(m => newResolvedIds.includes(m.id))
          .map(m => ({ memberId: m.id, name: m.name, status: 'unpaid' as const, confirmedAt: null }));
        const retained = prev[editingSettlement.id].filter(p => !editRemovedMemberIds.includes(p.memberId));
        return { ...prev, [editingSettlement.id]: [...retained, ...newPayments] };
      });
      setEditingSettlement(null);
    } catch {
      alert('保存に失敗しました。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const toggleEditPaymentMethod = (m: PaymentMethod) =>
    setEditForm(f => ({ ...f, paymentMethods: f.paymentMethods.includes(m) ? f.paymentMethods.filter(x => x !== m) : [...f.paymentMethods, m] }));

  // ===== Report payment modal =====

  const openReportModal = (s: Settlement) => {
    setReportingSettlement(s);
    setSelectedMethod(s.paymentMethods?.length === 1 ? s.paymentMethods[0] : null);
    setSelectedCollector(null);
  };

  const handleSubmitReport = async () => {
    if (!reportingSettlement || !selectedMethod) return;
    if (selectedMethod === 'cash' && (reportingSettlement.cashCollectors?.length ?? 0) > 0 && !selectedCollector) {
      alert('現金を渡す相手を選択してください'); return;
    }
    setSubmittingReport(true);
    const requiresConfirmation = reportingSettlement.requiresConfirmation ?? false;
    await reportPayment(reportingSettlement.id, memberId, selectedMethod, requiresConfirmation, selectedCollector?.memberId, selectedCollector?.name);
    const newStatus: PaymentStatus = requiresConfirmation ? 'reported' : 'confirmed';
    setMyRecords(prev => ({
      ...prev,
      [reportingSettlement.id]: {
        memberId, name: userName, status: newStatus,
        reportedMethod: selectedMethod,
        cashCollectorId: selectedCollector?.memberId,
        cashCollectorName: selectedCollector?.name,
        reportedAt: new Date(),
        confirmedAt: newStatus === 'confirmed' ? new Date() : null,
      },
    }));
    setSubmittingReport(false);
    setReportingSettlement(null);
  };

  // ===== Creator payment confirm/reset =====

  const loadPayments = async (settlementId: string) => {
    if (paymentsCache[settlementId]) return;
    const payments = await getSettlementPayments(settlementId);
    setPaymentsCache(prev => ({ ...prev, [settlementId]: payments }));
  };

  const handleToggleExpand = async (settlementId: string) => {
    if (expandedId === settlementId) { setExpandedId(null); return; }
    setExpandedId(settlementId);
    await loadPayments(settlementId);
  };

  // Creator cycles: unpaid → confirmed, reported → confirmed, confirmed → unpaid
  const handleCreatorToggle = async (settlementId: string, payment: PaymentRecord) => {
    const key = `${settlementId}_${payment.memberId}`;
    setTogglingKey(key);
    const newStatus: PaymentStatus = payment.status === 'confirmed' ? 'unpaid' : 'confirmed';
    await updatePaymentStatus(settlementId, payment.memberId, newStatus);
    setPaymentsCache(prev => ({
      ...prev,
      [settlementId]: prev[settlementId].map(p =>
        p.memberId === payment.memberId ? { ...p, status: newStatus, confirmedAt: newStatus === 'confirmed' ? new Date() : null } : p
      ),
    }));
    setTogglingKey(null);
  };

  const handleDeleteSettlement = async (s: Settlement) => {
    if (!confirm(`「${s.title}」を削除しますか？`)) return;
    try {
      await deleteSettlement(s.id);
      setAllSettlements(prev => prev.filter(x => x.id !== s.id));
    } catch (e: any) {
      console.error('[handleDeleteSettlement]', e);
      alert(`削除に失敗しました: ${e?.message || e}`);
    }
  };

  // ===== CSV download =====

  const downloadBankCSV = (s: Settlement) => {
    const payments = paymentsCache[s.id] ?? [];
    const bankPayments = payments.filter(p => p.reportedMethod === 'bank');
    if (bankPayments.length === 0) { alert('振込報告がまだありません'); return; }
    const rows = [
      ['会員番号', '氏名', '金額', '報告日時', 'ステータス'],
      ...bankPayments.map(p => [
        p.memberId, p.name, s.amount,
        p.reportedAt ? new Date(p.reportedAt.toDate?.() ?? p.reportedAt).toLocaleString('ja-JP') : '',
        p.status === 'confirmed' ? '確認済み' : '要確認',
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${s.title}_振込記録.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Compute primary target set for smart dropdown filtering
  const primaryTargetIds: Set<string> | null = (() => {
    if (form.targetType === 'number' && form.targetNumberId) {
      const roster = numberRosters.find(r => r.id === form.targetNumberId);
      if (roster) return new Set(roster.memberIds);
    }
    if (form.targetType === 'genre_generation') {
      return new Set(
        allUsers
          .filter(u => {
            const genreOk = !form.targetGenres.length || form.targetGenres.includes(u.genre as string);
            const genOk = !form.targetGenerations.length || form.targetGenerations.includes(u.generation as number);
            return genreOk && genOk;
          })
          .map(u => u.memberId)
      );
    }
    return null;
  })();
  const usersForAdditional = primaryTargetIds ? allUsers.filter(u => !primaryTargetIds.has(u.memberId)) : allUsers;
  const usersForExcluded = primaryTargetIds ? allUsers.filter(u => primaryTargetIds.has(u.memberId)) : allUsers;

  // ===== Creator status chip helper =====
  const creatorStatusChip = (payment: PaymentRecord, settlementId: string) => {
    const key = `${settlementId}_${payment.memberId}`;
    const toggling = togglingKey === key;
    if (payment.status === 'confirmed') {
      return (
        <button onClick={() => handleCreatorToggle(settlementId, payment)} disabled={toggling}
          className="text-xs px-3 py-1 rounded-full border transition-colors disabled:opacity-50 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20">
          {toggling ? '...' : '確認済み'}
        </button>
      );
    }
    if (payment.status === 'reported') {
      return (
        <button onClick={() => handleCreatorToggle(settlementId, payment)} disabled={toggling}
          className="text-xs px-3 py-1 rounded-full border transition-colors disabled:opacity-50 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30">
          {toggling ? '...' : '要確認 →'}
        </button>
      );
    }
    return (
      <button onClick={() => handleCreatorToggle(settlementId, payment)} disabled={toggling}
        className="text-xs px-3 py-1 rounded-full border transition-colors disabled:opacity-50 bg-white/[0.04] text-white/30 border-white/[0.08] hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30">
        {toggling ? '...' : '未払い'}
      </button>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">精算</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="text-xs px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors">
          + 請求を作成
        </button>
      </div>

      {/* ===== 作成フォーム ===== */}
      {showForm && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">請求を作成</p>
            <button type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setTargetMembers([]); setExtraMembers([]); setExcludedMembers([]); setCashCollectorInput(''); }}
              aria-label="閉じる"
              className="text-white/30 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08] transition-colors text-lg">
              ×
            </button>
          </div>

          <input type="text" placeholder="タイトル（例：新歓打ち上げ代）" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/30 block mb-1">金額（円）</label>
              <input type="number" placeholder="例：3000" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-white/30 block mb-1">期限</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
          </div>

          <textarea placeholder="メモ（任意）" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none" rows={2} />

          {/* 確認フロー設定 */}
          <div className="space-y-2">
            <label className="text-[11px] text-white/30 block">確認フロー</label>
            <div className="flex gap-2">
              <button onClick={() => setForm(f => ({ ...f, requiresConfirmation: true }))}
                className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${form.requiresConfirmation ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:text-white/60'}`}>
                確認あり
                <span className="block text-[10px] opacity-60 mt-0.5">作成者が入金確認する</span>
              </button>
              <button onClick={() => setForm(f => ({ ...f, requiresConfirmation: false }))}
                className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${!form.requiresConfirmation ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:text-white/60'}`}>
                確認なし
                <span className="block text-[10px] opacity-60 mt-0.5">報告した時点で完了</span>
              </button>
            </div>
            {form.requiresConfirmation && (
              <p className="text-[11px] text-orange-400/70">大きな金額や振込確認が必要な場合に推奨</p>
            )}
          </div>

          {/* 支払い方法 */}
          <div className="space-y-3">
            <label className="text-[11px] text-white/30 block">支払い方法（複数選択可）</label>
            <div className="flex gap-2 flex-wrap">
              {(['bank', 'paypay', 'cash'] as PaymentMethod[]).map(m => (
                <button key={m} onClick={() => togglePaymentMethod(m)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${form.paymentMethods.includes(m) ? `${METHOD_COLORS[m]} border` : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:text-white/60'}`}>
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>

            {form.paymentMethods.includes('bank') && (
              <div>
                <label className="text-[11px] text-white/30 block mb-1">口座情報</label>
                <textarea placeholder={'例：\n三菱UFJ銀行 渋谷支店\n普通 1234567\nボイルドサークル代表 山田太郎'}
                  value={form.bankInfo} onChange={e => setForm({ ...form, bankInfo: e.target.value })}
                  className="w-full bg-white/[0.06] border border-blue-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none font-mono" rows={3} />
              </div>
            )}

            {form.paymentMethods.includes('paypay') && (
              <div>
                <label className="text-[11px] text-white/30 block mb-1">PayPay 電話番号 / ID</label>
                <input type="text" placeholder="例：090-1234-5678" value={form.paypayInfo}
                  onChange={e => setForm({ ...form, paypayInfo: e.target.value })}
                  className="w-full bg-white/[0.06] border border-red-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none" />
              </div>
            )}

            {form.paymentMethods.includes('cash') && (
              <div className="space-y-2">
                <label className="text-[11px] text-white/30 block">現金を受け取る人</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="会員番号（例：16199）" value={cashCollectorInput}
                    onChange={e => { setCashCollectorInput(e.target.value); setCashCollectorError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleAddCashCollector()}
                    className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none" />
                  <button onClick={handleAddCashCollector} disabled={cashCollectorLoading || !cashCollectorInput.trim()}
                    className="text-xs px-3 py-1.5 bg-white/[0.06] text-white/60 rounded-lg hover:bg-white/[0.1] disabled:opacity-40">
                    {cashCollectorLoading ? '...' : '追加'}
                  </button>
                </div>
                {cashCollectorError && <p className="text-xs text-red-400">{cashCollectorError}</p>}
                {form.cashCollectors.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {form.cashCollectors.map(c => (
                      <span key={c.memberId} className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        {c.name}{c.genre ? ` (${c.genre}${c.generation ? ` ${c.generation}代` : ''})` : ''}
                        <button onClick={() => setForm(f => ({ ...f, cashCollectors: f.cashCollectors.filter(x => x.memberId !== c.memberId) }))}
                          className="text-emerald-400/50 hover:text-red-400 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/20">追加なし = 誰でも受け取り可</p>
                )}
              </div>
            )}
          </div>

          {/* 対象者 */}
          <div className="space-y-3">
            <label className="text-[11px] text-white/30 block">対象者の指定方法</label>
            <div className="space-y-1.5">
              {[{ value: 'genre_generation', label: 'ジャンル・代で絞り込む' }, { value: 'number', label: 'ナンバー名簿から選ぶ' }, { value: 'individual', label: '会員番号で個別指定' }].map(opt => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" name="payTargetType" value={opt.value} checked={form.targetType === opt.value}
                    onChange={() => setForm({ ...form, targetType: opt.value as TargetType })} className="accent-blue-500" />
                  <span className="text-sm text-white/60">{opt.label}</span>
                </label>
              ))}
            </div>

            {form.targetType === 'genre_generation' && (
              <div className="pl-5 space-y-3">
                <div>
                  <label className="text-[11px] text-white/30 block mb-2">対象ジャンル（空=全員）</label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map(g => (
                      <button key={g} onClick={() => toggleGenre(g)}
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${form.targetGenres.includes(g) ? 'bg-blue-500 text-white' : 'bg-white/[0.06] text-white/50 hover:text-white/80'}`}>{g}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-white/30 block mb-2">対象代（空=全員）</label>
                  <div className="flex flex-wrap gap-2">
                    {GENERATIONS.map(gen => (
                      <button key={gen} onClick={() => toggleGeneration(gen)}
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${form.targetGenerations.includes(gen) ? 'bg-purple-500 text-white' : 'bg-white/[0.06] text-white/50 hover:text-white/80'}`}>{gen}代</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {form.targetType === 'number' && (
              <div className="pl-5">
                {numberRosters.length === 0 ? <p className="text-xs text-white/30">名簿がまだありません</p> : (
                  <select value={form.targetNumberId} onChange={e => setForm({ ...form, targetNumberId: e.target.value })}
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
            <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
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
            <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
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

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setTargetMembers([]); setExtraMembers([]); setExcludedMembers([]); setCashCollectorInput(''); }}
              className="text-xs px-3 py-1.5 text-white/40 hover:text-white/60">キャンセル</button>
            <button onClick={handleCreate} disabled={creating}
              className="text-xs px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg">
              {creating ? '作成中...' : '作成'}
            </button>
          </div>
        </div>
      )}

      {/* ===== メインタブ ===== */}
      <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
        {[
          { key: 'incoming', label: `自分への請求${incomingSettlements.length > 0 ? ` (${incomingSettlements.length})` : ''}` },
          { key: 'created', label: `作成した請求${createdSettlements.length > 0 ? ` (${createdSettlements.length})` : ''}` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${tab === t.key ? 'bg-white/[0.08] text-white font-medium' : 'text-white/40 hover:text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== 自分への請求 ===== */}
      {tab === 'incoming' && (
        <div className="space-y-3">
          {/* サブタブ (3つ) */}
          <div className="flex gap-1">
            <button onClick={() => setIncomingSubTab('unpaid')}
              className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${incomingSubTab === 'unpaid' ? 'bg-red-500/20 text-red-400 border-red-500/30 font-medium' : 'text-white/30 border-white/[0.06] hover:text-white/50'}`}>
              未払い{unpaidSettlements.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500/30 rounded-full text-[10px]">{unpaidSettlements.length}</span>}
            </button>
            <button onClick={() => setIncomingSubTab('reported')}
              className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${incomingSubTab === 'reported' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-medium' : 'text-white/30 border-white/[0.06] hover:text-white/50'}`}>
              確認待ち{reportedSettlements.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-yellow-500/30 rounded-full text-[10px]">{reportedSettlements.length}</span>}
            </button>
            <button onClick={() => setIncomingSubTab('done')}
              className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${incomingSubTab === 'done' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-medium' : 'text-white/30 border-white/[0.06] hover:text-white/50'}`}>
              完了{doneSettlements.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-emerald-500/30 rounded-full text-[10px]">{doneSettlements.length}</span>}
            </button>
          </div>

          {/* 未払い */}
          {incomingSubTab === 'unpaid' && (
            <div className="space-y-2">
              {unpaidSettlements.length === 0 ? (
                <div className="text-center py-12"><p className="text-white/30 text-sm">未払いの請求はありません</p></div>
              ) : unpaidSettlements.map(s => {
                const isOverdue = new Date(s.dueDate) < new Date();
                return (
                  <div key={s.id} className={`border rounded-xl p-4 ${isOverdue ? 'bg-red-500/[0.06] border-red-500/20' : 'bg-white/[0.04] border-white/[0.06]'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-medium text-white">{s.title}</h3>
                          {!(s.requiresConfirmation ?? false) && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400/70 rounded border border-emerald-500/20">確認なし</span>
                          )}
                          {(s.requiresConfirmation ?? false) && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-400/70 rounded border border-orange-500/20">要確認</span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 ${isOverdue ? 'text-red-400' : 'text-white/40'}`}>
                          {s.createdByName} より・期限 {s.dueDate}{isOverdue ? '（期限超過）' : ''}
                        </p>
                        {s.note && <p className="text-xs text-white/30 mt-1">{s.note}</p>}
                        {s.paymentMethods?.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {s.paymentMethods.map(m => <span key={m} className={`text-[10px] px-2 py-0.5 rounded-full border ${METHOD_COLORS[m]}`}>{METHOD_LABELS[m]}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-base font-bold text-white">¥{s.amount.toLocaleString()}</span>
                        <button onClick={() => openReportModal(s)}
                          className="text-xs px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                          支払い報告
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 確認待ち */}
          {incomingSubTab === 'reported' && (
            <div className="space-y-2">
              {reportedSettlements.length === 0 ? (
                <div className="text-center py-12"><p className="text-white/30 text-sm">確認待ちの請求はありません</p></div>
              ) : reportedSettlements.map(s => {
                const rec = myRecords[s.id];
                return (
                  <div key={s.id} className="bg-yellow-500/[0.04] border border-yellow-500/20 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-white">{s.title}</h3>
                        <p className="text-xs text-white/40 mt-1">{s.createdByName} より・期限 {s.dueDate}</p>
                        {rec?.reportedMethod && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${METHOD_COLORS[rec.reportedMethod]}`}>
                              {METHOD_LABELS[rec.reportedMethod]}で報告済み
                            </span>
                            {rec.reportedMethod === 'cash' && rec.cashCollectorName && (
                              <span className="text-xs text-white/30">{rec.cashCollectorName} 宛</span>
                            )}
                          </div>
                        )}
                        <p className="text-[11px] text-yellow-400/60 mt-2">作成者の確認を待っています</p>
                      </div>
                      <span className="text-base font-bold text-yellow-400">¥{s.amount.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 完了 */}
          {incomingSubTab === 'done' && (
            <div className="space-y-2">
              {doneSettlements.length === 0 ? (
                <div className="text-center py-12"><p className="text-white/30 text-sm">完了した請求はありません</p></div>
              ) : doneSettlements.map(s => {
                const rec = myRecords[s.id];
                return (
                  <div key={s.id} className="bg-emerald-500/[0.04] border border-emerald-500/20 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-white">{s.title}</h3>
                        <p className="text-xs text-white/40 mt-1">{s.createdByName} より</p>
                        {rec?.reportedMethod && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${METHOD_COLORS[rec.reportedMethod]}`}>
                              {METHOD_LABELS[rec.reportedMethod]}
                            </span>
                            {rec.reportedMethod === 'cash' && rec.cashCollectorName && (
                              <span className="text-xs text-white/30">{rec.cashCollectorName} 宛</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-base font-bold text-emerald-400">¥{s.amount.toLocaleString()}</span>
                        <span className="text-[11px] text-emerald-400/60">完了</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== 作成した請求 ===== */}
      {tab === 'created' && (
        <div className="space-y-2">
          {createdSettlements.length === 0 ? (
            <div className="text-center py-16"><p className="text-white/30 text-sm">作成した請求はありません</p></div>
          ) : createdSettlements.map(s => {
            const payments = paymentsCache[s.id] ?? [];
            const isExpanded = expandedId === s.id;
            const confirmedCount = payments.filter(p => p.status === 'confirmed').length;
            const reportedCount = payments.filter(p => p.status === 'reported').length;

            return (
              <div key={s.id} className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
                <button className="w-full p-4 text-left hover:bg-white/[0.02] transition-colors" onClick={() => handleToggleExpand(s.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-white">{s.title}</h3>
                        {(s.requiresConfirmation ?? false) ? (
                          <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-400/70 rounded border border-orange-500/20">要確認</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400/70 rounded border border-emerald-500/20">確認なし</span>
                        )}
                        {reportedCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">{reportedCount}件 要確認</span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 mt-1">期限 {s.dueDate}・{s.resolvedMemberIds?.length ?? 0}人対象</p>
                      {s.note && <p className="text-xs text-white/30 mt-1">{s.note}</p>}
                      {isExpanded && payments.length > 0 && (
                        <p className="text-xs text-emerald-400/70 mt-1">{confirmedCount}/{payments.length} 人確認済み</p>
                      )}
                      {s.paymentMethods?.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {s.paymentMethods.map(m => <span key={m} className={`text-[10px] px-2 py-0.5 rounded-full border ${METHOD_COLORS[m]}`}>{METHOD_LABELS[m]}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-base font-bold text-white">¥{s.amount.toLocaleString()}</span>
                      <span className="text-[11px] text-white/30">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </button>
                <div className="flex items-center justify-between px-4 pb-3 gap-2">
                  <button onClick={() => openEditModal(s)} className="text-xs text-white/30 hover:text-blue-400 transition-colors">編集</button>
                  <button onClick={() => handleDeleteSettlement(s)} className="text-xs text-white/20 hover:text-red-400 transition-colors">削除</button>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/[0.06]">
                    {s.paymentMethods?.includes('bank') && (
                      <div className="px-4 py-2 flex justify-end border-b border-white/[0.04]">
                        <button onClick={() => downloadBankCSV(s)}
                          className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors">
                          振込記録 CSV
                        </button>
                      </div>
                    )}

                    {payments.length === 0 ? (
                      <p className="text-xs text-white/30 px-4 py-3">対象者がいません</p>
                    ) : (
                      <div className="divide-y divide-white/[0.04]">
                        {payments.sort((a, b) => a.name.localeCompare(b.name, 'ja')).map(p => (
                          <div key={p.memberId} className="flex items-center justify-between px-4 py-2.5">
                            <div>
                              <span className="text-sm text-white/70">{p.name}</span>
                              {p.reportedMethod && (
                                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full border ${METHOD_COLORS[p.reportedMethod]}`}>
                                  {METHOD_LABELS[p.reportedMethod]}{p.reportedMethod === 'cash' && p.cashCollectorName ? ` → ${p.cashCollectorName}` : ''}
                                </span>
                              )}
                            </div>
                            {creatorStatusChip(p, s.id)}
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== 編集モーダル ===== */}
      {editingSettlement && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingSettlement(null)} />
          <div className="relative w-full max-w-md bg-[#1a1f2e] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-white">請求を編集</h2>

            <input type="text" placeholder="タイトル" value={editForm.title}
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-white/30 block mb-1">金額（円）</label>
                <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-white/30 block mb-1">期限</label>
                <input type="date" value={editForm.dueDate} onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
            </div>

            <textarea placeholder="メモ（任意）" value={editForm.note} onChange={e => setEditForm({ ...editForm, note: e.target.value })}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none" rows={2} />

            {/* 確認フロー */}
            <div className="space-y-2">
              <label className="text-[11px] text-white/30 block">確認フロー</label>
              <div className="flex gap-2">
                <button onClick={() => setEditForm(f => ({ ...f, requiresConfirmation: true }))}
                  className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${editForm.requiresConfirmation ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:text-white/60'}`}>
                  確認あり
                </button>
                <button onClick={() => setEditForm(f => ({ ...f, requiresConfirmation: false }))}
                  className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${!editForm.requiresConfirmation ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:text-white/60'}`}>
                  確認なし
                </button>
              </div>
            </div>

            {/* 支払い方法 */}
            <div className="space-y-3">
              <label className="text-[11px] text-white/30 block">支払い方法</label>
              <div className="flex gap-2 flex-wrap">
                {(['bank', 'paypay', 'cash'] as PaymentMethod[]).map(m => (
                  <button key={m} onClick={() => toggleEditPaymentMethod(m)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${editForm.paymentMethods.includes(m) ? `${METHOD_COLORS[m]} border` : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:text-white/60'}`}>
                    {METHOD_LABELS[m]}
                  </button>
                ))}
              </div>

              {editForm.paymentMethods.includes('bank') && (
                <div>
                  <label className="text-[11px] text-white/30 block mb-1">口座情報</label>
                  <textarea value={editForm.bankInfo} onChange={e => setEditForm({ ...editForm, bankInfo: e.target.value })}
                    className="w-full bg-white/[0.06] border border-blue-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none font-mono" rows={3} />
                </div>
              )}

              {editForm.paymentMethods.includes('paypay') && (
                <div>
                  <label className="text-[11px] text-white/30 block mb-1">PayPay 電話番号 / ID</label>
                  <input type="text" value={editForm.paypayInfo} onChange={e => setEditForm({ ...editForm, paypayInfo: e.target.value })}
                    className="w-full bg-white/[0.06] border border-red-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                </div>
              )}

              {editForm.paymentMethods.includes('cash') && (
                <div className="space-y-2">
                  <label className="text-[11px] text-white/30 block">現金を受け取る人</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="会員番号（例：16199）" value={editCashCollectorInput}
                      onChange={e => { setEditCashCollectorInput(e.target.value); setEditCashCollectorError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleAddEditCashCollector()}
                      className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none" />
                    <button onClick={handleAddEditCashCollector} disabled={editCashCollectorLoading || !editCashCollectorInput.trim()}
                      className="text-xs px-3 py-1.5 bg-white/[0.06] text-white/60 rounded-lg hover:bg-white/[0.1] disabled:opacity-40">
                      {editCashCollectorLoading ? '...' : '追加'}
                    </button>
                  </div>
                  {editCashCollectorError && <p className="text-xs text-red-400">{editCashCollectorError}</p>}
                  {editForm.cashCollectors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {editForm.cashCollectors.map(c => (
                        <span key={c.memberId} className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          {c.name}
                          <button onClick={() => setEditForm(f => ({ ...f, cashCollectors: f.cashCollectors.filter(x => x.memberId !== c.memberId) }))}
                            className="text-emerald-400/50 hover:text-red-400 ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 対象者を外す */}
            {(editingSettlement?.resolvedMemberIds?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <label className="text-[11px] text-white/30 block">対象者を外す</label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {(editingSettlement?.resolvedMemberIds ?? []).map(id => {
                    const u = allUsers.find(u => u.memberId === id);
                    const name = u?.name ?? id;
                    const removed = editRemovedMemberIds.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => setEditRemovedMemberIds(prev =>
                          removed ? prev.filter(x => x !== id) : [...prev, id]
                        )}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${removed ? 'bg-red-500/20 text-red-400 border-red-500/30 line-through opacity-60' : 'bg-white/[0.06] text-white/60 border-white/[0.08] hover:border-red-500/30 hover:text-red-400'}`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
                {editRemovedMemberIds.length > 0 && (
                  <p className="text-[11px] text-red-400/70">{editRemovedMemberIds.length}人を対象から外します</p>
                )}
              </div>
            )}

            {/* 対象者追加 */}
            <div className="space-y-2">
              <label className="text-[11px] text-white/30 block">対象者を追加</label>
              <MemberSelectDropdown
                allUsers={allUsers.filter(u =>
                  !(editingSettlement?.resolvedMemberIds ?? []).includes(u.memberId as string) ||
                  editRemovedMemberIds.includes(u.memberId as string)
                )}
                selected={editNewMembers}
                onAdd={m => setEditNewMembers(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m])}
                onRemove={id => setEditNewMembers(prev => prev.filter(m => m.id !== id))}
                chipColor="green"
                placeholder="メンバーを検索して追加..."
              />
              {editNewMembers.length > 0 && (
                <p className="text-[11px] text-blue-400/70">{editNewMembers.length}人を新たに追加します</p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditingSettlement(null)}
                className="flex-1 py-2.5 text-sm text-white/40 hover:text-white/60 bg-white/[0.04] rounded-xl transition-colors">
                キャンセル
              </button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-xl transition-colors">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 支払い報告モーダル ===== */}
      {reportingSettlement && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReportingSettlement(null)} />
          <div className="relative w-full max-w-md bg-[#1a1f2e] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="bg-white/[0.04] rounded-xl p-3 text-center">
              <p className="text-sm text-white/60 mb-1">{reportingSettlement.title}</p>
              <p className="text-2xl font-bold text-white">¥{reportingSettlement.amount.toLocaleString()}</p>
              <p className="text-xs text-white/30 mt-1">期限 {reportingSettlement.dueDate}</p>
              {!(reportingSettlement.requiresConfirmation ?? false) && (
                <p className="text-[11px] text-emerald-400/70 mt-1">報告した時点で完了になります</p>
              )}
              {(reportingSettlement.requiresConfirmation ?? false) && (
                <p className="text-[11px] text-orange-400/70 mt-1">作成者の確認後に完了になります</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-white/40">支払い方法を選択</p>
              <div className="grid grid-cols-3 gap-2">
                {(reportingSettlement.paymentMethods ?? []).map(m => (
                  <button key={m} onClick={() => { setSelectedMethod(m); setSelectedCollector(null); }}
                    className={`py-2.5 rounded-xl border text-xs font-medium transition-colors ${selectedMethod === m ? `${METHOD_COLORS[m]} border` : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:text-white/60'}`}>
                    {METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {selectedMethod === 'bank' && reportingSettlement.bankInfo && (
              <div>
                <p className="text-[11px] text-white/30 mb-1">口座情報</p>
                <div className="bg-white/[0.04] rounded-lg p-3 font-mono text-xs text-white/70 whitespace-pre-wrap select-all border border-blue-500/20">
                  {reportingSettlement.bankInfo}
                </div>
                <p className="text-[10px] text-white/20 mt-1">振り込み後、下のボタンを押してください</p>
              </div>
            )}

            {selectedMethod === 'paypay' && reportingSettlement.paypayInfo && (
              <div>
                <p className="text-[11px] text-white/30 mb-1">PayPay 送金先</p>
                <div className="bg-white/[0.04] rounded-lg p-3 text-sm text-white/80 select-all border border-red-500/20 font-mono">
                  {reportingSettlement.paypayInfo}
                </div>
                <p className="text-[10px] text-white/20 mt-1">送金後、下のボタンを押してください</p>
              </div>
            )}

            {selectedMethod === 'cash' && (
              <div className="space-y-2">
                <p className="text-[11px] text-white/30">現金を渡す相手を選択</p>
                {(reportingSettlement.cashCollectors?.length ?? 0) === 0 ? (
                  <p className="text-xs text-white/40">担当者が設定されていません。直接渡してください。</p>
                ) : (
                  <div className="space-y-1.5">
                    {reportingSettlement.cashCollectors.map(c => (
                      <button key={c.memberId} onClick={() => setSelectedCollector(c)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${selectedCollector?.memberId === c.memberId ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-white/[0.04] text-white/60 border-white/[0.06] hover:bg-white/[0.06]'}`}>
                        <span className="font-medium">{c.name}</span>
                        {(c.genre || c.generation) && <span className="ml-2 text-xs opacity-60">{c.genre}{c.generation ? ` ${c.generation}代` : ''}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setReportingSettlement(null)}
                className="flex-1 py-2.5 text-sm text-white/40 hover:text-white/60 bg-white/[0.04] rounded-xl transition-colors">
                キャンセル
              </button>
              <button onClick={handleSubmitReport}
                disabled={!selectedMethod || (selectedMethod === 'cash' && (reportingSettlement.cashCollectors?.length ?? 0) > 0 && !selectedCollector) || submittingReport}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded-xl transition-colors">
                {submittingReport ? '送信中...' : '報告する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
