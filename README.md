# BOILED 活動管理アプリ

BOILEDのサークル活動を管理するWebアプリ。練習の出欠管理・イベント情報・精算・カレンダー連携などをまとめて扱える。

**本番URL**: https://boiled-app.vercel.app

---

## アーキテクチャ概要

```
[ブラウザ (Next.js / Vercel)]
        ↓ /api/* (REST)
[Go API サーバー (Cloud Run)]  ←  [GAS シート同期] [LINE Webhook]
        ↓                            ↓ (通知)
[Firestore]          [Firebase Storage]      [Discord]
                           ↑
              画像アップロードのみフロントから直接
```

フロントエンドはFirestoreを直接触らず、すべてGoのAPIサーバーを経由する。
画像（イベントギャラリー等）のアップロードのみ、Firebase Storageへ直接行う。

---

## 技術スタック

| 領域 | 技術 |
|------|------|
| フロントエンド | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| バックエンド | Go, クリーンアーキテクチャ (domain / usecase / adapter / infra) |
| データベース | Cloud Firestore (asia-northeast1) |
| ストレージ | Firebase Storage (イベント画像) |
| 認証 | 会員番号ログイン（localStorage、Firebase Auth不使用） |
| デプロイ | フロントエンド: Vercel / バックエンド: Cloud Run |
| CI/CD | フロント: Vercel連携 / バックエンド: GCP側のCloud Buildトリガー（いずれもmainへのpushで自動デプロイ） |

---

## リポジトリ構成

```
BOILED_app/
├── be/                          # Go バックエンドAPI
│   ├── main.go                  # エントリーポイント・DI
│   ├── cmd/seed/                # ローカル開発用シードスクリプト
│   ├── domain/                  # エンティティ（依存なし）
│   ├── usecase/                 # ビジネスロジック
│   ├── adapter/http/            # HTTPハンドラ・ルーティング・DTO
│   └── infra/                   # Firestore実装・キャッシュ層・Discord通知
├── fe/                          # Next.js フロントエンド
│   └── src/
│       ├── app/                 # ページ（App Router）
│       ├── components/          # 共通UIコンポーネント
│       └── lib/
│           ├── api.ts           # バックエンドAPIクライアント
│           ├── types.ts         # 共通型定義
│           └── firebase.ts      # Firebase Storage初期化
├── scripts/
│   └── sync-practices.gs        # スプレッドシート→アプリ/カレンダー同期（GAS）
├── infra/terraform/             # GCPインフラ定義（Terraform・現在は未使用）
└── docs/                        # ドキュメント（docs/README.md から読む）
```

---

## 機能一覧

| 機能 | パス | 説明 |
|------|------|------|
| ログイン | `/` | 会員番号を入力してログイン |
| プロフィール | `/profile` | 自分の情報・直近の練習・未払い精算のアラート |
| 練習一覧 | `/practices` | 自分が対象の練習一覧、出欠登録（GO/NO/LATE/EARLY）・作成フォーム |
| 練習詳細 | `/practices/project/[name]` | 練習プロジェクトの詳細・出欠・コレオ登録・編集・削除 |
| 出欠表 | `/practices/group/[name]` | プロジェクト全体の出欠マトリクス・CSV出力 |
| カレンダー | `/calendar` | 練習・イベントをカレンダー表示、Googleカレンダー連携 |
| イベント一覧 | `/events` | イベント一覧・作成フォーム |
| イベント詳細 | `/events/[id]` | タイムテーブル・集合情報・画像ギャラリー・編集 |
| 出欠履歴 | `/attendance` | 自分の出欠履歴一覧 |
| 精算 | `/payments` | 自分宛の未払い・支払い済み精算一覧・作成フォーム |
| ナンバー名簿 | `/numbers` | ナンバー（出演グループ）ごとのメンバー管理 |

---

## 権限

各メンバーは `users` コレクションの `role` フィールドで `admin` / `member` のいずれかを持つ。

- **全員**: 閲覧・出欠登録・支払い報告・精算作成・CSV出力
- **adminのみ**: 練習/イベントの新規作成、メンバー管理（追加・一括登録・削除）
- **編集・削除**: adminまたはその項目の作成者

出し分けはフロントエンドのみで行っており、バックエンドAPIに権限チェックはない（信頼関係前提の意図的な設計）。詳細は [docs/spec.md](docs/spec.md) を参照。

---

## 練習の対象者指定

練習作成時に「誰に見せるか」を以下の方式で指定できる。

| 方式 | フィールド | 説明 |
|------|-----------|------|
| `genre_generation` | targetGenres / targetGenerations | ジャンル × 期で絞り込み |
| `number` | targetNumberId | ナンバー名簿に登録されているメンバー |
| `individual` | targetMemberIds | 個別にメンバーIDを指定 |
| 追加 | additionalMemberIds | 上記の対象外でも強制的に追加するメンバー |
| 除外 | excludedMemberIds | 対象に含まれていても除外するメンバー |

このほか、プロジェクト単位で `choreoMemberIds`（コレオ登録メンバー）を設定でき、出欠表の先頭に表示される。

---

## ローカル開発

本番DBに触らずに、Firestore Emulatorで完全ローカル開発できる。

### 必要なもの

| ツール | 用途 | インストール |
|--------|------|-------------|
| Java 21+ | Firestore Emulator が内部で利用 | `brew install openjdk@21` |
| Firebase CLI | Emulator 起動 | `npm install -g firebase-tools` |
| Go 1.22+ | バックエンド | `brew install go` |
| Node.js 18+ | フロントエンド | `brew install node` |

### 初回セットアップ

```bash
make dev-setup
```

`be/.env.local` と `fe/.env.local` がサンプルから作成される。値はそのままでOK。

### 起動

ターミナルを3〜4つ開いて並行起動する。

```bash
# ターミナル1: Firestore Emulator (8085 / Web UI: 4000)
make emulator

# ターミナル2: シード投入（初回のみ・データをリセットしたい時に）
make seed

# ターミナル3: Goバックエンド (8080)
make backend

# ターミナル4: Next.jsフロント (3000)
make frontend
```

### 仕組み

- Firestore SDK は環境変数 `FIRESTORE_EMULATOR_HOST` が設定されていれば自動でEmulatorに接続するため、本番用コードは一切変更していない
- シードスクリプト (`be/cmd/seed/main.go`) は `FIRESTORE_EMULATOR_HOST` が未設定だと起動を拒否するので、誤って本番に書き込む心配なし
- Emulatorのデータはプロセス停止時に消える

### シードに含まれるユーザー

| 会員番号 | 名前 | 役割 |
|----------|------|------|
| 10001 | 管理者 太郎 | admin |
| 10002 | 佐藤 花子 | member |
| 10003 | 田中 次郎 | member |

ログイン画面でこれらの会員番号を入力すると、それぞれのアカウントで動作確認できる。

---

## API 概要

すべて `/api` プレフィックス付き。主要ルート:

| ルート | 説明 |
|--------|------|
| `POST /api/login` | 会員番号ログイン |
| `GET/POST/PUT/DELETE /api/users...` | メンバー管理 |
| `GET/POST/PUT/DELETE /api/practice-sessions...` | 練習セッション |
| `GET/POST /api/practice-sessions/{id}/rsvps...` | 出欠登録 |
| `GET/POST/PUT/DELETE /api/number-rosters...` | ナンバー名簿 |
| `GET/POST/PUT/DELETE /api/events...` | イベント |
| `GET/POST/PUT/DELETE /api/settlements...` | 精算・支払い |
| `GET /api/calendar/practices.ics` `events.ics` | iCalフィード |
| `POST /api/admin/sync-practices` | シート同期（GASから呼ばれる） |
| `POST /api/line/webhook` ほか `/api/line/*` | LINE連携 |
| `GET /health` | ヘルスチェック |

ルート定義: `be/adapter/http/router/fe_router.go`

---

## Firestoreコレクション

```
users/
  {memberId}             # name, furigana, role, genre, generation

practiceSessions/
  {sessionId}            # name, date, endDate, isOvernight, startTime, endTime,
                         # location, note, type, targetType, targetGenres[],
                         # targetGenerations[], targetNumberId, targetMemberIds[],
                         # additionalMemberIds[], excludedMemberIds[],
                         # choreoMemberIds[], updatedAt, sheetSyncedAt
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
                         # targetType, resolvedMemberIds[], requiresConfirmation,
                         # additionalMemberIds[], excludedMemberIds[]
  payments/
    {memberId}           # status(unpaid|reported|confirmed), reportedMethod

lineMessages/
  {id}                   # LINE Webhookで受信したメッセージ（イベント紐付け可能）
```

コレクション名の正は `be/infra/firestore/fe_*.go` の定数。
※ `firestore.indexes.json` には過去に使っていたコレクション（practice_series 等）の
インデックス定義が残っているが無害なため意図的に放置している。

---

## 認証の仕組み

Firebase Authは使用していない。会員番号をFirestoreの `users` コレクションで照合し、一致したら以下をlocalStorageに保存する。

| キー | 内容 |
|------|------|
| `memberId` | 会員番号 |
| `userName` | 名前 |
| `userRole` | `admin` または `member` |

ログアウトするとlocalStorageが削除され、全ページがログイン画面にリダイレクトされる。

---

## 外部連携

### スプレッドシート同期（GAS）

`scripts/sync-practices.gs` をスタジオ予定表スプレッドシートのApps Scriptに配置して使う。

- **シート → Googleカレンダー**: ジャンルごとのカレンダーに練習予定を自動登録
- **シート → アプリ**: `POST /api/admin/sync-practices` に練習データを送信（`X-Sync-Token` で認証）
- 毎朝9時の時間トリガー + シートのメニューから手動実行が可能
- アプリ側で編集済みのセッションはシート同期で上書きせず、食い違いをDiscordに通知する

### LINE Webhook

`POST /api/line/webhook` でグループのメッセージを受信し、イベント詳細ページから紐付けできる。

### Discord通知

イベント練当日の出欠変更や、シート同期の競合を Discord Webhook で通知する（`be/infra/discord/`）。

### カレンダー連携

`/calendar` ページからGoogleカレンダーへの追加が可能。

- **練習カレンダー**: 自分が対象の練習のみ表示 (`/api/calendar/practices.ics?memberId=xxx`)
- **イベントカレンダー**: 全イベントを終日表示 (`/api/calendar/events.ics`)

一度追加すると自動購読され、最大24時間以内に新しい練習・イベントが自動反映される。

---

## デプロイ

### バックエンド（Cloud Run）

mainブランチへのpushで、**GCP側に設定された継続的デプロイ（Cloud Buildトリガー）** が自動でビルド・デプロイを実行する。トリガーの設定はこのリポジトリではなく、GCPコンソール → Cloud Build → トリガー にある。デプロイの成否も GitHub ではなく GCPコンソール（Cloud Build の履歴 / Cloud Run のリビジョン一覧）で確認する。

> 補足: 以前は `.github/workflows/deploy-api.yml` というGitHub Actionsのワークフローも存在したが、
> Secrets未設定で一度も動作しておらず（実際のデプロイは常にGCP側トリガー）、
> マージのたびに失敗表示を出すだけだったため2026年7月に削除した。

自動デプロイは既存の環境変数を引き継ぐため、デプロイのたびに再設定する必要はない。

手動でデプロイする場合（自動デプロイが使えないときの代替）:
```bash
cd be
gcloud builds submit --tag gcr.io/boiled-app-bb43e/circle-api
gcloud run deploy circle-api \
  --image gcr.io/boiled-app-bb43e/circle-api \
  --region asia-northeast1 \
  --allow-unauthenticated
```

> ⚠️ 本番のCloud Runには `SHEET_SYNC_SECRET`・`LINE_CHANNEL_SECRET`・`DISCORD_WEBHOOK_*` などの
> 環境変数が**手動で**設定されている（このリポジトリには存在しない）。
> デプロイ時に消さないこと。一覧と役割は [docs/infrastructure.md](docs/infrastructure.md) を参照。

### フロントエンド（Vercel）

mainブランチへのpushで自動デプロイされる。

Vercelに設定が必要な環境変数:

| 変数名 | 値 |
|--------|-----|
| `NEXT_PUBLIC_API_URL` | Cloud RunのURL（例: `https://boiled-app-742645927524.asia-northeast1.run.app`） |

---

## Firebase Storageの設定

イベント画像のアップロードにはCORS設定が必要（初回・本番ドメイン追加時のみ）。
以下の内容で `cors.json` を作成して適用する（リポジトリには含まれていない）。

```json
[
  {
    "origin": ["https://boiled-app.vercel.app", "http://localhost:3000"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

```bash
gsutil cors set cors.json gs://boiled-app-bb43e.firebasestorage.app
```

---

## docs/ の読み方

読者タイプ別の案内は [docs/README.md](docs/README.md) にある。

| ドキュメント | 内容 | 主な読者 |
|-------------|------|---------|
| [docs/spec.md](docs/spec.md) | アプリ仕様書（機能・権限・データの意味） | 全員 |
| [docs/operations.md](docs/operations.md) | 運用ハンドブック（日常作業・トラブル対処） | 幹部（非エンジニア可） |
| [docs/handover.md](docs/handover.md) | 引き継ぎ台帳（アカウント・シークレット・代替わりチェックリスト） | 幹部（**代替わり時必読**） |
| [docs/infrastructure.md](docs/infrastructure.md) | インフラ全体図（GCP/Vercel/GAS等の構成と設定値の場所） | システム担当 |
| [docs/architecture.md](docs/architecture.md) | コード構成ガイド（どこを触ればいいか） | エンジニア |

旧設計資料（ハッカソン時代の要件定義・設計計画書）は2026年7月に削除済み。必要なら `git log -- docs/` から参照できる。

---

## トラブルシューティング

**画像がアップロードできない（CORSエラー）**
→ 上記「Firebase Storageの設定」のCORS設定を実行。

**ずっとロード中になる**
→ Firestoreのセキュリティルールが閉じている可能性。Firebaseコンソールで `allow read, write: if true` に設定。

**ログインできない（会員番号が見つからない）**
→ Firestoreの `users` コレクションにその会員番号のドキュメントが存在するか確認。

**Googleカレンダーに追加できない**
→ ローカル（localhost）では動作しない。Vercelの本番環境で試すこと。

**Cloud Runが503を返す**
→ Cloud Runのログを確認。`GCP_PROJECT_ID` の未設定やFirestore接続失敗が原因のことが多い。
