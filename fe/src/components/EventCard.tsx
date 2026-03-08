'use client';

import Link from 'next/link';
import { Event } from '@/lib/api';

interface EventCardProps {
    event: Event;
}

export default function EventCard({ event }: EventCardProps) {
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    };

    return (
        <Link href={`/events/${event.id}`}>
            <div className="card group cursor-pointer animate-fade-in">
                {/* Cover Image */}
                <div className="relative h-48 overflow-hidden bg-[#151d2e]">
                    {event.coverImageUrl ? (
                        <img
                            src={event.coverImageUrl}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#151d2e] to-[#1a2438]">
                            <span className="text-6xl opacity-20">📢</span>
                        </div>
                    )}

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-transparent to-transparent opacity-60" />

                    {/* Date badge */}
                    {event.startAt && (
                        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-[#0a0f1c]/80 backdrop-blur-sm text-xs font-medium text-white border border-[#2a3548]">
                            {formatDate(event.startAt)}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-5 relative z-10">
                    <h3 className="font-semibold text-white line-clamp-2 group-hover:text-[#3b82f6] transition-colors">
                        {event.title}
                    </h3>
                    {event.location && (
                        <p className="text-sm text-[#8b98b0] mt-2 flex items-center gap-2">
                            <span className="text-[#3b82f6]">●</span> {event.location}
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
}
