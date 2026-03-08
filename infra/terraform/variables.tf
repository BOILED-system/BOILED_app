variable "project_id" {
  type        = string
  description = "GCP project ID (existing project)"
}

variable "region" {
  type        = string
  default     = "asia-northeast1"
  description = "Default region for Cloud Run, etc."
}

variable "gemini_api_key" {
  type        = string
  sensitive   = true
  description = "Gemini API key (stored in Secret Manager). Leave empty to skip secret creation and set manually later."
  default     = ""
}

variable "cloud_run_api_image" {
  type        = string
  description = "Container image URL for the circle-api (e.g. gcr.io/PROJECT_ID/circle-api or ARTIFACT_REGISTRY URL). Set after first build."
  default     = ""
}
