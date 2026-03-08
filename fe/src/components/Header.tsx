'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserSwitcher from './UserSwitcher';

interface HeaderProps {
    circleName?: string;
}

export default function Header({ circleName = 'CircleMate' }: HeaderProps) {
    const pathname = usePathname();

    const navLinks = [
        { href: '/profile', label: 'ホーム' },
        { href: '/announcements', label: 'お知らせ' },
        { href: '/events', label: 'イベント' },
        { href: '/calendar', label: 'カレンダー' },
        { href: '/payments', label: '精算' },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
            <div className="container mx-auto px-4 md:px-8 py-4 md:py-5">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/profile" className="group">
                        <span className="text-xl md:text-2xl font-black tracking-wider text-white">
                            {circleName}
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`relative text-sm font-medium tracking-wide transition-all ${pathname.startsWith(link.href)
                                    ? 'text-white'
                                    : 'text-[#8b98b0] hover:text-white'
                                    }`}
                            >
                                {link.label}
                                {pathname.startsWith(link.href) && (
                                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#3b82f6]" />
                                )}
                            </Link>
                        ))}

                        {/* User Switcher */}
                        <div className="ml-4 pl-4 border-l border-white/10">
                            <UserSwitcher />
                        </div>
                    </nav>

                    {/* Mobile User Switcher */}
                    <div className="md:hidden">
                        <UserSwitcher />
                    </div>
                </div>
            </div>
        </header>
    );
}
