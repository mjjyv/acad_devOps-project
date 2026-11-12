# Module M2: Không Gian Thảo Luận, Chủ Đề, Explore & CMS (Spaces & Content v2.2)

> **Mã tài liệu:** `CORE-SPACES-CMS`  
> **Khung chuẩn:** Giai đoạn 4 & 5 trong [`SYSTEM ANALYSIS & DESIGN LIFECYCLE FRAMEWORK.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/SYSTEM%20ANALYSIS%20%26%20DESIGN%20LIFECYCLE%20FRAMEWORK.md)  
> **Mã nguồn triển khai:** [`services/community`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community), [`apps/api/src/routes/community-router.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/routes/community-router.ts)

---

## 1. PHẠM VI, ACTORS & QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

- **Actors:** `ACT-01 Guest` (xem Space công khai & bài viết), `ACT-02 Member` (Explore/lọc Topic, Join/Leave, tạo Space, đăng bài `TEXT`/`LINK`/`MEDIA` + Flair, upload ảnh Zero-Hop), `ACT-03/05 Mod/Admin` (Pin/Unpin, Lock/Unlock, quản trị Rules/Flairs).
- **Space Riêng Tư (`is_private = TRUE`):** Mọi truy vấn bài viết hoặc bình luận trong Space riêng tư từ người không phải thành viên đều trả **HTTP 403 Forbidden**.
- **Post Flairs:** Gắn màu chuẩn Slate Indigo (`#E1D9BC` trên `#30364F`), mỗi Space có tập `slug` flair duy nhất (`uq_space_flair_slug`).
- **Zero-Hop Media Upload:** Client kiểm tra Magic Bytes/MIME -> xin Presigned PUT URL (`POST /api/v1/media/presigned-url`) -> upload trực tiếp S3/R2 không qua Node.js Gateway -> gắn URL đã qua [`SsrfGuard`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/security/ssrf-guard.ts) vào bài viết.

---

## 2. BIỂU ĐỒ HOẠT ĐỘNG (ACTIVITY DIAGRAM — EXPLORE, LỌC TOPIC & ĐĂNG BÀI)

```mermaid
flowchart TD
    Start(["User bấm Explore hoặc Topic ở Sidebar"]) --> OpenExplore["Mở trang /explore?topic=..."]
    OpenExplore --> FetchSpaces["Gọi GET /api/v1/spaces?topic=...&q=..."]
    FetchSpaces --> ShowList["Hiển thị Spaces thật kèm memberCount, threadCount, isJoined"]
    ShowList --> ClickJoin{"User bấm Join Space?"}
    ClickJoin -- Chưa đăng nhập --> PromptLogin["Mở AuthModal đăng nhập"]
    ClickJoin -- Đã đăng nhập --> JoinAPI["POST /api/v1/spaces/:slug/join"]
    JoinAPI --> TriggerCount["DB Trigger tăng spaces.member_count (+1)"]
    TriggerCount --> SubmitPost["Vào /submit chọn Space đã tham gia & Flair"]
    SubmitPost --> TypeCheck{"Loại bài viết?"}
    TypeCheck -- MEDIA --> UploadPut["Xin Presigned URL & PUT trực tiếp S3/R2"]
    TypeCheck -- LINK --> CheckSSRF["Kiểm duyệt URL qua SsrfGuard"]
    TypeCheck -- TEXT --> CreateThread["POST /api/v1/threads (Tạo bài & init thread_counters)"]
    UploadPut --> CreateThread
    CheckSSRF --> CreateThread
    CreateThread --> End(["Điều hướng sang /threads/:id"])
```

---

## 3. BIỂU ĐỒ TUẦN TỰ (SEQUENCE DIAGRAM — TRUY CẬP SPACE RIÊNG TƯ & ĐĂNG BÀI)

```mermaid
sequenceDiagram
    autonumber
    actor User as Web Client
    participant Gateway as CommunityRouter
    participant SpaceSvc as SpaceService / ThreadService
    participant DB as PostgreSQL (spaces, threads)

    User->>Gateway: GET /api/v1/spaces/:slug/threads
    Gateway->>SpaceSvc: listThreadsBySpace(slug, viewerId)
    SpaceSvc->>DB: SELECT space & check space_memberships(space_id, viewerId)

    alt is_private = TRUE và viewerId không phải thành viên
        SpaceSvc-->>Gateway: Throw SpacePrivateForbiddenError
        Gateway-->>User: HTTP 403 Forbidden (Hiển thị màn hình yêu cầu Join/Private)
    else Công khai hoặc là thành viên
        DB-->>SpaceSvc: Danh sách Threads + Flair + Keyset nextCursor
        SpaceSvc-->>Gateway: Items DTO
        Gateway-->>User: HTTP 200 OK
    end
```

---

## 4. BIỂU ĐỒ TRẠNG THÁI (STATE MACHINE — VÒNG ĐỜI BÀI VIẾT THREAD)

```mermaid
stateDiagram-v2
    [*] --> DRAFT_CLIENT : Đang soạn thảo tại /submit
    DRAFT_CLIENT --> PUBLISHED : POST /api/v1/threads (is_pinned=false, is_locked=false)
    PUBLISHED --> PINNED : Admin/Mod ghim bài (is_pinned=true)
    PINNED --> PUBLISHED : Admin/Mod bỏ ghim
    PUBLISHED --> LOCKED : Admin/Mod khóa bình luận (is_locked=true)
    LOCKED --> PUBLISHED : Admin/Mod mở khóa
    PUBLISHED --> DELETED : Xóa bài (ON DELETE CASCADE counters & comments)
    LOCKED --> DELETED : Xóa bài
    DELETED --> [*]
```

---

## 5. BIỂU ĐỒ LỚP MIỀN & CẬP NHẬT DB SUY XUẤT

```mermaid
classDiagram
    class SpaceService {
        +listSpaces(limit, offset, viewerId, topic, q)
        +createSpace(creatorId, input)
        +joinSpace(userId, slug)
        +leaveSpace(userId, slug)
        +listFlairs(slug)
    }
    class ThreadService {
        +createThread(authorId, input)
        +getThreadById(id, viewerId)
        +listSpaceThreads(slug, options)
        +searchSpaceThreads(slug, q, limit)
    }
    class ZeroHopStorageService {
        +generatePresignedUploadUrl(fileName, fileType)
    }

    SpaceService --> ThreadService : hosts
    ThreadService --> ZeroHopStorageService : attaches media
```

### Ràng buộc & Cập nhật DB suy xuất cho Giai đoạn B (`000007`)
1. **Bổ sung cột `spaces.topic` (`VARCHAR(64) NOT NULL DEFAULT 'DevOps & SRE'`) + Index `idx_spaces_topic`:** Bắt buộc để luồng `/explore` và 5 mục `Topics` trên `LeftSidebar` (`DevOps & SRE`, `Kubernetes Architecture`, `PostgreSQL 16 & Redis 7`, `Cloudflare Zero Trust`, `Debian Linux Homelab`) lọc đúng dữ liệu cộng đồng từ DB.
2. **Đảm bảo `spaces.member_count` & `spaces.thread_count`:** Trigger khớp 100% số bản ghi `space_memberships` và `threads` qua `reconcile_platform_counters()`.
