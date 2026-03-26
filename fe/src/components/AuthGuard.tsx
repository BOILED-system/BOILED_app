'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';
import BottomNav from './BottomNav';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/';
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const memberId = localStorage.getItem('memberId');
    if (memberId) {
      setAuthed(true);
    } else {
      setAuthed(false);
      if (!isLoginPage) router.replace('/');
    }
  }, [pathname]);

  // ログインページはそのまま表示
  if (isLoginPage) {
    return (
      <main className="min-h-screen">
        {children}
      </main>
    );
  }

  // 認証確認中・未ログイン時は何も表示しない（ログインページへリダイレクト中）
  if (!authed) return null;

  return (
    <>
      <Header />
      <main className="pt-24 pb-24 md:pb-16 px-4 md:px-6 min-h-screen">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
