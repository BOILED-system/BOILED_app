'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { href: '/profile', label: 'ホーム' },
    { href: '/announcements', label: 'お知らせ' },
    { href: '/events', label: 'イベント' },
    { href: '/practices', label: '練習' }, // Added
    { href: '/payments', label: '精算' },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black/90 backdrop-blur-xl border-t border-white/[0.06]">
            <div className="flex justify-around items-center h-14">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center justify-center px-4 py-2 text-xs font-medium transition-colors ${isActive
                                ? 'text-white'
                                : 'text-white/25 hover:text-white/50'
                                }`}
                        >
                            {item.label}
                            {isActive && (
                                <span className="absolute bottom-2 w-1 h-1 rounded-full bg-blue-500" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
