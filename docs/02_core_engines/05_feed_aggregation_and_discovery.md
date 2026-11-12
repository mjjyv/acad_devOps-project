# Module M5: Bảng Tin Đa Thuật Toán, Điều Hướng & Tìm Kiếm (Feeds & Discovery v2.2)

> **Mã tài liệu:** `CORE-FEED-DISCOVERY`  
> **Khung chuẩn:** Giai đoạn 4 & 5 trong [`SYSTEM ANALYSIS & DESIGN LIFECYCLE FRAMEWORK.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/SYSTEM%20ANALYSIS%20%26%20DESIGN%20LIFECYCLE%20FRAMEWORK.md)  
> **Mã nguồn triển khai:** [`feed-service.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/services/feed-service.ts), [`apps/web/src/app/page.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/page.tsx), [`apps/web/src/components/layout/left-sidebar.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/layout/left-sidebar.tsx)

---

## 1. PHÂN BIỆT RÀNH MẠCH `HOME` vs `POPULAR` vs `EXPLORE`

- **Home (`/?tab=following`):** Bảng tin cá nhân hóa chỉ tổng hợp bài viết từ các Space người dùng đã Join (`space_memberships`). Nếu tài khoản mới chưa tham gia Space nào $\rightarrow$ hiển thị trạng thái rỗng kèm CTA dẫn tới `/explore`.
- **Popular (`/?tab=for_you&sort=hot`):** Bảng tin thịnh hành toàn sàn (tất cả Space công khai `is_private = FALSE`), sắp xếp mặc định theo `hot_score` (`Hot` / `New` / `Top` / `Best`).
- **Explore (`/explore` & `Topics`):** Trang danh bạ toàn bộ cộng đồng, lọc trực tiếp theo cột `spaces.topic` và tìm kiếm `pg_trgm`, cho phép Join/Leave ngay tại chỗ.
- **Recent Posts (`RightRail`):** Lưu lịch sử bài vừa mở ở trình duyệt và bấm vào phải điều hướng tới `/threads/[id]`.

---

## 2. BIỂU ĐỒ HOẠT ĐỘNG (ACTIVITY DIAGRAM — CHUYỂN ĐỔI BẢNG TIN & TÌM KIẾM)

```mermaid
flowchart TD
    Start(["User chọn mục trên LeftSidebar"]) --> Choice{"Chọn mục nào?"}
    Choice -- Home --> CheckLogin{"Đã đăng nhập?"}
    CheckLogin -- Chưa --> ShowGuestPrompt["Hiển thị lời mời Login + nút sang Popular"]
    CheckLogin -- Rồi --> HomeAPI["GET /api/v1/feed/home?strict=true"]
    HomeAPI --> HasSpaces{"Đã tham gia >= 1 Space?"}
    HasSpaces -- Chưa --> EmptyCTA["Hiển thị CTA Chưa tham gia Space -> mở /explore"]
    HasSpaces -- Có --> RenderFeed["Render Feed + Infinite Scroll Keyset Cursor"]
    Choice -- Popular --> PopAPI["GET /api/v1/feed/popular?sort=hot|new|top|best"]
    PopAPI --> RenderFeed
    Choice -- Explore hoặc Topic --> OpenExplore["Điều hướng /explore?topic=... -> GET /api/v1/spaces"]
```

---

## 3. BIỂU ĐỒ TUẦN TỰ (SEQUENCE DIAGRAM — KEYSET CURSOR & IN-SPACE SEARCH)

```mermaid
sequenceDiagram
    autonumber
    actor User as Web Client
    participant UI as HomePage / SpacePage
    participant API as FeedService / ThreadService
    participant DB as PostgreSQL (thread_counters, threads)

    User->>UI: Cuộn xuống cuối danh sách (IntersectionObserver)
    UI->>API: GET /api/v1/feed/popular?sort=hot&cursor=Base64(...)&limit=20
    API->>DB: Query Composite Index (hot_score, created_at, thread_id) < decodedCursor
    DB-->>API: Trang bài viết tiếp theo (20 items) + nextCursor mới
    API-->>UI: JSON { items, pagination: { nextCursor, hasMore } }

    User->>UI: Tìm kiếm trong /s/[slug] hoặc gõ '/' trên Header
    UI->>API: GET /api/v1/spaces/:slug/search?q=Podman
    API->>DB: GIN Trigram Index (idx_threads_title_trgm)
    DB-->>API: Danh sách Threads khớp từ khóa
```

---

## 4. BIỂU ĐỒ TRẠNG THÁI (STATE MACHINE — TRẠNG THÁI TẢI BẢNG TIN)

```mermaid
stateDiagram-v2
    [*] --> LOADING_INITIAL : Đổi tab / sort / spaceSlug
    LOADING_INITIAL --> EMPTY_NO_MEMBERSHIP : Home strict=true & chưa Join Space nào
    LOADING_INITIAL --> READY_HAS_MORE : Có items & hasMore=true
    LOADING_INITIAL --> READY_END : Có items & hasMore=false
    LOADING_INITIAL --> ERROR_RETRY : Mạng / API lỗi
    READY_HAS_MORE --> LOADING_MORE : Scroll chạm sentinelRef
    LOADING_MORE --> READY_HAS_MORE : Nối thêm items & cập nhật nextCursor
    LOADING_MORE --> READY_END : Hết dữ liệu (hasMore=false)
    EMPTY_NO_MEMBERSHIP --> LOADING_INITIAL : User vừa Join Space từ /explore
```

---

## 5. BIỂU ĐỒ LỚP MIỀN & CẬP NHẬT DB SUY XUẤT

```mermaid
classDiagram
    class FeedService {
        +getHomeFeed(userId, options)
        +getPopularFeed(viewerId, options)
        +decodeCursor(cursor)
        +encodeCursor(sortScore, createdAt, id)
    }
    class ThreadCounterIndexes {
        +idx_thread_counters_hot_feed
        +idx_thread_counters_best_feed
        +idx_thread_counters_top_feed
        +idx_thread_counters_new_feed
    }

    FeedService --> ThreadCounterIndexes : scans via Keyset O(log N)
```

### Ràng buộc & Cập nhật DB suy xuất cho Giai đoạn B (`000007`)
1. **Dùng Composite Indexes (`hot_score`, `wilson_score`, `net_score`, `created_at`):** Chỉ có giá trị thật khi `thread_counters` phản ánh đúng `thread_votes` (xóa bỏ seed ảo `562`).
2. **Hỗ trợ lọc Space theo `topic` cho `/explore`:** Kết nối bảng `spaces.topic` mới vào endpoint `GET /api/v1/spaces?topic=...`.
