# コード構成ガイド

このリポジトリのコードがどう組み立てられているかを説明する文書。**コードを変更する人向け**。アプリが何をするかは [spec.md](spec.md)、サーバー構成は [infrastructure.md](infrastructure.md) を参照。

---

## 全体の流れ

ユーザーの操作がデータ保存に至るまでの経路はこの1本だけ。

```
ブラウザ
  │  ① 画面(React)がユーザー操作を受ける
  ▼
fe/src/app/**/page.tsx ──── 画面ごとのファイル
  │  ② API呼び出しはすべてこのファイル経由
  ▼
fe/src/lib/api.ts ────────── APIクライアント(キャッシュ付き)
  │  ③ HTTPリクエスト(REST, /api/...)
  ▼
be/adapter/http/ ─────────── ルーティングとリクエスト/レスポンス変換
  │  ④ ビジネスロジックを呼ぶ
  ▼
be/usecase/fe_interactor.go ─ 「何をどういう順でやるか」の本体
  │  ⑤ データの読み書き
  ▼
be/infra/cache/ ───────────── 読み取り結果を30分キャッシュ
  ▼
be/infra/firestore/ ───────── Firestoreへの実際の読み書き
  ▼
Cloud Firestore(データベース)
```

例外は2つだけ:
- **イベント画像のアップロード**は、フロントからFirebase Storageへ直接行う(`fe/src/lib/firebase.ts`)
- **iCalカレンダー配信**の一部は `fe/src/app/api/calendar/route.ts`(Next.js側のサーバーコード)

---

## バックエンド (`be/`) — Go

クリーンアーキテクチャの4層構造。**内側(domain)ほど安定していて、外側ほど交換可能**という考え方で、依存は必ず外→内の一方向。

| ディレクトリ | 役割 | 触るのはどんなとき |
|-------------|------|------------------|
| `be/main.go` | 起動処理。各部品を組み立てて(DI)、HTTPサーバーを立てる | 新しいリポジトリ/ハンドラを追加したとき |
| `be/domain/` | エンティティ(データの形)の定義。`fe_entity.go` に全部入っている | フィールドを追加するとき |
| `be/usecase/` | ビジネスロジック。`fe_interactor.go` の `FEInteractor` に全ユースケースが集約 | 機能のふるまいを変えるとき |
| `be/usecase/port/` | リポジトリのインターフェース定義 | データ操作の種類を増やすとき |
| `be/adapter/http/router/` | URLとハンドラの対応表(`fe_router.go`)。**APIの全ルート一覧はこのファイルを見る** | エンドポイントを追加するとき |
| `be/adapter/http/handler/` | HTTPリクエストの解釈とレスポンス生成。`fe_handler.go`(メイン)、`calendar.go`(iCal)、`line_webhook.go`(LINE) | 〃 |
| `be/infra/firestore/` | Firestoreへの読み書きの実装。コレクション名の定数もここが正 | データの保存方法を変えるとき |
| `be/infra/cache/` | 読み取りキャッシュ(TTL30分)。各リポジトリを包むデコレータ | キャッシュの効き方が問題になったとき |
| `be/infra/discord/` | Discord Webhook通知(出欠変更・同期競合) | 通知の文面や宛先を変えるとき |
| `be/cmd/seed/` | ローカル開発用のダミーデータ投入CLI。**Emulator接続時しか動かない**安全設計 | シードデータを変えるとき |

### 覚えておくべきクセ

- **キャッシュは各Cloud Runインスタンスのメモリ内**にあり、インスタンス間で共有されない。「更新したのに反映されない」ように見えたら、最大30分のキャッシュ遅延を疑う
- **更新系APIはリクエストJSONをほぼそのままFirestoreにマージ**(`MergeAll`)している。バリデーションは薄いので、変なデータを送れば変なデータが入る
- **Discord通知は投げっぱなし**(エラーが起きても記録されない)。「通知が来ない」の調査はWebhook URLの設定確認から
- テストは `be/usecase/fe_interactor_test.go` にユースケースのテストがある。`cd be && go test ./...` で実行

---

## フロントエンド (`fe/`) — Next.js 14 (App Router)

全ページがクライアントコンポーネント(`'use client'`)のシンプルな構成。

| 場所 | 役割 |
|------|------|
| `fe/src/app/<パス>/page.tsx` | 画面。URLとフォルダ構造が1対1で対応(例: `/payments` → `app/payments/page.tsx`) |
| `fe/src/lib/api.ts` | **バックエンドAPI呼び出しの唯一の窓口**。全APIの関数 + sessionStorageキャッシュ(15分) + 更新時の自動キャッシュ無効化 |
| `fe/src/lib/types.ts` | フロント側の型定義 |
| `fe/src/lib/firebase.ts` | Firebase Storage(画像アップロード)専用の初期化。**Firestoreには直接つながない** |
| `fe/src/components/` | 共通部品(AuthGuard、ヘッダー、メンバー選択ドロップダウンなど) |

### 認証とロールの実装

- ログイン成功時に `localStorage` へ `memberId` / `userName` / `userRole` を保存(`app/page.tsx`)
- `AuthGuard.tsx` が「`memberId` がなければログイン画面へリダイレクト」を全ページに適用
- admin向け機能の出し分けは各ページで `userRole === 'admin'` を判定しているだけ。**サーバー側では検証していない**

### 覚えておくべきクセ

- `api.ts` のGETキャッシュのせいで、まれに古いデータが見える(最大15分)。更新系APIを呼ぶと関連キャッシュは自動で消える設計
- lintや型チェックのCIは**存在しない**。`cd fe && npx tsc --noEmit` を手動で流すのが唯一のチェック手段

---

## 変更したいとき、どこを触るか

| やりたいこと | 触る場所(順番に) |
|-------------|-----------------|
| 画面の文言・見た目を変える | `fe/src/app/<該当画面>/page.tsx` のみ |
| データ項目を増やす(例: 練習に「持ち物」欄) | `be/domain/fe_entity.go` → `be/adapter/http/dto/` → ハンドラ → `fe/src/lib/types.ts` → 画面 |
| APIエンドポイントを増やす | `be/adapter/http/router/fe_router.go` にルート追加 → handler → interactor → (必要なら)repository → `fe/src/lib/api.ts` に関数追加 |
| Discord通知の文面を変える | `be/infra/discord/webhook.go` |
| シート同期のロジックを変える | シート読取側: `scripts/sync-practices.gs` / アプリ受信側: `be/usecase/fe_interactor.go` の `SyncPracticesFromSheet` |
| ジャンルの追加 | `scripts/sync-practices.gs`(列定義とカレンダー名) + `fe/src/app/*/page.tsx` 内の `GENRES` 定数(※現在4ファイルに重複あり、全部直すこと) + Discordの `DISCORD_WEBHOOK_<ジャンル>` 環境変数 |

---

## 既知の負債(直すなら知っておくべきこと)

2026年7月のコード監査で見つかった、動作はするが紛らわしい箇所。

- `GENRES` 定数が4ファイルに重複しており、`profile/page.tsx` だけ `'Admin'` 入りで内容が違う
- `fe/src/app/attendance/page.tsx` に `genre_admin` というロールの分岐が残っているが、このロールは存在せず**絶対に実行されない**デッドコード
- `be/adapter/http/handler/calendar.go` にはロールではなく `Genre == "Admin"` でadmin判定する箇所があり、他と基準が違う
- `be/go.mod` に未使用のGemini(AI) SDKが残っている(`go mod tidy` で消える)
- `firestore.indexes.json` に旧スキーマ(`practice_series` 等)のインデックス定義が残っている(無害)
- `fe/package.json` の `date-fns` は未使用
- バックエンドのAPIは認証なし(spec.md「意図的にやっていないこと」参照)なので、URLを知っていれば誰でも叩ける。これは設計判断だが、変える場合は全ハンドラに影響する

---

## ローカル開発

ルートの [README.md](../README.md#ローカル開発) に手順あり。要点だけ:

```bash
make dev-setup   # 初回のみ
make emulator    # ターミナル1: Firestore Emulator
make seed        # ターミナル2: ダミーデータ投入
make backend     # ターミナル3: Go API (8080)
make frontend    # ターミナル4: Next.js (3000)
```

本番のデータベースには一切触れない(EmulatorというローカルのニセFirestoreを使う)ので、壊しても大丈夫。
