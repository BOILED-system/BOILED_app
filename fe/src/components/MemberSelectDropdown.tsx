'use client';

import { useState, useRef, useEffect } from 'react';
import type { FEUser } from '@/lib/api';

interface Props {
  allUsers: FEUser[];
  selected: { id: string; name: string }[];
  onAdd: (member: { id: string; name: string }) => void;
  onRemove: (id: string) => void;
  chipColor: 'green' | 'red';
  placeholder?: string;
}

export default function MemberSelectDropdown({
  allUsers,
  selected,
  onAdd,
  onRemove,
  chipColor,
  placeholder = 'メンバーを選択...',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedIds = new Set(selected.map(m => m.id));
  const filtered = allUsers
    .filter(u => !selectedIds.has(u.memberId))
    .filter(u => !search || u.name.includes(search) || u.memberId.includes(search));

  const chipClass =
    chipColor === 'green'
      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
      : 'bg-red-500/10 text-red-400 border border-red-500/20';

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(m => (
            <span key={m.id} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${chipClass}`}>
              {m.name}
              <button type="button" onClick={() => onRemove(m.id)} className="text-white/30 hover:text-red-400 ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => { setOpen(v => !v); setSearch(''); }}
          className="w-full text-left px-3 py-2 text-sm bg-white/[0.06] border border-white/[0.08] rounded-lg text-white/40 hover:text-white/60 hover:bg-white/[0.08] transition-colors flex items-center justify-between"
        >
          <span>{placeholder}</span>
          <span className="text-white/20 text-xs">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full bg-[#1a1f2e] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-white/[0.06]">
              <input
                type="text"
                placeholder="名前・会員番号で検索..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                className="w-full bg-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-white/30 px-3 py-3 text-center">該当なし</p>
              ) : filtered.map(u => (
                <button
                  key={u.memberId}
                  type="button"
                  onClick={() => { onAdd({ id: u.memberId, name: u.name }); setOpen(false); setSearch(''); }}
                  className="w-full text-left px-3 py-2.5 text-sm text-white/70 hover:bg-white/[0.06] transition-colors flex items-center justify-between"
                >
                  <span>{u.name}</span>
                  <span className="text-xs text-white/30">{u.genre} {u.generation}代</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
