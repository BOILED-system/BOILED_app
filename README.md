# サークル向けWebアプリ

AIチャットを主役としたサークル活動支援Webアプリケーション。

> [!NOTE]
> このプロジェクトはGoogle Hackathon用のMVPです。認証はダミー実装（`X-User-Id`ヘッダー）で代用しています。

---

## 📋 プロジェクト現状（引き継ぎ用）

### ✅ 実装済み
| カテゴリ | 内容 | 状態 |
|----------|------|------|
| **Go API** | Clean Architecture, 全エンドポイント | ✅ 完了 |
| **Firestore** | 全コレクション実装 | ✅ 完了 |
| **Gemini AI** | チャット機能（お知らせ参照） | ✅ 完了 |
| **Next.js** | 全ページ（お知らせ/カレンダー/支払い/イベント詳細） | ✅ 完了 |
| **ChatPanel** | AIチャットUI（参照元リンク付き） | ✅ 完了 |
| **RSVP** | 出欠機能（GO/NO/LATE/EARLY） | ✅ 完了 |
| **清算機能** | 銀行/PayPay、支払い報告 | ✅ 完了 |
| **イベント作成** | `/events/new` でUIから作成可能 | ✅ 完了 |
| **お知らせ作成** | イベント詳細ページ内で作成可能 | ✅ 完了 |
| **清算作成** | イベント詳細ページ内で作成可能 | ✅ 完了 |
| **UI/UX** | BOILED風ダークネイビーデザイン | ✅ 完了 |

### ⚠️ 未実装・MVP割り切り
| カテゴリ | 内容 | 備考 |
|----------|------|------|
| **出席機能** | お知らせ単位の出欠登録 | usecase・UIは実装済み。API接続（domain/infra/handler/router）が未完了 |
| **認証** | ログイン/ユーザー管理 | 現状: `X-User-Id`ヘッダーで代用 |
| **サークル作成UI** | サークル管理画面 | API経由でのみ作成可能（1回だけでOK） |
| **テスト** | 単体/結合テスト | 未実装 |
| **本番デプロイ** | Cloud Run / Vercel | 手順はREADMEに記載済み |
| **API用`.env`** | 環境変数定義ファイル | 未作成（毎回`export`が必要） |

### 🚀 デプロイ担当者向けチェックリスト

```markdown
## 事前準備
- [ ] GCPプロジェクト作成
- [ ] Firestore有効化（Native Mode）
- [ ] Gemini API Key取得（https://aistudio.google.com/app/apikey）
- [ ] gcloud CLI インストール・認証

## ローカル動作確認
- [ ] `be` で `go run main.go` が起動する
- [ ] `fe` で `npm run dev` が起動する
- [ ] サンプルデータ投入（下のcurlコマンド参照）
- [ ] ブラウザでイベント一覧が表示される
- [ ] AIチャットで質問→回答が返る

## 本番デプロイ
- [ ] APIをCloud Runにデプロイ（下のコマンド参照）
- [ ] フロントをVercelにデプロイ
- [ ] 環境変数設定（NEXT_PUBLIC_API_BASE_URL）
- [ ] 本番でイベント一覧が表示される
- [ ] AIチャットが動作する
```

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend | Go, Clean Architecture |
| DB | Firestore |
| AI | Gemini API |

## ディレクトリ構成

```
google-hackathon/
├── be/                               # Go API (Clean Architecture)
│   ├── main.go                       # エントリーポイント（DI・サーバー起動）
│   ├── go.mod / go.sum               # Goモジュール定義
│   ├── Dockerfile                    # マルチステージビルド
│   ├── domain/                       # ドメイン層（外部依存ゼロ）
│   │   ├── entity.go                 #   エンティティ定義
│   │   └── errors.go                 #   ドメインエラー
│   ├── usecase/                      # ユースケース層
│   │   ├── circle.go                 #   サークル
│   │   ├── event.go                  #   イベント
│   │   ├── announcement.go           #   お知らせ
│   │   ├── rsvp.go                   #   RSVP（出欠）
│   │   ├── settlement.go             #   清算
│   │   ├── attendance.go             #   出席（⚠️ API未接続）
│   │   └── chat.go                   #   AIチャット
│   ├── adapter/http/                 # アダプター層
│   │   ├── handler/                  #   HTTPハンドラー
│   │   ├── dto/                      #   リクエスト/レスポンスDTO
│   │   └── router/router.go          #   ルーティング定義
│   ├── infra/                        # インフラ層
│       ├── firestore/                #   Firestoreリポジトリ実装
│       └── gemini/                   #   Gemini AI実装
├── fe/                               # Next.js フロントエンド
│   ├── src/
│   │   ├── app/                      #   ページ（App Router）
│   │   │   ├── announcements/        #     お知らせ一覧・詳細
│   │   │   ├── calendar/             #     カレンダー
│   │   │   ├── events/               #     イベント詳細・作成
│   │   │   └── payments/             #     支払い管理
│   │   ├── components/               #   UIコンポーネント
│   │   ├── features/                 #   機能モジュール
│   │   └── lib/                      #   APIクライアント・ユーティリティ
│   └── .env.local                    #   環境変数（API URL設定済み）
├── scripts/
│   └── seed.go                       # サンプルデータ投入スクリプト
├── docker-compose.yml                # Docker構成
└── README.md
```

## 環境変数

### API（`be`）— ⚠️ `.env`ファイル未作成

現在、API側には`.env`ファイルがないため、起動時に毎回`export`する必要があります。

| 変数 | 必須 | 説明 | 現状 |
|------|------|------|------|
| `GCP_PROJECT_ID` | ✅ | GCPプロジェクトID | 未設定（要`export`） |
| `GEMINI_API_KEY` | ✅ | Gemini API Key | 未設定（要`export`） |
| `PORT` | - | ポート番号（デフォルト: 8080） | — |

```bash
# API起動前に毎回実行が必要
export GCP_PROJECT_ID=your-project-id
export GEMINI_API_KEY=your-api-key
```

### フロントエンド（`fe`）— ✅ 設定済み

`fe/.env.local` に設定済み:

| 変数 | 必須 | 説明 | 現状 |
|------|------|------|------|
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | API URL | ✅ `http://localhost:8080` |

## API エンドポイント

### Circle
| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/circles` | サークル作成 |
| GET | `/circles/:circleId` | サークル取得 |
| POST | `/circles/:circleId/members` | メンバー追加 |
| GET | `/circles/:circleId/members` | メンバー一覧 |
| GET | `/circles/:circleId/events` | イベント一覧 |
| GET | `/circles/:circleId/announcements` | お知らせ一覧 |

### Event
| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/events` | イベント作成 |
| GET | `/events/:eventId` | イベント取得 |
| GET | `/events/:eventId/announcements` | お知らせ取得 |
| POST | `/events/:eventId/rsvp` | 出欠登録 (X-User-Id) |
| GET | `/events/:eventId/rsvp/me` | 自分の出欠 (X-User-Id) |
| GET | `/events/:eventId/settlements` | 清算一覧 |

### Announcement
| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/announcements` | お知らせ作成 |

### Settlement
| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/settlements` | 清算作成 |
| GET | `/settlements/me` | 自分の清算 (X-User-Id) |
| POST | `/settlements/:id/report` | 支払い報告 (X-User-Id) |

### AI Chat
| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/ai/chat` | AIチャット |

### Health
| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/health` | ヘルスチェック |

## ローカル起動

### 1. 前提条件
- Go 1.21+
- Node.js 18+
- GCPプロジェクト（Firestore有効化済み）
- Gemini API Key

### 2. GCP認証
```bash
gcloud auth application-default login
```

### 3. API起動
```bash
cd be
export GCP_PROJECT_ID=your-project-id
export GEMINI_API_KEY=your-api-key
go mod tidy
go run main.go
```
→ http://localhost:8080 で起動

### 4. フロントエンド起動
```bash
cd fe
npm install
npm run dev
```
→ http://localhost:3000 で起動

## デプロイしたい場合

**一通りな手順は [docs/DEPLOY.md](docs/DEPLOY.md) にまとめてあります。**  
（GCP・gcloud ログイン → Terraform または手動で API デプロイ → Vercel でフロント）

## Terraform でインフラ構築（推奨）

GCP の API 有効化・Firestore・Secret Manager・Cloud Run をコードで管理する場合は `infra/terraform` を使用します。

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars で project_id を設定
terraform init
terraform apply
```

詳細は [infra/terraform/README.md](infra/terraform/README.md) を参照してください。

## Cloud Run デプロイ

### 1. APIデプロイ
```bash
cd be

# コンテナビルド & プッシュ
gcloud builds submit --tag gcr.io/PROJECT_ID/circle-api

# Cloud Runデプロイ
gcloud run deploy circle-api \
  --image gcr.io/PROJECT_ID/circle-api \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars "GCP_PROJECT_ID=PROJECT_ID,GEMINI_API_KEY=YOUR_KEY"
```

### 2. フロントエンドデプロイ (Vercel推奨)
```bash
cd fe

# 環境変数設定
echo "NEXT_PUBLIC_API_BASE_URL=https://circle-api-xxxxx.a.run.app" > .env.production

# ビルド確認
npm run build

# Vercel CLIでデプロイ
npx vercel --prod
```

## 認証（MVP）

MVPでは認証はダミー実装:
- `X-User-Id` ヘッダーでユーザーIDを指定
- 画面右上のセレクターでユーザー切り替え可能

## Firestore コレクション

- `users` - ユーザー
- `circles` - サークル
- `memberships` - メンバーシップ
- `events` - イベント
- `announcements` - お知らせ
- `rsvps` - 出欠
- `settlements` - 清算
- `payments` - 支払い

## サンプルデータ投入（curl コマンド集）

APIサーバーが `http://localhost:8080` で起動している前提です。

### 1. サークル作成
```bash
curl -X POST http://localhost:8080/circles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ダンスサークル「BOILED」",
    "description": "毎週金曜日に活動するインカレ・ダンスサークルです",
    "logoUrl": "https://picsum.photos/200"
  }'
# → 返ってきた id を CIRCLE_ID として控える
```

### 2. メンバー追加
```bash
CIRCLE_ID="ここに上で取得したIDを入れる"

# メンバー1: demo-user-1（フロントのデフォルトユーザー）
curl -X POST "http://localhost:8080/circles/${CIRCLE_ID}/members" \
  -H "Content-Type: application/json" \
  -d '{"userId": "demo-user-1", "role": "admin"}'

# メンバー2
curl -X POST "http://localhost:8080/circles/${CIRCLE_ID}/members" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-tanaka", "role": "member"}'

# メンバー3
curl -X POST "http://localhost:8080/circles/${CIRCLE_ID}/members" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-suzuki", "role": "member"}'
```

### 3. イベント作成
```bash
# イベント1: 新歓公演
curl -X POST http://localhost:8080/events \
  -H "Content-Type: application/json" \
  -d "{
    \"circleId\": \"${CIRCLE_ID}\",
    \"title\": \"新歓ダンス公演『START』\",
    \"startAt\": \"2026-04-15T18:00:00Z\",
    \"location\": \"大学大ホール\",
    \"coverImageUrl\": \"https://picsum.photos/seed/dance1/400/300\",
    \"rsvpTargetUserIds\": [\"demo-user-1\", \"user-tanaka\", \"user-suzuki\"],
    \"createdBy\": \"demo-user-1\"
  }"
# → 返ってきた id を EVENT1_ID として控える

# イベント2: 夏合宿
curl -X POST http://localhost:8080/events \
  -H "Content-Type: application/json" \
  -d "{
    \"circleId\": \"${CIRCLE_ID}\",
    \"title\": \"夏合宿 in 山梨ダンスロッジ\",
    \"startAt\": \"2026-08-10T10:00:00Z\",
    \"location\": \"山梨ダンスリゾート\",
    \"coverImageUrl\": \"https://picsum.photos/seed/camp/400/300\",
    \"rsvpTargetUserIds\": [\"demo-user-1\", \"user-tanaka\"],
    \"createdBy\": \"demo-user-1\"
  }"
# → 返ってきた id を EVENT2_ID として控える
```

### 4. お知らせ作成
```bash
EVENT1_ID="ここに新歓公演のIDを入れる"
EVENT2_ID="ここに夏合宿のIDを入れる"

# 新歓公演のお知らせ
curl -X POST http://localhost:8080/announcements \
  -H "Content-Type: application/json" \
  -d "{
    \"circleId\": \"${CIRCLE_ID}\",
    \"eventId\": \"${EVENT1_ID}\",
    \"title\": \"新歓公演のタイムテーブル・注意事項\",
    \"body\": \"【集合場所】大ホール 楽屋前\n【集合時間】14:00（リハ開始 15:00）\n【持ち物】衣装一式、内履きシューズ、メイク道具、タオル、飲み物\n【注意】楽屋での飲食は指定スペースのみ可能です\",
    \"createdBy\": \"demo-user-1\"
  }"

# 夏合宿のお知らせ
curl -X POST http://localhost:8080/announcements \
  -H "Content-Type: application/json" \
  -d "{
    \"circleId\": \"${CIRCLE_ID}\",
    \"eventId\": \"${EVENT2_ID}\",
    \"title\": \"夏合宿の詳細とスタジオ割り振り\",
    \"body\": \"【集合場所】新宿駅 西口バスターミナル\n【集合時間】8:00（バス出発 8:30）\n【持ち物】2泊3日分の着替え、レッスン着多め、室内用シューズ、アイソレ用タオル\n【宿泊先】山梨ダンスロッジ\n【参加費】25,000円（宿泊費・バス代・スタジオ代込み）\",
    \"createdBy\": \"demo-user-1\"
  }"
```

### 5. 清算作成
```bash
# 夏合宿の参加費清算
curl -X POST http://localhost:8080/settlements \
  -H "Content-Type: application/json" \
  -d "{
    \"circleId\": \"${CIRCLE_ID}\",
    \"eventId\": \"${EVENT2_ID}\",
    \"title\": \"夏合宿 参加費\",
    \"amount\": 25000,
    \"dueAt\": \"2026-07-31T23:59:59Z\",
    \"targetUserIds\": [\"demo-user-1\", \"user-tanaka\"],
    \"bankInfo\": \"三菱UFJ銀行 渋谷支店\\n普通 1234567\\nBOILED会計 ヤマダタロウ\",
    \"paypayInfo\": \"dance-boiled\"
  }"
```

---

## デモ台本（3分）

### 0:00-0:30 お知らせ一覧
1. ブラウザで `http://localhost:3000` を開く
2. 「お知らせ」画面にイベントカードが2つ表示されている
3. 「新歓ダンス公演『START』」のカードをクリック

### 0:30-1:00 イベント詳細・集合場所確認
1. イベント詳細画面で「お知らせ詳細」セクションを確認
2. 「集合場所：大ホール 楽屋前」を読み上げ
3. 「対象ユーザーなので、出欠パネルと清算パネルが表示されています」と説明

### 1:00-1:30 AIチャット
1. 右下のチャットボタン（💬）をクリック
2. 「集合場所はどこですか？」と入力して送信
3. AIの回答を確認（「大ホール 楽屋前」を含む回答）
4. **参照元**として「新歓公演のタイムテーブル・注意事項」が表示されることを確認

### 1:30-2:00 出欠入力
1. 「出欠登録」パネルで「⭕️ 参加」をクリック
2. メモ欄に「楽しみにしてます！」と入力
3. 「出欠を登録する」をクリック → 「出欠を登録しました！」表示

### 2:00-2:30 支払い確認
1. ヘッダーの「支払い」をクリック
2. 「未払い」タブに「夏合宿 参加費 ¥25,000」が表示
3. 「イベント詳細で支払う→」をクリック

### 2:30-3:00 支払い報告
1. 清算パネルで「📱 PayPay」タブをクリック
2. 送金手順と送金先ID（dance-boiled）を確認
3. 「📋 送金先IDをコピー」をクリック
4. 「支払いを報告する」をクリック → 「✅ 支払い報告済み」表示
5. ヘッダーの「支払い」→「済み」タブで移動を確認

### デモのポイント
- **対象者制御**: `demo-user-1` が rsvpTargetUserIds に含まれているため出欠・清算が表示される
- **AI参照**: お知らせ内容のみを参照し、個人情報や支払い情報は回答に含まれない
- **3分で主要機能を網羅**: お知らせ確認→AI質問→出欠→支払い

---

## トラブルシューティング

### CORS エラー
**症状**: ブラウザコンソールに `Access-Control-Allow-Origin` エラー

**解決策**:
```go
// main.go で CORS 設定を確認
c := cors.New(cors.Options{
    AllowedOrigins:   []string{"http://localhost:3000", "*"},
    AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowedHeaders:   []string{"*"},
    AllowCredentials: true,
})
```

Cloud Run の場合:
- `--allow-unauthenticated` フラグを忘れずに
- API側でCORSを許可していれば追加設定不要

---

### Firestore 権限エラー
**症状**: `permission-denied` または `PERMISSION_DENIED`

**解決策**:

1. **ローカル開発時**: 認証を確認
```bash
gcloud auth application-default login
```

2. **Firestoreルール**: テスト用に一時的に開放（本番では適切なルールを設定）
```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ⚠️ 開発用のみ
    }
  }
}
```

3. **サービスアカウント**: Cloud Run は自動で権限を持つが、ローカルではADCが必要

---

### Cloud Run 環境変数
**症状**: `GCP_PROJECT_ID environment variable is required`

**解決策**:
```bash
# デプロイ時に環境変数を設定
gcloud run deploy circle-api \
  --set-env-vars "GCP_PROJECT_ID=your-project-id,GEMINI_API_KEY=your-api-key"
```

**確認方法**:
```bash
gcloud run services describe circle-api --region asia-northeast1 --format='yaml(spec.template.spec.containers[0].env)'
```

---

### Gemini API Key エラー
**症状**: `AI chat will not work` または `failed to create Gemini client`

**解決策**:

1. **API Keyを取得**: [Google AI Studio](https://aistudio.google.com/app/apikey) でキーを発行

2. **環境変数を設定**:
```bash
export GEMINI_API_KEY=your-api-key-here
```

3. **API有効化**: Google Cloud Console で Generative Language API を有効化
```bash
gcloud services enable generativelanguage.googleapis.com
```

4. **キーの権限確認**: API Keyに適切な制限がかかっていないか確認

---

### その他のよくある問題

| 症状 | 原因 | 解決策 |
|------|------|--------|
| `connection refused` | APIが起動していない | `go run main.go` を実行 |
| `404 Not Found` | エンドポイントのtypo | URLパスを確認 |
| `null` response | Firestoreにデータがない | サンプルデータを投入 |
| フロントでデータが空 | `NEXT_PUBLIC_API_BASE_URL` 未設定 | `.env.local` を確認 |
| 出欠/清算が表示されない | targetUserIdsに含まれていない | `demo-user-1` を対象に含める |

---

## ライセンス

MIT