import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAzngGng0ZJ4VZyM7l9dc9Jp0T1zP2P6LM",
  authDomain: "boiled-app-bb43e.firebaseapp.com",
  projectId: "boiled-app-bb43e",
  storageBucket: "boiled-app-bb43e.firebasestorage.app",
  messagingSenderId: "742645927524",
  appId: "1:742645927524:web:d2c9d30742b400e96c9971",
};

function toICalDate(dateStr: string) {
  return dateStr.replace(/-/g, '');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const genre = searchParams.get('genre'); // 例: Hiphop
  const generation = searchParams.get('generation'); // 例: 16

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, 'practiceSessions'));
  let sessions = snap.docs.map(d => d.data());

  // ジャンルでフィルタ
  if (genre) {
    sessions = sessions.filter(s =>
      !s.targetGenres?.length || s.targetGenres.includes(genre)
    );
  }
  // 期でフィルタ
  if (generation) {
    const gen = parseInt(generation);
    sessions = sessions.filter(s =>
      !s.targetGenerations?.length || s.targetGenerations.includes(gen)
    );
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BOILED//BOILED App//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:BOILED練習${genre ? ` - ${genre}` : ''}`,
    'X-WR-TIMEZONE:Asia/Tokyo',
  ];

  for (const s of sessions) {
    const dateStr = toICalDate(s.date);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${s.id}@boiled-app`);
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(`DTEND;VALUE=DATE:${dateStr}`);
    lines.push(`SUMMARY:${s.name}`);
    lines.push(`LOCATION:${s.location || ''}`);
    lines.push(`DESCRIPTION:${s.note || ''}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="boiled.ics"',
    },
  });
}
