# Terraform: GCP インフラ

サークル向けWebアプリ用の GCP リソースをプロビジョニングします。

## 作成されるリソース

| リソース | 説明 |
|----------|------|
| **API有効化** | Firestore, Cloud Run, Secret Manager, Generative Language API, Cloud Build |
| **Firestore** | Native モードの (default) データベース（リージョン: asia-northeast1） |
| **Secret Manager** | Gemini API Key 用シークレット（変数で渡した場合のみ） |
| **Cloud Run** | circle-api サービス（イメージURLを指定した場合のみ） |

## 前提条件

- [Terraform](https://www.terraform.io/downloads) 1.5+
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) でログイン済み
- **既存の GCP プロジェクト**（プロジェクトIDを変数で指定）

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

## 使い方

### 1. 変数を設定

```bash
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集して project_id を設定
```

または環境変数で:

```bash
export TF_VAR_project_id="your-gcp-project-id"
export TF_VAR_gemini_api_key="your-gemini-api-key"   # 任意
```

### 2. 初回: API・Firestore・Secret だけ作成

```bash
terraform init
terraform plan
terraform apply
```

この時点では `cloud_run_api_image` が空なので、Cloud Run は作成されません。

### 3. API イメージをビルド・プッシュ

```bash
cd ../../be
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/circle-api
```

### 4. イメージを設定して Cloud Run をデプロイ

`terraform.tfvars` に追加（または `-var` で指定）:

```hcl
cloud_run_api_image = "gcr.io/YOUR_PROJECT_ID/circle-api:latest"
```

```bash
terraform apply
```

### 5. 出力を確認

```bash
terraform output cloud_run_api_url
```

この URL をフロントの `NEXT_PUBLIC_API_BASE_URL` に設定します（Vercel など）。

## 変数一覧

| 変数 | 必須 | 説明 |
|------|------|------|
| `project_id` | ✅ | GCP プロジェクトID |
| `region` | - | リージョン（デフォルト: asia-northeast1） |
| `gemini_api_key` | - | Gemini API Key。指定すると Secret Manager に保存し、Cloud Run に渡す |
| `cloud_run_api_image` | - | コンテナイメージURL。指定すると Cloud Run サービスを作成 |

## Gemini API Key を後から入れたい場合

1. [Secret Manager](https://console.cloud.google.com/security/secret-manager) で `gemini-api-key` を手動作成し、バージョンを追加
2. Cloud Run の「リビジョンを編集」で環境変数 `GEMINI_API_KEY` を手動設定（シークレット参照またはプレーンテキスト）

または、Terraform の変数に `gemini_api_key` を設定して再 apply すると、シークレットが作成され、次回 Cloud Run を更新するときに参照されます。

## 削除

```bash
terraform destroy
```

Firestore にデータがある場合は削除に時間がかかることがあります。
