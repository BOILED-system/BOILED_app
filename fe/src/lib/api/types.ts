// Request Types
export interface CreateEventRequest {
    circleId: string;
    title: string;
    startAt: string;
    location?: string;
    coverImageUrl?: string;
    rsvpTargetUserIds: string[];
    createdBy: string;
}

export interface UpdateEventRequest {
    title: string;
    startAt: string;
    location?: string;
    coverImageUrl?: string;
    rsvpTargetUserIds: string[];
}

export interface CreateAnnouncementRequest {
    circleId: string;
    eventId: string;
    title: string;
    body: string;
    createdBy: string;
}

export interface CreateSettlementRequest {
    circleId: string;
    eventId: string;
    title: string;
    amount: number;
    dueAt: string;
    targetUserIds: string[];
    bankInfo?: string;
    paypayInfo?: string;
}

export interface CreatePracticeSeriesRequest {
    circleId: string;
    categoryId: string;
    name: string;
    dayOfWeek: number;
    startTime: string;
    location: string;
    fee: number;
}

// Types
export interface User {
    id: string;
    name: string;
    avatarUrl: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Circle {
    id: string;
    name: string;
    description: string;
    logoUrl: string;
    createdAt: string;
}

export interface Event {
    id: string;
    circleId: string;
    title: string;
    startAt: string;
    location: string;
    coverImageUrl: string;
    rsvpTargetUserIds: string[];
    createdBy: string;
    createdAt: string;
}

export interface Announcement {
    id: string;
    circleId: string;
    eventId: string;
    title: string;
    body: string;
    imageUrl?: string;
    targetUserIds?: string[];
    createdBy: string;
    createdAt: string;
}

export interface AnnouncementDetail {
    announcement: Announcement;
    attendance?: RSVP;
    payments?: AnnouncementPayment[];
    isTarget: boolean;
}

export interface AnnouncementPayment {
    id: string;
    announcementId: string;
    userId: string;
    amount: number;
    description: string;
    isPaid: boolean;
    bankInfo: string;
    paypayInfo: string;
}

export interface RSVP {
    id: string;
    eventId: string;
    userId: string;
    status: 'GO' | 'NO' | 'LATE' | 'EARLY';
    note: string;
    updatedAt: string;
}

export interface Settlement {
    id: string;
    circleId: string;
    eventId: string;
    title: string;
    amount: number;
    dueAt: string;
    targetUserIds: string[];
    bankInfo: string;
    paypayInfo: string;
    createdAt: string;
}

export interface Payment {
    id: string;
    settlementId: string;
    userId: string;
    status: 'UNPAID' | 'PAID_REPORTED' | 'CONFIRMED';
    method: 'BANK' | 'PAYPAY';
    note: string;
    reportedAt: string;
}

export interface SettlementWithPayment {
    settlement: Settlement;
    payment: Payment | null;
}

export interface ChatReference {
    title: string;
    eventId?: string;
}

export interface ChatResponse {
    assistantMessage: string;
    references: ChatReference[];
}

// Practice Types
export interface PracticeCategory {
    id: string;
    circleId: string;
    name: string;
    parentId: string;
    order: number;
    createdBy: string;
    createdAt: string;
}

export interface PracticeSeries {
    id: string;
    circleId: string;
    categoryId: string;
    name: string;
    dayOfWeek: number;
    startTime: string;
    location: string;
    fee: number;
    createdBy: string;
    createdAt: string;
}

export interface PracticeSession {
    id: string;
    seriesId: string;
    date: string;
    cancelled: boolean;
    note: string;
    createdAt: string;
}

export interface PracticeRSVP {
    id: string;
    sessionId: string;
    userId: string;
    status: 'GO' | 'NO';
    updatedAt: string;
}

export interface PracticeSeriesDetail {
    series: PracticeSeries;
    sessions: PracticeSession[];
    myRsvps: PracticeRSVP[];
}
