import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';

const firebaseConfig = {
  apiKey: "AIzaSyAzngGng0ZJ4VZyM7l9dc9Jp0T1zP2P6LM",
  authDomain: "boiled-app-bb43e.firebaseapp.com",
  projectId: "boiled-app-bb43e",
  storageBucket: "boiled-app-bb43e.firebasestorage.app",
  messagingSenderId: "742645927524",
  appId: "1:742645927524:web:d2c9d30742b400e96c9971",
};

// D列〜J列のジャンル対応
const GENRE_COLS = {
  3: 'Lock',
  4: 'Hiphop',
  5: 'Pop',
  6: 'House',
  7: 'Break',
  8: 'Girls',
  9: 'Waack',
};

// C列の値がイベント練かどうか判定
function detectType(period) {
  if (period === '正規練') return 'regular';
  if (period && period !== 'チーム練' && period !== '') return 'event';
  return null; // チーム練・空欄はスキップ
}

// "19" → "19:00"、"17:45" → "17:45"
function formatTime(t) {
  t = t.trim();
  return t.includes(':') ? t : `${t}:00`;
}

// "マイスタ4B 19-21" → { location: "マイスタ4B", startTime: "19:00", endTime: "21:00" }
function parseCell(cell) {
  cell = cell.trim();
  if (!cell) return null;
  const parts = cell.split(' ');
  const last = parts[parts.length - 1];
  const m = last.match(/^(\d{1,2}(?::\d{2})?)-(\d{1,2}(?::\d{2})?)$/);
  if (m) {
    return {
      location: parts.slice(0, -1).join(' '),
      startTime: formatTime(m[1]),
      endTime: formatTime(m[2]),
    };
  }
  // 時間パターンが見つからない場合はセル全体をlocationとして扱う
  return { location: cell, startTime: '', endTime: '' };
}

// "2026/1/11" や "2026-1-11" → "2026-01-11"
function parseDate(s) {
  s = s.trim().replace(/\//g, '-');
  const parts = s.split('-');
  if (parts.length === 3) {
    const [y, mo, d] = parts;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return s;
}

// クォートを考慮したCSV行パーサー
function parseCSVLine(line) {
  const cols = [];
  let current = '';
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      cols.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current.trim());
  return cols;
}

function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ===== メイン処理 =====

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('既存の練習データを確認中...');
const existingDocs = await getDocs(collection(db, 'practiceSessions'));
const existingKeys = new Set(existingDocs.docs.map(d => `${d.data().date}_${d.data().name}`));
console.log(`既存: ${existingDocs.size} 件\n`);

const csv = readFileSync('./practices.csv', 'utf-8').replace(/^﻿/, ''); // BOM除去
const lines = csv.trim().split('\n').slice(1); // 1行目（ヘッダー）をスキップ

const toInsert = [];
const skipped = [];

for (const line of lines) {
  if (!line.trim()) continue;
  const cols = parseCSVLine(line);
  const dateRaw = cols[0];
  const period = cols[2] ?? '';

  if (!dateRaw) continue;
  const date = parseDate(dateRaw);
  const type = detectType(period);
  if (!type) continue; // チーム練・未対応はスキップ

  for (const [colIdxStr, genre] of Object.entries(GENRE_COLS)) {
    const cell = cols[parseInt(colIdxStr)] ?? '';
    if (!cell) continue;
    const parsed = parseCell(cell);
    if (!parsed) continue;

    const name = type === 'regular'
      ? `${genre}正規練`
      : `${period} ${genre}ナンバー`;

    const key = `${date}_${name}`;
    if (existingKeys.has(key)) {
      skipped.push(`${date} ${name}`);
      continue;
    }

    toInsert.push({
      name,
      date,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      location: parsed.location,
      note: '',
      type,
      targetType: 'genre_generation',
      targetGenres: [genre],
      targetGenerations: [],
      targetNumberId: '',
      targetMemberIds: [],
      additionalMemberIds: [],
      excludedMemberIds: [],
      createdBy: 'import',
      createdByName: 'インポート',
      createdAt: new Date(),
    });
  }
}

if (skipped.length > 0) {
  console.log(`=== スキップ（重複） ${skipped.length} 件 ===`);
  skipped.forEach(s => console.log(`  - ${s}`));
  console.log('');
}

if (toInsert.length === 0) {
  console.log('登録するデータがありません（すべて重複またはチーム練）');
  process.exit(0);
}

console.log(`=== 登録予定 ${toInsert.length} 件 ===`);
for (const s of toInsert) {
  console.log(`  ${s.date} [${s.type}] ${s.name} @ ${s.location || '場所なし'} ${s.startTime}-${s.endTime}`);
}
console.log('');

const answer = await confirm(`${toInsert.length} 件を登録しますか？ (y/n): `);
if (answer !== 'y') {
  console.log('キャンセルしました。');
  process.exit(0);
}

console.log('\n登録中...');
let count = 0;
for (const session of toInsert) {
  const ref = doc(collection(db, 'practiceSessions'));
  await setDoc(ref, { ...session, id: ref.id });
  console.log(`  登録: ${session.date} ${session.name}`);
  count++;
}

console.log(`\n完了！ ${count} 件登録しました。`);
