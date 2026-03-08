import {
    Circle, Event, Announcement, RSVP, Settlement, Payment, SettlementWithPayment,
    ChatResponse, PracticeCategory, PracticeSeries, PracticeSession, PracticeRSVP, PracticeSeriesDetail,
    CreateEventRequest, CreateAnnouncementRequest, CreateSettlementRequest, CreatePracticeSeriesRequest,
    User, AnnouncementDetail
} from './types';
import { MOCK_USERS } from '@/lib/constants/users';

const CURRENT_USER_ID = 'demo-user-1';

// --- MOCK DATA FROM NOA BRANCH (Events, Announcements, etc.) ---

const now = new Date();
const tomorrow = new Date(now.getTime() + 86400000);
const nextWeek = new Date(now.getTime() + 7 * 86400000);
const lastWeek = new Date(now.getTime() - 7 * 86400000);

export const MOCK_EVENTS: Event[] = [
    {
        id: 'mock-event-1',
        circleId: 'mock-circle',
        title: '【通常練習】土曜テニス練習',
        startAt: tomorrow.toISOString(),
        location: '東京都立公園テニスコート',
        coverImageUrl: 'https://picsum.photos/seed/tennis1/400/300',
        rsvpTargetUserIds: ['demo-user-1', 'demo-user-2', 'demo-user-3', 'demo-user-4'],
        createdBy: 'demo-user-1',
        createdAt: now.toISOString(),
    },
    {
        id: 'mock-event-2',
        circleId: 'mock-circle',
        title: '【特別イベント】春季テニス大会',
        startAt: nextWeek.toISOString(),
        location: '品川スポーツセンター',
        coverImageUrl: 'https://picsum.photos/seed/tennis2/400/300',
        rsvpTargetUserIds: ['demo-user-1', 'demo-user-2', 'demo-user-3'],
        createdBy: 'demo-user-1',
        createdAt: now.toISOString(),
    },
    {
        id: 'mock-event-3',
        circleId: 'mock-circle',
        title: '【通常練習】水曜夜練習',
        startAt: lastWeek.toISOString(),
        location: '渋谷区スポーツセンター',
        coverImageUrl: '',
        rsvpTargetUserIds: ['demo-user-1', 'demo-user-2'],
        createdBy: 'demo-user-2',
        createdAt: lastWeek.toISOString(),
    },
    {
        id: 'mock-event-4',
        circleId: 'mock-circle',
        title: '【特別イベント】新歓BBQ',
        startAt: new Date(now.getTime() + 14 * 86400000).toISOString(),
        location: '代々木公園',
        coverImageUrl: 'https://picsum.photos/seed/bbq/400/300',
        rsvpTargetUserIds: ['demo-user-1', 'demo-user-2', 'demo-user-3', 'demo-user-4'],
        createdBy: 'demo-user-1',
        createdAt: now.toISOString(),
    },
];

export let MOCK_ANNOUNCEMENTS: Announcement[] = [
    {
        id: 'mock-ann-1',
        circleId: 'mock-circle',
        eventId: 'mock-event-1',
        title: '練習場所の変更について',
        body: '今週の練習場所が変更になりました。詳細はこちらをご確認ください。新しい場所は東京都立公園テニスコートA面です。',
        createdBy: 'demo-user-1',
        createdAt: now.toISOString(),
    },
    {
        id: 'mock-ann-2',
        circleId: 'mock-circle',
        eventId: 'mock-event-2',
        title: '大会エントリー締切',
        body: '春季テニス大会のエントリー締切は来週金曜日です。参加希望の方は早めに登録をお願いします。',
        createdBy: 'demo-user-1',
        createdAt: lastWeek.toISOString(),
    },
];

export const MOCK_RSVPS: Record<string, RSVP | null> = {
    'mock-event-1': { id: 'mock-rsvp-1', eventId: 'mock-event-1', userId: 'demo-user-1', status: 'GO', note: '', updatedAt: now.toISOString() },
    'mock-event-2': null, // 未登録
    'mock-event-3': { id: 'mock-rsvp-3', eventId: 'mock-event-3', userId: 'demo-user-1', status: 'NO', note: '仕事', updatedAt: lastWeek.toISOString() },
    'mock-event-4': null, // 未登録
};

export const MOCK_ALL_RSVPS: Record<string, RSVP[]> = {
    'mock-event-1': [
        { id: 'r1', eventId: 'mock-event-1', userId: 'demo-user-1', status: 'GO', note: '', updatedAt: now.toISOString() },
        { id: 'r2', eventId: 'mock-event-1', userId: 'demo-user-2', status: 'GO', note: '', updatedAt: now.toISOString() },
        { id: 'r3', eventId: 'mock-event-1', userId: 'demo-user-3', status: 'LATE', note: '30分遅れます', updatedAt: now.toISOString() },
        { id: 'r4', eventId: 'mock-event-1', userId: 'demo-user-4', status: 'NO', note: '', updatedAt: now.toISOString() },
    ],
    'mock-event-2': [
        { id: 'r5', eventId: 'mock-event-2', userId: 'demo-user-2', status: 'GO', note: '', updatedAt: now.toISOString() },
    ],
    'mock-event-3': [
        { id: 'r6', eventId: 'mock-event-3', userId: 'demo-user-1', status: 'NO', note: '仕事', updatedAt: lastWeek.toISOString() },
        { id: 'r7', eventId: 'mock-event-3', userId: 'demo-user-2', status: 'GO', note: '', updatedAt: lastWeek.toISOString() },
    ],
};

export const MOCK_SETTLEMENTS: Settlement[] = [
    {
        id: 'mock-settle-1',
        circleId: 'mock-circle',
        eventId: 'mock-event-1',
        title: 'コート代',
        amount: 500,
        dueAt: nextWeek.toISOString(),
        targetUserIds: ['demo-user-1', 'demo-user-2', 'demo-user-3'],
        bankInfo: '三菱UFJ 1234567',
        paypayInfo: '@tanaka-tennis',
        createdAt: now.toISOString(),
    },
    {
        id: 'mock-settle-2',
        circleId: 'mock-circle',
        eventId: 'mock-event-3',
        title: 'ボール代',
        amount: 300,
        dueAt: lastWeek.toISOString(),
        targetUserIds: ['demo-user-1', 'demo-user-2'],
        bankInfo: '三菱UFJ 1234567',
        paypayInfo: '',
        createdAt: lastWeek.toISOString(),
    },
];

export const MOCK_MY_SETTLEMENTS: { unpaid: SettlementWithPayment[]; paid: SettlementWithPayment[] } = {
    unpaid: [
        {
            settlement: MOCK_SETTLEMENTS[0],
            payment: null,
        },
    ],
    paid: [
        {
            settlement: MOCK_SETTLEMENTS[1],
            payment: {
                id: 'mock-pay-1',
                settlementId: 'mock-settle-2',
                userId: 'demo-user-1',
                status: 'CONFIRMED',
                method: 'PAYPAY',
                note: '',
                reportedAt: lastWeek.toISOString(),
            },
        },
    ],
};

export const MOCK_CIRCLE: Circle = {
    id: 'mock-circle',
    name: 'CIRCLE',
    description: 'テニスサークル',
    logoUrl: '',
    createdAt: now.toISOString(),
};

export function isMockMode(): boolean {
    return process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
}

// --- MOCK DATA FROM NOA-RSVP BRANCH (Practices) ---

let categories: PracticeCategory[] = [
    { id: 'cat-1', circleId: 'circle-1', name: 'テニス', parentId: '', order: 1, createdBy: 'admin', createdAt: new Date().toISOString() },
    { id: 'cat-2', circleId: 'circle-1', name: 'シングルス', parentId: 'cat-1', order: 1, createdBy: 'admin', createdAt: new Date().toISOString() },
    { id: 'cat-3', circleId: 'circle-1', name: 'ダブルス', parentId: 'cat-1', order: 2, createdBy: 'admin', createdAt: new Date().toISOString() },
];

let seriesList: PracticeSeries[] = [
    { id: 'series-1', circleId: 'circle-1', categoryId: 'cat-2', name: '土曜シングルス練', dayOfWeek: 6, startTime: '14:00', location: '有明テニスの森', fee: 1500, createdBy: 'admin', createdAt: new Date().toISOString() },
    { id: 'series-2', circleId: 'circle-1', categoryId: 'cat-3', name: '平日ナイター', dayOfWeek: 3, startTime: '19:00', location: '日比谷公園', fee: 1000, createdBy: 'admin', createdAt: new Date().toISOString() },
];

let sessions: PracticeSession[] = [
    { id: 'sess-1', seriesId: 'series-1', date: '2024-04-06T14:00:00Z', cancelled: false, note: '', createdAt: new Date().toISOString() },
    { id: 'sess-2', seriesId: 'series-1', date: '2024-04-13T14:00:00Z', cancelled: false, note: '', createdAt: new Date().toISOString() },
    { id: 'sess-3', seriesId: 'series-1', date: '2024-04-20T14:00:00Z', cancelled: true, note: '雨天中止', createdAt: new Date().toISOString() },
    { id: 'sess-4', seriesId: 'series-1', date: '2024-04-27T14:00:00Z', cancelled: false, note: '', createdAt: new Date().toISOString() },
];

let rsvps: PracticeRSVP[] = [
    { id: 'rsvp-1', sessionId: 'sess-1', userId: CURRENT_USER_ID, status: 'GO', updatedAt: new Date().toISOString() },
    { id: 'rsvp-2', sessionId: 'sess-2', userId: CURRENT_USER_ID, status: 'NO', updatedAt: new Date().toISOString() },
];

// Combine implementation
export const mockApi = {
    // Circle
    // Circle
    getCircle: async (id: string): Promise<Circle> => MOCK_CIRCLE,
    getMembers: async (id: string): Promise<User[]> => MOCK_USERS,

    // Events
    getEvents: async () => MOCK_EVENTS,
    getEvent: async (eventId: string) => MOCK_EVENTS.find(e => e.id === eventId) as Event,
    createEvent: async () => ({} as Event),
    getEventsByUser: async () => MOCK_EVENTS, // Simplification
    updateEvent: async () => ({} as Event),
    deleteEvent: async () => { },

    // Announcement Edit/Delete
    updateAnnouncement: async (id: string, data: { title: string; body: string }) => {
        const ann = MOCK_ANNOUNCEMENTS.find(a => a.id === id);
        if (ann) {
            ann.title = data.title;
            ann.body = data.body;
        }
        return ann as Announcement;
    },
    deleteAnnouncement: async (id: string) => {
        MOCK_ANNOUNCEMENTS = MOCK_ANNOUNCEMENTS.filter(a => a.id !== id);
    },

    // Practice Series Edit/Delete
    updatePracticeSeries: async (id: string, data: CreatePracticeSeriesRequest) => {
        const s = seriesList.find(s => s.id === id);
        if (s) {
            s.name = data.name;
            s.dayOfWeek = data.dayOfWeek;
            s.startTime = data.startTime;
            s.location = data.location;
            s.fee = data.fee;
        }
        return s as PracticeSeries;
    },
    deletePracticeSeries: async (id: string) => {
        seriesList = seriesList.filter(s => s.id !== id);
    },

    // Announcements
    getAnnouncements: async () => MOCK_ANNOUNCEMENTS,
    getEventAnnouncements: async (eventId: string) => MOCK_ANNOUNCEMENTS.filter(a => a.eventId === eventId),
    createAnnouncement: async () => ({} as Announcement),
    getAnnouncement: async (id: string) => {
        const ann = MOCK_ANNOUNCEMENTS.find(a => a.id === id);
        return { announcement: ann, attendance: undefined, payments: [], isTarget: true } as AnnouncementDetail;
    },

    // RSVP (Event)
    submitRSVP: async (eventId: string, status: string, note?: string) => {
        const rsvp: RSVP = {
            id: `mock-rsvp-${Date.now()}`,
            eventId,
            userId: CURRENT_USER_ID,
            status: status as any,
            note: note || '',
            updatedAt: new Date().toISOString(),
        };
        // Update My RSVP
        MOCK_RSVPS[eventId] = rsvp;

        // Update All RSVPs list
        if (!MOCK_ALL_RSVPS[eventId]) MOCK_ALL_RSVPS[eventId] = [];
        const existingIdx = MOCK_ALL_RSVPS[eventId].findIndex(r => r.userId === CURRENT_USER_ID);
        if (existingIdx >= 0) {
            MOCK_ALL_RSVPS[eventId][existingIdx] = rsvp;
        } else {
            MOCK_ALL_RSVPS[eventId].push(rsvp);
        }

        return rsvp;
    },
    getMyRSVP: async (eventId: string) => MOCK_RSVPS[eventId] || null,
    getEventRSVPs: async (eventId: string) => MOCK_ALL_RSVPS[eventId] || [],

    // Settlements
    getEventSettlements: async (eventId: string) => MOCK_SETTLEMENTS.filter(s => s.eventId === eventId),
    getMySettlements: async () => MOCK_MY_SETTLEMENTS,
    createSettlement: async () => ({} as Settlement),
    reportPayment: async () => ({} as Payment),
    updateSettlement: async () => ({} as Settlement),

    // Chat
    chat: async () => ({ assistantMessage: 'モックモードです。APIに接続されていません。', references: [] }),

    // User
    updateUser: async () => ({} as User),
    getUser: async (id: string) => ({ id, name: 'Demo User', avatarUrl: '' }),

    // Practice API (Keep existing dynamic logic)
    getPracticeCategories: async (circleId: string) => [...categories],

    createPracticeCategory: async (data: any) => {
        const newCat = { ...data, id: `cat-${Date.now()}`, createdBy: CURRENT_USER_ID, createdAt: new Date().toISOString() };
        categories.push(newCat);
        return newCat;
    },

    deletePracticeCategory: async (id: string) => {
        categories = categories.filter(c => c.id !== id);
    },

    getPracticeSeries: async (circleId: string) => [...seriesList],

    createPracticeSeries: async (data: CreatePracticeSeriesRequest) => {
        const newSeries = { ...data, id: `series-${Date.now()}`, createdBy: CURRENT_USER_ID, createdAt: new Date().toISOString() };
        seriesList.push(newSeries);
        // Create 4 initial sessions
        const start = new Date();
        for (let i = 0; i < 4; i++) {
            sessions.push({
                id: `sess-${Date.now()}-${i}`,
                seriesId: newSeries.id,
                date: new Date(start.setDate(start.getDate() + 7)).toISOString(),
                cancelled: false,
                note: '',
                createdAt: new Date().toISOString(),
            });
        }
        return newSeries;
    },

    getPracticeSeriesDetail: async (id: string): Promise<PracticeSeriesDetail> => {
        const series = seriesList.find(s => s.id === id);
        if (!series) throw new Error('Series not found');
        const sess = sessions.filter(s => s.seriesId === id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const myRsvps = rsvps.filter(r => r.userId === CURRENT_USER_ID && sess.some(s => s.id === r.sessionId));
        return { series, sessions: sess, myRsvps };
    },

    createPracticeSession: async (seriesId: string, data: { date: string; note?: string }) => {
        const newSess = {
            id: `sess-${Date.now()}`,
            seriesId,
            date: data.date,
            cancelled: false,
            note: data.note || '',
            createdAt: new Date().toISOString(),
        };
        sessions.push(newSess);
        return newSess;
    },

    submitPracticeRSVP: async (sessionId: string, status: string) => {
        const existingInfo = rsvps.find(r => r.sessionId === sessionId && r.userId === CURRENT_USER_ID);
        let result: PracticeRSVP;
        if (existingInfo) {
            existingInfo.status = status as 'GO' | 'NO';
            existingInfo.updatedAt = new Date().toISOString();
            result = existingInfo;
        } else {
            result = {
                id: `rsvp-${Date.now()}`,
                sessionId,
                userId: CURRENT_USER_ID,
                status: status as 'GO' | 'NO',
                updatedAt: new Date().toISOString(),
            };
            rsvps.push(result);
        }
        return result;
    },

    bulkPracticeRSVP: async (seriesId: string, items: { sessionId: string; status: string }[]) => {
        items.forEach(item => {
            const existing = rsvps.find(r => r.sessionId === item.sessionId && r.userId === CURRENT_USER_ID);
            if (existing) {
                existing.status = item.status as 'GO' | 'NO';
                existing.updatedAt = new Date().toISOString();
            } else {
                rsvps.push({
                    id: `rsvp-${Date.now()}-${item.sessionId}`,
                    sessionId: item.sessionId,
                    userId: CURRENT_USER_ID,
                    status: item.status as 'GO' | 'NO',
                    updatedAt: new Date().toISOString(),
                });
            }
        });
        return { status: 'ok' };
    },

    createPracticeSettlements: async (seriesId: string, month: string) => {
        console.log(`Created settlements for series ${seriesId} month ${month}`);
        return { status: 'ok' };
    },

    getSessionRSVPs: async (sessionId: string) => {
        return rsvps.filter(r => r.sessionId === sessionId);
    },
};
