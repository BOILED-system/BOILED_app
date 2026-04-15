import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function toICalDate(dateStr: string) {
  return dateStr.replace(/-/g, '');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const genre = searchParams.get('genre'); // 例: Hiphop
  const generation = searchParams.get('generation'); // 例: 16

  // Fetch practice sessions from Go backend API
  const res = await fetch(`${API_BASE}/api/practice-sessions`);
  if (!res.ok) {
    return new NextResponse('Failed to fetch practice sessions', { status: 500 });
  }
  let sessions: any[] = await res.json();

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
