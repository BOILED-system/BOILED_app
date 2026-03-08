'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api, PracticeCategory, PracticeSeries } from '@/lib/api/client';
import { DEFAULT_CIRCLE_ID } from '@/lib/constants';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function PracticeList() {
    const [categories, setCategories] = useState<PracticeCategory[]>([]);
    const [seriesList, setSeriesList] = useState<PracticeSeries[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Admin form state
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [showSeriesForm, setShowSeriesForm] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryParent, setNewCategoryParent] = useState('');
    const [newSeries, setNewSeries] = useState({
        name: '', categoryId: '', dayOfWeek: 6, startTime: '14:00', location: '', fee: 0,
    });

    const load = useCallback(async () => {
        try {
            const [cats, series] = await Promise.all([
                api.getPracticeCategories(DEFAULT_CIRCLE_ID),
                api.getPracticeSeries(DEFAULT_CIRCLE_ID),
            ]);
            setCategories(cats || []);
            setSeriesList(series || []);
        } catch {
            setCategories([]);
            setSeriesList([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Build category tree
    const rootCategories = categories.filter(c => !c.parentId);
    const getChildren = (parentId: string) => categories.filter(c => c.parentId === parentId);

    const filtered = selectedCategory === 'all'
        ? seriesList
        : seriesList.filter(s => {
            if (s.categoryId === selectedCategory) return true;
            // Also match children of selected category
            const children = getChildren(selectedCategory);
            return children.some(c => c.id === s.categoryId);
        });

    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || '';

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        await api.createPracticeCategory({
            circleId: DEFAULT_CIRCLE_ID,
            name: newCategoryName.trim(),
            parentId: newCategoryParent || undefined,
        });
        setNewCategoryName('');
        setNewCategoryParent('');
        setShowCategoryForm(false);
        load();
    };

    const handleCreateSeries = async () => {
        if (!newSeries.name.trim() || !newSeries.categoryId) return;
        await api.createPracticeSeries({
            circleId: DEFAULT_CIRCLE_ID,
            ...newSeries,
        });
        setNewSeries({ name: '', categoryId: '', dayOfWeek: 6, startTime: '14:00', location: '', fee: 0 });
        setShowSeriesForm(false);
        load();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex items-center justify-end gap-2">
                <button
                    onClick={() => setShowCategoryForm(!showCategoryForm)}
                    className="text-xs px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-white/60 rounded-lg transition-colors"
                >
                    + カテゴリ
                </button>
                <button
                    onClick={() => setShowSeriesForm(!showSeriesForm)}
                    className="text-xs px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                >
                    + シリーズ
                </button>
            </div>

            {/* Category Form */}
            {showCategoryForm && (
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3 animate-fade-in">
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">カテゴリ作成</p>
                    <input
                        type="text"
                        placeholder="カテゴリ名（例: シングルス）"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
                    />
                    <select
                        value={newCategoryParent}
                        onChange={e => setNewCategoryParent(e.target.value)}
                        className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    >
                        <option value="">親カテゴリなし（ルート）</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.parentId ? '  └ ' : ''}{c.name}</option>
                        ))}
                    </select>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowCategoryForm(false)} className="text-xs px-3 py-1.5 text-white/40 hover:text-white/60">キャンセル</button>
                        <button onClick={handleCreateCategory} className="text-xs px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">作成</button>
                    </div>
                </div>
            )}

            {/* Series Form */}
            {showSeriesForm && (
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3 animate-fade-in">
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">シリーズ作成</p>
                    <input
                        type="text"
                        placeholder="シリーズ名（例: 土曜午後練習）"
                        value={newSeries.name}
                        onChange={e => setNewSeries({ ...newSeries, name: e.target.value })}
                        className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
                    />
                    <select
                        value={newSeries.categoryId}
                        onChange={e => setNewSeries({ ...newSeries, categoryId: e.target.value })}
                        className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    >
                        <option value="">カテゴリを選択</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.parentId ? '  └ ' : ''}{c.name}</option>
                        ))}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] text-white/30 block mb-1">曜日</label>
                            <select
                                value={newSeries.dayOfWeek}
                                onChange={e => setNewSeries({ ...newSeries, dayOfWeek: parseInt(e.target.value) })}
                                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                            >
                                {DAY_LABELS.map((d, i) => <option key={i} value={i}>{d}曜</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] text-white/30 block mb-1">時間</label>
                            <input
                                type="time"
                                value={newSeries.startTime}
                                onChange={e => setNewSeries({ ...newSeries, startTime: e.target.value })}
                                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                            />
                        </div>
                    </div>
                    <input
                        type="text"
                        placeholder="場所"
                        value={newSeries.location}
                        onChange={e => setNewSeries({ ...newSeries, location: e.target.value })}
                        className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
                    />
                    <div>
                        <label className="text-[11px] text-white/30 block mb-1">参加費（1回）</label>
                        <input
                            type="number"
                            value={newSeries.fee}
                            onChange={e => setNewSeries({ ...newSeries, fee: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowSeriesForm(false)} className="text-xs px-3 py-1.5 text-white/40 hover:text-white/60">キャンセル</button>
                        <button onClick={handleCreateSeries} className="text-xs px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">作成</button>
                    </div>
                </div>
            )}

            {/* Category Filter */}
            {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`text-xs px-3 py-1.5 rounded-full shrink-0 transition-colors ${selectedCategory === 'all'
                            ? 'bg-white text-black'
                            : 'bg-white/[0.06] text-white/50 hover:text-white/80'
                            }`}
                    >
                        全て
                    </button>
                    {rootCategories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`text-xs px-3 py-1.5 rounded-full shrink-0 transition-colors ${selectedCategory === cat.id
                                ? 'bg-white text-black'
                                : 'bg-white/[0.06] text-white/50 hover:text-white/80'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Series List */}
            {categories.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-white/30 text-sm">カテゴリが登録されていません</p>
                    <p className="text-white/20 text-xs mt-1">まずは「+ カテゴリ」からカテゴリを作成してください</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-white/30 text-sm">練習シリーズがありません</p>
                    <p className="text-white/20 text-xs mt-1">「+ シリーズ」から作成してください</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(series => (
                        <div key={series.id} className="relative group">
                            <Link
                                href={`/practices/${series.id}`}
                                className="block bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] transition-colors h-full"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm font-medium text-white truncate pr-8">{series.name}</h3>
                                    {getCategoryName(series.categoryId) && (
                                        <span className="text-[10px] px-2 py-0.5 bg-white/[0.06] text-white/40 rounded-full shrink-0">
                                            {getCategoryName(series.categoryId)}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-white/60">
                                        <span className="w-16">日時</span>
                                        <span>{DAY_LABELS[series.dayOfWeek]}曜 {series.startTime}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/60">
                                        <span className="w-16">場所</span>
                                        <span className="truncate">{series.location || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/60">
                                        <span className="w-16">参加費</span>
                                        <span>{series.fee > 0 ? `¥${series.fee.toLocaleString()}` : '無料'}</span>
                                    </div>
                                </div>
                            </Link>
                            <button
                                onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!window.confirm(`「${series.name}」を削除しますか？\n※関連するセッションも削除される可能性があります`)) return;
                                    try {
                                        await api.deletePracticeSeries(series.id);
                                        load();
                                    } catch (err) {
                                        alert('削除に失敗しました');
                                    }
                                }}
                                className="absolute top-2 right-2 p-1.5 text-white/20 hover:text-red-400 bg-black/20 hover:bg-black/40 rounded opacity-0 group-hover:opacity-100 transition-all z-10"
                                title="削除"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
