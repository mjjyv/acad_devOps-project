#!/usr/bin/env bash
# ==============================================================================
# ĐỒNG BỘ SESSION REDIS MẪU PHÂN HỆ 1 (KEYSPACE & O(1) LOOKUP)
# File: deploy/seeds/001_auth_redis_seed.sh
# ==============================================================================
set -e

if [ -n "$REDIS_CLI" ]; then
  REDIS_CMD="$REDIS_CLI"
elif command -v redis-cli >/dev/null 2>&1; then
  REDIS_CMD="redis-cli"
else
  REDIS_CMD="podman exec -i acad-redis redis-cli"
fi

echo "--- Đang nạp dữ liệu phiên làm việc Phân hệ 1 vào Redis ---"

EXPIRES_AT="$(date -d '+7 days' -Iseconds)"
NOW_ISO="$(date -Iseconds)"
GRACE_EXP="$(date -d '+25 seconds' -Iseconds)"

# 1. Session 1: admin_pro (Active)
ADMIN_USER_ID="a0000000-0000-0000-0000-000000000001"
ADMIN_SESSION_ID="f1000000-0000-0000-0000-000000000001"
ADMIN_TOKEN_HASH="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

$REDIS_CMD HSET "session:${ADMIN_USER_ID}:${ADMIN_SESSION_ID}" \
  id "$ADMIN_SESSION_ID" \
  userId "$ADMIN_USER_ID" \
  currentTokenHash "$ADMIN_TOKEN_HASH" \
  previousTokenHash "" \
  gracePeriodExpiresAt "" \
  deviceFingerprint "debian13_xfce_x86_64_admin_station" \
  ipAddress "127.0.0.1" \
  userAgent "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0" \
  isRevoked "false" \
  expiresAt "$EXPIRES_AT" \
  createdAt "$NOW_ISO" \
  updatedAt "$NOW_ISO" >/dev/null

$REDIS_CMD EXPIRE "session:${ADMIN_USER_ID}:${ADMIN_SESSION_ID}" 604800 >/dev/null
$REDIS_CMD SETEX "session_lookup:${ADMIN_TOKEN_HASH}" 604800 "${ADMIN_USER_ID}:${ADMIN_SESSION_ID}" >/dev/null

# 2. Session 2: devops_coder (30s Grace Period)
CODER_USER_ID="a0000000-0000-0000-0000-000000000004"
CODER_SESSION_ID="f1000000-0000-0000-0000-000000000002"
CODER_CURRENT_HASH="a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"
CODER_PREV_HASH="1111111111111111111111111111111111111111111111111111111111111111"

$REDIS_CMD HSET "session:${CODER_USER_ID}:${CODER_SESSION_ID}" \
  id "$CODER_SESSION_ID" \
  userId "$CODER_USER_ID" \
  currentTokenHash "$CODER_CURRENT_HASH" \
  previousTokenHash "$CODER_PREV_HASH" \
  gracePeriodExpiresAt "$GRACE_EXP" \
  deviceFingerprint "macos_arm64_safari_developer" \
  ipAddress "192.168.1.150" \
  userAgent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15" \
  isRevoked "false" \
  expiresAt "$EXPIRES_AT" \
  createdAt "$NOW_ISO" \
  updatedAt "$NOW_ISO" >/dev/null

$REDIS_CMD EXPIRE "session:${CODER_USER_ID}:${CODER_SESSION_ID}" 604800 >/dev/null
$REDIS_CMD SETEX "session_lookup:${CODER_CURRENT_HASH}" 604800 "${CODER_USER_ID}:${CODER_SESSION_ID}" >/dev/null
$REDIS_CMD SETEX "session_lookup:${CODER_PREV_HASH}" 35 "${CODER_USER_ID}:${CODER_SESSION_ID}" >/dev/null

echo "✅ Đã nạp thành công bộ đệm phiên Redis Phân hệ 1."
