'use client';

import { useState, useEffect } from 'react';
import { api, Event, PracticeSeries, PracticeSession, RSVP, PracticeRSVP } from '@/lib/api/client';
import { DEFAULT_CIRCLE_ID, DEFAULT_USER_ID } from '@/lib/constants';
import CalendarView, { CalendarItem } from '@/components/CalendarView';
import { useUser } from '@/components/providers/UserContext';

export default function CalendarPage() {
    const { currentUser } = useUser();
    const [events, setEvents] = useState<Event[]>([]);
    const [practiceSessions, setPracticeSessions] = useState<{ series: PracticeSeries, session: PracticeSession }[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'all' | 'my'>('all');

    // Store RSVPs to filter
    const [myEventRsvps, setMyEventRsvps] = useState<Record<string, RSVP>>({});
    const [myPracticeRsvps, setMyPracticeRsvps] = useState<Record<string, PracticeRSVP>>({});

    useEffect(() => {
        const load = async () => {
            try {
                const userId = currentUser.id || DEFAULT_USER_ID;

                // 1. Fetch Events
                const eventsData = await api.getEvents(DEFAULT_CIRCLE_ID);
                setEvents(eventsData);

                // Fetch My RSVPs for events
                const eventRsvps: Record<string, RSVP> = {};
                await Promise.all(eventsData.map(async (event) => {
                    try {
                        const rsvp = await api.getMyRSVP(event.id);
                        if (rsvp) eventRsvps[event.id] = rsvp;
                    } catch (e) { /* ignore */ }
                }));
                setMyEventRsvps(eventRsvps);

                // 2. Fetch Practice Series & Sessions
                const seriesData = await api.getPracticeSeries(DEFAULT_CIRCLE_ID);

                const allSessions: { series: PracticeSeries, session: PracticeSession }[] = [];
                const practiceRsvps: Record<string, PracticeRSVP> = {};

                await Promise.all(seriesData.map(async (series) => {
                    try {
                        const detail = await api.getPracticeSeriesDetail(series.id);
                        if (detail && detail.sessions) {
                            detail.sessions.forEach(session => {
                                allSessions.push({ series, session });
                                // Store RSVP if exists
                                const rsvp = detail.myRsvps?.find(r => r.sessionId === session.id);
                                if (rsvp) practiceRsvps[session.id] = rsvp;
                            });
                        }
                    } catch (e) {
                        console.error(`Failed to load sessions for series ${series.id}`, e);
                    }
                }));

                setPracticeSessions(allSessions);
                setMyPracticeRsvps(practiceRsvps);

            } catch (error) {
                console.error('Failed to load calendar data', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser.id]);

    // Transform and Filter
    const getCalendarItems = () => {
        let filteredEvents = events;
        let filteredSessions = practiceSessions;

        if (viewMode === 'my') {
            filteredEvents = events.filter(e => {
                const rsvp = myEventRsvps[e.id];
                return rsvp && ['GO', 'LATE', 'EARLY'].includes(rsvp.status);
            });
            filteredSessions = practiceSessions.filter(({ session }) => {
                const rsvp = myPracticeRsvps[session.id];
                return rsvp && rsvp.status === 'GO'; // Practice only has GO/NO in current mock usually
            });
        }

        return [
            ...filteredEvents.map(event => ({
                id: event.id,
                title: `【イベント】${event.title}`,
                start: event.startAt,
                type: 'event' as const,
                url: `/events/${event.id}`,
            })),
            ...filteredSessions.map(({ series, session }) => ({
                id: session.id,
                title: `【練習】${series.name}`,
                start: session.date,
                type: 'practice' as const,
                url: `/practices/${series.id}`,
            }))
        ];
    };

    const calendarItems = getCalendarItems();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-white">カレンダー</h1>

                {/* View Toggle */}
                <div className="flex p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                    <button
                        onClick={() => setViewMode('all')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'all'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-white/40 hover:text-white/60'
                            }`}
                    >
                        すべて
                    </button>
                    <button
                        onClick={() => setViewMode('my')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'my'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-white/40 hover:text-white/60'
                            }`}
                    >
                        自分の予定
                    </button>
                </div>
            </div>

            <div className="animate-fade-in">
                <CalendarView items={calendarItems} />
            </div>
        </div>
    );
}
