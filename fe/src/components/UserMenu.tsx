'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function UserMenu() {
  const [userName, setUserName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setUserName(localStorage.getItem('userName') || '');
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('memberId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('current_user_id');
    router.push('/');
  };

  if (!userName) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300 shrink-0">
          {userName.charAt(0)}
        </div>
        <span className="text-sm text-white/70">{userName}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-white/[0.06]">
            <p className="text-[11px] text-white/30">ログイン中</p>
            <p className="text-sm text-white font-medium mt-0.5">{userName}</p>
          </div>
          <div className="p-1">
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
