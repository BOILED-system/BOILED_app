output "project_id" {
  value       = var.project_id
  description = "GCP project ID"
}

output "cloud_run_api_url" {
  value       = var.cloud_run_api_image != "" ? google_cloud_run_v2_service.api[0].uri : null
  description = "Cloud Run API service URL (set cloud_run_api_image and apply again after building image)"
}

output "gemini_api_key_secret_name" {
  value       = var.gemini_api_key != "" ? google_secret_manager_secret.gemini_key[0].name : null
  description = "Secret Manager secret name for Gemini API key"
}

output "next_steps" {
  value = <<-EOT
    1. Enable APIs and apply: terraform apply
    2. Build and push API image:
       cd be && gcloud builds submit --tag gcr.io/${var.project_id}/circle-api
    3. Set cloud_run_api_image = "gcr.io/${var.project_id}/circle-api:latest" (or the image you built)
    4. terraform apply again to deploy Cloud Run
    5. Set NEXT_PUBLIC_API_BASE_URL in your frontend (Vercel) to the Cloud Run URL
  EOT
}
