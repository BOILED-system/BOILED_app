# インフラ (infra/terraform/)

Terraform で GCP リソースを管理する。通常のバックエンドデプロイは GitHub Actions で自動化されているため、Terraform の操作は初回セットアップや構成変更時のみ必要。

---

## 作成されるリソース

| リソース | 説明 |
|----------|------|
| API有効化 | Firestore, Cloud Run, Secret Manager, Generative Language API |
| Firestore | Native モード (default) データベース（asia-northeast1） |
| Secret Manager | Gemini API Key 用シークレット（変数指定時のみ） |
| Cloud Run | circle-api サービス（イメージURL指定時のみ） |

---

## 前提条件

- [Terraform](https://www.terraform.io/downloads) 1.5+
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) でログイン済み
- 既存の GCP プロジェクト

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

---

## 初回セットアップ

### 1. 変数を設定

```bash
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集して project_id を設定
```

または環境変数で指定：

```bash
export TF_VAR_project_id="your-gcp-project-id"
export TF_VAR_gemini_api_key="your-gemini-api-key"  # 任意
```

### 2. Firestore・Secret Manager を作成

```bash
terraform init
terraform plan
terraform apply
```

この時点では `cloud_run_api_image` が空なので Cloud Run は作成されない。

### 3. 初回イメージをビルド・プッシュ

```bash
cd ../../be
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/circle-api
```

### 4. Cloud Run をデプロイ

`terraform.tfvars` に追加：

```hcl
cloud_run_api_image = "gcr.io/YOUR_PROJECT_ID/circle-api:latest"
```

```bash
terraform apply
```

### 5. フロントエンドの環境変数を設定

```bash
terraform output cloud_run_api_url
# -> この URL を Vercel の NEXT_PUBLIC_API_URL に設定
```

---

## 通常のデプロイフロー（初回セットアップ後）

mainブランチの `be/` 配下に変更をpushすると、GitHub Actions（`.github/workflows/deploy-api.yml`）が自動でビルド・Cloud Runへデプロイする。Terraformの操作は不要。

---

## 変数一覧

| 変数 | 必須 | 説明 |
|------|------|------|
| `project_id` | ✅ | GCP プロジェクトID |
| `region` | - | リージョン（デフォルト: asia-northeast1） |
| `gemini_api_key` | - | Gemini API Key。指定すると Secret Manager に保存し Cloud Run に渡す |
| `cloud_run_api_image` | - | コンテナイメージURL。指定すると Cloud Run サービスを作成 |

---

## Gemini API Key を後から追加したい場合

1. [Secret Manager](https://console.cloud.google.com/security/secret-manager) で `gemini-api-key` を手動作成してバージョンを追加
2. Cloud Run の「リビジョンを編集」で環境変数 `GEMINI_API_KEY` を設定

または `gemini_api_key` 変数を設定して `terraform apply` する。

---

## 削除

```bash
terraform destroy
```

Firestore にデータがある場合は削除に時間がかかることがある。
