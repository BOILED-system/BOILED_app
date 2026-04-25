# フロントエンド (fe/)

BOILED活動管理アプリのフロントエンド。Next.js 14 (App Router) + TypeScript + Tailwind CSS で構築。

---

## 技術スタック

| 技術 | 用途 |
|------|------|
| Next.js 14 (App Router) | フレームワーク |
| TypeScript | 型安全 |
| Tailwind CSS | スタイリング |
| FullCalendar 6.x | カレンダー表示 |
| Firebase SDK | Storage（イベント画像アップロードのみ） |

---

## 起動方法

```bash
npm install
npm run dev
# -> http://localhost:3000
```

バックエンド（Go API）が `http://localhost:8080` で起動していることが前提。
`NEXT_PUBLIC_API_URL` 環境変数でAPIのURLを変更できる。

---

## 環境変数

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | バックエンドAPIのベースURL |

本番（Vercel）では Cloud Run のURLを設定する。

---

## ページ一覧

| パス | 説明 |
|------|------|
| `/` | ログイン（会員番号入力） |
| `/profile` | 自分の情報・直近の練習・未払い精算アラート |
| `/practices` | 自分が対象の練習一覧・出欠登録・作成フォーム |
| `/practices/project/[name]` | 練習プロジェクト詳細・出欠状況・編集・削除 |
| `/practices/group/[name]` | ジャンル別練習一覧 |
| `/calendar` | 月表示カレンダー・Googleカレンダー連携 |
| `/events` | イベント一覧・Admin作成フォーム |
| `/events/[id]` | イベント詳細（タイムテーブル・画像ギャラリー） |
| `/events/[id]/edit` | イベント編集（Admin専用） |
| `/attendance` | 自分の出欠履歴 |
| `/payments` | 精算一覧（未払い・支払い済み） |
| `/numbers` | ナンバー名簿管理 |

---

## 主要ファイル

| ファイル | 役割 |
|----------|------|
| `src/lib/api.ts` | バックエンドへの全APIコール |
| `src/lib/types.ts` | 共通型定義 |
| `src/lib/firebase.ts` | Firebase Storage初期化（画像アップロード用） |
| `src/components/AuthGuard.tsx` | 未ログイン時のリダイレクト |
| `src/components/CalendarView.tsx` | FullCalendarのラッパー |
| `src/components/MemberSelectDropdown.tsx` | メンバー選択ドロップダウン |
| `src/components/Header.tsx` | ヘッダーナビゲーション |
| `src/components/BottomNav.tsx` | モバイル用ボトムナビ |

---

## 認証

Firebase Authは使用しない。ログイン時に以下をlocalStorageに保存する。

| キー | 内容 |
|------|------|
| `memberId` | 会員番号 |
| `userName` | 名前 |
| `userRole` | 常に `admin`（フラット権限のため全員同じ） |

`AuthGuard` コンポーネントがlocalStorageを確認し、未ログインならトップページにリダイレクトする。
