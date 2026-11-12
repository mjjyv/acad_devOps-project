# Real-User E2E Verification Gates

Run these checks against the live local API + PostgreSQL + Redis + Web App after the final edit.

## Gate 1: Database Invariant & Zero-Mock Audit (PostgreSQL + Redis)

Run reconciliation queries via `psql`:

1. **Vote Counter Consistency:**
   - For every thread: `tc.upvotes == COUNT(tv WHERE direction = 1)` and `tc.downvotes == COUNT(tv WHERE direction = -1)`.
   - Zero threads may have `upvotes + downvotes > (SELECT COUNT(*) FROM users)`.
2. **Comment Counter Consistency:**
   - `threads.comment_count` and `thread_counters.comment_count` must match the defined active comment rule (`COUNT(comments WHERE thread_id = t.id AND is_deleted = FALSE)` if hidden on soft-delete, or match soft-delete placeholder count consistently in both UI header and button).
3. **Space & User Denormalized Counters:**
   - `spaces.member_count == COUNT(space_memberships WHERE space_id = s.id)`
   - `spaces.thread_count == COUNT(threads WHERE space_id = s.id)`
   - `users.threads_count == COUNT(threads WHERE author_id = u.id)`
4. **Redis Sync Consistency:**
   - For every `target:{id}:counters` key in Redis, `upvotes`, `downvotes`, `net_score` match PostgreSQL `thread_counters` (or are actively queued in `dirty:votes` within the 5s flush window).

## Gate 2: Fresh Blank User Journey (2 Accounts: `fresh_a`, `fresh_b`)

1. Register `fresh_a` and `fresh_b` via `POST /api/v1/auth/register` (0 pre-seeded spaces, 0 channels).
2. **Navigation Distinction:**
   - Visit `Home`, `Popular`, `Explore` in sequence:
     - `Home` (authenticated, 0 spaces joined) -> displays empty joined state with clear CTA to `/explore` (or joined spaces feed once joined), distinct from `Popular`.
     - `Popular` -> displays global trending feed (`sort=hot`).
     - `Explore` (`/explore`) -> displays spaces directory, topics filter, member counts, working Join/Leave buttons.
     - `Topics` click -> filters real spaces/threads (no fake toast stub).
     - `Recent Posts` click -> navigates to `/threads/:id` (no fake toast stub).
3. **Auth Reload Persistence:**
   - Reload page after login -> session remains authenticated via refresh rotation (`GET /api/v1/auth/me` 200 OK).
4. **Vote & Comment Persistence:**
   - Upvote -> counter `+1`; click upvote again -> unvote (`0`); downvote -> `-1`; reload page -> `userVote` matches DB/Redis.
   - Create comment + nested reply -> reload page -> comment persists and matches author username.
5. **Two-User Realtime Chat Journey (from Empty State):**
   - `fresh_a` opens Chat widget / `/chat` (`Direct (0)`, `Groups (0)`, `Requests (0)`):
     - Uses **Create Chat / Search by username** to search `fresh_b` (prefix match, does NOT require memorizing full username).
     - Initiates 1-on-1 message `"Hello from fresh_a"`.
     - Verify `fresh_a` sees outgoing pending state (does not silently vanish into blank `Direct (0)`).
   - `fresh_b` opens Chat / receives SSE `chat_request:new`:
     - Sees `fresh_a` in **Incoming Requests** tab with Accept / Ignore / Block.
     - Clicks **Accept** -> creates `DIRECT` channel for both `fresh_a` and `fresh_b` via `channel:created` SSE.
   - `fresh_a` sends follow-up message -> appears in `fresh_b`'s channel via SSE `message:new` without page reload.
   - Opening the channel updates read cursor (`last_read_message_id`) and clears `unreadCount` cleanly.
   - Creating a Group chat forbids solo 1-person groups (requires at least 1 other distinct member).
   - Switching tabs (`Groups` <-> `Direct` when `Direct` has 0 channels) clears `selectedChannelId` so group messages never bleed into `Direct`.
