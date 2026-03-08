'use client';

import Link from 'next/link';
import { Announcement } from '@/lib/api';
import Image from 'next/image';

interface Props {
    announcement: Announcement;
}

export default function AnnouncementCard({ announcement }: Props) {
    return (
        <Link href={`/announcements/${announcement.id}`}>
            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer border border-gray-100">
                {/* Image */}
                <div className="relative h-48 bg-gradient-to-br from-indigo-100 to-purple-100">
                    {announcement.imageUrl ? (
                        <Image
                            src={announcement.imageUrl}
                            alt={announcement.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-6xl">📢</span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {announcement.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {announcement.body}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                            {new Date(announcement.createdAt).toLocaleDateString('ja-JP')}
                        </span>
                        <span className="text-indigo-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                            詳細を見る →
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
