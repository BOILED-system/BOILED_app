// API Client for Circle App
import {
    Circle, Event, Announcement, RSVP, Settlement, Payment, SettlementWithPayment,
    ChatResponse, PracticeCategory, PracticeSeries, PracticeSession, PracticeRSVP, PracticeSeriesDetail,
    CreateEventRequest, CreateAnnouncementRequest, CreateSettlementRequest, CreatePracticeSeriesRequest,
    User, AnnouncementDetail, UpdateEventRequest, AnnouncementPayment
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://circle-api-za2cxc4exa-an.a.run.app';

// Default user ID for MVP
const DEFAULT_USER_ID = 'demo-user-1';

interface RequestOptions {
    method?: string;
    body?: unknown;
    userId?: string;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, userId } = options;

    // Get current user ID from localStorage if not provided
    const currentUserId = userId || (typeof window !== 'undefined' ? localStorage.getItem('current_user_id') : null) || DEFAULT_USER_ID;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-User-Id': currentUserId,
    };

    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API] ${method} ${endpoint} failed: ${response.status} ${errorText}`);
            throw new Error(`API error ${response.status}: ${errorText}`);
        }

        // Handle empty responses (204 No Content, etc.)
        const text = await response.text();
        if (!text || text === 'null') {
            return null as T;
        }

        return JSON.parse(text);
    } catch (error) {
        console.error(`[API] ${method} ${endpoint} error:`, error);
        throw error;
    }
}

// Log API base URL on load for debugging
if (typeof window !== 'undefined') {
    console.log('[API] Base URL:', API_BASE_URL);
}

// API functions
const realApi = {
    // Circle
    getCircle: (circleId: string) =>
        apiRequest<Circle>(`/circles/${circleId}`),

    getMembers: (circleId: string) =>
        apiRequest<User[]>(`/circles/${circleId}/members`),

    addMember: (circleId: string, userId: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER') =>
        apiRequest<void>(`/circles/${circleId}/members`, { method: 'POST', body: { userId, role } }),

    // Events
    getEvents: (circleId: string) =>
        apiRequest<Event[]>(`/circles/${circleId}/events`),

    getEvent: (eventId: string) =>
        apiRequest<Event>(`/events/${eventId}`),

    createEvent: (data: CreateEventRequest) =>
        apiRequest<Event>('/events', { method: 'POST', body: data }),

    getEventsByUser: async (circleId: string, userId: string): Promise<Event[]> => {
        const events = await api.getEvents(circleId);
        // This filtering should ideally happen on backend, but for MVP we do it here
        // We need to fetch RSVPs for each event to check status
        // Optimally: GET /circles/:id/events?userId=:userId&status=GO,LATE,EARLY

        const userEvents: Event[] = [];
        for (const event of events) {
            try {
                const rsvp = await apiRequest<RSVP | null>(`/events/${event.id}/rsvp/me`, { userId });
                if (rsvp && ['GO', 'LATE', 'EARLY'].includes(rsvp.status)) {
                    userEvents.push(event);
                }
            } catch (e) {
                // Ignore errors (e.g. no RSVP found)
            }
        }
        return userEvents;
    },

    // Announcements
    getAnnouncements: (circleId: string, limit = 10) =>
        apiRequest<Announcement[]>(`/circles/${circleId}/announcements?limit=${limit}`),

    getEventAnnouncements: (eventId: string) =>
        apiRequest<Announcement[]>(`/events/${eventId}/announcements`),

    createAnnouncement: (data: CreateAnnouncementRequest) =>
        apiRequest<Announcement>('/announcements', { method: 'POST', body: data }),

    getAnnouncement: (id: string, userId?: string) =>
        apiRequest<AnnouncementDetail>(`/announcements/${id}`, { userId }),

    // RSVP
    submitRSVP: (eventId: string, status: string, note?: string) =>
        apiRequest<RSVP>(`/events/${eventId}/rsvp`, { method: 'POST', body: { status, note } }),

    getMyRSVP: (eventId: string) =>
        apiRequest<RSVP | null>(`/events/${eventId}/rsvp/me`),

    getEventRSVPs: (eventId: string) =>
        apiRequest<RSVP[]>(`/events/${eventId}/rsvps`),

    // Settlements
    getEventSettlements: (eventId: string) =>
        apiRequest<Settlement[]>(`/events/${eventId}/settlements`),

    getMySettlements: () =>
        apiRequest<{ unpaid: SettlementWithPayment[]; paid: SettlementWithPayment[] }>('/settlements/me'),

    createSettlement: (data: CreateSettlementRequest) =>
        apiRequest<Settlement>('/settlements', { method: 'POST', body: data }),

    reportPayment: (settlementId: string, method: string, note?: string) =>
        apiRequest<Payment>(`/settlements/${settlementId}/report`, { method: 'POST', body: { method, note } }),

    // AI Chat
    chat: (circleId: string, message: string) =>
        apiRequest<ChatResponse>('/ai/chat', { method: 'POST', body: { circleId, message } }),

    // User
    updateUser: (id: string, name: string, avatarUrl: string) =>
        apiRequest<User>('/users', { method: 'POST', body: { id, name, avatarUrl } }),

    getUser: (id: string) =>
        apiRequest<User>(`/users/${id}`),

    // Event Edit/Delete
    updateEvent: (eventId: string, data: UpdateEventRequest) =>
        apiRequest<Event>(`/events/${eventId}`, { method: 'PUT', body: data }),

    deleteEvent: (eventId: string) =>
        apiRequest<void>(`/events/${eventId}`, { method: 'DELETE' }),

    // Settlement Edit
    updateSettlement: (settlementId: string, data: { title: string; amount: number; dueAt: string }) =>
        apiRequest<Settlement>(`/settlements/${settlementId}`, { method: 'PUT', body: data }),

    // Practice API
    getPracticeCategories: (circleId: string) =>
        apiRequest<PracticeCategory[]>(`/circles/${circleId}/practice-categories`),

    createPracticeCategory: (data: { circleId: string; name: string; parentId?: string; order?: number }) =>
        apiRequest<PracticeCategory>('/practice-categories', { method: 'POST', body: data }),

    deletePracticeCategory: (id: string) =>
        apiRequest<void>(`/practice-categories/${id}`, { method: 'DELETE' }),

    getPracticeSeries: (circleId: string) =>
        apiRequest<PracticeSeries[]>(`/circles/${circleId}/practice-series`),

    createPracticeSeries: (data: CreatePracticeSeriesRequest) =>
        apiRequest<PracticeSeries>('/practice-series', { method: 'POST', body: data }),

    getPracticeSeriesDetail: (id: string) =>
        apiRequest<PracticeSeriesDetail>(`/practice-series/${id}`),

    createPracticeSession: (seriesId: string, data: { date: string; note?: string }) =>
        apiRequest<PracticeSession>(`/practice-series/${seriesId}/sessions`, { method: 'POST', body: data }),

    submitPracticeRSVP: (sessionId: string, status: string) =>
        apiRequest<PracticeRSVP>(`/practice-sessions/${sessionId}/rsvp`, { method: 'POST', body: { status } }),

    bulkPracticeRSVP: (seriesId: string, rsvps: { sessionId: string; status: string }[]) =>
        apiRequest<{ status: string }>(`/practice-series/${seriesId}/bulk-rsvp`, { method: 'POST', body: { rsvps } }),

    createPracticeSettlements: (seriesId: string, month: string) =>
        apiRequest<{ status: string }>(`/practice-series/${seriesId}/settlements`, { method: 'POST', body: { month } }),

    getSessionRSVPs: (sessionId: string) =>
        apiRequest<PracticeRSVP[]>(`/practice-sessions/${sessionId}/rsvps`),

    // Announcement Edit/Delete
    updateAnnouncement: (id: string, data: { title: string; body: string }) =>
        apiRequest<Announcement>(`/announcements/${id}`, { method: 'PUT', body: data }),

    deleteAnnouncement: (id: string) =>
        apiRequest<void>(`/announcements/${id}`, { method: 'DELETE' }),

    // Practice Series Edit/Delete
    updatePracticeSeries: (id: string, data: CreatePracticeSeriesRequest) =>
        apiRequest<PracticeSeries>(`/practice-series/${id}`, { method: 'PUT', body: data }),

    deletePracticeSeries: (id: string) =>
        apiRequest<void>(`/practice-series/${id}`, { method: 'DELETE' }),
};

// Always use realApi - mock responses are handled inside apiRequest for GET only
export const api = realApi;

export * from './types';

