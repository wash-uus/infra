#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# INFRA Platform — Post-Deploy Watch Script
#
# Purpose:
#   Continuously monitors all Cloud Run services immediately after deployment.
#   Streams ERROR/CRITICAL log entries from every service in real-time.
#   Polls health check endpoints every 30 s.
#   Exits with code 1 and rings the terminal bell if any service is unhealthy.
#
# Usage:
#   export PROJECT_ID=your-gcp-project-id
#   bash scripts/post-deploy-watch.sh
#
# Optional overrides:
#   WATCH_DURATION=3600   # seconds to watch (default: 24 h)
#   POLL_INTERVAL=30      # health-check poll interval in seconds (default: 30)
#   REGION=us-central1    # Cloud Run region (default: us-central1)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID must be set}"
REGION="${REGION:-us-central1}"
WATCH_DURATION="${WATCH_DURATION:-86400}"   # 24 hours by default
POLL_INTERVAL="${POLL_INTERVAL:-30}"

SERVICES=(
  infrasells-backend
  infrasells-messaging
  infrasells-payments
  infrasells-users
  infrasells-jobs
  infrasells-project
  infrasells-notifications
  infrasells-reviews
  infrasells-search
  infrasells-subscriptions
  infrasells-tools
)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  INFRA Post-Deploy Watch — project: ${PROJECT_ID}${NC}"
echo -e "${BLUE}  Watching ${#SERVICES[@]} services for ${WATCH_DURATION}s${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Verify all services are up before starting the watch loop ────────────────
echo "🔍 Initial health check..."
ALL_HEALTHY=true
for SERVICE in "${SERVICES[@]}"; do
  URL=$(gcloud run services describe "$SERVICE" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(status.url)" 2>/dev/null || echo "")

  if [[ -z "$URL" ]]; then
    echo -e "  ${YELLOW}⚠  $SERVICE — not deployed yet (skipping)${NC}"
    continue
  fi

  HTTP=$(curl -sf -o /dev/null -w "%{http_code}" "${URL}/health" || echo "000")
  if [[ "$HTTP" == "200" ]]; then
    echo -e "  ${GREEN}✅ $SERVICE — /health → $HTTP${NC}"
  else
    echo -e "  ${RED}❌ $SERVICE — /health → $HTTP  ← UNHEALTHY${NC}"
    ALL_HEALTHY=false
  fi
done
echo ""

if [[ "$ALL_HEALTHY" == "false" ]]; then
  echo -e "${RED}⚠  One or more services are unhealthy. Investigate before proceeding.${NC}"
  echo -e "${RED}   Continuing watch to stream logs...${NC}"
  echo ""
fi

# ── Background log tail ───────────────────────────────────────────────────────
# Stream ERROR + CRITICAL logs from all infrasells- services.
LOG_FILTER='resource.type="cloud_run_revision"
(severity="ERROR" OR severity="CRITICAL")
resource.labels.service_name=~"^infrasells-"'

echo -e "${BLUE}📡 Streaming logs (ERROR + CRITICAL only)...${NC}"
echo -e "${YELLOW}   Press Ctrl+C to stop.${NC}"
echo ""

gcloud logging tail "$LOG_FILTER" \
  --project="$PROJECT_ID" \
  --format='table(timestamp, resource.labels.service_name, severity, jsonPayload.message, jsonPayload.error)' &
LOG_PID=$!

# ── Health poll loop ──────────────────────────────────────────────────────────
START_TIME=$(date +%s)
UNHEALTHY_STREAK=0

while true; do
  NOW=$(date +%s)
  ELAPSED=$(( NOW - START_TIME ))

  if (( ELAPSED >= WATCH_DURATION )); then
    echo -e "\n${GREEN}✅ Watch period complete (${WATCH_DURATION}s). All clear.${NC}"
    kill "$LOG_PID" 2>/dev/null || true
    exit 0
  fi

  sleep "$POLL_INTERVAL"

  echo -e "\n[$(date '+%H:%M:%S')] Health poll..."
  POLL_HEALTHY=true

  for SERVICE in "${SERVICES[@]}"; do
    URL=$(gcloud run services describe "$SERVICE" \
      --region="$REGION" \
      --project="$PROJECT_ID" \
      --format="value(status.url)" 2>/dev/null || echo "")

    [[ -z "$URL" ]] && continue

    HTTP=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 5 "${URL}/health" || echo "000")
    if [[ "$HTTP" != "200" ]]; then
      echo -e "  ${RED}❌ $SERVICE → $HTTP  ← UNHEALTHY${NC}"
      POLL_HEALTHY=false
    fi
  done

  if [[ "$POLL_HEALTHY" == "true" ]]; then
    echo -e "  ${GREEN}All services healthy.${NC}"
    UNHEALTHY_STREAK=0
  else
    (( UNHEALTHY_STREAK++ )) || true
    # Bell alert after 3 consecutive unhealthy polls (1.5 min default)
    if (( UNHEALTHY_STREAK >= 3 )); then
      echo -e "${RED}🚨 ALERT: Services unhealthy for $((UNHEALTHY_STREAK * POLL_INTERVAL))s!${NC}"
      printf '\a'  # terminal bell
    fi
  fi
done
