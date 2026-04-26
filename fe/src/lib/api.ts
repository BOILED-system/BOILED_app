// API client for the Go backend.
// Replaces direct Firestore access with HTTP calls.

import type {
  FEUser,
  PracticeSession,
  PracticeRSVP,
  NumberRoster,
  BoiledEvent,
  TimetableRow,
  Settlement,
  PaymentRecord,
  PaymentMethod,
  TargetType,
  CashCollector,
} from './types';

// Re-export all types so pages can import everything from '@/lib/api'
export type {
  FEUser,
  PracticeSession,
  PracticeRSVP,
  NumberRoster,
  BoiledEvent,
  TimetableRow,
  Settlement,
  PaymentRecord,
  PaymentMethod,
  PaymentStatus,
  TargetType,
  CashCollector,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return res.json();
}

async function apiPut(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
}

// ===== Users =====

export async function getUser(memberId: string): Promise<FEUser | null> {
  try {
    return await apiGet<FEUser>(`/api/users/${memberId}`);
  } catch {
    return null;
  }
}

export async function getAllUsers(): Promise<FEUser[]> {
  return apiGet<FEUser[]>('/api/users');
}

// ===== Practice Sessions =====

export async function getPracticeSessions(): Promise<PracticeSession[]> {
  return apiGet<PracticeSession[]>('/api/practice-sessions');
}

export async function getPracticeSession(id: string): Promise<PracticeSession | null> {
  try {
    return await apiGet<PracticeSession>(`/api/practice-sessions/${id}`);
  } catch {
    return null;
  }
}

export async function createPracticeSession(data: {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  note: string;
  type: 'regular' | 'event' | 'team';
  targetType: TargetType;
  targetGenres: string[];
  targetGenerations: number[];
  targetNumberId: string;
  targetMemberIds: string[];
  additionalMemberIds: string[];
  excludedMemberIds: string[];
  createdBy?: string;
  createdByName?: string;
}): Promise<string> {
  const result = await apiPost<PracticeSession>('/api/practice-sessions', data);
  return result.id;
}

export async function updatePracticeSession(
  id: string,
  data: Partial<Omit<PracticeSession, 'id' | 'createdAt'>>,
): Promise<void> {
  await apiPut(`/api/practice-sessions/${id}`, data);
}

export async function deletePracticeSession(id: string): Promise<void> {
  await apiDelete(`/api/practice-sessions/${id}`);
}

// ===== Practice RSVPs =====

export async function submitRSVP(data: {
  sessionId: string;
  memberId: string;
  name: string;
  genre: string;
  generation: number;
  status: 'GO' | 'NO' | 'LATE' | 'EARLY';
  note: string;
}): Promise<void> {
  const { sessionId, ...rsvpData } = data;
  await apiPost(`/api/practice-sessions/${sessionId}/rsvps`, rsvpData);
}

export async function getMyRSVP(sessionId: string, memberId: string): Promise<PracticeRSVP | null> {
  try {
    return await apiGet<PracticeRSVP | null>(`/api/practice-sessions/${sessionId}/rsvps/${memberId}`);
  } catch {
    return null;
  }
}

export async function getMyRSVPs(memberId: string): Promise<Record<string, PracticeRSVP>> {
  return apiGet<Record<string, PracticeRSVP>>(`/api/members/${memberId}/rsvps`);
}

export async function getSessionRSVPs(sessionId: string): Promise<PracticeRSVP[]> {
  return apiGet<PracticeRSVP[]>(`/api/practice-sessions/${sessionId}/rsvps`);
}

// ===== Number Rosters =====

export async function getNumberRosters(): Promise<NumberRoster[]> {
  return apiGet<NumberRoster[]>('/api/number-rosters');
}

export async function createNumberRoster(data: {
  name: string;
  memberIds: string[];
}): Promise<string> {
  const result = await apiPost<NumberRoster>('/api/number-rosters', data);
  return result.id;
}

export async function updateNumberRoster(
  id: string,
  data: { name?: string; memberIds?: string[] },
): Promise<void> {
  await apiPut(`/api/number-rosters/${id}`, data);
}

export async function deleteNumberRoster(id: string): Promise<void> {
  await apiDelete(`/api/number-rosters/${id}`);
}

// ===== Events =====

export async function getEvents(): Promise<BoiledEvent[]> {
  return apiGet<BoiledEvent[]>('/api/events');
}

export async function getEvent(id: string): Promise<BoiledEvent | null> {
  try {
    return await apiGet<BoiledEvent>(`/api/events/${id}`);
  } catch {
    return null;
  }
}

export async function createEvent(data: {
  title: string;
  date: string;
  endDate?: string;
  location: string;
  meetingTime: string;
  meetingLocation: string;
  timetable: TimetableRow[];
  note: string;
  createdBy?: string;
  createdByName?: string;
}): Promise<string> {
  const result = await apiPost<BoiledEvent>('/api/events', data);
  return result.id;
}

export async function updateEvent(
  id: string,
  data: Partial<Omit<BoiledEvent, 'id' | 'createdAt'>>,
): Promise<void> {
  await apiPut(`/api/events/${id}`, data);
}

export async function deleteEvent(id: string): Promise<void> {
  await apiDelete(`/api/events/${id}`);
}

// ===== Settlements =====

export async function getSettlements(): Promise<Settlement[]> {
  return apiGet<Settlement[]>('/api/settlements');
}

export async function createSettlement(
  data: Omit<Settlement, 'id' | 'createdAt'>,
  payments: { memberId: string; name: string }[],
): Promise<string> {
  const result = await apiPost<Settlement>('/api/settlements', { ...data, payments });
  return result.id;
}

export async function getSettlementPayments(settlementId: string): Promise<PaymentRecord[]> {
  return apiGet<PaymentRecord[]>(`/api/settlements/${settlementId}/payments`);
}

export async function reportPayment(
  settlementId: string,
  memberId: string,
  method: PaymentMethod,
  requiresConfirmation: boolean,
  cashCollectorId?: string,
  cashCollectorName?: string,
): Promise<void> {
  await apiPost(`/api/settlements/${settlementId}/report-payment`, {
    memberId,
    method,
    requiresConfirmation,
    cashCollectorId,
    cashCollectorName,
  });
}

export async function updatePaymentStatus(
  settlementId: string,
  memberId: string,
  status: string,
): Promise<void> {
  await apiPut(`/api/settlements/${settlementId}/payment-status`, { memberId, status });
}

export async function updateSettlement(
  id: string,
  data: Partial<Pick<Settlement, 'title' | 'amount' | 'dueDate' | 'note' | 'paymentMethods' | 'bankInfo' | 'paypayInfo' | 'cashCollectors' | 'requiresConfirmation' | 'resolvedMemberIds'>>,
): Promise<void> {
  await apiPut(`/api/settlements/${id}`, data);
}

export async function deleteSettlement(settlementId: string): Promise<void> {
  await apiDelete(`/api/settlements/${settlementId}`);
}

export async function addPaymentRecord(settlementId: string, memberId: string, name: string): Promise<void> {
  await apiPost(`/api/settlements/${settlementId}/payments`, { memberId, name });
}

// ===== Utility functions (moved from firestore.ts, now pure logic) =====

export function isSessionForMember(
  session: PracticeSession,
  memberId: string,
  genre: string,
  generation: number,
  rosters: NumberRoster[],
): boolean {
  if (session.excludedMemberIds?.includes(memberId)) return false;
  if (session.additionalMemberIds?.includes(memberId)) return true;

  const tt: TargetType = session.targetType || 'genre_generation';
  if (tt === 'genre_generation') {
    if (!session.targetGenres?.length && !session.targetGenerations?.length) return false;
    const genreOk = !session.targetGenres?.length || session.targetGenres.includes(genre);
    const genOk = !session.targetGenerations?.length || session.targetGenerations.includes(generation);
    return genreOk && genOk;
  }
  if (tt === 'number') {
    const roster = rosters.find(r => r.id === session.targetNumberId);
    return roster?.memberIds.includes(memberId) ?? false;
  }
  if (tt === 'individual') {
    return session.targetMemberIds?.includes(memberId) ?? false;
  }
  return false;
}

// ===== Composite functions (used by profile page) =====

export async function getUpcomingUnregisteredSessions(memberId: string): Promise<PracticeSession[]> {
  const [sessions, rosters, user] = await Promise.all([
    getPracticeSessions(),
    getNumberRosters(),
    getUser(memberId),
  ]);

  const genre = user?.genre || '';
  const generation = user?.generation || 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcoming = sessions.filter(s => {
    if (!isSessionForMember(s, memberId, genre, generation, rosters)) return false;
    const d = new Date(s.date);
    return d >= today && d <= nextWeek;
  });

  const myRSVPs = await getMyRSVPs(memberId);
  return upcoming.filter(session => !myRSVPs[session.id]);
}

export async function getMyUnpaidSettlements(memberId: string): Promise<Settlement[]> {
  const settlements = await getSettlements();
  const mine = settlements.filter(s => s.resolvedMemberIds?.includes(memberId));
  const unpaid: Settlement[] = [];
  await Promise.all(
    mine.map(async s => {
      const payments = await getSettlementPayments(s.id);
      const rec = payments.find(p => p.memberId === memberId);
      if (!rec || rec.status === 'unpaid') unpaid.push(s);
    })
  );
  return unpaid.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

// ===== LINE Messages =====

export interface LineMessage {
  id: string;
  lineMessageId: string;
  userId: string;
  groupId: string;
  text: string;
  linkedEventId?: string;
  createdAt: any;
}

export async function getLineMessages(eventId?: string): Promise<LineMessage[]> {
  const query = eventId ? `?eventId=${eventId}` : '';
  return apiGet<LineMessage[]>(`/api/line/messages${query}`);
}

export async function linkLineMessageToEvent(id: string, eventId: string): Promise<void> {
  await apiPut(`/api/line/messages/${id}/link`, { eventId });
}
