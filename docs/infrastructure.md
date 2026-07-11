# インフラ全体図

このアプリを動かしている**リポジトリの外側**の説明。どのサービスがどこで動き、どこに何を設定すればいいかをまとめる。アカウントの持ち主・引き継ぎは [handover.md](handover.md)、日々の操作は [operations.md](operations.md) を参照。

---

## 全体図

```
                    ┌─────────────────────────────────────────────┐
                    │                 メンバーのスマホ・PC              │
                    └──────────────────┬──────────────────────────┘
                                       │ https://boiled-app.vercel.app
                    ┌──────────────────▼──────────────────────────┐
                    │  Vercel (フロントエンド / Next.js)              │
                    │  mainブランチにpushすると自動デプロイ             │
                    └──────┬───────────────────────────┬──────────┘
                           │ /api/* (REST)             │ 画像アップロードのみ直接
                    ┌──────▼──────────────────┐  ┌─────▼──────────────┐
                    │  Cloud Run「circle-api」  │  │  Firebase Storage   │
                    │  (バックエンド / Go)       │  │  (イベント画像)       │
                    │  GCP asia-northeast1    │  └────────────────────┘
                    └──────┬──────────────────┘
                           │                    GCPプロジェクト: boiled-app-bb43e
                    ┌──────▼──────────────────┐
                    │  Cloud Firestore (DB)    │
                    └─────────────────────────┘

  ─── 外から入ってくるもの ───────────────────────────────────────────
  ・GAS(スプレッドシートのスクリプト) ──毎朝9時──▶ POST /api/admin/sync-practices
  ・LINEグループのメッセージ ──LINE Platform──▶ POST /api/line/webhook

  ─── 外へ出ていくもの ─────────────────────────────────────────────
  ・Cloud Run ──出欠変更・同期競合の通知──▶ Discord (Webhook)
  ・GAS ──練習予定の登録──▶ Googleカレンダー(ジャンル別)
```

---

## 登場するサービス一覧

| サービス | 何をしている | 管理画面 | 費用 |
|---------|------------|---------|------|
| **Vercel** | フロントエンドの配信。GitHubの `main` に push すると自動で本番反映 | vercel.com | Hobbyプランなら無料 |
| **GCP (プロジェクト `boiled-app-bb43e`)** | 下記3つの入れ物 | console.cloud.google.com | 従量課金(現規模ならほぼ無料枠内) |
| ├ **Cloud Run** | Go製APIサーバー `circle-api`(東京リージョン) | 〃 | リクエスト従量。無料枠が大きい |
| ├ **Cloud Firestore** | データベース本体 | Firebaseコンソールからも見える | 読み書き従量。無料枠あり |
| └ **Firebase Storage** | イベント画像の保存 | console.firebase.google.com | 保存量従量 |
| **GitHub (`BOILED-system/BOILED_app`)** | コード置き場 + バックエンド自動デプロイ(GitHub Actions) | github.com | 無料 |
| **Google Apps Script (GAS)** | スタジオ予定表スプレッドシートに仕込まれた同期スクリプト。毎朝9時に自動実行 | スプレッドシートの「拡張機能 > Apps Script」 | 無料 |
| **Discord** | 幹部向け通知の受け口(Webhook) | Discordサーバー設定 | 無料 |
| **LINE Developers** | LINEボット(Messaging API)のチャンネル | developers.line.biz | 無料 |

> ⚠️ **費用の注意**: 現在の規模(数百人・低頻度アクセス)ならGCPはほぼ無料枠に収まるが、請求先アカウント(クレジットカード)が誰かに紐づいている。[handover.md](handover.md) の台帳を必ず埋めること。

---

## 設定値・シークレットの完全な台帳

**このリポジトリのコードだけでは本番は動かない。** 以下の設定が各サービスの管理画面に手動で入っている。これが失われると復旧できないので、必ず把握しておくこと。

### Cloud Run「circle-api」の環境変数

Cloud Runコンソール → circle-api → 「新しいリビジョンの編集とデプロイ」→「変数とシークレット」で確認・変更できる。

| 環境変数 | 役割 | 消えるとどうなるか |
|---------|------|------------------|
| `GCP_PROJECT_ID` | Firestoreの接続先プロジェクト | API全体が起動しない |
| `SHEET_SYNC_SECRET` | シート同期の合言葉。GAS側の `APP_SYNC_TOKEN` と**同じ値**にする | 毎朝のシート同期が401エラーで止まる |
| `LINE_CHANNEL_SECRET` | LINE Webhookの署名検証キー(LINE Developersのチャンネル基本設定にある値) | LINE連携が動かなくなる |
| `DISCORD_WEBHOOK_ALL` | 全体通知チャンネルのWebhook URL | Discord通知が来なくなる |
| `DISCORD_WEBHOOK_SYNC` | シート同期競合の通知先(未設定なら `_ALL` に飛ぶ) | 競合通知が全体チャンネルに混ざる |
| `DISCORD_WEBHOOK_<ジャンル大文字>` | ジャンル別通知(例: `DISCORD_WEBHOOK_HIPHOP`) | そのジャンルの通知が来なくなる |
| `DISCORD_SYNC_MENTION_ROLE_IDS` | 競合通知でメンションするDiscordロールID(カンマ区切り) | メンションが飛ばなくなるだけ |

> ⚠️ **重要**: これらは**Cloud Runにしか存在しない**(Terraformにも GitHub にも記録がない)。リビジョン編集時に「変数を引き継ぐ」を外すと全部消える。変更前に必ず現在値をメモすること。

### GAS(スプレッドシート側)のスクリプトプロパティ

Apps Scriptエディタ → プロジェクトの設定 → スクリプトプロパティ。

| プロパティ | 役割 |
|-----------|------|
| `APP_API_URL` | アプリAPIのURL(Cloud RunのURL) |
| `APP_SYNC_TOKEN` | 同期の合言葉。Cloud Runの `SHEET_SYNC_SECRET` と**同じ値** |

### Vercelの環境変数

Vercelダッシュボード → プロジェクト → Settings → Environment Variables。

| 環境変数 | 役割 |
|---------|------|
| `NEXT_PUBLIC_API_URL` | バックエンドAPIのURL(Cloud RunのURL)。**`NEXT_PUBLIC_API_BASE_URL` ではない**(過去の資料の誤記) |

### GitHubリポジトリのSecrets

Settings → Secrets and variables → Actions。バックエンド自動デプロイ用。

| Secret | 役割 |
|--------|------|
| `GCP_SA_KEY` | GCPサービスアカウントのJSONキー |
| `GCP_PROJECT_ID` | GCPプロジェクトID |

> ⚠️ 2026年7月時点で**未設定のため自動デプロイは失敗する**。`main` にマージしても本番のバックエンドには反映されない。手動デプロイ手順は [operations.md](operations.md) 参照。

### その他の手動設定

| 設定 | 場所 | 内容 |
|------|------|------|
| Firebase StorageのCORS | `gsutil` コマンドで適用 | フロントから画像を直接アップロードするための許可設定。手順はルート [README.md](../README.md#firebase-storageの設定) |
| Firestoreセキュリティルール | Firebaseコンソール | 現在は全開放(`allow read, write: if true`)。APIサーバー経由の設計なので閉じるとStorage以外は影響ないが、変更は慎重に |
| GASの時間トリガー | Apps Scriptエディタ → トリガー | `syncAll` を毎日午前9時に実行。**設定した人のGoogleアカウントで動く**(重要: [handover.md](handover.md) 参照) |
| LINE WebhookのURL | LINE Developersコンソール | `https://<Cloud RunのURL>/api/line/webhook` を登録 |

---

## デプロイの経路

| 対象 | 経路 | 状態 |
|------|------|------|
| フロントエンド | `main` にpush → Vercelが自動デプロイ | ✅ 動いている |
| バックエンド | `main` の `be/` 配下にpush → GitHub Actions(`.github/workflows/deploy-api.yml`)がCloud Runへデプロイ | ⚠️ Secrets未設定で失敗中。手動デプロイで代替([operations.md](operations.md)) |

---

## Terraform (`infra/terraform/`) について

GCPリソースをコードで管理するためのTerraform定義があるが、**現在の本番環境はTerraformで作られたものではなく、実態は手動管理**。`terraform.tfvars` も本番値では用意されていない。

- 中身: API有効化・Firestore・Cloud Run・Secret Managerの定義
- Gemini(AI)関連の定義が含まれるが、**アプリはGeminiを使っていない**(初期構想の残骸。applyすると不要なAPIが有効化されるだけ)
- 今からインフラをいじる場合、Terraformを頑張って本番に合わせるより、この文書と各サービスの管理画面で運用するほうが現実的

---

## ⚠️ 危険物: `scripts/` のNode.jsスクリプト

`scripts/seed-members.mjs` と `scripts/import-practices.mjs` は**本番のFirestoreに直接書き込む**移行用スクリプト。ローカル開発用の `make seed`(安全)とは別物。

- 実行ガードがなく、手元で `node scripts/seed-members.mjs` すると**そのまま本番データが書き換わる**
- 通常運用で使うことはない。メンバー追加はアプリのプロフィール画面(admin機能)から行うこと
- 中身を理解せずに実行しない
