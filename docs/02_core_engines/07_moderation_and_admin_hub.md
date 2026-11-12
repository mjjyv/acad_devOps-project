# Module M7: Kiểm Duyệt, Chống Spam & Kiểm Toán Bất Biến (Moderation & Admin Hub v2.2)

> **Mã tài liệu:** `CORE-ADMIN-MODERATION`  
> **Khung chuẩn:** Giai đoạn 4 & 5 trong [`SYSTEM ANALYSIS & DESIGN LIFECYCLE FRAMEWORK.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/SYSTEM%20ANALYSIS%20%26%20DESIGN%20LIFECYCLE%20FRAMEWORK.md)  
> **Mã nguồn triển khai:** [`services/moderation`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/moderation), [`admin-router.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/routes/admin-router.ts), [`report-router.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/routes/report-router.ts), [`apps/web/src/app/admin/page.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/admin/page.tsx)

---

## 1. PHẠM VI, ACTORS & QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

- **Actors:** `ACT-02 Member` (gửi báo cáo vi phạm `THREAD`/`COMMENT` qua `ReportModal`), `ACT-04 GLOBAL_MOD` & `ACT-05 ADMIN` (truy cập `/admin` & `/api/v1/admin/*` qua `adminGuard`).
- **Chống spam Báo cáo:** Partial Unique Index `uq_pending_report_per_user_target` chặn người dùng gửi trùng báo cáo `PENDING` cho cùng một đối tượng (trả HTTP **409 Conflict**).
- **Shadowban (`status = 'SHADOWBANNED'`):** Bài viết/bình luận của tài khoản bị shadowban vẫn hiển thị với chính họ nhưng ẩn khỏi feed người khác.
- **Audit Trail Bất Biến (`audit_logs`):** Trigger `trg_audit_logs_immutability` (`BEFORE UPDATE OR DELETE`) chặn tuyệt đối mọi sửa đổi/xóa log kiểm toán ở tầng nhân CSDL.

---

## 2. BIỂU ĐỒ HOẠT ĐỘNG (ACTIVITY DIAGRAM — BÁO CÁO & XỬ LÝ MOD QUEUE)

```mermaid
flowchart TD
    Start(["User bấm Report trên PostCard hoặc CommentItem"]) --> SubmitReport["POST /api/v1/reports { targetType, targetId, reason }"]
    SubmitReport --> DupCheck{"Đã có report PENDING của user này cho target?"}
    DupCheck -- Có --> Return409["Trả HTTP 409 Duplicate Pending Report"]
    DupCheck -- Không --> InsertReport["INSERT INTO reports (status = PENDING)"]
    InsertReport --> ModView["Admin/GlobalMod mở /admin -> Tab Báo cáo"]
    ModView --> ModAction{"Quyết định xử lý?"}
    ModAction -- Resolve --> ResolveFlow["Cập nhật status=RESOLVED, resolved_by, resolved_at, note"]
    ModAction -- Dismiss --> DismissFlow["Cập nhật status=DISMISSED, resolved_by, resolved_at, note"]
    ResolveFlow --> WriteAudit["INSERT INTO audit_logs (Append-only)"]
    DismissFlow --> WriteAudit
```

---

## 3. BIỂU ĐỒ TUẦN TỰ (SEQUENCE DIAGRAM — KHÓA USER / SHADOWBAN & AUDIT LOG)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin / GlobalMod
    participant UI as /admin Console
    participant Gateway as AdminRouter (authGuard + adminGuard)
    participant ModSvc as ModerationService
    participant Redis as RedisSessionStore
    participant DB as PostgreSQL (users, reports, audit_logs)

    Admin->>UI: Chuyển trạng thái user sang SUSPENDED hoặc SHADOWBANNED
    UI->>Gateway: PATCH /api/v1/admin/users/:id/status { status }
    Gateway->>Gateway: Kiểm tra JWT role IN ('ADMIN', 'GLOBAL_MOD')
    Gateway->>ModSvc: updateUserStatus(actorId, targetUserId, status, meta)
    ModSvc->>DB: UPDATE users SET status = $1
    alt status == SUSPENDED
        ModSvc->>Redis: Thu hồi toàn bộ phiên session:{targetUserId}:*
        ModSvc->>DB: UPDATE user_sessions SET is_revoked = TRUE
    end
    ModSvc->>DB: INSERT INTO audit_logs (actor_id, action: USER_STATUS_CHANGED)
    ModSvc-->>UI: HTTP 200 OK
```

---

## 4. BIỂU ĐỒ TRẠNG THÁI (STATE MACHINE — VÒNG ĐỜI REPORT & USER STATUS)

```mermaid
stateDiagram-v2
    state "Vòng đời Report (reports.status)" as Rep {
        [*] --> PENDING
        PENDING --> RESOLVED : Mod Resolve (resolved_at != NULL)
        PENDING --> DISMISSED : Mod Dismiss (resolved_at != NULL)
    }
    state "Vòng đời Tài khoản (users.status)" as Usr {
        [*] --> ACTIVE
        ACTIVE --> SHADOWBANNED : Cấm ngầm (ẩn khỏi feed công khai)
        ACTIVE --> SUSPENDED : Khóa tài khoản + thu hồi toàn bộ phiên
        SHADOWBANNED --> ACTIVE : Khôi phục
        SUSPENDED --> ACTIVE : Mở khóa
        ACTIVE --> DELETED : Xóa tài khoản
    }
```

---

## 5. BIỂU ĐỒ LỚP MIỀN & RÀNG BUỘC DB

```mermaid
classDiagram
    class ModerationService {
        +getAdminStats()
        +createReport(reporterId, input)
        +listReports(filters)
        +resolveReport(actorId, reportId, input)
        +updateUserRole(actorId, targetId, role)
        +updateUserStatus(actorId, targetId, status)
        +pinThread(actorId, threadId, pinned)
        +lockThread(actorId, threadId, locked)
        +listAuditLogs(filters)
    }
    class PostgresModerationRepository {
        +insertAuditLog(entry)
        +enforceImmutabilityTrigger()
    }

    ModerationService --> PostgresModerationRepository : persists reports & immutable audit
```
