# BOILED 活動管理アプリ

BOILEDのサークル活動を管理するWebアプリ。練習の出欠管理・イベント情報・精算・カレンダー連携などをまとめて扱える。

**本番URL**: https://boiled-app.vercel.app

---

## アーキテクチャ概要

```
[ブラウザ (Next.js / Vercel)]
        ↓ /api/* (REST)
[Go API サーバー (Cloud Run)]
        ↓
[Firestore]          [Firebase Storage]
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
| CI/CD | GitHub Actions (mainブランチへのpushで自動デプロイ) |

---

## 機能一覧

| 機能 | パス | 説明 |
|------|------|------|
| ログイン | `/` | 会員番号を入力してログイン |
| プロフィール | `/profile` | 自分の情報・直近の練習・未払い精算のアラート |
| 練習一覧 | `/practices` | 自分が対象の練習一覧、出欠登録（GO/NO/LATE/EARLY）・作成フォーム |
| 練習詳細 | `/practices/project/[name]` | 練習プロジェクトの詳細・出欠状況・編集・削除 |
| カレンダー | `/calendar` | 練習・イベントをカレンダー表示、Googleカレンダー連携 |
| イベント一覧 | `/events` | イベント一覧・作成フォーム |
| イベント詳細 | `/events/[id]` | タイムテーブル・集合情報・画像ギャラリー・編集 |
| 出欠履歴 | `/attendance` | 自分の出欠履歴一覧 |
| 精算 | `/payments` | 自分宛の未払い・支払い済み精算一覧・作成フォーム |
| ナンバー名簿 | `/numbers` | ナンバー（出演グループ）ごとのメンバー管理 |

---

## 権限

ログイン時に全員 `admin` として扱われるため、すべてのメンバーが全機能を利用できる（フラット権限）。

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

---

## ローカル開発

本番DBに触らずに、Firestore Emulatorで完全ローカル開発できる。

### 必要なもの

| ツール | 用途 |
|--------|------|
| Java 11+ | Firestore Emulator が内部で利用 (`brew install openjdk@17`) |
| Firebase CLI | Emulator 起動 (`npm install -g firebase-tools`) |
| Go 1.22+ | バックエンド |
| Node.js | フロント |

### 初回セットアップ

```bash
make dev-setup
```

`be/.env.local` と `fe/.env.local` がサンプルから作成される。値は基本そのままでOK。

### 起動

3つのターミナルで並行起動する。

```bash
# ターミナル1: Firestore Emulator (8085 / Web UI: 4000)
make emulator

# ターミナル2: シード投入（初回のみ・必要な時に）
make seed

# ターミナル2 or 3: Goバックエンド (8080)
make backend

# ターミナル3 or 4: Next.jsフロント (3000)
make frontend
```

### 仕組み

- Firestore SDK は環境変数 `FIRESTORE_EMULATOR_HOST` が設定されていれば自動でEmulatorに接続するため、本番用コードは一切変更していない
- シードスクリプト (`be/cmd/seed`) は `FIRESTORE_EMULATOR_HOST` が未設定だと起動を拒否するので、誤って本番に書き込む心配なし
- Emulatorのデータはプロセス停止時に消える（必要なら `firebase.json` に `emulators.firestore.dataDir` を追加して永続化可能）

### シードに含まれるユーザー

| 会員番号 | 名前 | 役割 |
|----------|------|------|
| 10001 | 管理者 太郎 | admin |
| 10002 | 佐藤 花子 | member |
| 10003 | 田中 次郎 | member |

ログイン画面でこれらの会員番号を入力すると、それぞれのアカウントで動作確認できる。

---

## カレンダー連携

`/calendar` ページからGoogleカレンダーへの追加が可能。

- **練習カレンダー**: 自分が対象の練習のみ表示 (`/api/calendar/practices.ics?memberId=xxx`)
- **イベントカレンダー**: 全イベントを終日表示 (`/api/calendar/events.ics`)

一度追加すると自動購読され、最大24時間以内に新しい練習・イベントが自動反映される。

---

## Firestoreコレクション

```
users/
  {memberId}             # name, role, genre, generation

practiceSessions/
  {sessionId}            # name, date, startTime, endTime, location, note,
                         # targetType, targetGenres[], targetGenerations[],
                         # targetNumberId, targetMemberIds[],
                         # additionalMemberIds[], excludedMemberIds[]
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
```

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

## デプロイ

### バックエンド（Cloud Run）

mainブランチの `be/` 配下に変更をpushすると、GitHub Actionsが自動でビルド・デプロイを実行する。

手動でデプロイする場合：
```bash
cd be
gcloud builds submit --tag gcr.io/boiled-app-bb43e/circle-api
gcloud run deploy circle-api \
  --image gcr.io/boiled-app-bb43e/circle-api \
  --region asia-northeast1 \
  --allow-unauthenticated
```

GitHub Actionsに必要なシークレット（リポジトリのSettings → Secrets）：

| シークレット名 | 内容 |
|--------------|------|
| `GCP_SA_KEY` | サービスアカウントのJSONキー |
| `GCP_PROJECT_ID` | GCPプロジェクトID |

### フロントエンド（Vercel）

mainブランチへのpushで自動デプロイされる。

Vercelに設定が必要な環境変数：

| 変数名 | 値 |
|--------|-----|
| `NEXT_PUBLIC_API_URL` | Cloud RunのURL（例: `https://boiled-app-742645927524.asia-northeast1.run.app`） |

---

## Firebase Storageの設定

イベント画像のアップロードにはCORS設定が必要（初回・本番ドメイン追加時のみ）。

```bash
gsutil cors set cors.json gs://boiled-app-bb43e.firebasestorage.app
```

`cors.json` はリポジトリルートに配置済み。

---

## ディレクトリ構成

```
BOILED_app/
├── be/                          # Go バックエンドAPI
│   ├── main.go                  # エントリーポイント・DIコンテナ
│   ├── domain/                  # エンティティ（依存なし）
│   ├── usecase/                 # ビジネスロジック
│   ├── adapter/http/            # HTTPハンドラ・ルーティング
│   └── infra/                   # Firestore実装・キャッシュ層
├── fe/                          # Next.js フロントエンド
│   └── src/
│       ├── app/                 # ページ（App Router）
│       ├── components/          # 共通UIコンポーネント
│       └── lib/
│           ├── api.ts           # バックエンドAPIクライアント
│           ├── types.ts         # 共通型定義
│           └── firebase.ts      # Firebase Storage初期化
├── infra/terraform/             # GCPインフラ定義（Terraform）
├── .github/workflows/           # CI/CD（GitHub Actions）
├── docker-compose.yml           # ローカル開発用
└── cors.json                    # Firebase Storage CORS設定
```

---

## トラブルシューティング

**画像がアップロードできない（CORSエラー）**
→ `gsutil cors set cors.json gs://boiled-app-bb43e.firebasestorage.app` を実行。

**ずっとロード中になる**
→ Firestoreのセキュリティルールが閉じている可能性。Firebaseコンソールで `allow read, write: if true` に設定。

**ログインできない（会員番号が見つからない）**
→ Firestoreの `users` コレクションにその会員番号のドキュメントが存在するか確認。

**Googleカレンダーに追加できない**
→ ローカル（localhost）では動作しない。Vercelの本番環境で試すこと。

**Cloud Runが503を返す**
→ Cloud Runのログを確認。`GCP_PROJECT_ID` の未設定やFirestore接続失敗が原因のことが多い。
