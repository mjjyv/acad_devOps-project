#!/usr/bin/env bash
# ==============================================================================
# ĐỒNG BỘ BỘ ĐẾM BIỂU QUYẾT & VOTERS REDIS TỪ POSTGRESQL (100% DỮ LIỆU THẬT)
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
  REDIS_CMD="podman exec acad-redis redis-cli"
fi

if [ -n "$DATABASE_URL" ] && command -v psql >/dev/null 2>&1; then
  PSQL_CMD="psql $DATABASE_URL"
else
  PSQL_CMD="podman exec acad-postgres psql -U postgres -d acad_dev"
fi

echo "--- Đang đồng bộ Bộ đếm Biểu quyết Redis từ PostgreSQL (0% Dữ liệu Giả Lập) ---"

# Dọn tập dirty:votes và toàn bộ target:* key cũ trước khi nạp lại sạch
$REDIS_CMD DEL "dirty:votes" >/dev/null </dev/null
existing_keys="$($REDIS_CMD KEYS 'target:*' </dev/null 2>/dev/null || true)"
if [ -n "$existing_keys" ]; then
  while IFS= read -r key <&3; do
    [ -n "$key" ] && $REDIS_CMD DEL "$key" >/dev/null </dev/null
  done 3<<< "$existing_keys"
fi

# 1. Đồng bộ thread_counters -> target:{thread_id}:counters
while IFS='|' read -r tid up down net <&3; do
  [ -z "$tid" ] && continue
  $REDIS_CMD HSET "target:${tid}:counters" upvotes "$up" downvotes "$down" net_score "$net" >/dev/null </dev/null
  $REDIS_CMD EXPIRE "target:${tid}:counters" 2592000 >/dev/null </dev/null
done 3< <($PSQL_CMD -tAc "SELECT thread_id || '|' || upvotes || '|' || downvotes || '|' || net_score FROM thread_counters;" </dev/null)

# 2. Đồng bộ thread_votes -> target:{thread_id}:voters
while IFS='|' read -r tid uid dir <&3; do
  [ -z "$tid" ] && continue
  $REDIS_CMD HSET "target:${tid}:voters" "$uid" "$dir" >/dev/null </dev/null
  $REDIS_CMD EXPIRE "target:${tid}:voters" 2592000 >/dev/null </dev/null
done 3< <($PSQL_CMD -tAc "SELECT thread_id || '|' || user_id || '|' || direction FROM thread_votes;" </dev/null)

# 3. Đồng bộ comments vote counters & comment_votes
while IFS='|' read -r cid up down net <&3; do
  [ -z "$cid" ] && continue
  $REDIS_CMD HSET "target:${cid}:counters" upvotes "$up" downvotes "$down" net_score "$net" >/dev/null </dev/null
  $REDIS_CMD EXPIRE "target:${cid}:counters" 2592000 >/dev/null </dev/null
done 3< <($PSQL_CMD -tAc "SELECT id || '|' || upvotes_count || '|' || downvotes_count || '|' || (upvotes_count - downvotes_count) FROM comments WHERE upvotes_count > 0 OR downvotes_count > 0;" </dev/null)

while IFS='|' read -r cid uid dir <&3; do
  [ -z "$cid" ] && continue
  $REDIS_CMD HSET "target:${cid}:voters" "$uid" "$dir" >/dev/null </dev/null
  $REDIS_CMD EXPIRE "target:${cid}:voters" 2592000 >/dev/null </dev/null
done 3< <($PSQL_CMD -tAc "SELECT comment_id || '|' || user_id || '|' || direction FROM comment_votes;" </dev/null)

echo "✅ Đã đồng bộ 100% bộ đếm & phiếu bầu thật từ PostgreSQL sang Redis."
