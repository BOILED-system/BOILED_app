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

// ===== Client-side GET cache =====
// Persists GET responses in sessionStorage with a TTL so repeated page navigations
// don't re-hit the API (and Firestore behind it). Writes invalidate by prefix.

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_PREFIX = 'apiCache:';
const inflight = new Map<string, Promise<unknown>>();

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

function cacheKey(path: string): string {
  return CACHE_PREFIX + path;
}

function readCache<T>(path: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(cacheKey(path));
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(cacheKey(path));
      return undefined;
    }
    return entry.value;
  } catch {
    return undefined;
  }
}

function writeCache<T>(path: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    sessionStorage.setItem(cacheKey(path), JSON.stringify(entry));
  } catch {
    // sessionStorage quota / disabled — silently skip
  }
}

// Invalidate any cached GET whose path starts with one of the given prefixes.
function invalidate(...prefixes: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith(CACHE_PREFIX)) continue;
      const path = key.slice(CACHE_PREFIX.length);
      if (prefixes.some(p => path.startsWith(p))) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

async function apiGet<T>(path: string, options?: { noCache?: boolean }): Promise<T> {
  if (!options?.noCache) {
    const cached = readCache<T>(path);
    if (cached !== undefined) return cached;
    const pending = inflight.get(path);
    if (pending) return pending as Promise<T>;
  }
  const p = (async () => {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error ${res.status}: ${body}`);
    }
    const data = (await res.json()) as T;
    if (!options?.noCache) writeCache(path, data);
    return data;
  })();
  if (!options?.noCache) {
    inflight.set(path, p);
    p.finally(() => inflight.delete(path));
  }
  return p;
}

// Map a write path to the GET cache prefixes it invalidates.
function invalidationPrefixesFor(path: string): string[] {
  if (path.startsWith('/api/users')) return ['/api/users'];
  if (path.startsWith('/api/practice-sessions')) {
    return ['/api/practice-sessions', '/api/members/'];
  }
  if (path.startsWith('/api/members/') && path.endsWith('/rsvps')) {
    return ['/api/members/', '/api/practice-sessions'];
  }
  if (path.startsWith('/api/number-rosters')) return ['/api/number-rosters'];
  if (path.startsWith('/api/events')) return ['/api/events'];
  if (path.startsWith('/api/settlements')) return ['/api/settlements'];
  if (path.startsWith('/api/line/')) return ['/api/line/'];
  return [];
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
  invalidate(...invalidationPrefixesFor(path));
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
  invalidate(...invalidationPrefixesFor(path));
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  invalidate(...invalidationPrefixesFor(path));
}

// Clear all cached GETs. Exported so pages can force-refresh after major mutations.
export function clearApiCache(): void {
  if (typeof window === 'undefined') return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // ignore
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

export async function createUser(data: {
  memberId: string;
  name: string;
  furigana?: string;
  role: 'admin' | 'member';
  genre: string;
  generation: number;
}): Promise<FEUser> {
  return apiPost<FEUser>('/api/users', data);
}

export async function updateUser(data: {
  memberId: string;
  name: string;
  furigana?: string;
  role: 'admin' | 'member';
  genre: string;
  generation: number;
}): Promise<FEUser> {
  const { memberId, ...body } = data;
  const res = await fetch(`${API_BASE}/api/users/${memberId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  invalidate('/api/users');
  return res.json();
}

export async function deleteUser(memberId: string): Promise<void> {
  return apiDelete(`/api/users/${memberId}`);
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
  if (genre === 'Admin') return true;
  if (session.additionalMemberIds?.includes(memberId)) return true;

  const tt: TargetType = session.targetType || 'genre_generation';
  if (tt === 'genre_generation') {
    if (!session.targetGenres?.length && !session.targetGenerations?.length) return false;
    const genreOk = !session.targetGenres?.length || session.targetGenres.includes(genre);
    const genOk = generation === 0 || !session.targetGenerations?.length || session.targetGenerations.includes(generation);
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
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const upcoming = sessions.filter(s => {
    if (!isSessionForMember(s, memberId, genre, generation, rosters)) return false;
    const d = new Date(s.date);
    return d >= today && d <= nextMonth;
  });

  const myRSVPs = await getMyRSVPs(memberId);
  return upcoming
    .filter(session => !myRSVPs[session.id])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
