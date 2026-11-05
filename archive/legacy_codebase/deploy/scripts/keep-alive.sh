#!/bin/sh
# ============================================================================
# SPIN-DOWN MITIGATION SCRIPT (KEEP-ALIVE FOR RENDER FREE TIER)
# File: deploy/scripts/keep-alive.sh
# Gửi HTTP ping định kỳ mỗi 10 phút vào /healthz để container không bị ngủ đông
# ============================================================================

API_URL="${1:-http://localhost:8080/healthz}"
WEB_URL="${2:-http://localhost:3000/}"
INTERVAL_SECONDS="${3:-600}" # 10 phút = 600s

echo "================================================================="
echo "Bắt đầu Keep-Alive Worker cho hệ thống Acad Community Platform"
echo "API Endpoint : $API_URL"
echo "Web Endpoint : $WEB_URL"
echo "Chu kỳ ping  : mỗi $INTERVAL_SECONDS giây"
echo "================================================================="

while true; do
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  echo "[$TIMESTAMP] Đang gửi ping giữ ấm dịch vụ..."

  # Ping API Healthz
  API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" || echo "FAILED")
  echo "[$TIMESTAMP] API ($API_URL) phản hồi HTTP: $API_STATUS"

  # Ping Frontend Web
  WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL" || echo "FAILED")
  echo "[$TIMESTAMP] Web ($WEB_URL) phản hồi HTTP: $WEB_STATUS"

  sleep "$INTERVAL_SECONDS"
done
