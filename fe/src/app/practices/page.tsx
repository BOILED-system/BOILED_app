'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPracticeSessions, createPracticeSession } from '@/lib/firestore';

const GENRES = ['Break', 'Girls', 'Hiphop', 'House', 'Lock', 'Pop', 'Waack'];

export default function PracticesPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [activeType, setActiveType] = useState<'regular' | 'event'>('regular');
  const [form, setForm] = useState({
    name: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    note: '',
    targetGenerations: [] as number[],
    targetGenres: [] as string[],
  });

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole') || 'member');
    load();
  }, []);

  const load = async () => {
    const data = await getPracticeSessions();
    const sorted = data.sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setSessions(sorted);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.date || !form.startTime || !form.location) {
      alert('練習名・日付・開始時間・場所は必須です');
      return;
    }
    await createPracticeSession({ ...form, type: activeType });
    setShowForm(false);
    setForm({ name: '', date: '', startTime: '', endTime: '', location: '', note: '', targetGenerations: [], targetGenres: [] });
    load();
  };

  const toggleGenre = (genre: string) => {
    setForm(f => ({
      ...f,
      targetGenres: f.targetGenres.includes(genre)
        ? f.targetGenres.filter(g => g !== genre)
        : [...f.targetGenres, genre],
    }));
  };

  const toggleGeneration = (gen: number) => {
    setForm(f => ({
      ...f,
      targetGenerations: f.targetGenerations.includes(gen)
        ? f.targetGenerations.filter(g => g !== gen)
        : [...f.targetGenerations, gen],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">練習</h1>
        {userRole === 'admin' && (
          <div className="flex gap-2">
            <select
              value={activeType}
              onChange={e => setActiveType(e.target.value as 'regular' | 'event')}
              className="text-xs px-3 py-1.5 bg-white/[0.06] text-white/60 rounded-lg focus:outline-none"
            >
              <option value="regular">正規練</option>
              <option value="event">イベント練</option>
            </select>
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-xs px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
            >
              + 練習を追加
            </button>
          </div>
        )}
      </div>

      {/* 作成フォーム */}
      {showForm && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
            {activeType === 'regular' ? '正規練' : 'イベント練'}を作成
          </p>

          <input
            type="text"
            placeholder={activeType === 'regular' ? '例：Hiphop正規練' : '例：夏イベ Hiphopナンバー練'}
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
          />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-white/30 block mb-1">日付</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/30 block mb-1">開始</label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value })}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/30 block mb-1">終了</label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          <input
            type="text"
            placeholder="場所（例：マイスタ4B）"
            value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
          />

          <textarea
            placeholder="メモ（任意）"
            value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none"
            rows={2}
          />

          {activeType === 'regular' && (
            <>
              <div>
                <label className="text-[11px] text-white/30 block mb-2">対象ジャンル（空=全員）</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      onClick={() => toggleGenre(g)}
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${
                        form.targetGenres.includes(g)
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/[0.06] text-white/50 hover:text-white/80'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-white/30 block mb-2">対象期（空=全員）</label>
                <div className="flex flex-wrap gap-2">
                  {[13, 14, 15, 16, 17].map(gen => (
                    <button
                      key={gen}
                      onClick={() => toggleGeneration(gen)}
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${
                        form.targetGenerations.includes(gen)
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/[0.06] text-white/50 hover:text-white/80'
                      }`}
                    >
                      {gen}期
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeType === 'event' && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-3 text-xs text-white/30">
              対象者はGoogle Form連携で自動設定予定（現在は全員対象）
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 text-white/40 hover:text-white/60">キャンセル</button>
            <button onClick={handleCreate} className="text-xs px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">作成</button>
          </div>
        </div>
      )}

      {/* 練習一覧（時系列） */}
      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/30 text-sm">練習がまだありません</p>
          {userRole === 'admin' && (
            <p className="text-white/20 text-xs mt-1">「+ 練習を追加」から作成してください</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session: any) => (
            <Link
              key={session.id}
              href={`/practices/${session.id}`}
              className="block bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] transition-colors group"
            >
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
                    <span className="text-xs text-white/40">
                      {session.date} {session.startTime}〜{session.endTime}
                    </span>
                    {session.location && (
                      <span className="text-xs text-white/30 truncate">{session.location}</span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {session.targetGenres?.map((g: string) => (
                      <span key={g} className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">{g}</span>
                    ))}
                    {session.targetGenerations?.map((g: number) => (
                      <span key={g} className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">{g}期</span>
                    ))}
                    {(!session.targetGenres?.length && !session.targetGenerations?.length) && (
                      <span className="text-[10px] px-2 py-0.5 bg-white/[0.06] text-white/30 rounded-full">全員</span>
                    )}
                  </div>
                </div>
                <span className="text-white/20 group-hover:text-blue-400 transition-colors ml-4">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
