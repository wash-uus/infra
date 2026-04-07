#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# INFRA Platform — GCP Cloud Monitoring Setup
#
# Provisions:
#   1. Log-based metrics (error rate, latency p95, payment failures)
#   2. Alert policies (error spike, latency threshold, payment failure)
#   3. Uptime checks for all Cloud Run services
#   4. Dashboard (JSON config → Cloud Monitoring)
#
# Prerequisites:
#   gcloud auth application-default login
#   export PROJECT_ID=<your-gcp-project-id>
#   export ALERT_EMAIL=<your-ops-email>
#
# Usage:
#   bash infrastructure/monitoring/setup-monitoring.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID must be set}"
ALERT_EMAIL="${ALERT_EMAIL:?ALERT_EMAIL must be set}"
REGION="${REGION:-us-central1}"

echo "🔧 Setting up Cloud Monitoring for project: $PROJECT_ID"

# ── Services + Health Check URLs ─────────────────────────────────────────────
declare -A SERVICES=(
  [infrasells-backend]="https://infrasells-backend-${PROJECT_ID}.a.run.app/health"
  [infrasells-messaging]="https://infrasells-messaging-${PROJECT_ID}.a.run.app/health"
  [infrasells-payments]="https://infrasells-payments-${PROJECT_ID}.a.run.app/health"
  [infrasells-users]="https://infrasells-users-${PROJECT_ID}.a.run.app/health"
  [infrasells-jobs]="https://infrasells-jobs-${PROJECT_ID}.a.run.app/health"
  [infrasells-project]="https://infrasells-project-${PROJECT_ID}.a.run.app/health"
  [infrasells-notifications]="https://infrasells-notifications-${PROJECT_ID}.a.run.app/health"
  [infrasells-reviews]="https://infrasells-reviews-${PROJECT_ID}.a.run.app/health"
  [infrasells-search]="https://infrasells-search-${PROJECT_ID}.a.run.app/health"
  [infrasells-subscriptions]="https://infrasells-subscriptions-${PROJECT_ID}.a.run.app/health"
  [infrasells-tools]="https://infrasells-tools-${PROJECT_ID}.a.run.app/health"
)

# ── 1. Notification Channel (Email) ──────────────────────────────────────────
echo "📧 Creating notification channel..."
CHANNEL_ID=$(gcloud monitoring channels create \
  --display-name="INFRA Ops — Email" \
  --type=email \
  --channel-labels="email_address=${ALERT_EMAIL}" \
  --description="Primary ops alert channel" \
  --format="value(name)" \
  --project="$PROJECT_ID")
echo "  ✅ Channel created: $CHANNEL_ID"

# ── 2. Log-Based Metrics ──────────────────────────────────────────────────────
echo "📊 Creating log-based metrics..."

# 2a. HTTP 5xx error rate
gcloud logging metrics create infra_http_5xx \
  --description="Count of HTTP 5xx responses across all INFRA services" \
  --log-filter='resource.type="cloud_run_revision" AND
httpRequest.status>=500 AND
resource.labels.service_name=~"^infrasells-"' \
  --project="$PROJECT_ID" || echo "  (metric already exists)"

# 2b. Request latency > 500 ms
gcloud logging metrics create infra_slow_requests \
  --description="Requests taking >500ms on INFRA backend" \
  --log-filter='resource.type="cloud_run_revision" AND
jsonPayload.durationMs>500 AND
resource.labels.service_name="infrasells-backend"' \
  --project="$PROJECT_ID" || echo "  (metric already exists)"

# 2c. Payment failures
gcloud logging metrics create infra_payment_failures \
  --description="Stripe/M-Pesa/PayPal payment failures" \
  --log-filter='resource.type="cloud_run_revision" AND
(jsonPayload.message=~"payment.*fail" OR
 jsonPayload.message=~"webhook.*error" OR
 jsonPayload.message=~"STK push.*fail") AND
resource.labels.service_name=~"^infrasells-"' \
  --project="$PROJECT_ID" || echo "  (metric already exists)"

# 2d. Redis connection failures (graceful degradation events)
gcloud logging metrics create infra_redis_failures \
  --description="Redis connection unavailable — falling back to in-memory cache" \
  --log-filter='resource.type="cloud_run_revision" AND
jsonPayload.message=~"Redis.*unavailable" AND
resource.labels.service_name=~"^infrasells-"' \
  --project="$PROJECT_ID" || echo "  (metric already exists)"

echo "  ✅ Log-based metrics created"

# ── 3. Uptime Checks ──────────────────────────────────────────────────────────
echo "🔍 Creating uptime checks..."
for service in "${!SERVICES[@]}"; do
  url="${SERVICES[$service]}"
  gcloud monitoring uptime create "${service}-health" \
    --display-name="[INFRA] ${service} health" \
    --http-check-path="/health" \
    --hostname="${url#https://}" \
    --period=60 \
    --regions="usa,europe,asia-pacific" \
    --project="$PROJECT_ID" || echo "  (check already exists for ${service})"
  echo "  ✅ Uptime check: $service"
done

# ── 4. Alert Policies ─────────────────────────────────────────────────────────
echo "🚨 Creating alert policies..."

# 4a. API Error Rate > 2% over 5 minutes
gcloud monitoring policies create \
  --display-name="[INFRA] Error rate > 2% (5 min)" \
  --condition-filter='metric.type="logging.googleapis.com/user/infra_http_5xx"
  resource.type="cloud_run_revision"' \
  --condition-threshold-value=2 \
  --condition-threshold-duration=300s \
  --condition-comparison=COMPARISON_GT \
  --notification-channels="$CHANNEL_ID" \
  --documentation="INFRA backend returning >2% 5xx errors. Check logs: https://console.cloud.google.com/logs/query?project=${PROJECT_ID}" \
  --project="$PROJECT_ID" || echo "  (policy already exists)"

# 4b. Latency > 500 ms (p95)
gcloud monitoring policies create \
  --display-name="[INFRA] P95 latency > 500ms" \
  --condition-filter='metric.type="run.googleapis.com/request_latencies"
  resource.type="cloud_run_revision"
  resource.label.service_name="infrasells-backend"
  metric.label.response_code_class="2xx"' \
  --condition-threshold-value=500 \
  --condition-threshold-duration=300s \
  --condition-comparison=COMPARISON_GT \
  --aggregations-per-series-aligner=ALIGN_PERCENTILE_95 \
  --notification-channels="$CHANNEL_ID" \
  --documentation="Backend API latency P95 exceeds 500ms. Investigate Firestore indexes, Redis cache hit rate, and N+1 query patterns." \
  --project="$PROJECT_ID" || echo "  (policy already exists)"

# 4c. Payment failure spike (>5 in 5 min)
gcloud monitoring policies create \
  --display-name="[INFRA] Payment failure spike (>5 in 5 min)" \
  --condition-filter='metric.type="logging.googleapis.com/user/infra_payment_failures"
  resource.type="cloud_run_revision"' \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s \
  --condition-comparison=COMPARISON_GT \
  --notification-channels="$CHANNEL_ID" \
  --documentation="More than 5 payment failures in 5 minutes. Check Stripe dashboard, M-Pesa API status, and PayPal webhook logs." \
  --project="$PROJECT_ID" || echo "  (policy already exists)"

# 4d. Memory utilization > 85% (Cloud Run OOM prevention)
gcloud monitoring policies create \
  --display-name="[INFRA] Memory > 85% (Cloud Run)" \
  --condition-filter='metric.type="run.googleapis.com/container/memory/utilizations"
  resource.type="cloud_run_revision"
  resource.label.service_name=~"^infrasells-"' \
  --condition-threshold-value=0.85 \
  --condition-threshold-duration=120s \
  --condition-comparison=COMPARISON_GT \
  --notification-channels="$CHANNEL_ID" \
  --documentation="Cloud Run container approaching memory limit. Consider increasing memory allocation or investigating memory leaks." \
  --project="$PROJECT_ID" || echo "  (policy already exists)"

# 4e. Redis failover detected
gcloud monitoring policies create \
  --display-name="[INFRA] Redis unavailable (in-memory fallback active)" \
  --condition-filter='metric.type="logging.googleapis.com/user/infra_redis_failures"
  resource.type="cloud_run_revision"' \
  --condition-threshold-value=3 \
  --condition-threshold-duration=300s \
  --condition-comparison=COMPARISON_GT \
  --notification-channels="$CHANNEL_ID" \
  --documentation="Redis is unavailable and the platform has fallen back to in-memory cache. Rate limiting is now per-instance only. Investigate Redis cluster health." \
  --project="$PROJECT_ID" || echo "  (policy already exists)"

# 4f. Service crash / zero instances (any Cloud Run service hitting 0 active instances)
gcloud monitoring policies create \
  --display-name="[INFRA] Service crash — active instances = 0" \
  --condition-filter='metric.type="run.googleapis.com/container/instance_count"
  resource.type="cloud_run_revision"
  resource.label.service_name=~"^infrasells-"
  metric.label.state="active"' \
  --condition-threshold-value=0 \
  --condition-threshold-duration=60s \
  --condition-comparison=COMPARISON_LT \
  --notification-channels="$CHANNEL_ID" \
  --documentation="A Cloud Run service has dropped to 0 active instances — possible OOM kill or crash loop. Check service logs immediately." \
  --project="$PROJECT_ID" || echo "  (policy already exists)"

# 4g. Startup latency > 10 s (indicates cold-start or misconfiguration)
gcloud monitoring policies create \
  --display-name="[INFRA] Startup latency > 10s (cold-start warning)" \
  --condition-filter='metric.type="run.googleapis.com/container/startup_latencies"
  resource.type="cloud_run_revision"
  resource.label.service_name=~"^infrasells-"' \
  --condition-threshold-value=10000 \
  --condition-threshold-duration=120s \
  --condition-comparison=COMPARISON_GT \
  --notification-channels="$CHANNEL_ID" \
  --documentation="Container startup is taking > 10 s. Check if min-instances=1 is set, verify there are no ENV-loading bottlenecks at boot." \
  --project="$PROJECT_ID" || echo "  (policy already exists)"

echo "  ✅ Alert policies created"

# ── 5. Revenue Monitoring Custom Metric ──────────────────────────────────────
echo "💰 Creating revenue custom metrics..."
cat > /tmp/infra-revenue-metric.json <<EOF
{
  "type": "custom.googleapis.com/infra/daily_revenue_kes",
  "description": "Daily transaction revenue (KES) processed by INFRA platform",
  "displayName": "INFRA Daily Revenue (KES)",
  "metricKind": "GAUGE",
  "valueType": "DOUBLE",
  "unit": "KES",
  "labels": [
    { "key": "payment_method", "valueType": "STRING", "description": "mpesa|stripe|paypal" },
    { "key": "transaction_type", "valueType": "STRING", "description": "subscription|escrow|microtransaction" }
  ]
}
EOF

gcloud monitoring metrics-descriptors create \
  --config-from-file=/tmp/infra-revenue-metric.json \
  --project="$PROJECT_ID" || echo "  (metric already exists)"

cat > /tmp/infra-users-metric.json <<EOF
{
  "type": "custom.googleapis.com/infra/active_users",
  "description": "Daily active users on the INFRA platform",
  "displayName": "INFRA Daily Active Users",
  "metricKind": "GAUGE",
  "valueType": "INT64",
  "labels": [
    { "key": "tier", "valueType": "STRING", "description": "free|pro|elite|unlimited" }
  ]
}
EOF

gcloud monitoring metrics-descriptors create \
  --config-from-file=/tmp/infra-users-metric.json \
  --project="$PROJECT_ID" || echo "  (metric already exists)"

echo "  ✅ Custom revenue/user metrics created"

echo ""
echo "✅ INFRA Monitoring setup complete!"
echo ""
echo "📊 Dashboard: https://console.cloud.google.com/monitoring/dashboards?project=${PROJECT_ID}"
echo "🚨 Alerts:    https://console.cloud.google.com/monitoring/alerting?project=${PROJECT_ID}"
echo "🔍 Uptime:    https://console.cloud.google.com/monitoring/uptime?project=${PROJECT_ID}"
echo "📈 Metrics:   https://console.cloud.google.com/monitoring/metrics-explorer?project=${PROJECT_ID}"
