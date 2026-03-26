import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";

// ===== ユーザー =====

export async function getUser(memberId: string) {
  const ref = doc(db, "users", memberId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

export async function saveUser(
  memberId: string,
  data: {
    name: string;
    role: "admin" | "member";
  },
) {
  const ref = doc(db, "users", memberId);
  await setDoc(
    ref,
    {
      memberId,
      ...data,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

export async function getAllUsers() {
  const ref = collection(db, "users");
  const snap = await getDocs(ref);
  return snap.docs.map((d) => d.data());
}

// ===== 精算 =====

export type PaymentMethod = 'bank' | 'paypay' | 'cash';

export interface CashCollector {
  memberId: string;
  name: string;
  genre?: string;
  generation?: number;
}

export type PaymentStatus = 'unpaid' | 'reported' | 'confirmed';

export interface Settlement {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  note: string;
  createdBy: string;
  createdByName: string;
  targetType: TargetType;
  targetGenres: string[];
  targetGenerations: number[];
  targetNumberId: string;
  targetMemberIds: string[];
  resolvedMemberIds: string[];
  // 支払い方法の設定
  paymentMethods: PaymentMethod[];
  bankInfo: string;
  paypayInfo: string;
  cashCollectors: CashCollector[];
  // 確認フロー設定
  requiresConfirmation: boolean; // true=作成者確認必須, false=報告即完了
  createdAt: any;
}

export interface PaymentRecord {
  memberId: string;
  name: string;
  status: PaymentStatus;
  reportedMethod?: PaymentMethod;
  cashCollectorId?: string;
  cashCollectorName?: string;
  reportedAt?: any;
  confirmedAt: any;
}

export async function createSettlement(
  data: Omit<Settlement, 'id' | 'createdAt'>,
  payments: { memberId: string; name: string }[],
): Promise<string> {
  const ref = doc(collection(db, 'settlements'));
  await setDoc(ref, { id: ref.id, ...data, createdAt: new Date() });
  await Promise.all(
    payments.map(p =>
      setDoc(doc(db, 'settlements', ref.id, 'payments', p.memberId), {
        memberId: p.memberId,
        name: p.name,
        status: 'unpaid',
        confirmedAt: null,
      })
    )
  );
  return ref.id;
}

export async function getSettlements(): Promise<Settlement[]> {
  const snap = await getDocs(collection(db, 'settlements'));
  return snap.docs.map(d => d.data() as Settlement);
}

export async function getSettlementPayments(settlementId: string): Promise<PaymentRecord[]> {
  const snap = await getDocs(collection(db, 'settlements', settlementId, 'payments'));
  return snap.docs.map(d => d.data() as PaymentRecord);
}

// メンバーが支払いを報告する
// requiresConfirmation=true → 'reported'（作成者確認待ち）
// requiresConfirmation=false → 'confirmed'（即完了）
export async function reportPayment(
  settlementId: string,
  memberId: string,
  method: PaymentMethod,
  requiresConfirmation: boolean,
  cashCollectorId?: string,
  cashCollectorName?: string,
): Promise<void> {
  const status: PaymentStatus = requiresConfirmation ? 'reported' : 'confirmed';
  await setDoc(
    doc(db, 'settlements', settlementId, 'payments', memberId),
    {
      status,
      reportedMethod: method,
      ...(cashCollectorId ? { cashCollectorId, cashCollectorName } : {}),
      reportedAt: new Date(),
      confirmedAt: status === 'confirmed' ? new Date() : null,
    },
    { merge: true },
  );
}

// 作成者が入金を確認 / 取り消す
export async function updatePaymentStatus(
  settlementId: string,
  memberId: string,
  status: PaymentStatus,
): Promise<void> {
  await setDoc(
    doc(db, 'settlements', settlementId, 'payments', memberId),
    { status, confirmedAt: status === 'confirmed' ? new Date() : null },
    { merge: true },
  );
}

export async function updateSettlement(
  id: string,
  data: Partial<Pick<Settlement, 'title' | 'amount' | 'dueDate' | 'note' | 'paymentMethods' | 'bankInfo' | 'paypayInfo' | 'cashCollectors' | 'requiresConfirmation'>>,
): Promise<void> {
  await setDoc(doc(db, 'settlements', id), { ...data, updatedAt: new Date() }, { merge: true });
}

export async function deleteSettlement(settlementId: string): Promise<void> {
  // payments サブコレクションは Firestore コンソールで別途削除（クライアントSDKでは再帰削除不可）
  await deleteDoc(doc(db, 'settlements', settlementId));
}

// ===== イベント =====

export interface TimetableRow {
  time: string;
  description: string;
}

export interface BoiledEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  meetingTime: string;
  meetingLocation: string;
  timetable: TimetableRow[];
  note: string;
  imageUrls: string[];
  createdAt: any;
}

export async function getEvent(id: string): Promise<BoiledEvent | null> {
  const ref = doc(db, 'events', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as BoiledEvent;
}

export async function createEvent(data: {
  title: string;
  date: string;
  location: string;
  meetingTime: string;
  meetingLocation: string;
  timetable: TimetableRow[];
  note: string;
}): Promise<string> {
  const ref = doc(collection(db, 'events'));
  await setDoc(ref, { id: ref.id, ...data, createdAt: new Date() });
  return ref.id;
}

export async function getEvents(): Promise<BoiledEvent[]> {
  const ref = collection(db, 'events');
  const snap = await getDocs(ref);
  return snap.docs.map(d => d.data() as BoiledEvent);
}

export async function updateEvent(id: string, data: Partial<Omit<BoiledEvent, 'id' | 'createdAt'>>): Promise<void> {
  await setDoc(doc(db, 'events', id), { ...data, updatedAt: new Date() }, { merge: true });
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteDoc(doc(db, 'events', id));
}

// ===== ナンバー名簿 =====
// イベントのジャンルナンバーごとの参加者リスト

export interface NumberRoster {
  id: string;
  name: string;       // 例: "Hiphopナンバー"
  eventName?: string; // 非推奨・省略可
  memberIds: string[];
  createdAt: any;
}

export async function createNumberRoster(data: {
  name: string;
  memberIds: string[];
}): Promise<string> {
  const ref = doc(collection(db, 'numberRosters'));
  await setDoc(ref, { id: ref.id, ...data, createdAt: new Date() });
  return ref.id;
}

export async function getNumberRosters(): Promise<NumberRoster[]> {
  const ref = collection(db, 'numberRosters');
  const snap = await getDocs(ref);
  return snap.docs.map(d => d.data() as NumberRoster);
}

export async function updateNumberRoster(id: string, data: { name?: string; memberIds?: string[] }): Promise<void> {
  const ref = doc(db, 'numberRosters', id);
  await setDoc(ref, { ...data, updatedAt: new Date() }, { merge: true });
}

export async function deleteNumberRoster(id: string): Promise<void> {
  await deleteDoc(doc(db, 'numberRosters', id));
}

// ===== 練習セッション =====

export type TargetType = 'genre_generation' | 'number' | 'individual';

export interface PracticeSession {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  note: string;
  type: 'regular' | 'event';
  // 対象者の指定方法
  targetType: TargetType;
  // targetType === 'genre_generation'
  targetGenres: string[];
  targetGenerations: number[];
  // targetType === 'number'
  targetNumberId: string;
  // targetType === 'individual'
  targetMemberIds: string[];
  createdAt: any;
}

export interface PracticeRSVP {
  memberId: string;
  name: string;
  genre: string;
  generation: number;
  status: 'GO' | 'NO' | 'LATE' | 'EARLY';
  note: string;
  updatedAt: any;
}

export async function createPracticeSession(data: {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  note: string;
  type: 'regular' | 'event';
  targetType: TargetType;
  targetGenres: string[];
  targetGenerations: number[];
  targetNumberId: string;
  targetMemberIds: string[];
}) {
  const ref = doc(collection(db, 'practiceSessions'));
  await setDoc(ref, {
    id: ref.id,
    ...data,
    createdAt: new Date(),
  });
  return ref.id;
}

export async function getPracticeSessions(): Promise<PracticeSession[]> {
  const ref = collection(db, 'practiceSessions');
  const snap = await getDocs(ref);
  return snap.docs.map(d => d.data() as PracticeSession);
}

export async function updatePracticeSession(
  id: string,
  data: Partial<Omit<PracticeSession, 'id' | 'createdAt'>>,
): Promise<void> {
  await setDoc(doc(db, 'practiceSessions', id), { ...data, updatedAt: new Date() }, { merge: true });
}

export async function deletePracticeSession(id: string): Promise<void> {
  await deleteDoc(doc(db, 'practiceSessions', id));
}

export async function getPracticeSession(id: string): Promise<PracticeSession | null> {
  const ref = doc(db, 'practiceSessions', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as PracticeSession;
}

// 練習セッションが特定ユーザーの対象かを判定
export function isSessionForMember(
  session: PracticeSession,
  memberId: string,
  genre: string,
  generation: number,
  rosters: NumberRoster[],
): boolean {
  const tt: TargetType = session.targetType || 'genre_generation';

  if (tt === 'genre_generation') {
    // 両方未選択 = 対象なし
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
  return true;
}

// 出欠登録
export async function submitRSVP(data: {
  sessionId: string;
  memberId: string;
  name: string;
  genre: string;
  generation: number;
  status: 'GO' | 'NO' | 'LATE' | 'EARLY';
  note: string;
}) {
  const { sessionId, ...rsvpData } = data;
  const ref = doc(db, 'practiceSessions', sessionId, 'rsvps', data.memberId);
  await setDoc(ref, {
    ...rsvpData,
    updatedAt: new Date(),
  });
}

export async function getMyRSVP(sessionId: string, memberId: string): Promise<PracticeRSVP | null> {
  const ref = doc(db, 'practiceSessions', sessionId, 'rsvps', memberId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as PracticeRSVP;
}

export async function getSessionRSVPs(sessionId: string): Promise<PracticeRSVP[]> {
  const ref = collection(db, 'practiceSessions', sessionId, 'rsvps');
  const snap = await getDocs(ref);
  return snap.docs.map(d => d.data() as PracticeRSVP);
}

// 直近1週間の出欠未登録練習を取得
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

  const results = await Promise.all(
    upcoming.map(async session => {
      const rsvp = await getMyRSVP(session.id, memberId);
      return rsvp ? null : session;
    })
  );

  return results.filter((s): s is PracticeSession => s !== null);
}

// ホーム用：自分宛の未払い精算を取得
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
