provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}

# Firestore multi-region config
resource "google_firestore_database" "multi_region" {
  name         = "infrasells-firestore"
  location_id  = "nam5"   # Multi-region (nam5 = US multi-region)
  type         = "FIRESTORE_NATIVE"
}

# Redis (Cloud Memorystore) — HA, used by all Cloud Run services
resource "google_redis_instance" "main" {
  name                    = "infrasells-redis"
  tier                    = "STANDARD_HA"
  memory_size_gb          = 10
  region                  = var.gcp_region
  alternative_location_id = "us-east1"   # HA failover zone
}

# NOTE: All application services run on Google Cloud Run (managed).
# No GKE cluster is required. Services are deployed via:
#   gcloud run deploy <service> --image gcr.io/$PROJECT_ID/<service>:$SHA ...
# or the GitHub Actions pipeline in .github/workflows/backend.yml.

output "firestore_db" { value = google_firestore_database.multi_region.name }
output "redis_host"   { value = google_redis_instance.main.host }
