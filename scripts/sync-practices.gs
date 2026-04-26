// BOILED 練習日程 自動同期スクリプト
// Google Apps Script としてスプレッドシートに設置する。
//
// 【設置手順】
// 1. スプレッドシートを開く
// 2. 拡張機能 → Apps Script
// 3. このコードを貼り付けて保存
// 4. スクリプトプロパティに以下を設定（歯車アイコン → スクリプトのプロパティ）:
//      API_URL   = https://your-backend.run.app   （バックエンドのURL）
//      SYNC_TOKEN = （バックエンドの SHEET_SYNC_SECRET と同じ値）
// 5. トリガーを設定: 実行 → トリガーを追加 → syncPractices → 時間主導型 → 毎日

// ========== 設定 ==========
const SHEET_NAME = 'シート1'; // スプレッドシートのシート名に合わせて変更
const GENRE_COLS = { 3: 'Lock', 4: 'Hiphop', 5: 'Pop', 6: 'House', 7: 'Break', 8: 'Girls', 9: 'Waack' };

// ========== メイン関数（トリガーで実行） ==========
function syncPractices() {
  const props = PropertiesService.getScriptProperties();
  const apiUrl = props.getProperty('API_URL');
  const syncToken = props.getProperty('SYNC_TOKEN');
  if (!apiUrl || !syncToken) {
    Logger.log('エラー: API_URL または SYNC_TOKEN が設定されていません');
    return;
  }

  const sessions = parseSessions();
  if (sessions.length === 0) {
    Logger.log('登録対象の練習がありません');
    return;
  }

  Logger.log(`${sessions.length} 件を送信します...`);

  const res = UrlFetchApp.fetch(`${apiUrl}/api/admin/sync-practices`, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Sync-Token': syncToken },
    payload: JSON.stringify({ sessions }),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code === 200) {
    const result = JSON.parse(body);
    Logger.log(`同期完了: ${result.created} 件登録しました`);
  } else {
    Logger.log(`エラー: HTTP ${code} - ${body}`);
  }
}

// ========== スプレッドシートをパースしてセッション一覧を返す ==========
function parseSessions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  // 2行目以降（1行目はヘッダー）
  const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();

  const sessions = [];

  for (const row of data) {
    const dateRaw = row[0]; // A列: 日程
    const period   = String(row[2] || '').trim(); // C列: 期間

    if (!dateRaw) continue;
    const date = formatDate(dateRaw);
    const type = detectType(period);
    if (!type) continue; // チーム練・空欄はスキップ

    for (const [colIdx, genre] of Object.entries(GENRE_COLS)) {
      const cell = String(row[parseInt(colIdx)] || '').trim();
      if (!cell) continue;
      const parsed = parseCell(cell);
      if (!parsed) continue;

      const name = type === 'regular'
        ? `${genre}正規練`
        : `${period} ${genre}ナンバー`;

      sessions.push({
        name,
        date,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        location: parsed.location,
        type,
        targetGenres: [genre],
      });
    }
  }

  return sessions;
}

// ========== ヘルパー関数 ==========

function detectType(period) {
  if (period === '正規練') return 'regular';
  if (period && period !== 'チーム練') return 'event';
  return null;
}

// "マイスタ4B 19-21" → { location, startTime, endTime }
function parseCell(cell) {
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
  return { location: cell, startTime: '', endTime: '' };
}

// "19" → "19:00"
function formatTime(t) {
  return t.includes(':') ? t : `${t}:00`;
}

// Dateオブジェクト or "2026/1/11" → "2026-01-11"
function formatDate(val) {
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim().replace(/\//g, '-');
  const parts = s.split('-');
  if (parts.length === 3) {
    const [y, mo, d] = parts;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return s;
}
