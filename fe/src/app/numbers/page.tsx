'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getNumberRosters,
  createNumberRoster,
  updateNumberRoster,
  deleteNumberRoster,
  getUser,
} from '@/lib/api';
import type { NumberRoster } from '@/lib/api';

export default function NumbersPage() {
  const [rosters, setRosters] = useState<NumberRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');

  // 新規作成
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // 展開・メンバー操作
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [memberInput, setMemberInput] = useState('');
  const [memberInputError, setMemberInputError] = useState('');
  const [memberInputLoading, setMemberInputLoading] = useState(false);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  // CSVインポート
  const [csvMode, setCsvMode] = useState<string | null>(null); // roster.id or null
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<{ id: string; name: string; found: boolean }[]>([]);
  const [csvParsing, setCsvParsing] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole') || 'member');
    load();
  }, []);

  const load = async () => {
    const data = await getNumberRosters();
    setRosters(data.sort((a, b) => a.name.localeCompare(b.name, 'ja')));
    setLoading(false);

    const allIds = Array.from(new Set(data.flatMap(r => r.memberIds)));
    const names: Record<string, string> = {};
    await Promise.all(allIds.map(async id => {
      const u = await getUser(id);
      if (u) names[id] = u.name as string;
    }));
    setMemberNames(names);
  };

  const handleCreate = async () => {
    if (!newName.trim()) { alert('名簿名は必須です'); return; }
    setCreating(true);
    await createNumberRoster({ name: newName.trim(), memberIds: [] });
    setNewName('');
    setShowCreateForm(false);
    setCreating(false);
    load();
  };

  const handleAddMember = async (rosterId: string, currentIds: string[]) => {
    const id = memberInput.trim();
    if (!id) return;
    if (currentIds.includes(id)) { setMemberInputError('すでに追加されています'); return; }
    setMemberInputLoading(true);
    setMemberInputError('');
    const user = await getUser(id);
    setMemberInputLoading(false);
    if (!user) { setMemberInputError('会員番号が見つかりません'); return; }
    const newIds = [...currentIds, id];
    await updateNumberRoster(rosterId, { memberIds: newIds });
    setMemberNames(prev => ({ ...prev, [id]: user.name as string }));
    setMemberInput('');
    setRosters(prev => prev.map(r => r.id === rosterId ? { ...r, memberIds: newIds } : r));
  };

  const handleRemoveMember = async (rosterId: string, currentIds: string[], removeId: string) => {
    const newIds = currentIds.filter(id => id !== removeId);
    await updateNumberRoster(rosterId, { memberIds: newIds });
    setRosters(prev => prev.map(r => r.id === rosterId ? { ...r, memberIds: newIds } : r));
  };

  const handleDelete = async (rosterId: string, rosterName: string) => {
    if (!confirm(`「${rosterName}」を削除しますか？`)) return;
    await deleteNumberRoster(rosterId);
    setRosters(prev => prev.filter(r => r.id !== rosterId));
  };

  // ===== CSV インポート =====
  // スプレッドシートからペーストされたテキストを解析して会員番号を抽出する
  const parseCsvText = async (text: string) => {
    if (!text.trim()) { setCsvPreview([]); return; }
    setCsvParsing(true);

    // タブ・カンマ・改行で分割してトークンを取得
    const tokens = text
      .split(/[\n\r]/)
      .flatMap(line => line.split(/[\t,\s]+/))
      .map(t => t.trim().replace(/^["']|["']$/g, '')) // クォート除去
      .filter(t => /^\d{4,6}$/.test(t)); // 4〜6桁の数字のみ（会員番号）

    const unique = Array.from(new Set(tokens));

    const results = await Promise.all(
      unique.map(async id => {
        const u = await getUser(id);
        return { id, name: u?.name as string ?? '', found: !!u };
      })
    );
    setCsvPreview(results);
    setCsvParsing(false);
  };

  const handleCsvImport = async (rosterId: string, currentIds: string[]) => {
    const toAdd = csvPreview.filter(p => p.found && !currentIds.includes(p.id));
    if (toAdd.length === 0) { alert('追加できる新しいメンバーがいません'); return; }
    setCsvImporting(true);
    const newIds = [...currentIds, ...toAdd.map(p => p.id)];
    await updateNumberRoster(rosterId, { memberIds: newIds });
    const newNames: Record<string, string> = {};
    toAdd.forEach(p => { newNames[p.id] = p.name; });
    setMemberNames(prev => ({ ...prev, ...newNames }));
    setRosters(prev => prev.map(r => r.id === rosterId ? { ...r, memberIds: newIds } : r));
    setCsvMode(null);
    setCsvText('');
    setCsvPreview([]);
    setCsvImporting(false);
  };

  const openCsvMode = (rosterId: string) => {
    setCsvMode(rosterId);
    setCsvText('');
    setCsvPreview([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="text-center py-16">
        <p className="text-white/30 text-sm">この画面はAdminのみ利用できます</p>
        <Link href="/practices" className="text-blue-400 text-xs mt-2 inline-block">← 練習一覧に戻る</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/practices" className="text-xs text-white/30 hover:text-white/60 transition-colors">← 練習一覧</Link>
          <h1 className="text-xl font-bold text-white mt-1">ナンバー名簿管理</h1>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="text-xs px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
        >
          + 名簿を作成
        </button>
      </div>

      {/* 新規作成フォーム */}
      {showCreateForm && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">新しい名簿</p>
          <input
            type="text"
            placeholder="名簿名（例：Hiphopナンバー）"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateForm(false)} className="text-xs px-3 py-1.5 text-white/40 hover:text-white/60">キャンセル</button>
            <button onClick={handleCreate} disabled={creating} className="text-xs px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg">
              {creating ? '作成中...' : '作成'}
            </button>
          </div>
        </div>
      )}

      {/* 名簿一覧 */}
      {rosters.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/30 text-sm">名簿がまだありません</p>
          <p className="text-white/20 text-xs mt-1">「+ 名簿を作成」から追加してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rosters.map(roster => {
            const isExpanded = expandedId === roster.id;
            const isCsvOpen = csvMode === roster.id;
            const foundCount = csvPreview.filter(p => p.found).length;
            const newCount = csvPreview.filter(p => p.found && !roster.memberIds.includes(p.id)).length;

            return (
              <div key={roster.id} className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <h3 className="text-sm font-medium text-white">{roster.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{roster.memberIds.length}人</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setExpandedId(isExpanded ? null : roster.id);
                        setMemberInput(''); setMemberInputError('');
                        if (isCsvOpen) { setCsvMode(null); setCsvText(''); setCsvPreview([]); }
                      }}
                      className="text-xs px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.08] text-white/50 rounded-lg transition-colors"
                    >
                      {isExpanded ? '閉じる' : 'メンバー管理'}
                    </button>
                    <button
                      onClick={() => handleDelete(roster.id, roster.name)}
                      className="text-xs text-white/20 hover:text-red-400 transition-colors px-1"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {/* メンバー管理（展開時） */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] px-4 py-3 space-y-3">

                    {/* 追加モード切替 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setCsvMode(null); setCsvText(''); setCsvPreview([]); }}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${!isCsvOpen ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/[0.04] text-white/40 border-white/[0.08]'}`}
                      >
                        1件ずつ追加
                      </button>
                      <button
                        onClick={() => openCsvMode(roster.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${isCsvOpen ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-white/[0.04] text-white/40 border-white/[0.08]'}`}
                      >
                        スプレッドシートから一括追加
                      </button>
                    </div>

                    {/* 1件ずつ追加 */}
                    {!isCsvOpen && (
                      <div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="会員番号を入力（例：16199）"
                            value={memberInput}
                            onChange={e => { setMemberInput(e.target.value); setMemberInputError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleAddMember(roster.id, roster.memberIds)}
                            className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none"
                          />
                          <button
                            onClick={() => handleAddMember(roster.id, roster.memberIds)}
                            disabled={memberInputLoading || !memberInput.trim()}
                            className="text-xs px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 disabled:opacity-40 transition-colors"
                          >
                            {memberInputLoading ? '...' : '追加'}
                          </button>
                        </div>
                        {memberInputError && <p className="text-xs text-red-400 mt-1">{memberInputError}</p>}
                      </div>
                    )}

                    {/* CSVインポート */}
                    {isCsvOpen && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] text-white/30 block mb-1.5">
                            スプレッドシートのデータをそのままペーストしてください
                          </label>
                          <textarea
                            placeholder={'例（コピー&ペーストでOK）:\n16101\t山田太郎\tHiphop\n16199\t鈴木花子\tBreak\n\n会員番号列だけでもOKです。'}
                            value={csvText}
                            onChange={e => {
                              setCsvText(e.target.value);
                              setCsvPreview([]);
                            }}
                            className="w-full bg-white/[0.06] border border-teal-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none font-mono"
                            rows={5}
                          />
                        </div>

                        <button
                          onClick={() => parseCsvText(csvText)}
                          disabled={csvParsing || !csvText.trim()}
                          className="text-xs px-4 py-1.5 bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 disabled:opacity-40 rounded-lg transition-colors"
                        >
                          {csvParsing ? '解析中...' : '解析する'}
                        </button>

                        {/* プレビュー */}
                        {csvPreview.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[11px] text-white/40">
                              {foundCount}件ヒット・新規追加 {newCount}件
                              {csvPreview.filter(p => !p.found).length > 0 && (
                                <span className="text-red-400/70 ml-2">{csvPreview.filter(p => !p.found).length}件 見つからず</span>
                              )}
                            </p>

                            <div className="bg-white/[0.03] rounded-lg divide-y divide-white/[0.04] max-h-48 overflow-y-auto">
                              {csvPreview.map(p => {
                                const isAlready = roster.memberIds.includes(p.id);
                                return (
                                  <div key={p.id} className="flex items-center justify-between px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-mono ${p.found ? 'text-white/70' : 'text-red-400/60'}`}>{p.id}</span>
                                      {p.found && <span className="text-xs text-white/50">{p.name}</span>}
                                      {!p.found && <span className="text-xs text-red-400/60">見つかりません</span>}
                                    </div>
                                    {p.found && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isAlready ? 'bg-white/[0.04] text-white/20 border-white/[0.06]' : 'bg-teal-500/20 text-teal-400 border-teal-500/30'}`}>
                                        {isAlready ? '既存' : '追加'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => { setCsvMode(null); setCsvText(''); setCsvPreview([]); }}
                                className="text-xs px-3 py-1.5 text-white/40 hover:text-white/60"
                              >
                                キャンセル
                              </button>
                              <button
                                onClick={() => handleCsvImport(roster.id, roster.memberIds)}
                                disabled={csvImporting || newCount === 0}
                                className="text-xs px-4 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white rounded-lg transition-colors"
                              >
                                {csvImporting ? '追加中...' : `${newCount}人を追加`}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* メンバーリスト */}
                    {roster.memberIds.length === 0 ? (
                      <p className="text-xs text-white/20 text-center py-2">まだメンバーがいません</p>
                    ) : (
                      <div className="space-y-1">
                        {roster.memberIds.map(id => (
                          <div key={id} className="flex items-center justify-between py-1">
                            <div>
                              <span className="text-sm text-white/70">{memberNames[id] || '...'}</span>
                              <span className="text-xs text-white/30 ml-2">{id}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveMember(roster.id, roster.memberIds, id)}
                              className="text-xs text-white/20 hover:text-red-400 transition-colors px-2 py-1"
                            >
                              削除
                            </button>
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
    </div>
  );
}
