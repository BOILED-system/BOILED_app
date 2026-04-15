# BOILED 活動管理アプリ

BOILEDのサークル活動を管理するWebアプリ。練習の出欠管理・イベント情報・精算・カレンダー連携などをまとめて扱える。

**本番URL**: https://boiled-app.vercel.app

---

## 技術スタック

| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Go (REST API) |
| DB / Storage | Firebase Firestore (via Go API), Firebase Storage (direct from FE for images) |
| 認証 | localStorageベース（会員番号ログイン） |
| デプロイ | Frontend: Vercel, Backend: App Engine / Cloud Run 等 |

クリーンアーキテクチャへの移行に伴い、フロントエンドとバックエンドが分離されました。
Webブラウザからは直接Firestoreを触らず、すべてGo APIサーバー(`/api/*`)を経由してデータを読み書きします。
※イベント画像などの大容量ファイルのアップロードのみ、引き続きフロントエンドから直接Firebase Storageへ行います。

---

## 機能一覧

### 全メンバー共通
| 機能 | パス | 説明 |
|------|------|------|
| ログイン | `/` | 会員番号を入力してログイン。ログアウトするまでセッション維持 |
| プロフィール | `/profile` | 自分の情報（名前・ジャンル・期）表示、ログアウト |
| 練習一覧 | `/practices` | 自分が対象の練習一覧、出欠登録（GO/NO/LATE/EARLY） |
| 練習詳細 | `/practices/[id]` | 練習の詳細、出欠状況確認 |
| カレンダー | `/calendar` | 全練習・イベントをカレンダー表示、Googleカレンダー連携 |
| イベント一覧 | `/events` | イベント一覧 |
| イベント詳細 | `/events/[id]` | タイムテーブル・集合情報・画像ギャラリー |
| 出欠管理 | `/attendance` | 自分の出欠履歴一覧 |
| 精算 | `/payments` | 自分宛の未払い・支払い済み一覧 |

### Admin専用
| 機能 | 説明 |
|------|------|
| 練習作成・編集・削除 | 対象者（ジャンル・期・ナンバー・個別）を指定して練習を作成 |
| イベント編集 | `/events/[id]/edit` でタイムテーブル・画像などを編集 |
| ナンバー名簿 | `/numbers` でナンバー（出演グループ）ごとのメンバー管理 |
| 精算作成 | 銀行・PayPay・現金など支払い方法を指定して精算を作成 |

---

## ロールと権限

| ロール | できること |
|--------|-----------|
| `admin` | 全機能（作成・編集・削除・閲覧） |
| `member` | 閲覧・出欠登録・支払い報告 |

ロールはFirestoreの`users`コレクションで管理。

---

## 練習の対象者指定

練習作成時に「誰に見せるか」を以下の3方式で指定できる：

| 方式 | 説明 |
|------|------|
| `genre_generation` | ジャンル × 期で絞り込み（例: Hiphop × 16期） |
| `number` | ナンバー名簿に登録されているメンバーのみ |
| `individual` | 個別にメンバーIDを指定 |

---

## Firestoreコレクション

```
users/
  {memberId}             # name, role, genre, generation

practiceSessions/
  {sessionId}            # name, date, startTime, endTime, location, note,
                         # type(regular|event), targetType, targetGenres,
                         # targetGenerations, targetNumberId, targetMemberIds
  rsvps/
    {memberId}           # status(GO|NO|LATE|EARLY), note

events/
  {eventId}              # title, date, location, meetingTime, meetingLocation,
                         # timetable[], timetableImageUrl, note, imageUrls[]

numberRosters/
  {rosterId}             # name, memberIds[]

settlements/
  {settlementId}         # title, amount, dueDate, paymentMethods[],
                         # bankInfo, paypayInfo, cashCollectors[],
                         # targetType, resolvedMemberIds[], requiresConfirmation
  payments/
    {memberId}           # status(unpaid|reported|confirmed), reportedMethod
```

---

## Firebaseの設定

### Firebase Storage CORSの設定（初回・本番ドメイン追加時に必要）

Vercelにデプロイ後、画像アップロードにはCORS設定が必要。

1. `cors.json` を作成（リポジトリルートに置いてある）：
```json
[
  {
    "origin": ["https://boiled-app.vercel.app", "http://localhost:3000"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

2. 適用：
```bash
gsutil cors set cors.json gs://boiled-app-bb43e.firebasestorage.app
```

### Firestoreセキュリティルール

テスト・内輪用途のため全開放：
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Firebase Storageセキュリティルール

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

---

## ローカル開発

### 前提条件

- Node.js 18+
- Firebase プロジェクト（`boiled-app-bb43e`）へのアクセス

### セットアップ

バックエンド (Go API):
```bash
cd be
go run cmd/api/main.go
# -> http://localhost:8080 で起動
```

フロントエンド (Next.js):
```bash
cd fe
npm install
npm run dev
# -> http://localhost:3000 で起動
# デフォルトでローカルのAPIサーバー (http://localhost:8080) へリクエストします。
```

### 会員番号の追加

Firestoreコンソール（https://console.firebase.google.com/）から `users` コレクションにドキュメントを追加：

```json
{
  "memberId": "16199",
  "name": "山田太郎",
  "role": "member",
  "genre": "Hiphop",
  "generation": 16
}
```

`role` は `"admin"` または `"member"`。

---

## Vercelデプロイ

```bash
cd fe
npx vercel --prod
```

環境変数の設定は不要（Firebaseの設定はコードに直書き）。

デプロイ後、Firebase StorageのCORS設定を確認すること。

---

## ディレクトリ構成

```
BOILED_app/
├── be/                          # Go バックエンドAPI
│   ├── cmd/                     # エントリーポイント
│   ├── domain/                  # エンティティ（FE互換モデル）
│   ├── usecase/                 # ユースケース層
│   ├── adapter/                 # HTTPハンドラ等
│   └── infra/                   # Firestoreリポジトリ実装等
├── fe/                          # Next.js フロントエンド
│   ├── src/
│   │   ├── app/                 # 各ページ (page.tsx, layout.tsx, etc.)
│   │   ├── components/          # 共通UIコンポーネント
│   │   └── lib/
│   │       ├── api.ts           # Go backendへのAPIクライアント
│   │       ├── types.ts         # 共通型定義
│   │       └── firebase.ts      # Firebase初期化 (Storage用のみ)
│   └── package.json
└── cors.json                    # Firebase Storage CORS設定
```

---

## 認証の仕組み

Firebase Authは使用していない。会員番号をFirestoreの`users`コレクションで照合し、一致したら以下をlocalStorageに保存：

| キー | 内容 |
|------|------|
| `memberId` | 会員番号 |
| `userName` | 名前 |
| `userRole` | `admin` または `member` |

ログアウト操作をしない限りログイン状態が維持される。ログアウトするとlocalStorageが削除され、全ページがログイン画面にリダイレクトされる。

---

## トラブルシューティング

### 画像がアップロードできない（CORSエラー）

```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' has been blocked by CORS policy
```

→ 上記「Firebase Storage CORSの設定」を参照して`gsutil`コマンドを実行。

### ずっとロード中になる

→ Firestoreのセキュリティルールが閉じている可能性。Firebaseコンソールで`allow read, write: if true`に設定。

### ログインできない（会員番号が見つからない）

→ Firestoreの`users`コレクションにその会員番号のドキュメントが存在するか確認。

### Googleカレンダーに追加できない

→ ローカル（localhost）では動作しない。Vercelにデプロイした本番環境で試すこと。
