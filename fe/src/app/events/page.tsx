'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getEvents, createEvent, deleteEvent } from '@/lib/api';
import type { BoiledEvent, TimetableRow } from '@/lib/api';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const EMPTY_FORM = {
  title: '',
  date: '',
  location: '',
  meetingTime: '',
  meetingLocation: '',
  note: '',
};

export default function EventsPage() {
  const [events, setEvents] = useState<BoiledEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [memberId, setMemberId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [timetable, setTimetable] = useState<TimetableRow[]>([]);
  const [timetableInput, setTimetableInput] = useState({ time: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole') || 'member');
    setMemberId(localStorage.getItem('memberId') || '');
    load();
  }, []);

  const load = async () => {
    try {
      const data = await getEvents();
      setEvents(data.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTimetableRow = () => {
    if (!timetableInput.time || !timetableInput.description) return;
    setTimetable(prev => [...prev, { ...timetableInput }].sort((a, b) => a.time.localeCompare(b.time)));
    setTimetableInput({ time: '', description: '' });
  };

  const handleCreate = async () => {
    if (!form.title || !form.date) {
      alert('イベント名と日付は必須です');
      return;
    }
    setSaving(true);
    await createEvent({ ...form, timetable, createdBy: memberId, createdByName: localStorage.getItem('userName') || '' });
    setForm(EMPTY_FORM);
    setTimetable([]);
    setTimetableInput({ time: '', description: '' });
    setShowForm(false);
    setSaving(false);
    load();
  };

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    if (!confirm(`「${title}」を削除しますか？`)) return;
    await deleteEvent(id);
    setEvents(prev => prev.filter(ev => ev.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.date >= today);
  const past = events.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">イベント</h1>
        {userRole === 'admin' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
          >
            + イベントを追加
          </button>
        )}
      </div>

      {/* 作成フォーム */}
      {showForm && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3">
          <button type="button"
            onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setTimetable([]); setTimetableInput({ time: '', description: '' }); }}
            className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1">
            ← イベント一覧に戻る
          </button>
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">イベントを作成</p>

          <input
            type="text" placeholder="イベント名（例：新歓イベント2025）"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/30 block mb-1">日付</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-white/30 block mb-1">会場</label>
              <input type="text" placeholder="例：渋谷○○ホール" value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/30 block mb-1">集合時間</label>
              <input type="time" value={form.meetingTime} onChange={e => setForm({ ...form, meetingTime: e.target.value })}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-white/30 block mb-1">集合場所</label>
              <input type="text" placeholder="例：正門前" value={form.meetingLocation}
                onChange={e => setForm({ ...form, meetingLocation: e.target.value })}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none" />
            </div>
          </div>

          {/* タイムテーブル */}
          <div>
            <label className="text-[11px] text-white/30 block mb-2">タイムテーブル（任意）</label>
            {timetable.length > 0 && (
              <div className="mb-2 space-y-1">
                {timetable.map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white/[0.04] rounded-lg px-3 py-1.5">
                    <span className="text-white/50 w-12 shrink-0">{row.time}</span>
                    <span className="text-white/70 flex-1 ml-2">{row.description}</span>
                    <button onClick={() => setTimetable(prev => prev.filter((_, j) => j !== i))}
                      className="text-white/20 hover:text-red-400 ml-2">×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="time" value={timetableInput.time}
                onChange={e => setTimetableInput(p => ({ ...p, time: e.target.value }))}
                className="w-28 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none shrink-0" />
              <input type="text" placeholder="内容（例：開場）"
                value={timetableInput.description}
                onChange={e => setTimetableInput(p => ({ ...p, description: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddTimetableRow()}
                className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none" />
              <button onClick={handleAddTimetableRow}
                className="text-xs px-3 py-1.5 bg-white/[0.06] text-white/50 rounded-lg hover:bg-white/[0.1] shrink-0">
                追加
              </button>
            </div>
          </div>

          <textarea
            placeholder="メモ・備考（任意）" value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none" rows={2}
          />

          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setTimetable([]); }}
              className="text-xs px-3 py-1.5 text-white/40 hover:text-white/60">キャンセル</button>
            <button onClick={handleCreate} disabled={saving}
              className="text-xs px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg">
              {saving ? '作成中...' : '作成'}
            </button>
          </div>
        </div>
      )}

      {/* 今後のイベント */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          {upcoming.map(event => {
            const date = new Date(event.date);
            return (
              <div key={event.id} className="group relative">
                <Link href={`/events/${event.id}`}
                  className="flex items-center gap-4 bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] transition-colors">
                  <div className="flex flex-col items-center w-10 shrink-0">
                    <span className="text-[10px] text-white/30">{date.getMonth() + 1}月</span>
                    <span className="text-xl font-semibold text-white leading-tight">{date.getDate()}</span>
                    <span className="text-[10px] text-white/30">{DAY_LABELS[date.getDay()]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">{event.title}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      {event.meetingTime && <span className="text-xs text-white/40">集合 {event.meetingTime}</span>}
                      {event.location && <span className="text-xs text-white/30 truncate">{event.location}</span>}
                    </div>
                  </div>
                  <span className="text-white/20 group-hover:text-blue-400 transition-colors text-sm">→</span>
                </Link>
                {userRole === 'admin' && (!event.createdBy || event.createdBy === memberId) && (
                  <button onClick={e => handleDelete(e, event.id, event.title)}
                    className="absolute top-1/2 -translate-y-1/2 right-10 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all text-xs px-2 py-1">
                    削除
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 過去のイベント */}
      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/20 font-medium uppercase tracking-wider px-1">過去のイベント</p>
          {past.map(event => {
            const date = new Date(event.date);
            return (
              <div key={event.id} className="group relative">
                <Link href={`/events/${event.id}`}
                  className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 opacity-50 hover:opacity-70 transition-opacity">
                  <div className="flex flex-col items-center w-10 shrink-0">
                    <span className="text-[10px] text-white/30">{date.getMonth() + 1}月</span>
                    <span className="text-xl font-semibold text-white leading-tight">{date.getDate()}</span>
                    <span className="text-[10px] text-white/30">{DAY_LABELS[date.getDay()]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">{event.title}</h3>
                    {event.location && <p className="text-xs text-white/30 mt-0.5 truncate">{event.location}</p>}
                  </div>
                  <span className="text-white/20 text-sm">→</span>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <div className="text-center py-16">
          <p className="text-white/30 text-sm">イベントがまだありません</p>
          {userRole === 'admin' && <p className="text-white/20 text-xs mt-1">「+ イベントを追加」から作成してください</p>}
        </div>
      )}
    </div>
  );
}
