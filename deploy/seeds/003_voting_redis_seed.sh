#!/usr/bin/env bash
# ==============================================================================
# ĐỒNG BỘ BỘ ĐẾM BIỂU QUYẾT & VOTERS REDIS PHÂN HỆ 3
# Keyspace chính thức khớp deploy/redis/execute_vote.lua:
#   target:{targetId}:counters  |  target:{targetId}:voters
# File: deploy/seeds/003_voting_redis_seed.sh
# ==============================================================================
set -e

if [ -n "$REDIS_CLI" ]; then
  REDIS_CMD="$REDIS_CLI"
elif command -v redis-cli >/dev/null 2>&1; then
  REDIS_CMD="redis-cli"
else
  REDIS_CMD="podman exec -i acad-redis redis-cli"
fi

echo "--- Đang đồng bộ Bộ đếm Biểu quyết Phân hệ 3 vào Redis (target:{id}:*) ---"

ADMIN_ID="a0000000-0000-0000-0000-000000000001"
MOD_ID="a0000000-0000-0000-0000-000000000002"
ARCH_ID="a0000000-0000-0000-0000-000000000003"
CODER_ID="a0000000-0000-0000-0000-000000000004"
SPAMMER_ID="a0000000-0000-0000-0000-000000000005"

sync_target() {
  local tid="$1"
  local up="$2"
  local down="$3"
  local net="$4"
  $REDIS_CMD DEL "target:${tid}:counters" "target:${tid}:voters" >/dev/null
  $REDIS_CMD HSET "target:${tid}:counters" upvotes "$up" downvotes "$down" net_score "$net" >/dev/null
  $REDIS_CMD EXPIRE "target:${tid}:counters" 2592000 >/dev/null
}

sync_target "d0000000-0000-0000-0000-000000000001" 562 4 558
$REDIS_CMD HSET "target:d0000000-0000-0000-0000-000000000001:voters" "$ADMIN_ID" 1 "$MOD_ID" 1 "$CODER_ID" 1 >/dev/null
$REDIS_CMD EXPIRE "target:d0000000-0000-0000-0000-000000000001:voters" 2592000 >/dev/null

sync_target "d0000000-0000-0000-0000-000000000002" 428 2 426
$REDIS_CMD HSET "target:d0000000-0000-0000-0000-000000000002:voters" "$ARCH_ID" 1 "$ADMIN_ID" 1 "$SPAMMER_ID" -1 >/dev/null
$REDIS_CMD EXPIRE "target:d0000000-0000-0000-0000-000000000002:voters" 2592000 >/dev/null

sync_target "d0000000-0000-0000-0000-000000000003" 315 25 290
$REDIS_CMD HSET "target:d0000000-0000-0000-0000-000000000003:voters" "$ADMIN_ID" 1 "$ARCH_ID" 1 >/dev/null
$REDIS_CMD EXPIRE "target:d0000000-0000-0000-0000-000000000003:voters" 2592000 >/dev/null

sync_target "d0000000-0000-0000-0000-000000000004" 240 0 240
$REDIS_CMD HSET "target:d0000000-0000-0000-0000-000000000004:voters" "$ARCH_ID" 1 "$CODER_ID" 1 >/dev/null
$REDIS_CMD EXPIRE "target:d0000000-0000-0000-0000-000000000004:voters" 2592000 >/dev/null

sync_target "d0000000-0000-0000-0000-000000000005" 145 5 140
sync_target "d0000000-0000-0000-0000-000000000006" 289 0 289
$REDIS_CMD HSET "target:d0000000-0000-0000-0000-000000000006:voters" "$ADMIN_ID" 1 "$CODER_ID" 1 >/dev/null
$REDIS_CMD EXPIRE "target:d0000000-0000-0000-0000-000000000006:voters" 2592000 >/dev/null

sync_target "d0000000-0000-0000-0000-000000000007" 195 1 194
$REDIS_CMD HSET "target:d0000000-0000-0000-0000-000000000007:voters" "$ADMIN_ID" 1 "$MOD_ID" 1 >/dev/null
$REDIS_CMD EXPIRE "target:d0000000-0000-0000-0000-000000000007:voters" 2592000 >/dev/null

sync_target "d0000000-0000-0000-0000-000000000008" 48 0 48

# Comment 1 (e0...0001)
sync_target "e0000000-0000-0000-0000-000000000001" 18 0 18
$REDIS_CMD HSET "target:e0000000-0000-0000-0000-000000000001:voters" "$ADMIN_ID" 1 "$ARCH_ID" 1 >/dev/null
$REDIS_CMD EXPIRE "target:e0000000-0000-0000-0000-000000000001:voters" 2592000 >/dev/null

echo "✅ Đã đồng bộ thành công bộ đếm biểu quyết Redis Phân hệ 3 (target:{id}:*)."
