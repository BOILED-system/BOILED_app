'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getEvent, updateEvent, TimetableRow } from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const parseTimetableText = (text: string): TimetableRow[] => {
  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // タブ区切り（スプレッドシートからの貼り付け）
      const tabIdx = line.indexOf('\t');
      if (tabIdx >= 0) {
        return { time: line.slice(0, tabIdx).trim(), description: line.slice(tabIdx + 1).trim() };
      }
      // 時刻で始まる行: "13:00 開場" or "13:00　開場"
      const match = line.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
      if (match) {
        return { time: match[1], description: match[2].trim() };
      }
      return { time: '', description: line };
    });
};

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timetableImageRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState('');

  const [form, setForm] = useState({
    title: '',
    date: '',
    location: '',
    meetingTime: '',
    meetingLocation: '',
    note: '',
  });
  const [timetable, setTimetable] = useState<TimetableRow[]>([]);
  const [timetableMode, setTimetableMode] = useState<'text' | 'image'>('text');
  const [pasteText, setPasteText] = useState('');
  const [timetableImageUrl, setTimetableImageUrl] = useState('');
  const [timetableUploading, setTimetableUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole') || 'member');
    getEvent(id).then(event => {
      if (!event) { setLoading(false); return; }
      setForm({
        title: event.title || '',
        date: event.date || '',
        location: event.location || '',
        meetingTime: event.meetingTime || '',
        meetingLocation: event.meetingLocation || '',
        note: event.note || '',
      });
      setTimetable(event.timetable || []);
      setTimetableImageUrl(event.timetableImageUrl || '');
      setImageUrls(event.imageUrls || []);
      // 既存データに応じてモードを初期化
      if (event.timetableImageUrl && (!event.timetable || event.timetable.length === 0)) {
        setTimetableMode('image');
      }
      setLoading(false);
    });
  }, [id]);

  const handleParsePaste = () => {
    const rows = parseTimetableText(pasteText);
    setTimetable(rows);
    setPasteText('');
  };

  const handleTimetableImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTimetableUploading(true);
    const storageRef = ref(storage, `events/${id}/timetable_${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setTimetableImageUrl(url);
    setTimetableUploading(false);
    if (timetableImageRef.current) timetableImageRef.current.value = '';
  };

  const handleRemoveTimetableImage = async () => {
    if (!confirm('タイムテーブル画像を削除しますか？')) return;
    try {
      await deleteObject(ref(storage, timetableImageUrl));
    } catch {}
    setTimetableImageUrl('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress(files.map(f => f.name));
    const newUrls: string[] = [];
    for (const file of files) {
      const storageRef = ref(storage, `events/${id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      newUrls.push(url);
    }
    setImageUrls(prev => [...prev, ...newUrls]);
    setUploadProgress([]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = async (url: string) => {
    if (!confirm('この画像を削除しますか？')) return;
    try {
      await deleteObject(ref(storage, url));
    } catch {}
    setImageUrls(prev => prev.filter(u => u !== url));
  };

  const handleSave = async () => {
    if (!form.title || !form.date) {
      alert('イベント名と日付は必須です');
      return;
    }
    setSaving(true);
    await updateEvent(id, {
      ...form,
      timetable: timetableMode === 'text' ? timetable : [],
      timetableImageUrl: timetableMode === 'image' ? timetableImageUrl : '',
      imageUrls,
    });
    setSaving(false);
    router.push(`/events/${id}`);
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
        <Link href={`/events/${id}`} className="text-blue-400 text-xs mt-2 inline-block">← 戻る</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link href={`/events/${id}`} className="text-xs text-white/30 hover:text-white/60 transition-colors">
        ← キャンセル
      </Link>

      <h1 className="text-xl font-bold text-white">イベントを編集</h1>

      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3">

        <input
          type="text" placeholder="イベント名"
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
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] text-white/30">タイムテーブル</label>
            <div className="flex gap-1">
              <button
                onClick={() => setTimetableMode('text')}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${timetableMode === 'text' ? 'bg-white/10 text-white/70' : 'text-white/30 hover:text-white/50'}`}
              >
                テキスト
              </button>
              <button
                onClick={() => setTimetableMode('image')}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${timetableMode === 'image' ? 'bg-white/10 text-white/70' : 'text-white/30 hover:text-white/50'}`}
              >
                画像
              </button>
            </div>
          </div>

          {timetableMode === 'text' && (
            <div className="space-y-2">
              {/* パース済み行のプレビュー */}
              {timetable.length > 0 && (
                <div className="space-y-1">
                  {timetable.map((row, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white/[0.04] rounded-lg px-3 py-1.5">
                      <span className="text-white/50 w-12 shrink-0">{row.time}</span>
                      <span className="text-white/70 flex-1 ml-2">{row.description}</span>
                      <button onClick={() => setTimetable(prev => prev.filter((_, j) => j !== i))}
                        className="text-white/20 hover:text-red-400 ml-2 shrink-0">×</button>
                    </div>
                  ))}
                  <button
                    onClick={() => setTimetable([])}
                    className="text-[11px] text-white/20 hover:text-red-400 transition-colors w-full text-right"
                  >
                    全て削除
                  </button>
                </div>
              )}
              {/* 貼り付けエリア */}
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={"スプレッドシートからコピーしたデータをここに貼り付け\n例）13:00\t開場\n13:30\t開演"}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none resize-none font-mono"
                rows={4}
              />
              <button
                onClick={handleParsePaste}
                disabled={!pasteText.trim()}
                className="w-full py-2 text-xs bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-30 text-white/60 rounded-lg transition-colors"
              >
                解析して反映
              </button>
            </div>
          )}

          {timetableMode === 'image' && (
            <div className="space-y-2">
              {timetableImageUrl ? (
                <div className="relative group">
                  <img src={timetableImageUrl} alt="タイムテーブル" className="w-full rounded-lg" />
                  <button
                    onClick={handleRemoveTimetableImage}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/70 text-white/60 hover:text-red-400 rounded-full text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={timetableImageRef}
                    type="file"
                    accept="image/*"
                    onChange={handleTimetableImageUpload}
                    className="hidden"
                    id="timetable-image-upload"
                  />
                  <label
                    htmlFor="timetable-image-upload"
                    className={`flex items-center justify-center gap-2 w-full py-6 border border-dashed border-white/[0.15] rounded-lg text-xs text-white/40 hover:text-white/60 hover:border-white/30 cursor-pointer transition-colors ${timetableUploading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {timetableUploading ? 'アップロード中...' : '+ タイムテーブル画像をアップロード'}
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        <textarea
          placeholder="メモ・備考（任意）" value={form.note}
          onChange={e => setForm({ ...form, note: e.target.value })}
          className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none" rows={3}
        />
      </div>

      {/* 画像 */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">画像</p>

        {imageUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {imageUrls.map((url, i) => (
              <div key={i} className="relative group aspect-square">
                <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                <button
                  onClick={() => handleRemoveImage(url)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white/60 hover:text-red-400 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {uploadProgress.length > 0 && (
          <div className="space-y-1">
            {uploadProgress.map(name => (
              <div key={name} className="flex items-center gap-2 text-xs text-white/40">
                <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin shrink-0" />
                {name}
              </div>
            ))}
          </div>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className={`flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/[0.15] rounded-lg text-xs text-white/40 hover:text-white/60 hover:border-white/30 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {uploading ? 'アップロード中...' : '+ 画像を追加（複数選択可）'}
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pb-8">
        <Link href={`/events/${id}`}
          className="text-xs px-4 py-2 text-white/40 hover:text-white/60 transition-colors">
          キャンセル
        </Link>
        <button
          onClick={handleSave}
          disabled={saving || uploading || timetableUploading}
          className="text-xs px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
        >
          {saving ? '保存中...' : '変更を保存'}
        </button>
      </div>
    </div>
  );
}
