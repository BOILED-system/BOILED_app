# ---------------------------------------------------------------------------
# GCP インフラ: サークル向けWebアプリ (Google Hackathon)
# - 必要なAPI有効化 / Firestore / Secret Manager / Cloud Run
# ---------------------------------------------------------------------------

data "google_project" "project" {
  project_id = var.project_id
}

# --- API 有効化 ---
resource "google_project_service" "firestore" {
  project            = var.project_id
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "run" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secretmanager" {
  project            = var.project_id
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "generativelanguage" {
  project            = var.project_id
  service            = "generativelanguage.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  project            = var.project_id
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

# --- Firestore (Native mode) ---
resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = "asia-northeast1"
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.firestore]
}

# --- Gemini API Key (Secret Manager) ---
resource "google_secret_manager_secret" "gemini_key" {
  count     = var.gemini_api_key != "" ? 1 : 0
  project   = var.project_id
  secret_id = "gemini-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "gemini_key" {
  count       = var.gemini_api_key != "" ? 1 : 0
  secret      = google_secret_manager_secret.gemini_key[0].id
  secret_data = var.gemini_api_key
}

# Cloud Run のデフォルト SA にシークレット参照権限を付与
resource "google_secret_manager_secret_iam_member" "gemini_key_access" {
  count     = var.gemini_api_key != "" ? 1 : 0
  secret_id = google_secret_manager_secret.gemini_key[0].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# --- Cloud Run (circle-api) ---
# イメージをビルド・プッシュした後に cloud_run_api_image を設定して apply
resource "google_cloud_run_v2_service" "api" {
  count    = var.cloud_run_api_image != "" ? 1 : 0
  name     = "circle-api"
  project  = var.project_id
  location = var.region

  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = var.cloud_run_api_image

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      dynamic "env" {
        for_each = var.gemini_api_key != "" ? [1] : []
        content {
          name = "GEMINI_API_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.gemini_key[0].secret_id
              version = "latest"
            }
          }
        }
      }

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  depends_on = [google_project_service.run]
}

# 未認証で Cloud Run を呼べるようにする（ハッカソン用）
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  count    = var.cloud_run_api_image != "" ? 1 : 0
  project  = var.project_id
  location = google_cloud_run_v2_service.api[0].location
  name     = google_cloud_run_v2_service.api[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
