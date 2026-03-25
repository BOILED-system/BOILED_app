import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

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

// ===== 練習セッション =====

export interface PracticeSession {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  note: string;
  type: 'regular' | 'event';
  targetGenerations: number[];
  targetGenres: string[];
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
  targetGenerations: number[];
  targetGenres: string[];
  note: string;
  type: 'regular' | 'event';
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

export async function getPracticeSession(id: string): Promise<PracticeSession | null> {
  const ref = doc(db, 'practiceSessions', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as PracticeSession;
}

// 出欠登録（Spreadsheet出力対応: name/genre/generation/status/note/updatedAt を保存）
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
  const sessions = await getPracticeSessions();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcoming = sessions.filter(s => {
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
