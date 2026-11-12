---
name: real-user-e2e-verification
description: >-
  Enforces real end-to-end verification from the perspective of a newly registered
  blank user across UI, API, and Database invariants. Activate whenever implementing,
  auditing, or verifying user-facing features, database changes, or reporting completion
  in order to eliminate HTTP-200-only sign-off, seeded-account bias, fake/simulated data,
  and superficial checklist ticking.
---

# Real-User End-to-End Verification & Anti-Slop Skill

Never claim a feature or phase is "complete" solely because TypeScript compiles, Vitest passes mocked/seeded unit tests, or `curl` returns `HTTP 200`.

## 5 Mandatory Rules Before Reporting Any Feature Done

1. **Reject HTTP-200 & SSR-Shell Illusion:**
   - Next.js Client Components (`'use client'`) return `HTTP 200` even when rendering empty loading placeholders or broken client handlers.
   - Verify actual DOM rendering and interactive execution (clicking links, tabs, forms, modals) via real headless browser execution (e.g. Playwright/Chromium) or, if no browser runtime is installed, explicitly report that GUI DOM interaction was not executed and trace every client state transition + API roundtrip end-to-end.

2. **Mandatory Fresh-Account Testing (`fresh_user_a` + `fresh_user_b`):**
   - Never validate a flow solely with pre-seeded accounts (`admin_pro`) that already have joined spaces, active channels, and pending requests.
   - Register at least one **brand-new blank user** (0 joined spaces, 0 channels, 0 votes, 0 posts) and run the complete empty-state journey:
     - Can the new user discover & join spaces from empty state (`/explore`)?
     - Can the new user open Chat from empty state, search another real user by username, initiate a 1-on-1 DM or Request, have `fresh_user_b` receive & accept it, and exchange real messages?
     - Does switching tabs reset stale selections instead of showing data from the previous tab?

3. **Verify End-to-End Consistency Over Checklist Existance:**
   - Having a `<Link>` tag, modal, or backend route does **not** mean the feature works.
   - Clickable navigation (`Home`, `Popular`, `Explore`, `Topics`, `Recent Posts`) must change URL/route, query distinct backend endpoints/filters, and update rendered posts — never `showToast(...)` stubs or duplicate URLs pointing to the exact same feed state.

4. **Zero Simulated or Inflated Data (`0% Fake Counters`):**
   - Counters stored in `thread_counters`, `threads`, `spaces`, `users` (`upvotes`, `downvotes`, `net_score`, `comment_count`, `member_count`, `thread_count`, `threads_count`, `karma_score`) must strictly match underlying rows in `thread_votes`, `comments`, `space_memberships`, and `threads`.
   - `upvotes + downvotes` on any seeded or live thread must never exceed the actual number of real voting rows/users.

5. **Strict Truthful Reporting:**
   - State exact scope tested (`fresh user` vs `seeded user`), exact SQL/API/UI checks executed *after* the last edit, and list any untested paths or browser limits openly.

## Procedure

Follow the verification gates in [e2e-verification-gates.md](./references/e2e-verification-gates.md) before marking any task complete:

1. Run **Database Invariant Audit** (reconcile counters against underlying vote/comment/membership tables in PostgreSQL and Redis).
2. Run **Fresh-User Cross-Account Flows** (Register `fresh_a` & `fresh_b` -> Feed/Explore -> Vote/Comment -> User Search -> Direct Chat / Request / Accept / Message -> Logout/Reload persistence).
3. Run **Interactive Navigation & Edge-State Audit** (test empty states, switching between empty/populated tabs, `Topics`, `Recent Posts`, `Home` vs `Popular` vs `Explore`).
4. Only after all gates pass with zero simulated data discrepancies may the task be reported complete.
