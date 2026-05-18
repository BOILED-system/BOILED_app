const SHEET_NAMES = ['日曜スタジオ', '水曜スタジオ', '深夜練'];
const NIGHT_PRACTICE_SHEETS = new Set(['深夜練']); // タイトルに🌛を付けるシート

// ジャンル カレンダー名 の対応
const GENRE_CALENDAR_MAP = {
  'lock':  'Boiled Lockスケジュール',
  'hip':   'Boiled HipHop スケジュール',
  'pop':   'Boiled Pop スケジュール',
  'house': 'Boiled House スケジュール',
  'break': 'Boiled Break スケジュール',
  'girls': 'Boiled Girls スケジュール',
  'waack': 'Boiled Waack スケジュール',
  'hip1':  'Boiled 下級HipHop1 スケジュール',
  'hip2':  'Boiled 下級HipHop2 スケジュール',
  'lock1': 'Boiled 下級Lock1 スケジュール',
  'lock2': 'Boiled 下級Lock2 スケジュール',
};

// スプシ列順: 日程(0), 備考(1), 期間(2), lock(3), hip(4), pop(5), house(6), break(7), girls(8), waack(9), hip1(10), hip2(11), lock1(12), lock2(13)
const GENRE_COLUMNS = [
  { index: 3,  name: 'lock'  },
  { index: 4,  name: 'hip'   },
  { index: 5,  name: 'pop'   },
  { index: 6,  name: 'house' },
  { index: 7,  name: 'break' },
  { index: 8,  name: 'girls' },
  { index: 9,  name: 'waack' },
  { index: 10, name: 'hip1'  },
  { index: 11, name: 'hip2'  },
  { index: 12, name: 'lock1' },
  { index: 13, name: 'lock2' },
];

// スタジオ名の表記揺れ正規化テーブル
const STUDIO_NAME_NORMALIZE = {
  'よもだ': ['よもだ', 'ヨモダ', 'yomoda'],
  'ワークル': ['worcle', 'ワークル', 'studio worcle'],
  'buzz':   ['buzz', 'BUZZ', 'Buzz', 'バズ'],
};

// スタジオ名（前方一致） 住所 の対応表
const STUDIO_LOCATION_MAP = {
  'よもだ':       '〒110-0003 Tokyo, Taito City, 12, 根岸2丁目12-11 スタジオよもだ',
  'マイスタ':     '〒160-0023 Tokyo, Shinjuku City, Nishishinjuku, 7 Chome−9−17 ６F・５F・４F',
  'ソニズ新宿':   '〒160-0023 Tokyo, Shinjuku City, Nishishinjuku, 7 Chome−22−31 柏木 MURA B1F',
  'ソニズ新中野': '〒164-0011 Tokyo, Nakano City, Central, 3 Chome−34−3 B1階',
  '新宿スタンダード': '〒160-0022 Tokyo, Shinjuku City, Shinjuku, 5 Chome−10−20 JKKグループ本社ビル1F',
  '新宿プロ': 'ニューローレルビル 地下1階, 1 Chome-34-11 Shinjuku, Shinjuku City, Tokyo 160-0022',
  'ワークル新宿': '〒160-0023 Tokyo, Shinjuku City, Nishishinjuku, 7 Chome−16−7 第２１フジビル',
  'ワークル代々木': '〒151-0053 Tokyo, Shibuya, Yoyogi, 1 Chome−36−12 2F',
  'ワークル大久保': 'Shinjuku St Building, 1 Chome-21-5 Hyakunincho, Shinjuku City, Tokyo 169-0073',
  'ワークル高田馬場': '3 Chome-27-1 Takada, Toshima City, Tokyo 171-0033',
  'ワークル池袋': '2 Chome-22-4 Minamiikebukuro, Toshima City, Tokyo 171-0022',
  'ワークル市ヶ谷': '3 Chome-1-1 Ichigayatamachi, Shinjuku City, Tokyo 162-0843',
  '大久保':       'Shinjuku St Building, 1 Chome-21-5 Hyakunincho, Shinjuku City, Tokyo 169-0073',
  '市ヶ谷':       '3 Chome-1-1 Ichigayatamachi, Shinjuku City, Tokyo 162-0843',
  '花伝舎':       '〒160-0023 Tokyo, Shinjuku City, Nishishinjuku, 6 Chome−12−30 A棟2階',
  'buzz代々木':   '〒151-0053 Tokyo, Shibuya, Yoyogi, 1 Chome−36−1 B1',
  'buzz新宿西口': '〒160-0023 Tokyo, Shinjuku City, Nishishinjuku, 7 Chome−1−8 ヒノデビル B1F',
  'buzz池袋東口': '〒170-0013 Tokyo, Toshima City, Higashiikebukuro, 1 Chome−36−7 B1',
  'buzz南池袋': '〒171-0022 Tokyo, Toshima City, Minamiikebukuro, 3 Chome−18−37 ベストフレンドビル',
  'buzz赤坂見附': '〒107-0052 Tokyo, Minato City, Akasaka, 3 Chome−21 14TS 共和六番館 地下1階',
  'buzz西日暮里': '〒116-0013 Tokyo, Arakawa City, Nishinippori, 5 Chome−24−2 Ｋ．Ｉビル 地下1階',
  'ワークル原宿annex': '〒151-0051 Tokyo, Shibuya, Sendagaya, 3 Chome−52−52-9 ＵＳビル 1F',
  'buzz池袋本店': '〒171-0022 Tokyo, Toshima City, Minamiikebukuro, 1 Chome−20−1 3F',
  'buzz渋谷宮下park': '〒150-0001 Tokyo, Shibuya, Jingumae, 6 Chome−18−10 海老名ビル 地下1階',
  'ソニズ東高円寺': '〒166-0003 Tokyo, Suginami City, Koenjiminami, 1 Chome−6−5 高円寺サマリヤマンション 松屋の隣',
};

const SYNC_TAG = '[boiled-sync]';

function makeEventKey(title, date) {
  const y   = date.getFullYear();
  const mo  = date.getMonth() + 1;
  const d   = date.getDate();
  const h   = date.getHours();
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${title}|${y}/${mo}/${d} ${h}:${min}`;
}

function makeAllDayKey(title, date) {
  const y  = date.getFullYear();
  const mo = date.getMonth() + 1;
  const d  = date.getDate();
  return `${title}|${y}/${mo}/${d} allday`;
}

// -----------------------------------------------------------------------
// 正規化
// -----------------------------------------------------------------------

function normalizeCell(str) {
  if (!str) return '';
  str = String(str);
  str = str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  str = str.replace(/　/g, ' ');
  str = str.replace(/[－―‐‑‒–—]/g, '-');
  str = str.replace(/[．。]/g, '.');
  str = str.replace(/：/g, ':');
  str = str.replace(/／/g, '/');
  str = str.replace(/（/g, '(').replace(/）/g, ')');
  str = str.replace(/予定$/, '').trim();
  str = str.replace(/\s+/g, ' ').trim();
  return str;
}

function normalizeStudioName(studioName) {
  const lower = studioName.toLowerCase();
  for (const [canonical, variants] of Object.entries(STUDIO_NAME_NORMALIZE)) {
    for (const variant of variants) {
      if (lower.startsWith(variant.toLowerCase())) {
        const rest = studioName.slice(variant.length);
        return canonical + rest;
      }
    }
  }
  return studioName;
}

// -----------------------------------------------------------------------
// パース
// -----------------------------------------------------------------------

function extractDateFromCell(cellValue, baseDate) {
  const baseYear  = baseDate.getFullYear();
  const baseMonth = baseDate.getMonth();

  let m = cellValue.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));

  m = cellValue.match(/(?<!\d)(\d{1,2})\/(\d{1,2})(?!\d)/);
  if (m) return new Date(baseYear, parseInt(m[1]) - 1, parseInt(m[2]));

  m = cellValue.match(/(?<!\d)(\d{1,2})\([月火水木金土日]\)/);
  if (m) return new Date(baseYear, baseMonth, parseInt(m[1]));

  m = cellValue.match(/(?<!\d)(\d{1,2})日/);
  if (m) return new Date(baseYear, baseMonth, parseInt(m[1]));

  return null;
}

function parseTime(timeStr) {
  if (timeStr.includes(':')) {
    const [h, m] = timeStr.split(':').map(Number);
    return { hours: h, minutes: m };
  } else if (timeStr.includes('.')) {
    const val = parseFloat(timeStr);
    return { hours: Math.floor(val), minutes: val % 1 >= 0.5 ? 30 : 0 };
  } else {
    return { hours: parseInt(timeStr), minutes: 0 };
  }
}

function getLocation(studioName) {
  const lower = studioName.toLowerCase();
  for (const key in STUDIO_LOCATION_MAP) {
    if (lower.startsWith(key.toLowerCase())) return STUDIO_LOCATION_MAP[key];
  }
  return null;
}

// -----------------------------------------------------------------------
// カレンダーキャッシュ
// -----------------------------------------------------------------------

let calendarCache = {};
function getCalendar(calendarName) {
  if (calendarCache[calendarName]) return calendarCache[calendarName];
  const calendars = CalendarApp.getCalendarsByName(calendarName);
  if (calendars.length === 0) {
    throw new Error(`カレンダーが見つかりません: "${calendarName}"`);
  }
  calendarCache[calendarName] = calendars[0];
  return calendars[0];
}

// -----------------------------------------------------------------------
// スプレッドシートから期待イベント一覧を構築
// -----------------------------------------------------------------------

function buildExpectedEvents() {
  const expected = {};
  let minDate = null;
  let maxDate = null;

  for (const sheetName of SHEET_NAMES) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      console.log(`シート "${sheetName}" が見つかりません。スキップします。`);
      continue;
    }

    const data = sheet.getDataRange().getValues();
    const isNightPractice = NIGHT_PRACTICE_SHEETS.has(sheetName);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const dateRaw = row[0];
      const category = normalizeCell(String(row[2]));
      if (!dateRaw) continue;

      const baseDate = new Date(dateRaw);
      if (isNaN(baseDate.getTime())) continue;

      for (const genre of GENRE_COLUMNS) {
        const cellValue = normalizeCell(String(row[genre.index]));
        if (!cellValue || cellValue === 'undefined') continue;

        const eventDate = extractDateFromCell(cellValue, baseDate) || baseDate;
        const timeMatch = cellValue.match(/([\d]+(?:[:\.][\d]+)?)\s*-\s*([\d]+(?:[:\.][\d]+)?)/);

        // 時間なしの場合：期間が空 or 人名・メモとみなされるセルはスキップ
        if (!timeMatch) {
          if (!category) continue;
          const knownLocation = getLocation(normalizeStudioName(cellValue.trim()));
          if (!knownLocation && !/[a-zA-Z0-9]/.test(cellValue)) continue;
        }

        let startDate = null, endDate = null;
        if (timeMatch) {
          const startTime = parseTime(timeMatch[1]);
          const endTime   = parseTime(timeMatch[2]);
          startDate = new Date(eventDate);
          startDate.setHours(startTime.hours, startTime.minutes, 0, 0);
          endDate = new Date(eventDate);
          endDate.setHours(endTime.hours, endTime.minutes, 0, 0);
          if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.log(`日付無効のためスキップ: "${cellValue}" (baseDate: ${baseDate})`);
            continue;
          }
        }

        const timeIndex  = timeMatch ? cellValue.indexOf(timeMatch[0]) : cellValue.length;
        const beforeTime = cellValue.slice(0, timeIndex).trim();
        const afterTime  = timeMatch ? cellValue.slice(timeIndex + timeMatch[0].length).trim() : '';

        const studioRaw = beforeTime
          .replace(/\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/, '')
          .replace(/\d{1,2}\/\d{1,2}/, '')
          .replace(/\d{1,2}\([月火水木金土日]\)/, '')
          .replace(/\d{1,2}日/, '')
          .trim();

        const studioName = normalizeStudioName(studioRaw) || '未定';
        const keyMatch   = afterTime.match(/🔑?(\d+)/);
        const keyStr     = keyMatch ? ` 🔑${keyMatch[1]}` : '';
        const nightMark  = isNightPractice ? '🌛深夜練 ' : '';
        const title      = `${nightMark}${category} ${genre.name} ${studioName}${keyStr}`;

        const calendarName = GENRE_CALENDAR_MAP[genre.name];
        if (!expected[calendarName]) expected[calendarName] = [];
        expected[calendarName].push({
          title,
          startDate,
          endDate,
          eventDate,
          hasTime: !!timeMatch,
          location: getLocation(studioName),
          studioName,
        });

        if (startDate) {
          if (!minDate || startDate < minDate) minDate = new Date(startDate);
          if (!maxDate || endDate   > maxDate) maxDate = new Date(endDate);
        } else {
          if (!minDate || eventDate < minDate) minDate = new Date(eventDate);
          if (!maxDate || eventDate > maxDate) maxDate = new Date(eventDate);
        }
      }
    }
  }

  return { expected, minDate, maxDate };
}

// -----------------------------------------------------------------------
// メイン同期処理（UIなし・トリガーからも呼べる）
// -----------------------------------------------------------------------

function syncToCalendar() {
  const { expected, minDate, maxDate } = buildExpectedEvents();

  if (!minDate || !maxDate || isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) {
    console.log('処理対象のイベントがありません（または日付が無効）。');
    return { success: 0, skip: 0, deleted: 0, updated: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const searchStart = new Date(minDate < today ? today : minDate);
  searchStart.setHours(0, 0, 0, 0);
  const searchEnd   = new Date(maxDate);
  searchEnd.setHours(23, 59, 59, 999);

  let successCount = 0;
  let skipCount    = 0;
  let deletedCount = 0;
  let updatedCount = 0;

  console.log(`searchStart: ${searchStart.toISOString()}`);
  console.log(`searchEnd:   ${searchEnd.toISOString()}`);

  for (const [calendarName, expectedList] of Object.entries(expected)) {
    let calendar;
    try {
      calendar = getCalendar(calendarName);
    } catch (e) {
      console.log(e.message);
      continue;
    }

    const allCalendarEvents = calendar.getEvents(searchStart, searchEnd);
    console.log(`\n[${calendarName}] カレンダーイベント数: ${allCalendarEvents.length}`);

    const allEventsMap = new Map();
    for (const ev of allCalendarEvents) {
      const key = ev.isAllDayEvent()
        ? makeAllDayKey(ev.getTitle(), ev.getStartTime())
        : makeEventKey(ev.getTitle(), ev.getStartTime());
      if (!allEventsMap.has(key)) allEventsMap.set(key, []);
      allEventsMap.get(key).push(ev);
    }

    const futureExpected = expectedList.filter(ev => {
      if (ev.hasTime) return ev.startDate && ev.startDate >= today;
      return ev.eventDate && ev.eventDate >= today;
    });
    const expectedMap = new Map(
      futureExpected.map(ev => {
        const key = ev.hasTime
          ? makeEventKey(ev.title, ev.startDate)
          : makeAllDayKey(ev.title, ev.eventDate);
        return [key, ev];
      })
    );
    const expectedKeys = new Set(expectedMap.keys());

    for (const [key] of expectedMap) {
      if (!allEventsMap.has(key)) {
        console.log(`  追加候補: "${key}"`);
        const titlePrefix = key.split('|')[0];
        for (const [cKey] of allEventsMap) {
          if (cKey.split('|')[0] === titlePrefix) {
            console.log(`    → 同タイトルのカレンダーキー: "${cKey}"`);
          }
        }
      }
    }

    for (const [key, events] of allEventsMap) {
      if (expectedKeys.has(key)) {
        const taggedIdx = events.findIndex(ev => (ev.getDescription() || '').includes(SYNC_TAG));
        const keeperIdx = taggedIdx >= 0 ? taggedIdx : 0;
        const keeper = events[keeperIdx];

        for (let i = 0; i < events.length; i++) {
          if (i !== keeperIdx) {
            events[i].deleteEvent();
            console.log(`重複削除: ${events[i].getTitle()}`);
            deletedCount++;
          }
        }
        if (!(keeper.getDescription() || '').includes(SYNC_TAG)) {
          keeper.setDescription(SYNC_TAG);
        }
        const expected = expectedMap.get(key);
        if (expected && expected.location && keeper.getLocation() !== expected.location) {
          keeper.setLocation(expected.location);
          console.log(`住所更新: ${keeper.getTitle()}`);
          updatedCount++;
        } else {
          skipCount++;
        }
      } else {
        for (const ev of events) {
          if ((ev.getDescription() || '').includes(SYNC_TAG)) {
            ev.deleteEvent();
            console.log(`削除: ${ev.getTitle()} @ ${ev.getStartTime()}`);
            deletedCount++;
          }
        }
      }
    }

    for (const [key, ev] of expectedMap) {
      if (!allEventsMap.has(key)) {
        const evDay = key.split('|')[1].split(' ')[0];

        for (const [cKey, cEvents] of allEventsMap) {
          if (cKey.startsWith(ev.title + '|')) {
            const cDay = cKey.split('|')[1].split(' ')[0];
            if (cDay === evDay) {
              for (const cEv of cEvents) {
                if ((cEv.getDescription() || '').includes(SYNC_TAG)) {
                  cEv.deleteEvent();
                  console.log(`古いバージョン削除: ${cEv.getTitle()} @ ${cKey.split('|')[1]}`);
                  deletedCount++;
                }
              }
            }
          }
        }

        const newEvent = ev.hasTime
          ? calendar.createEvent(ev.title, ev.startDate, ev.endDate)
          : calendar.createAllDayEvent(ev.title, ev.eventDate);
        newEvent.setDescription(SYNC_TAG);
        if (ev.location) newEvent.setLocation(ev.location);
        console.log(`登録: ${ev.title} @ ${key.split('|')[1]}`);
        successCount++;
      }
    }
  }

  return { success: successCount, skip: skipCount, deleted: deletedCount, updated: updatedCount };
}

// -----------------------------------------------------------------------
// メニューから呼ぶ用（UIあり）
// -----------------------------------------------------------------------

function syncToCalendarWithUI() {
  try {
    const result = syncToCalendar();
    SpreadsheetApp.getUi().alert(
      `カレンダー同期完了\n\n` +
      `登録:   ${result.success} 件\n` +
      `住所更新: ${result.updated} 件\n` +
      `削除:   ${result.deleted} 件\n` +
      `スキップ（重複）: ${result.skip} 件`
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert(`エラーが発生しました:\n${e.message}`);
  }
}

// -----------------------------------------------------------------------
// アプリへの同期
// -----------------------------------------------------------------------

function syncToApp() {
  const props  = PropertiesService.getScriptProperties();
  const apiUrl = props.getProperty('APP_API_URL');
  const token  = props.getProperty('APP_SYNC_TOKEN');
  if (!apiUrl || !token) {
    Logger.log('APP_API_URL または APP_SYNC_TOKEN が設定されていません');
    return;
  }

  const GENRE_NAME_MAP = {
    lock:  'Lock',
    hip:   'Hiphop',
    pop:   'Pop',
    house: 'House',
    break: 'Break',
    girls: 'Girls',
    waack: 'Waack',
    hip1:  '下級Hiphop1',
    hip2:  '下級Hiphop2',
    lock1: '下級Lock1',
    lock2: '下級Lock2',
  };

  const { expected } = buildExpectedEvents();
  const sessions = [];

  for (const [calendarName, events] of Object.entries(expected)) {
    for (const ev of events) {
      const genreEntry = Object.entries(GENRE_CALENDAR_MAP).find(([, v]) => v === calendarName);
      if (!genreEntry) continue;
      const genreKey  = genreEntry[0];
      const genreName = GENRE_NAME_MAP[genreKey] || genreKey;

      const titleWithoutNight = ev.title.replace(/^🌛深夜練 /, '');
      const parts      = titleWithoutNight.split(` ${genreKey} `);
      const category   = parts[0] || '';
      const studioPart = parts[1] ? parts[1].replace(/ 🔑\d+$/, '').trim() : '';

      const isNight = ev.title.startsWith('🌛深夜練 ');
      const type = category.includes('正規練') ? 'regular' : 'event';
      const name = `${category}${genreName}`;

      const pad = n => String(n).padStart(2, '0');
      let dateStr, startTimeStr, endTimeStr;

      if (ev.hasTime && ev.startDate) {
        let sessionDate = ev.startDate;
        let startHour   = ev.startDate.getHours();
        let startMin    = ev.startDate.getMinutes();
        let endHour     = ev.endDate.getHours();
        let endMin      = ev.endDate.getMinutes();

        if (isNight && startHour < 12) {
          sessionDate = new Date(ev.startDate);
          sessionDate.setDate(sessionDate.getDate() - 1);
          startHour += 24;
          endHour   += 24;
        }

        const d = sessionDate;
        dateStr      = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        startTimeStr = `${startHour}:${pad(startMin)}`;
        endTimeStr   = `${endHour}:${pad(endMin)}`;
      } else {
        const d = new Date(ev.eventDate);
        dateStr      = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        startTimeStr = '未定';
        endTimeStr   = '未定';
      }

      const locationStr = (studioPart || ev.studioName || ev.location || '未定') + (isNight ? '（深夜練）' : '');

      sessions.push({
        name,
        date:         dateStr,
        startTime:    startTimeStr,
        endTime:      endTimeStr,
        location:     locationStr,
        type,
        targetGenres: [genreName],
      });
    }
  }

  if (sessions.length === 0) {
    Logger.log('アプリに送信するセッションがありません');
    return;
  }

  const res = UrlFetchApp.fetch(`${apiUrl}/api/admin/sync-practices`, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Sync-Token': token },
    payload: JSON.stringify({ sessions }),
    muteHttpExceptions: true,
  });

  const result = JSON.parse(res.getContentText());
  Logger.log(`アプリ同期完了: 新規 ${result.synced} 件（既存はスキップ）`);
}

// -----------------------------------------------------------------------
// 全同期（カレンダー + アプリ）
// -----------------------------------------------------------------------

function syncAll() {
  syncToCalendar();
  syncToApp();
}

// -----------------------------------------------------------------------
// スプレッドシートを開いたときにメニューを追加
// -----------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📅カレンダー同期')
    .addItem('カレンダーに同期', 'syncToCalendarWithUI')
    .addToUi();
}
