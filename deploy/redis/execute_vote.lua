-- ============================================================================
-- ACAD COMMUNITY PLATFORM - REDIS ATOMIC VOTE PROCESSOR
-- File: execute_vote.lua
-- Complexity: O(1)
--
-- KEYS:
--   [1] thread:{target_id}:voters       (Hash: user_id -> direction)
--   [2] thread:{target_id}:counters     (Hash: upvotes, downvotes, net_score)
--   [3] dirty_threads_registry          (Set: stores target_id with state changes)
--
-- ARGV:
--   [1] user_id                         (String UUID)
--   [2] new_direction                   (Integer: 1 hoặc -1)
--   [3] target_id                       (String UUID)
-- ============================================================================

local voters_key = KEYS[1]
local counters_key = KEYS[2]
local dirty_registry_key = KEYS[3]

local user_id = ARGV[1]
local target_direction = tonumber(ARGV[2])
local target_id = ARGV[3]

local current_raw = redis.call('HGET', voters_key, user_id)
local current_direction = 0
if current_raw then
    current_direction = tonumber(current_raw)
end

local final_direction = 0

-- TRƯỜNG HỢP 1: BẤM LẠI NÚT CŨ -> HÀNH VI HỦY VOTE (UNVOTE)
if current_direction == target_direction then
    redis.call('HDEL', voters_key, user_id)
    if target_direction == 1 then
        redis.call('HINCRBY', counters_key, 'upvotes', -1)
        redis.call('HINCRBY', counters_key, 'net_score', -1)
    else
        redis.call('HINCRBY', counters_key, 'downvotes', -1)
        redis.call('HINCRBY', counters_key, 'net_score', 1)
    end
    final_direction = 0

-- TRƯỜNG HỢP 2: BẦU MỚI HOÀN TOÀN HOẶC ĐẢO CHIỀU (UPVOTE <-> DOWNVOTE)
else
    redis.call('HSET', voters_key, user_id, target_direction)
    if current_direction == 0 then
        -- Bầu mới
        if target_direction == 1 then
            redis.call('HINCRBY', counters_key, 'upvotes', 1)
            redis.call('HINCRBY', counters_key, 'net_score', 1)
        else
            redis.call('HINCRBY', counters_key, 'downvotes', 1)
            redis.call('HINCRBY', counters_key, 'net_score', -1)
        end
    else
        -- Đảo chiều (-1 sang +1 hoặc +1 sang -1)
        if target_direction == 1 then
            redis.call('HINCRBY', counters_key, 'upvotes', 1)
            redis.call('HINCRBY', counters_key, 'downvotes', -1)
            redis.call('HINCRBY', counters_key, 'net_score', 2)
        else
            redis.call('HINCRBY', counters_key, 'upvotes', -1)
            redis.call('HINCRBY', counters_key, 'downvotes', 1)
            redis.call('HINCRBY', counters_key, 'net_score', -2)
        end
    end
    final_direction = target_direction
end

-- Gắn cờ cần flush vào DB
redis.call('SADD', dirty_registry_key, target_id)

-- Đọc lại bộ đếm sau cập nhật
local upvotes = tonumber(redis.call('HGET', counters_key, 'upvotes') or '0')
local downvotes = tonumber(redis.call('HGET', counters_key, 'downvotes') or '0')
local net_score = tonumber(redis.call('HGET', counters_key, 'net_score') or '0')

return { final_direction, upvotes, downvotes, net_score }
