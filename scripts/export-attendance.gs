// =======================================================================
// 出欠表エクスポート
// アプリのAPIから出欠状況を読み取り、Googleスプレッドシートのタブに書き出す。
// アプリ → スプレッドシートの「一方向」出力。シート側の編集はアプリに同期されない
// （毎回シートをクリアして書き直すため、アプリが常に正となる）。
//
// 使い方:
//   1. スクリプトプロパティ APP_API_URL を設定（既存の同期設定と共通）
//   2. 下の ATTENDANCE_PROJECT_NAMES に出力したいプロジェクト名を入れる
//      （空配列のままだと全プロジェクトを出力）
//      → プロジェクト名が分からなければ listProjectNames() を実行するとログに一覧が出る
//   3. メニュー「📅カレンダー同期 > 出欠表を今すぐ出力」で手動実行して確認
//   4. メニュー「出欠表トリガーを設定（毎朝9時）」で毎朝の自動更新を有効化
// =======================================================================

// 出力対象のプロジェクト名（練習名）。空配列なら全プロジェクトを出力する。
// 例: ['正規練Hiphop', 'ショーケースHiphopA']
const ATTENDANCE_PROJECT_NAMES = [];

// タブ名の接頭辞
const ATTENDANCE_SHEET_PREFIX = '出欠_';

// ステータス表示
const ATTENDANCE_STATUS_MARK = { GO: '○', NO: '×', LATE: '遅', EARLY: '早' };

// -----------------------------------------------------------------------
// API アクセス（GETは認証不要）
// -----------------------------------------------------------------------

function getAppApiUrl_() {
  const url = PropertiesService.getScriptProperties().getProperty('APP_API_URL');
  if (!url) throw new Error('APP_API_URL が未設定です（スクリプトプロパティに設定してください）');
  return url.replace(/\/$/, '');
}

function apiGetJson_(path) {
  const res = UrlFetchApp.fetch(getAppApiUrl_() + path, { muteHttpExceptions: true });
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`API エラー ${code}: ${path}\n${res.getContentText().slice(0, 200)}`);
  }
  return JSON.parse(res.getContentText());
}

// -----------------------------------------------------------------------
// 対象者判定（fe/src/lib/api.ts の isSessionForMember と同じロジック）
// -----------------------------------------------------------------------

function isSessionForMember_(session, user, rosters) {
  const excluded = session.excludedMemberIds || [];
  if (excluded.indexOf(user.memberId) >= 0) return false;
  if (user.genre === 'Admin') return true;
  const additional = session.additionalMemberIds || [];
  if (additional.indexOf(user.memberId) >= 0) return true;

  const tt = session.targetType || 'genre_generation';
  if (tt === 'genre_generation') {
    const genres = session.targetGenres || [];
    const gens = session.targetGenerations || [];
    if (genres.length === 0 && gens.length === 0) return false;
    const genreOk = genres.length === 0 || genres.indexOf(user.genre) >= 0;
    const genOk = user.generation === 0 || gens.length === 0 || gens.indexOf(user.generation) >= 0;
    return genreOk && genOk;
  }
  if (tt === 'number') {
    const roster = rosters.find(r => r.id === session.targetNumberId);
    return roster ? (roster.memberIds || []).indexOf(user.memberId) >= 0 : false;
  }
  if (tt === 'individual') {
    return (session.targetMemberIds || []).indexOf(user.memberId) >= 0;
  }
  return false;
}

// -----------------------------------------------------------------------
// 列見出し（日程）
// -----------------------------------------------------------------------

function attendanceColHeader_(s) {
  const md = d => (d ? String(d).split('-').slice(1).join('/') : '');
  if (s.isOvernight) return `${md(s.date)}〜${md(s.endDate)} 深夜`;
  const t = s.startTime && s.startTime !== '未定' ? ` ${s.startTime}` : '';
  return `${md(s.date)}${t}`;
}

// -----------------------------------------------------------------------
// メイン: 出欠表を出力
// -----------------------------------------------------------------------

function exportAttendance() {
  const sessions = apiGetJson_('/api/practice-sessions');
  const users = apiGetJson_('/api/users');
  const rosters = apiGetJson_('/api/number-rosters');

  let projectNames = ATTENDANCE_PROJECT_NAMES;
  if (!projectNames || projectNames.length === 0) {
    projectNames = Array.from(new Set(sessions.map(s => s.name))).filter(n => n);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let written = 0;
  for (const name of projectNames) {
    if (exportOneProject_(ss, name, sessions, users, rosters)) written++;
  }
  return written;
}

function exportOneProject_(ss, projectName, allSessions, allUsers, rosters) {
  const matched = allSessions
    .filter(s => s.name === projectName)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (matched.length === 0) {
    Logger.log(`プロジェクト "${projectName}" の日程が見つかりません。スキップ。`);
    return false;
  }

  // コレオ登録メンバー（全日程のunion）
  const choreoIds = new Set();
  matched.forEach(s => (s.choreoMemberIds || []).forEach(id => choreoIds.add(id)));

  // 対象メンバー: いずれかの日程で対象 or コレオ登録。Adminジャンルは除外。
  const targeted = allUsers
    .filter(u =>
      u.genre !== 'Admin' &&
      (choreoIds.has(u.memberId) ||
        matched.some(s => isSessionForMember_(s, u, rosters)))
    )
    .sort((a, b) => {
      const ac = choreoIds.has(a.memberId) ? 0 : 1;
      const bc = choreoIds.has(b.memberId) ? 0 : 1;
      if (ac !== bc) return ac - bc;
      return parseInt(a.memberId, 10) - parseInt(b.memberId, 10);
    });

  // 各日程のRSVPを取得（memberId -> rsvp）
  const rsvpBySession = {};
  matched.forEach(s => {
    const arr = apiGetJson_(`/api/practice-sessions/${s.id}/rsvps`);
    const m = {};
    arr.forEach(r => { m[r.memberId] = r; });
    rsvpBySession[s.id] = m;
  });

  // ヘッダー行
  const header = ['会員番号', '名前', 'ジャンル', '期'].concat(matched.map(attendanceColHeader_));

  // メンバー行（未回答は空欄）
  const dataRows = targeted.map(u => {
    const row = [
      u.memberId,
      choreoIds.has(u.memberId) ? `${u.name} [コレオ]` : u.name,
      u.genre,
      u.generation,
    ];
    matched.forEach(s => {
      const r = rsvpBySession[s.id][u.memberId];
      if (!r) { row.push(''); return; }
      const mark = ATTENDANCE_STATUS_MARK[r.status] || r.status;
      row.push(r.note ? `${mark}(${r.note})` : mark);
    });
    return row;
  });

  // 合計行
  const totalsRow = ['', '合計 出/欠/遅/早/未', '', ''];
  matched.forEach(s => {
    const vals = Object.keys(rsvpBySession[s.id])
      .filter(id => targeted.some(u => u.memberId === id))
      .map(id => rsvpBySession[s.id][id]);
    const go = vals.filter(r => r.status === 'GO').length;
    const no = vals.filter(r => r.status === 'NO').length;
    const late = vals.filter(r => r.status === 'LATE').length;
    const early = vals.filter(r => r.status === 'EARLY').length;
    const unsub = targeted.length - (go + no + late + early);
    totalsRow.push(`${go}/${no}/${late}/${early}/${unsub}`);
  });

  writeAttendanceSheet_(ss, projectName, header, dataRows, totalsRow);
  Logger.log(`"${projectName}" 出力完了: ${targeted.length}人 × ${matched.length}日程`);
  return true;
}

// -----------------------------------------------------------------------
// シート書き込み・整形
// -----------------------------------------------------------------------

function sanitizeSheetName_(name) {
  const cleaned = String(name).replace(/[\[\]\*\/\\\?:]/g, '_');
  const full = ATTENDANCE_SHEET_PREFIX + cleaned;
  return full.length > 90 ? full.slice(0, 90) : full;
}

function writeAttendanceSheet_(ss, projectName, header, dataRows, totalsRow) {
  const sheetName = sanitizeSheetName_(projectName);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clear();
  const existingFilter = sheet.getFilter();
  if (existingFilter) existingFilter.remove();

  const tz = Session.getScriptTimeZone();
  const stamp = Utilities.formatDate(new Date(), tz, 'yyyy/MM/dd HH:mm');
  const numCols = header.length;

  // レイアウト:
  //   1行目: タイトル + 最終更新
  //   2行目: ヘッダー
  //   3行目〜: メンバー
  //   最終行: 合計
  const titleRow = [`${projectName} 出欠表`].concat(new Array(numCols - 1).fill(''));
  titleRow[numCols - 1] = `最終更新: ${stamp}`;

  const allRows = [titleRow, header].concat(dataRows).concat([totalsRow]);
  sheet.getRange(1, 1, allRows.length, numCols).setValues(allRows);

  const lastRow = allRows.length;
  const headerRowIdx = 2;
  const dataStartRow = 3;
  const totalsRowIdx = lastRow;

  // 整形（タイトル行はマージせず、左端にタイトル・右端に更新時刻）
  sheet.getRange(1, 1, 1, numCols).setBackground('#1a2030').setFontColor('#ffffff');
  sheet.getRange(1, 1).setFontWeight('bold').setFontSize(12);
  sheet.getRange(1, numCols).setHorizontalAlignment('right').setFontColor('#9aa4b2');

  // ヘッダー行
  sheet.getRange(headerRowIdx, 1, 1, numCols)
    .setFontWeight('bold').setBackground('#e8eef7').setHorizontalAlignment('center');
  // 日程列は中央寄せ
  if (dataRows.length > 0) {
    sheet.getRange(dataStartRow, 5, dataRows.length, numCols - 4).setHorizontalAlignment('center');
  }
  // 合計行
  sheet.getRange(totalsRowIdx, 1, 1, numCols)
    .setFontColor('#666666').setBackground('#f3f3f3').setHorizontalAlignment('center');
  sheet.getRange(totalsRowIdx, 2).setHorizontalAlignment('left');

  // 固定・フィルタ
  sheet.setFrozenRows(headerRowIdx);   // タイトル+ヘッダーを固定
  sheet.setFrozenColumns(2);           // 会員番号・名前を固定
  if (dataRows.length > 0) {
    sheet.getRange(headerRowIdx, 1, dataRows.length + 1, numCols).createFilter();
  }
  sheet.autoResizeColumns(1, Math.min(numCols, 4));
}

// -----------------------------------------------------------------------
// 補助: 全プロジェクト名を一覧表示
// -----------------------------------------------------------------------

function listProjectNames() {
  const sessions = apiGetJson_('/api/practice-sessions');
  const names = Array.from(new Set(sessions.map(s => s.name))).filter(n => n).sort();
  Logger.log('プロジェクト名一覧:\n' + names.map(n => `  ${n}`).join('\n'));
  return names;
}

// -----------------------------------------------------------------------
// メニューから呼ぶ用（UIあり）
// -----------------------------------------------------------------------

function exportAttendanceWithUI() {
  try {
    const count = exportAttendance();
    SpreadsheetApp.getUi().alert(`出欠表の出力が完了しました（${count} プロジェクト）。`);
  } catch (e) {
    SpreadsheetApp.getUi().alert(`エラーが発生しました:\n${e.message}`);
  }
}

// -----------------------------------------------------------------------
// トリガー設定（GASエディタまたはメニューから1回だけ実行）
// -----------------------------------------------------------------------

function setupAttendanceTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'exportAttendance') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('exportAttendance')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
  Logger.log('トリガー設定完了: exportAttendance を毎朝9時に実行');
}
