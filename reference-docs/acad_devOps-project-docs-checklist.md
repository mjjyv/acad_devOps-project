
## CHECKLIST

1. **Khảo sát & Định vị sản phẩm (Discovery & Product Definition)**
    - Xác định phạm vi MVP, mục tiêu kinh doanh và đối tượng người dùng mục tiêu.
    - Hoàn thiện tài liệu đặc tả yêu cầu sản phẩm (PRD), sơ đồ luồng người dùng (User Journey/Flows) và ma trận phân quyền.

2. **Thiết kế UI/UX & Kiến trúc hệ thống (Design & Architecture)**
    - Xây dựng wireframe, luồng tương tác và bộ Design System/UI Kit hoàn chỉnh trên Figma.
    - Thiết kế kiến trúc tổng thể, mô hình cơ sở dữ liệu (Database Schema), API Contract (OpenAPI/Swagger) và các phương án xử lý tải (Caching, Queue, Realtime).

3. **Thiết lập nền tảng & Môi trường phát triển (Foundation & DevOps Setup)**
    - Khởi tạo source code repository, quy chuẩn coding conventions, linting và Git workflow.
    - Thiết lập môi trường cục bộ qua Docker Compose (PostgreSQL, Redis, Storage mockup).
    - Xây dựng pipeline CI/CD cơ bản (tự động test, lint, build) và chuẩn bị môi trường Staging/Development.

4. **Phát triển tính năng cốt lõi (Core Development & Integration)**
    - Phát triển Backend: Xác thực (Auth), phân quyền (RBAC), logic nghiệp vụ, background workers và hạ tầng realtime (SSE/WebSocket).
    - Phát triển Frontend: Khung giao diện (Layouts), trình soạn thảo (Editor), bảng tin (Feed), cây bình luận và tối ưu hóa hiển thị.
    - Ghép nối tích hợp (Client-Server Integration), hoàn thiện các luồng xử lý dữ liệu động và phản hồi tức thì (Optimistic UI).

5. **Kiểm thử chất lượng & Tối ưu hiệu năng (QA, Security & Performance)**
    - Kiểm thử tự động (Unit Test, Integration Test, E2E) và kiểm thử hồi quy thủ công.
    - Đánh giá tải (Stress/Load Testing), tối ưu hóa truy vấn cơ sở dữ liệu, bộ nhớ đệm và Core Web Vitals.
    - Rà soát lỗ hổng bảo mật: Chống XSS, CSRF, kiểm soát hạn mức gọi API (Rate Limiting) và thiết lập Content Security Policy (CSP).

6. **Triển khai & Phát hành (Deployment & Launch)**
    - Thiết lập hạ tầng Production (Cloud servers, Managed DB, CDN, Object Storage, DNS).
    - Thực hiện di chuyển dữ liệu (Data Migration) và chạy thử nghiệm giới hạn (Closed Beta / Soft Launch).
    - Kích hoạt lập chỉ mục SEO (Sitemap, Metadata, Schema markup) và mở phát hành rộng rãi (Public Launch).

7. **Vận hành, Giám sát & Mở rộng (Operations & Maintenance)**
    - Thiết lập hệ thống giám sát thời gian thực: Metrics (Prometheus/Grafana), Centralized Logging (Loki) và cảnh báo lỗi (Sentry).
    - Xây dựng kịch bản sao lưu tự động (Automated Backups) và kế hoạch khôi phục sau sự cố (Disaster Recovery).
    - Tiếp nhận phản hồi người dùng, phân tích chỉ số giữ chân và lên kế hoạch lặp phiên bản tiếp theo.

---

### TÀI LIỆU KHẢO SÁT & ĐỊNH VỊ SẢN PHẨM (GIAI ĐOẠN 1)

---

#### 1. Khung cấu trúc Bộ tài liệu Đặc tả Yêu cầu Sản phẩm (PRD Template)

Một bản PRD chuẩn kỹ thuật dành riêng cho nền tảng Mạng xã hội & Diễn đàn cộng đồng cần tuân thủ 6 phần cốt lõi sau:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          CẤU TRÚC TỔNG THỂ PRD                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. TỔNG QUAN & MỤC TIÊU CHIẾN LƯỢC (Context, OKRs, North Star Metric)  │
│ 2. CHÂN DUNG NGƯỜI DÙNG & TÌNH HUỐNG SỬ DỤNG (Personas & Core Jobs)    │
│ 3. ĐẶC TẢ TÍNH NĂNG CHỨC NĂNG (Functional Requirements - FRD)          │
│ 4. ĐẶC TẢ YÊU CẦU PHI CHỨC NĂNG (Non-Functional Requirements - NFRD)   │
│ 5. QUY TẮC NGHIỆP VỤ & ĐIỀU KIỆN BIÊN (Business Rules & Edge Cases)    │
│ 6. ĐO LƯỜNG HIỆU QUẢ & LỘ TRÌNH PHÁT HÀNH (Success Metrics & Rollout)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

##### Chi tiết các đề mục thành phần

###### 1. Tổng quan & Mục tiêu chiến lược

- **Tuyên ngôn sản phẩm (Product Vision):** Định vị giá trị khác biệt (ví dụ: diễn đàn kỹ thuật sâu có giao diện phản hồi tức thì, tối ưu tuyệt đối cho SEO và lập trình viên/chuyên gia).
- **Mục tiêu then chốt (North Star Metric):** Số lượng tương tác thảo luận có giá trị trên tuần (Weekly Meaningful Discussions - WMD: tính bằng các thread có trên 5 comment chất lượng).
- **Chỉ số kinh doanh cốt lõi (OKRs):**
    - Tỉ lệ giữ chân tuần 4 ($W_4\text{ Retention}) \ge 25\%$.
    - Tỉ lệ đóng góp nội dung (Creator-to-Consumer ratio) $\ge 8\%$.
    - 80% trang bài viết công khai được Google lập chỉ mục (Indexed) trong vòng 48h.

###### 2. Chân dung người dùng (User Personas & Jobs-to-be-done)

- **The Lurker (Người đọc thầm lặng - 80%):** Cần tìm kiếm giải pháp nhanh qua Google, đọc luồng bài viết không bị gián đoạn, cuộn mượt mà trên mobile.
- **The Contributor (Người tích cực thảo luận - 15%):** Cần trình soạn thảo mạnh mẽ, lưu nháp tin cậy, thông báo tức thì khi có người phản hồi, ghi nhận điểm danh tiếng (Karma).
- **The Curator / Mod (Quản trị viên cộng đồng - 5%):** Cần công cụ dọn rác, khóa thread, xử lý báo cáo vi phạm với số lần click tối thiểu, bảo mật danh tính khi xử phạt.

###### 3. Đặc tả tính năng chức năng (Functional Requirements)

Chia theo ma trận MoSCoW (Must-have cho MVP, Should-have cho V1.1, Could-have cho V1.2):

- **Module Auth:** OAuth Google/GitHub, Magic Link, Passkeys, Session Device Manager.
- **Module Content:** Trình soạn thảo Tiptap, xử lý tải file trực tiếp (Presigned URL), render code block, thăm dò ý kiến (Polls).
- **Module Interaction:** Bảng tin Hot/Top/New, cây bình luận đa tầng (Nested Comments), cơ chế Vote có trừ điểm, Bookmark.
- **Module Community:** Tạo Space, cấu hình luật riêng của Space, chuyển giao quyền Moderator.
- **Module Trust & Safety:** Bộ lọc từ khóa cấm, rate-limit chống spam, hàng đợi xử lý vi phạm (Mod Queue), cơ chế Shadowban.

###### 4. Đặc tả yêu cầu phi chức năng (Non-Functional Requirements)

- **Hiệu năng giao diện (Core Web Vitals):**
    - LCP (Largest Contentful Paint) $< 1.2\text{s}$ trên mạng 4G.
    - CLS (Cumulative Layout Shift) $= 0$.
    - INP (Interaction to Next Paint) $< 100\text{ms}$.

- **Khả năng chịu tải (Availability & Scalability):** Hệ thống đạt SLA 99.9% uptime, chịu được tối thiểu 5.000 requests/giây (RPS) vào các trang thread hot mà không sập cache.
- **Bảo mật:** Chuẩn CSP Nonce-based, mã hóa dữ liệu nhạy cảm at-rest (AES-256) và in-transit (TLS 1.3), tự động lọc mã độc HTML/SVG (Sanitization).

###### 5. Quy tắc nghiệp vụ cốt lõi (Business Rules)

- Công thức tính điểm Hot Trending (Gravity Decay).
- Bảng thang điểm cộng/trừ Karma và ngưỡng mở khóa tính năng tự động.
- Cơ chế khóa chỉnh sửa bài viết sau mốc thời gian quy định (24h).

---

#### 2. Sơ đồ Luồng Người dùng (Core User Flows)

##### Flow 1: Tiếp cận từ Google, Đọc & Chuyển đổi Đăng ký (Guest to Onboarded User)

```text
[Google Search / Social Link]
             │
             ▼
  [Trang Thread Detail (ISR)] ──(Chưa đăng nhập, FCP < 0.8s)
             │
             ├──> Đọc nội dung & cuộn xem cây bình luận
             │
             ▼
[Hành động tương tác: Click Upvote / Viết Bình luận]
             │
             ▼
    [Auth Modal bật mở] ──(Giữ nguyên trạng thái cuộn, không reload trang)
             │
             ├───> Chọn [Đăng nhập bằng Google / GitHub]
             │             │
             │             ▼
             │     [Xác thực OAuth 2.0]
             │             │
             │             ▼
             │     [Kiểm tra tài khoản]
             │      ├── Đã tồn tại ──> Cấp JWT Cookie
             │      └── Mới tạo ────> Mở Form Onboarding nhanh:
             │                           - Nhập Username độc nhất
             │                           - Chọn 3 Spaces quan tâm
             │
             ▼
[Tự động kích hoạt lại hành động dở dang] ──> Upvote ghi nhận ngay / Focus lại vào ô gõ bình luận
```

---

##### Flow 2: Sáng tạo Nội dung & Xuất bản (Creation & Fan-out Pipeline)

```text
[Bấm "Tạo bài viết"]
         │
         ▼
[Mở Trình soạn thảo Tiptap] ──(Tự động restore Draft từ LocalStorage nếu có)
         │
         ├─── Nhập Tiêu đề & Chọn Không gian (Space)
         ├─── Soạn thảo văn bản (Markdown / Rich-text)
         │
         ├─── [Kéo thả tệp ảnh vào khung soạn thảo]
         │          │
         │          ▼
         │    [Xin Presigned URL] ──> [Upload trực tiếp lên Cloudflare R2]
         │          │
         │          ▼
         │    [Hiển thị ảnh mờ Blurhash tạm thời trên Editor]
         │
         ▼
[Bấm nút "Đăng bài" (Publish)]
         │
         ├──> [Client Validation: Zod Schema] ──(Lỗi: Báo đỏ tại chỗ)
         │
         ▼ (Hợp lệ)
[Gửi Server Action / API Endpoint]
         │
         ├──> [Quét Spam & Toxicity tự động qua Worker]
         │      ├── Vi phạm nghiêm trọng ──> Từ chối, báo lỗi
         │      └── Nghi vấn nhẹ ──────────> Vẫn cho đăng, tự động gắn cờ đẩy vào Mod Queue
         │
         ▼
[Lưu bản ghi vào PostgreSQL]
         │
         ├───> [Phân phối Feed (Hybrid Fan-out via Redis)]
         ├───> [Cập nhật Sitemap Hot (Background Job)]
         └───> [Chuyển hướng người dùng đến URL bài viết chính thức]
```

---

##### Flow 3: Thảo luận sâu & Tương tác Thời gian thực (Nested Discussion & Realtime Loop)

```text
[Người dùng xem Thread]
         │
         ├──> [Bấm "Trả lời" tại Comment #452 (Tầng 3)]
         │          │
         │          ▼
         │    [Mở ô Reply thụt lề ngay dưới Comment #452]
         │          │
         │          ▼
         │    [Nhập nội dung kèm tag @author_name] ──> [Bấm Gửi]
         │
         ▼
[Optimistic Render trên UI Client] ──(Comment hiện tức thì với trạng thái "Đang gửi")
         │
         ├──> [API ghi nhận thành công] ──> Đổi trạng thái sang "Đã gửi"
         │
         ▼
[Hệ thống kích hoạt sự kiện Event Bus]
         │
         ├───> [Ghi nhận Karma: +5 điểm cho người phản hồi]
         │
         ├───> [Đẩy tin qua SSE đến @author_name]:
         │          │
         │          ▼
         │    [Màn hình tác giả rung chuông thông báo không cần F5]
         │
         └───> [Đẩy socket event đến toàn bộ người đang xem cùng Thread]:
                    │
                    ▼
              [Hiện thanh thông báo nổi: "Có 1 bình luận mới vừa gửi, click để cuộn tới"]
```

---

##### Flow 4: Báo cáo Vi phạm & Không gian Kiểm duyệt (Report & Mod Queue)

```text
[Thành viên bấm [Report] một bài viết/bình luận]
                  │
                  ▼
[Chọn lý do vi phạm: Spam / Xúc phạm / Sai chủ đề / Lừa đảo] ──> Gửi báo cáo
                  │
                  ▼
      [Hệ thống gom nhóm (Aggregation)]
                  │
                  ├── Lượt report < 3: Đưa vào hàng đợi độ ưu tiên thấp
                  └── Lượt report ≥ 3: Tự động gắn cờ [Flagged] & đẩy lên đầu Mod Queue
                                │
                                ▼
              [Moderator mở Dashboard kiểm duyệt]
                                │
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
      [Bác bỏ (Dismiss)]  [Khóa Thread]     [Xử phạt nặng]
             │                  │                  │
        (Hủy cờ,          (Chặn comment,           ├── Ẩn bài viết vĩnh viễn
        bài hiển thị       giữ nguyên cho          ├── Trừ 50 điểm Karma tác giả
        bình thường)       cộng đồng đọc)          └── Tùy chọn: Ban/Mute tài khoản
                                                           │
                                                           ▼
                                                [Ghi vết Immutable Audit Log]
                                                (Lưu: Ai phạt, Lý do, Bản sao nội dung gốc)
```

---

#### 3. Ma trận Phân quyền Toàn diện (RBAC + ABAC Matrix)

Hệ thống kết hợp giữa **Vai trò tĩnh (Role-Based)** và **Thuộc tính động (Attribute-Based: Điểm Karma, Thời gian tạo tài khoản, Quyền sở hữu đối tượng)**.

##### Ký hiệu quy ước

- ✅ : Có quyền toàn phần.
- ❌ : Bị chặn hoàn toàn.
- ⚠️ : Quyền kèm điều kiện thuộc tính (ABAC condition).

##### Bảng ma trận quyền hạn

| Nhóm chức năng | Hành động cụ thể | Guest (Khách) | Member (Mới tạo < 7d) | Member (Uy tín $\ge 500$ Karma) | Space Moderator | Global Moderator | Super Admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Xác thực & Cá nhân** | Đọc bài viết / Bình luận công khai | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Cập nhật Profile, Avatar, Bio | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Xuất dữ liệu cá nhân (GDPR) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Đổi vai trò thành viên khác | ❌ | ❌ | ❌ | ⚠️ *(1)* | ⚠️ *(2)* | ✅ |
| **Quản trị Bài viết** | Đăng bài viết mới | ❌ | ⚠️ *(3)* | ✅ | ✅ | ✅ | ✅ |
|  | Chỉnh sửa bài viết | ❌ | ⚠️ *(4)* | ⚠️ *(4)* | ⚠️ *(5)* | ⚠️ *(5)* | ✅ |
|  | Xóa bài viết | ❌ | ⚠️ *(4)* | ⚠️ *(4)* | ⚠️ *(5)* | ✅ | ✅ |
|  | Ghim bài lên đầu Space | ❌ | ❌ | ❌ | ⚠️ *(5)* | ✅ | ✅ |
|  | Đóng băng / Khóa bình luận | ❌ | ❌ | ❌ | ⚠️ *(5)* | ✅ | ✅ |
| **Bình luận & Thảo luận** | Gửi bình luận / Phản hồi | ❌ | ⚠️ *(6)* | ✅ | ✅ | ✅ | ✅ |
|  | Đính kèm ảnh / Code block vào bình luận | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
|  | Thu gọn / Ẩn bình luận của người khác | ❌ | ❌ | ❌ | ⚠️ *(5)* | ✅ | ✅ |
| **Tương tác & Đánh giá** | Thả Upvote | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
|  | Thả Downvote | ❌ | ❌ | ✅ *(7)* | ✅ | ✅ | ✅ |
|  | Báo cáo bài viết vi phạm (Report) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Quản trị Không gian** | Tạo mới Space / Sub-community | ❌ | ❌ | ✅ *(8)* | ✅ | ✅ | ✅ |
|  | Cấu hình Luật, Banner, Thẻ tags của Space | ❌ | ❌ | ❌ | ⚠️ *(5)* | ✅ | ✅ |
|  | Xóa hoàn toàn một Space | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Kiểm duyệt & An toàn** | Xem danh sách Mod Queue | ❌ | ❌ | ❌ | ⚠️ *(5)* | ✅ | ✅ |
|  | Mute người dùng trong Space (1-7 ngày) | ❌ | ❌ | ❌ | ⚠️ *(5)* | ✅ | ✅ |
|  | Shadowban tài khoản toàn sàn | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
|  | Khóa IP / Cấm vĩnh viễn tài khoản | ❌ | ❌ | ❌ | ❌ | ⚠️ *(9)* | ✅ |
| **Cấu hình Hạ tầng** | Xem Logs hệ thống, Trạng thái Worker | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
|  | Bật chế độ Bảo trì toàn sàn (Emergency) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

##### Chi tiết các điều kiện biên ABAC (Attributes Constraints)

- *(1)* **Chỉ định Mod con:** Space Moderator chỉ có quyền bổ nhiệm hoặc hủy quyền của Moderator cấp thấp hơn trong chính Space mình quản lý.
- *(2)* **Giới hạn Global Mod:** Global Mod chỉ được cấp quyền trong phạm vi các Space con, không được can thiệp vào tài khoản có quyền Admin.
- *(3)* **Rate Limit tài khoản mới:** Tài khoản dưới 7 ngày tuổi bị giới hạn tối đa 2 bài viết/ngày; mọi liên kết ngoài (external link) tự động bị gắn thuộc tính `rel="nofollow ugc"` và buộc qua bộ lọc từ khóa kiểm duyệt trước khi hiển thị công khai.
- *(4)* **Quyền sở hữu tác giả (Author Ownership):** Người dùng chỉ được sửa/xóa bài viết do chính mình tạo ra; tính năng chỉnh sửa nội dung sẽ tự động khóa cứng sau 24 giờ kể từ thời điểm đăng bài.
- *(5)* **Ranh giới Không gian (Space Boundary):** Quyền hạn chỉ có hiệu lực trên các bài viết, bình luận thuộc Space mà tài khoản đó được phân công làm Moderator.
- *(6)* **Chống Spam cào dữ liệu:** Tài khoản mới chỉ được gửi tối đa 1 bình luận mỗi 60 giây (Slow-down barrier).
- *(7)* **Rào cản Downvote:** Chỉ tài khoản có điểm uy tín $\ge 500$ Karma mới được mở khóa tính năng Downvote nhằm hạn chế việc tài khoản rác đi dìm bài viết của người khác. Mỗi lần Downvote bài viết khác, tài khoản thực hiện sẽ bị trừ $-1$ điểm Karma của chính mình để tránh lạm dụng.
- *(8)* **Điều kiện lập Space mới:** Yêu cầu tài khoản có thâm niên tối thiểu 30 ngày và đạt tối thiểu 500 điểm Karma.
- *(9)* **Quy trình cấm vĩnh viễn:** Global Moderator khi thực hiện cấm vĩnh viễn một tài khoản phải cung cấp lý do bắt buộc kèm liên kết bằng chứng; hệ thống tự động gửi thông báo kiểm toán vào kênh riêng của Admin.

---

### TÀI LIỆU THIẾT KẾ UI/UX & KIẾN TRÚC HỆ THỐNG (GIAI ĐOẠN 2)

*Tài liệu kỹ thuật định dạng chuẩn cho AI Agent / Machine Execution. Không bao gồm mã nguồn triển khai.*

---

#### 2.1. ĐẶC TẢ HỆ THỐNG GIAO DIỆN & MÁY TRẠNG THÁI UI (UI/UX SPECIFICATION & STATE MACHINES)

##### 2.1.1. Ma trận Thiết kế Hệ thống (Design System Tokens)

```yaml
design_tokens:
  grid_system:
    base_unit: 4px
    breakpoints:
      mobile_sm: 360px
      mobile_lg: 480px
      tablet: 768px
      desktop_sm: 1024px
      desktop_lg: 1280px
      desktop_xl: 1536px
    layout_max_width: 1440px
    columns:
      mobile: 4
      tablet: 8
      desktop: 12
    gutters:
      mobile: 16px
      tablet: 24px
      desktop: 32px

  typography_scale:
    font_family_sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    font_family_mono: "'JetBrains Mono', 'Fira Code', monospace"
    scale:
      display: { size: 36px, line_height: 44px, weight: 800, tracking: -0.02em }
      h1:      { size: 30px, line_height: 38px, weight: 700, tracking: -0.015em }
      h2:      { size: 24px, line_height: 32px, weight: 700, tracking: -0.01em }
      h3:      { size: 20px, line_height: 28px, weight: 600, tracking: -0.005em }
      body_lg: { size: 16px, line_height: 24px, weight: 400, tracking: 0 }
      body_md: { size: 14px, line_height: 20px, weight: 400, tracking: 0 }
      body_sm: { size: 12px, line_height: 16px, weight: 400, tracking: 0.01em }
      caption: { size: 11px, line_height: 14px, weight: 500, tracking: 0.02em }

  color_semantics:
    modes: [light, dark]
    palette:
      surface_canvas:     { light: "#F8FAFC", dark: "#0B0F17" }
      surface_elevated_1: { light: "#FFFFFF", dark: "#131926" }
      surface_elevated_2: { light: "#F1F5F9", dark: "#1E2638" }
      border_subtle:      { light: "#E2E8F0", dark: "#242F45" }
      border_strong:      { light: "#CBD5E1", dark: "#334155" }
      text_primary:       { light: "#0F172A", dark: "#F8FAFC" }
      text_secondary:     { light: "#475569", dark: "#94A3B8" }
      text_muted:         { light: "#94A3B8", dark: "#64748B" }
      brand_primary:      { light: "#2563EB", dark: "#3B82F6" }
      brand_interactive:  { light: "#1D4ED8", dark: "#60A5FA" }
      vote_up:            { light: "#EA580C", dark: "#F97316" }
      vote_down:          { light: "#4F46E5", dark: "#6366F1" }
      status_danger:      { light: "#DC2626", dark: "#EF4444" }
      status_success:     { light: "#16A34A", dark: "#22C55E" }
      status_warning:     { light: "#CA8A04", dark: "#EAB308" }
```

---

##### 2.1.2. Bố cục Khung nhìn (Screen Layout Blueprint)

```text
LAYOUT_STRUCTURE_DAG:
  Viewport [100vw, 100vh]
    ├── TopNavbar [Fixed, h: 56px, z: 50, w: 100%]
    │     ├── Left: [Logo] + [SpaceSelectorDropdown]
    │     ├── Center: [GlobalSearchBar (Debounced, ModalTrigger: Cmd+K)]
    │     └── Right: [CreatePostButton] + [NotificationBell (BadgeCounter)] + [UserMenu]
    │
    └── MainContainer [Max-W: 1440px, Margin: 0 auto, Display: Flex]
          ├── LeftRailNavigation [Sticky, Top: 56px, Width: 240px, Height: calc(100vh - 56px)]
          │     ├── MainLinks: [Home, Popular, AllSpaces]
          │     ├── FollowedSpacesList: [Dynamic, Scrollable]
          │     └── SystemLinks: [Rules, Privacy, Feedback]
          │
          ├── CenterContentStage [Flex: 1, Min-W: 0, Max-W: 768px, Border-X: 1px subtle]
          │     ├── FeedRoute:
          │     │     ├── FeedFilterBar [Sticky, Top: 56px, z: 40, Height: 48px]
          │     │     └── VirtualizedFeedStream [InfiniteScroll, ViewportContainer]
          │     └── ThreadDetailRoute:
          │           ├── ThreadHeader + Breadcrumb
          │           ├── ThreadBody (RichTextAST/HTML, Min-H: 200px)
          │           ├── InlineInteractionBar [Vote, CommentCount, Share, Bookmark]
          │           ├── QuickReplyComposerBox (Collapsed by default, Expand on focus)
          │           └── VirtualizedCommentTree [DynamicDepth, NestedGuideLines]
          │
          └── RightRailContextual [Sticky, Top: 56px, Width: 320px, Height: fit-content]
                ├── Context: SpaceInfoCard (Members, Description, Rules)
                ├── Context: TrendingTopicsWidget (Top 5 tags 24h)
                └── Context: ActiveModeratorsWidget
```

---

##### 2.1.3. Định nghĩa Máy trạng thái Thành phần Giao diện (Statechart Specifications)

###### Thành phần: Thao tác Bầu chọn (VoteAction Component)

- **Tập trạng thái ($S$):** `{IDLE_UNVOTED, UPVOTED, DOWNVOTED, OPTIMISTIC_UP, OPTIMISTIC_DOWN, OPTIMISTIC_UNVOTE, SYNC_ERROR_ROLLBACK}`
- **Tập sự kiện ($E$):** `{CLICK_UP, CLICK_DOWN, API_SUCCESS, API_ERROR, AUTH_REQUIRED}`

```text
STATE_TRANSITION_TABLE [VoteAction]:
  Current_State        | Event         | Next_State            | Side_Effects / UI Mutation
  ----------------------------------------------------------------------------------------------------------------
  IDLE_UNVOTED         | CLICK_UP      | OPTIMISTIC_UP         | UI: Score +1, UpActive=true; Queue: API_CALL(UP)
  IDLE_UNVOTED         | CLICK_DOWN    | OPTIMISTIC_DOWN       | UI: Score -1, DownActive=true; Queue: API_CALL(DOWN)
  UPVOTED              | CLICK_UP      | OPTIMISTIC_UNVOTE     | UI: Score -1, UpActive=false; Queue: API_CALL(UNVOTE)
  UPVOTED              | CLICK_DOWN    | OPTIMISTIC_DOWN       | UI: Score -2, UpActive=false, DownActive=true; Queue: API_CALL(DOWN)
  DOWNVOTED            | CLICK_DOWN    | OPTIMISTIC_UNVOTE     | UI: Score +1, DownActive=false; Queue: API_CALL(UNVOTE)
  DOWNVOTED            | CLICK_UP      | OPTIMISTIC_UP         | UI: Score +2, DownActive=false, UpActive=true; Queue: API_CALL(UP)
  OPTIMISTIC_UP        | API_SUCCESS   | UPVOTED               | Commit delta, Invalidate stale cache
  OPTIMISTIC_DOWN      | API_SUCCESS   | DOWNVOTED             | Commit delta, Invalidate stale cache
  OPTIMISTIC_UNVOTE    | API_SUCCESS   | IDLE_UNVOTED          | Commit delta, Invalidate stale cache
  OPTIMISTIC_*         | API_ERROR     | SYNC_ERROR_ROLLBACK   | Revert score, Show Toast("Không thể lưu phiếu bầu"), Restore prev state
  ANY_STATE            | AUTH_REQUIRED | SAME_STATE            | Trigger AuthModal(preserve_intent=true)
```

---

###### Thành phần: Nút Thu gọn Nhánh Bình luận (CommentNode Collapse)

- **Tập trạng thái ($S$):** `{EXPANDED, COLLAPSED, HOVER_GUIDE}`
- **Quy tắc hiển thị:** Khi `COLLAPSED`, ẩn tất cả các nút con có `path` dạng `parent_path.*`. Hiển thị nhãn đại diện: `"[+] {author_name} - {relative_time} - {hidden_children_count} phản hồi bị ẩn"`. Chiều cao dòng ảo tự động cập nhật về kích thước của thẻ thu gọn ($36\text{px}$).

---

#### 2.2. KIẾN TRÚC THÔNG TIN & PHÂN CHIA RANH GIỚI SERVER-CLIENT

##### 2.2.1. Cây Phân cấp Định tuyến (Route Hierarchy & Boundaries)

```text
ROUTING_COMPONENT_BOUNDARY_SPEC:
  / (app layout) [RSC - Static Root]
    ├── Navbar [RSC]
    │     ├── SearchBar [Client Component - nuqs, debounced input]
    │     ├── NotificationTrigger [Client Component - SSE listener, Zustand badge]
    │     └── UserProfileMenu [Client Component - Dropdown state]
    │
    ├── /(feed) [Route Group]
    │     └── page.tsx [RSC - Dynamic SSR + Suspense]
    │           ├── FeedFilterHeader [Client Component - nuqs URL sync: sort, time]
    │           └── Suspense fallback=<FeedSkeleton count=10 />
    │                 └── VirtualizedFeedStream [Client Component - TanStack Virtual + InfiniteQuery]
    │                       └── FeedPostCard [RSC Shell]
    │                             └── PostInteractionButtons [Client Component - Optimistic State]
    │
    ├── /s/[spaceSlug] [Route Group: Spaces]
    │     ├── layout.tsx [RSC - ISR revalidate: 3600] -> Nạp metadata, sidebar Space
    │     ├── page.tsx [RSC - Streamed SSR] -> Space Feed
    │     └── /thread/[threadSlug] [Route Group: Thread Detail]
    │           └── page.tsx [RSC - ISR revalidate: 60s, PPR Shell]
    │                 ├── ThreadMetaHead [RSC - JSON-LD Schema, OpenGraph]
    │                 ├── ThreadArticle [RSC - Static Content, Code Syntax Render]
    │                 │     ├── ActionPanel [Client Component - Upvote, Bookmark]
    │                 │     └── MediaGallery [Client Component - Lightbox trigger]
    │                 ├── ReplyComposer [Client Component - Lazy Tiptap Editor]
    │                 └── Suspense fallback=<CommentsSkeleton count=8 />
    │                       └── CommentTreeContainer [Client Component - TanStack Virtual]
    │                             └── VirtualCommentRow [Client Component - Indent, Collapse]
    │
    └── /admin/mod-queue [Route Group: Restricted]
          └── page.tsx [RSC - Dynamic Server Authenticated, SSR only]
                └── ModQueueTable [Client Component - Batch selection, hotkeys]
```

---

##### 2.2.2. Đặc tả Trạng thái URL (URL Query Parameter Schema)

```yaml
url_state_schema:
  feed_filters:
    route: "/, /s/[spaceSlug]"
    parameters:
      sort:
        type: enum
        values: [hot, new, top, rising]
        default: hot
      time:
        type: enum
        values: [now, day, week, month, year, all]
        default: day
        depends_on: { sort: top }
      cursor:
        type: string (base64)
        nullable: true

  thread_detail:
    route: "/s/[spaceSlug]/thread/[threadSlug]"
    parameters:
      comment_sort:
        type: enum
        values: [best, oldest, newest, controversial]
        default: best
      focus_comment:
        type: uuid
        nullable: true
        behavior: "Highlight comment DOM, auto-expand parent tree to target"

  global_modal:
    parameters:
      auth_action:
        type: enum
        values: [login, register, forgot_password]
      intent_redirect:
        type: string (relative_url)
```

---

#### 2.3. KIẾN TRÚC HỆ THỐNG & SƠ ĐỒ ĐIỀU HƯỚNG DỮ LIỆU (SYSTEM TOPOLOGY & DATA FLOW DAGS)

##### 2.3.1. Danh mục Thực thể Nút Mạng Hạ tầng (Infrastructure Topology Nodes)

```yaml
topology_nodes:
  EDGE_INSPECTOR:
    role: "Cloudflare WAF / Enterprise Edge"
    functions: ["TLS 1.3 Termination", "DDoS L3/L7 Mitigation", "Edge Cache (Static/ISR)", "Bot Score Filtering"]
  REVERSE_PROXY:
    role: "Envoy / NGINX Gateway"
    functions: ["Rate Limiting Enforcement", "Routing: Next.js vs Go API", "WebSocket Upgrade & SSE Buffering Termination"]
  WEB_RUNNER:
    role: "Next.js 15+ Node.js Standalone Cluster"
    functions: ["React Server Component Rendering", "Edge Page Generation", "Initial HTML Streaming"]
  CORE_API:
    role: "Go 1.23+ Core Application (Fiber/Gin)"
    functions: ["Business Domain Logic", "Write Operations", "Token Verification", "RBAC/ABAC Gate"]
  REALTIME_HUB:
    role: "Go Dedicated Socket/SSE Engine"
    functions: ["Persistent Connection Termination", "Heartbeat Ping/Pong", "SSE Event Dispatcher"]
  ASYNC_WORKER:
    role: "Go Distributed Workers (Asynq Engine)"
    functions: ["Fan-out processing", "Karma calculation", "Notification batching", "Media reconciliation"]
  SEARCH_ENGINE:
    role: "Meilisearch Cluster"
    functions: ["Typo-tolerant Search", "Prefix Indexing", "Instant Auto-complete"]
  CACHE_STORE:
    role: "Redis 7.2 Cluster (Cluster A: Ephemeral Cache)"
    functions: ["Hot Timelines", "Vote Counters (Write-Behind)", "Rate-limit Buckets"]
  QUEUE_STORE:
    role: "Redis 7.2 Sentinel (Cluster B: Persistent Queue & Sessions)"
    functions: ["Asynq Job Storage", "User Refresh Token Hashes", "Pub/Sub Channels"]
  RELATIONAL_DB:
    role: "PostgreSQL 16 High-Availability (1 Master, 2 Sync Replicas)"
    functions: ["ACID System of Record", "ltree Hierarchical Storage", "Relational Consistency"]
  OBJECT_VAULT:
    role: "Cloudflare R2 Bucket"
    functions: ["Raw/Optimized Image Storage", "Zero-Egress Asset Serving"]
```

---

##### 2.3.2. Đồ thị Có hướng Điều phối Luồng Ghi & Đọc (Data Flow DAGs)

###### Luồng 1: Đăng Tải Bài Viết & Phân Phối Bảng Tin (Write Path & Fan-out)

```text
DAG_FLOW: WRITE_THREAD_AND_FANOUT
  NODES:
    - [N1: Client Editor]
    - [N2: Core API (Go)]
    - [N3: Object Vault (R2)]
    - [N4: Relational DB (PostgreSQL)]
    - [N5: Queue Store (Redis Persistent)]
    - [N6: Async Worker]
    - [N7: Cache Store (Redis Ephemeral)]
    - [N8: Search Engine (Meilisearch)]
  EDGES:
    - Step 1: N1 -> N2: HTTP POST /api/v1/threads/presigned-url (Payload: file_hash, mime_type, size)
    - Step 2: N2 -> N1: Returns 200 (Presigned_S3_PUT_URL, file_uuid, expires_in: 300)
    - Step 3: N1 -> N3: HTTP PUT (Binary Image Payload, Direct to Storage)
    - Step 4: N1 -> N2: HTTP POST /api/v1/threads (Payload: space_id, title, tiptap_json, media_keys)
    - Step 5: N2 -> N4: BEGIN TRANSACTION;
                        INSERT INTO threads;
                        INSERT INTO thread_counters;
                        UPDATE media_assets SET status='ATTACHED' WHERE key IN (media_keys);
                        COMMIT;
    - Step 6: N2 -> N5: LPUSH asynq:jobs (Payload: Task{Type: "post:fanout", ThreadID: uuid, AuthorID: uuid, SpaceID: uuid})
    - Step 7: N2 -> N1: Returns 201 Created (ThreadPayload, SlugURL)
    - Step 8: N6 -> N5: RPOPLPUSH (Consume Fanout Task)
    - Step 9: N6 -> N4: SELECT follower_id FROM space_followers WHERE space_id = target_space_id;
    - Step 10: N6 -> N7: PIPELINE {
                           FOR follower_id IN followers (< 25k):
                             ZADD feed:user:{follower_id} <timestamp> <thread_id>;
                             ZREMRANGEBYRANK feed:user:{follower_id} 0 -801;
                         }
    - Step 11: N6 -> N8: HTTP POST /indexes/threads/documents (Sync search document)
```

---

###### Luồng 2: Bầu chọn Không chặn & Ghi chậm (Write-Behind Voting Loop)

```text
DAG_FLOW: VOTE_INTERACTION_WRITE_BEHIND
  NODES:
    - [V1: Client View]
    - [V2: Reverse Proxy]
    - [V3: Core API (Go)]
    - [V4: Cache Store (Redis Ephemeral)]
    - [V5: Async Sync Worker]
    - [V6: Relational DB (PostgreSQL)]
    - [V7: Realtime Hub]
  EDGES:
    - Step 1: V1 -> V1: Run Optimistic UI Update (Score visually updated, Click locked)
    - Step 2: V1 -> V2: HTTP POST /api/v1/threads/{id}/votes (Header: Bearer JWT, Payload: direction: +1)
    - Step 3: V2 -> V3: Proxy Pass (TLS Terminated)
    - Step 4: V3 -> V4: EVALSHA lua_vote_dedup_and_counter (
                          KEYS: [thread:{id}:voters, thread:{id}:counters],
                          ARGS: [user_id, +1]
                        )
              NOTE_LUA_EXEC:
                - Check voter set. If same vote exists: ABORT (return 0).
                - Update voter set with new direction.
                - HINCRBY thread:{id}:counters upvotes 1.
                - SADD dirty_threads_set {id}.
                - Return current_computed_delta.
    - Step 5: V3 -> V1: Returns 200 OK (Calculated state)
    - Step 6: V5 -> V4: CRON (Every 5s): SMEMBERS dirty_threads_set -> Retrieve & Clear set
    - Step 7: V5 -> V4: PIPELINE HGETALL thread:{id}:counters for all dirty IDs
    - Step 8: V5 -> V6: BEGIN TRANSACTION;
                        BULK UPDATE thread_counters AS tc
                        SET upvotes = tc.upvotes + delta.upvotes,
                            downvotes = tc.downvotes + delta.downvotes,
                            updated_at = NOW()
                        FROM bulk_values;
                        INSERT INTO votes (user_id, thread_id, direction) VALUES (...)
                        ON CONFLICT (user_id, thread_id) DO UPDATE SET direction = EXCLUDED.direction;
                        COMMIT;
    - Step 9: V5 -> V7: PUBLISH channel:thread_updates (Payload: {thread_id: uuid, upvotes: N})
    - Step 10: V7 -> V1: SSE Broadcast Event: "vote_change" -> UI synchronizes accurately
```

---

#### 2.4. ĐẶC TẢ CƠ SỞ DỮ LIỆU QUAN HỆ (POSTGRESQL 16 DDL SPECIFICATION)

##### 2.4.1. Tiện ích & Kiểu Dữ liệu Tùy biến (Extensions & Enums)

```sql
-- Extensions required
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enum Definitions
CREATE TYPE user_role_enum AS ENUM ('GUEST', 'MEMBER', 'SPACE_MODERATOR', 'GLOBAL_MODERATOR', 'SUPER_ADMIN');
CREATE TYPE media_status_enum AS ENUM ('PENDING', 'ATTACHED', 'ORPHANED', 'DELETED');
CREATE TYPE report_reason_enum AS ENUM ('SPAM', 'HARASSMENT', 'HATE_SPEECH', 'DOXXING', 'MISINFORMATION', 'COPYRIGHT', 'OTHER');
CREATE TYPE report_status_enum AS ENUM ('PENDING', 'ACTIONED', 'DISMISSED');
CREATE TYPE action_type_enum AS ENUM ('SOFT_DELETE', 'HARD_DELETE', 'LOCK_THREAD', 'MUTE_USER', 'BAN_USER', 'SHADOWBAN_USER');
```

---

##### 2.4.2. Khung Bảng Thực thể & Chỉ mục (Tables, Constraints & Indexes)

```sql
-- 1. USERS & PROFILES
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(32) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash CHAR(60), -- Nullable for OAuth-only users
    global_role user_role_enum NOT NULL DEFAULT 'MEMBER',
    is_shadowbanned BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    karma_score INT NOT NULL DEFAULT 0,
    token_version INT NOT NULL DEFAULT 1,
    avatar_url VARCHAR(512),
    bio VARCHAR(256),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_username_format CHECK (username ~* '^[a-zA-Z0-9_]{3,32}$')
);

CREATE INDEX idx_users_karma ON users (karma_score DESC);
CREATE INDEX idx_users_username_trgm ON users USING gin (username gin_trgm_ops);

-- 2. SPACES (COMMUNITIES)
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(48) NOT NULL,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    icon_url VARCHAR(512),
    banner_url VARCHAR(512),
    rules_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_spaces_slug UNIQUE (slug)
);

CREATE INDEX idx_spaces_slug ON spaces (slug) WHERE deleted_at IS NULL;

-- 3. SPACE MEMBERSHIPS & CONTEXTUAL RBAC
CREATE TABLE space_memberships (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    contextual_role user_role_enum NOT NULL DEFAULT 'MEMBER',
    karma_in_space INT NOT NULL DEFAULT 0,
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    muted_until TIMESTAMPTZ,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, space_id)
);

CREATE INDEX idx_space_membership_lookup ON space_memberships (space_id, contextual_role);

-- 4. THREADS (POSTS)
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE RESTRICT,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(300) NOT NULL,
    slug VARCHAR(350) NOT NULL,
    content_ast JSONB NOT NULL,
    content_text TEXT NOT NULL, -- Plain text extraction for indexing & previews
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    moderation_status VARCHAR(24) NOT NULL DEFAULT 'APPROVED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_space_thread_slug UNIQUE (space_id, slug)
);

CREATE INDEX idx_threads_space_created ON threads (space_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_threads_author ON threads (author_id, created_at DESC);

-- 5. THREAD COUNTERS (ISOLATED FOR HIGH WRITE THROUGHPUT)
CREATE TABLE thread_counters (
    thread_id UUID PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
    upvotes INT NOT NULL DEFAULT 0,
    downvotes INT NOT NULL DEFAULT 0,
    net_score INT NOT NULL DEFAULT 0,
    hot_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    comment_count INT NOT NULL DEFAULT 0,
    view_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) WITH (fillfactor = 70);

CREATE INDEX idx_thread_counters_hot ON thread_counters (hot_score DESC);
CREATE INDEX idx_thread_counters_net ON thread_counters (net_score DESC);

-- 6. COMMENTS (NESTED HIERARCHICAL TREE VIA LTREE)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE RESTRICT,
    path LTREE NOT NULL,
    depth INT NOT NULL DEFAULT 0,
    content_ast JSONB NOT NULL,
    upvotes INT NOT NULL DEFAULT 0,
    downvotes INT NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_thread_path ON comments USING gist (path);
CREATE INDEX idx_comments_path_btree ON comments (path);
CREATE INDEX idx_comments_thread_created ON comments (thread_id, created_at ASC);

-- 7. VOTES RECORD (AUDIT & SINGLE SOURCE OF TRUTH)
CREATE TABLE votes (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL, -- Target Thread ID or Comment ID
    entity_type VARCHAR(16) NOT NULL, -- 'THREAD' or 'COMMENT'
    direction SMALLINT NOT NULL, -- +1, -1
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, entity_id),
    CONSTRAINT ck_direction_valid CHECK (direction IN (1, -1))
);

CREATE INDEX idx_votes_entity_direction ON votes (entity_id, direction);

-- 8. MEDIA ASSETS
CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_key VARCHAR(256) NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    blurhash VARCHAR(64),
    status media_status_enum NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_media_file_key UNIQUE (file_key)
);

CREATE INDEX idx_media_pending_cleanup ON media_assets (status, created_at) WHERE status = 'PENDING';

-- 9. MODERATION QUEUE & AUDIT TRAIL
CREATE TABLE moderation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL, -- Entity ID
    target_type VARCHAR(16) NOT NULL, -- 'THREAD', 'COMMENT', 'USER'
    reason report_reason_enum NOT NULL,
    notes TEXT,
    status report_status_enum NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mod_reports_status ON moderation_reports (status, created_at ASC);

CREATE TABLE moderation_actions_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    moderator_id UUID NOT NULL REFERENCES users(id),
    space_id UUID REFERENCES spaces(id), -- Nullable for Global Actions
    target_id UUID NOT NULL,
    action action_type_enum NOT NULL,
    reason TEXT NOT NULL,
    snapshot_data JSONB NOT NULL, -- Freeze content before execution
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mod_audit_space ON moderation_actions_audit (space_id, created_at DESC);
```

---

#### 2.5. THIẾT KẾ BỘ NHỚ ĐỆM & KHÔNG GIAN KHÓA REDIS (REDIS TOPOLOGY SPECIFICATION)

##### 2.5.1. Quy chuẩn Phân bố Key (Key Namespace Schema)

```yaml
redis_keyspace:
  cluster_a_ephemeral:
    user_feed:
      pattern: "feed:user:{user_id}"
      type: ZSET
      score: "Unix Timestamp (Float64)"
      value: "thread_id (UUID string)"
      ttl: 604800 # 7 days
      max_elements: 800

    author_feed:
      pattern: "feed:author:{author_id}"
      type: ZSET
      score: "Unix Timestamp (Float64)"
      value: "thread_id (UUID string)"
      ttl: 1209600 # 14 days
      max_elements: 1000

    trending_space:
      pattern: "trending:space:{space_id}"
      type: ZSET
      score: "Hot Score (Float64)"
      value: "thread_id (UUID string)"
      ttl: 86400 # 24 hours

    thread_live_counters:
      pattern: "{thread:{thread_id}}:counters"
      type: HASH
      fields:
        upvotes: "Integer delta"
        downvotes: "Integer delta"
        views: "Integer delta"
        comments: "Integer delta"
      ttl: None # Maintained via Worker Flush

    voter_dedup_set:
      pattern: "{thread:{thread_id}}:voters"
      type: HASH
      fields:
        "{user_id}": "Direction (+1 or -1)"
      ttl: 86400 # 24h retention after active engagement

    rate_limit_bucket:
      pattern: "ratelimit:{ip|user_id}:{action_type}"
      type: STRING (Numeric)
      ttl: 60 # Rolling window

  cluster_b_persistent:
    session_refresh_token:
      pattern: "session:user:{user_id}:{device_uuid}"
      type: STRING
      value: "Hashed_Refresh_Token"
      ttl: 604800 # 7 days

    read_watermark:
      pattern: "watermark:user:{user_id}"
      type: STRING (UUID / Timestamp)
      value: "last_read_notification_timestamp"
      ttl: Persistent

    notification_stream:
      pattern: "stream:notify:{user_id}"
      type: STREAM
      id: "Timestamp-Sequence"
      fields:
        event_type: "String"
        payload_json: "String"
      max_len: 200 # Fixed capped stream

    lock_revalidate:
      pattern: "lock:reval:{thread_id}"
      type: STRING
      value: "worker_node_uuid"
      ttl: 15 # Seconds
```

---

#### 2.6. KHẾ ƯỚC GIAO TIẾP DỮ LIỆU & GIAO THỨC TRUYỀN THÔNG (API & REALTIME CONTRACTS)

##### 2.6.1. Hợp đồng RESTful API Cốt lõi (Core Endpoints)

###### Endpoint 1: Bảng tin Phân trang Con trỏ (Cursor-based Feed Query)

- **Giao thức & Đường dẫn:** `GET /api/v1/feed`
- **Xác thực:** Tùy chọn (Optional Bearer JWT)
- **Query Parameters:**
```yaml
sort: "hot | new | top"
space_id: "UUID (Optional)"
cursor: "Base64(score_or_timestamp:id) (Optional)"
limit: "Integer (Min: 10, Max: 50, Default: 20)"
```

- **Mẫu Phản hồi Thành công (200 OK):**
```json
{
  "data": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "title": "Tối ưu hóa hiệu năng PostgreSQL với 100 triệu dòng ltree",
      "slug": "toi-uu-hoa-hieu-nang-postgresql-voi-100-trieu-dong-ltree",
      "content_preview": "Khi cấu trúc phân cấp bình luận vượt ngưỡng...",
      "author": {
        "id": "a3bb189e-8bf9-450a-8cf9-7a54911d0fa4",
        "username": "hoang_dev",
        "avatar_url": "https://cdn.domain.com/avatars/a3bb.webp",
        "karma": 1420
      },
      "space": {
        "id": "18f3a388-c7a5-4bf7-9f7a-8b832b4b455b",
        "slug": "backend-engineering",
        "name": "Backend Engineering"
      },
      "stats": {
        "score": 384,
        "upvotes": 412,
        "downvotes": 28,
        "comment_count": 89
      },
      "viewer_interaction": {
        "vote_direction": 1,
        "is_bookmarked": true
      },
      "created_at": "2026-09-25T02:15:30Z"
    }
  ],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJzY29yZSI6MzgyLCJpZCI6IjdjOWU2Njc5LTc0MjUtNDBkZS05NDRiLWUwN2ZjMWY5MGFlNyJ9"
  }
}
```

###### Endpoint 2: Cây Bình luận Trải phẳng (Flattened Comment Tree Query)

- **Giao thức & Đường dẫn:** `GET /api/v1/threads/{threadId}/comments`
- **Xác thực:** Tùy chọn (Optional Bearer JWT)
- **Query Parameters:**
```yaml
sort: "best | oldest | newest"
parent_path: "ltree string, e.g. 0001 (Optional, for lazy branch loading)"
max_depth: "Integer (Default: 4)"
```

- **Mẫu Phản hồi Thành công (200 OK):**
```json
{
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "parent_id": null,
      "path": "0001",
      "depth": 0,
      "author": {
        "id": "b1b2b3b4-0000-0000-0000-000000000000",
        "username": "tech_lead",
        "avatar_url": "https://cdn.domain.com/avatars/b1.webp"
      },
      "content_ast": { "type": "doc", "content": [...] },
      "stats": { "upvotes": 45, "downvotes": 2 },
      "viewer_vote": 0,
      "child_count": 12,
      "created_at": "2026-09-25T02:30:00Z"
    },
    {
      "id": "c58bd21c-69dd-5483-b678-1f13c3d4e580",
      "parent_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "path": "0001.0001",
      "depth": 1,
      "author": {
        "id": "c2c3c4c5-0000-0000-0000-000000000000",
        "username": "junior_sec",
        "avatar_url": "https://cdn.domain.com/avatars/c2.webp"
      },
      "content_ast": { "type": "doc", "content": [...] },
      "stats": { "upvotes": 8, "downvotes": 0 },
      "viewer_vote": 1,
      "child_count": 0,
      "created_at": "2026-09-25T02:45:10Z"
    }
  ]
}
```

##### 2.6.2. Đặc tả Kênh Đẩy Sự kiện (Server-Sent Events Pipeline)

- **URL Kết nối:** `GET /api/v1/realtime/events`
- **Headers Yêu cầu:**
    - `Authorization: Bearer <JWT>`
    - `Accept: text/event-stream`
    - `Cache-Control: no-cache`
    - `Last-Event-ID: <UUID_or_StreamID>`

- **Cấu hình Transport:** HTTP/2 Server Push tương thích, Reverse Proxy Buffer Disabled (`X-Accel-Buffering: no`).

```text
SSE_EVENT_TYPES:
  1. THREAD_VOTE_UPDATE:
     event: "thread_stats"
     id: "evt_1727234130_001"
     data: {"thread_id": "UUID", "upvotes": 1204, "downvotes": 43, "score": 1161}

  2. NEW_NESTED_COMMENT:
     event: "new_comment"
     id: "evt_1727234135_002"
     data: {"thread_id": "UUID", "parent_id": "UUID", "parent_path": "0001.0002", "comment_preview": "..."}

  3. AGGREGATED_NOTIFICATION:
     event: "user_notification"
     id: "evt_1727234140_003"
     data: {
       "batch_id": "UUID",
       "type": "UPVOTE_MILESTONE",
       "title": "Bài viết của bạn đạt 100 upvotes",
       "entity_url": "/s/backend/thread/slug",
       "actors_sample": ["user_a", "user_b"],
       "total_count": 48
     }
```

---

#### 2.7. ĐẶC TẢ ĐỘNG CƠ TÌM KIẾM TOÀN VĂN (MEILISEARCH SEARCH INDEX SPEC)

##### 2.7.1. Cấu hình Chỉ mục `threads_index`

```yaml
meilisearch_configuration:
  index_uid: "threads_index"
  primary_key: "id"

  searchable_attributes:
    - "title"
    - "tags"
    - "content_text"
    - "space_name"
    - "author_username"

  filterable_attributes:
    - "space_id"
    - "author_id"
    - "is_locked"
    - "created_at_timestamp"
    - "net_score"

  sortable_attributes:
    - "created_at_timestamp"
    - "net_score"
    - "comment_count"

  ranking_rules:
    - "words"        # Số từ khóa khớp xuất hiện
    - "typo"         # Ưu tiên đúng chính tả
    - "proximity"    # Khoảng cách giữa các từ khóa gần nhau
    - "attribute"    # Ưu tiên title > tags > content_text
    - "sort"         # Tùy biến theo Sort params (nếu có)
    - "exactness"    # Khớp chính xác hoàn toàn cụm từ
    - "net_score:desc" # Điểm số cộng đồng làm trọng số cuối

  typo_tolerance:
    enabled: true
    min_word_size_for_one_typo: 5
    min_word_size_for_two_typos: 9
    disable_on_attributes: ["tags"]
```

---

##### 2.7.2. Hợp đồng Đồng bộ Dữ liệu Thay đổi (CDC Synchronization Contract)

- **Nguồn kích hoạt (Trigger):** Asynq Worker lấy sự kiện `thread.created` / `thread.updated` / `thread.deleted`.
- **Cấu trúc Tài liệu Tìm kiếm (Index Document Payload):**
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "space_id": "18f3a388-c7a5-4bf7-9f7a-8b832b4b455b",
  "space_name": "Backend Engineering",
  "author_id": "a3bb189e-8bf9-450a-8cf9-7a54911d0fa4",
  "author_username": "hoang_dev",
  "title": "Tối ưu hóa hiệu năng PostgreSQL với 100 triệu dòng ltree",
  "content_text": "Khi cấu trúc phân cấp bình luận vượt ngưỡng 10 triệu bản ghi, chỉ mục GiST trên ltree cần được tính toán...",
  "tags": ["postgresql", "database", "scaling", "performance"],
  "net_score": 384,
  "comment_count": 89,
  "is_locked": false,
  "created_at_timestamp": 1790295330
}
```

---

### 3. THIẾT LẬP NỀN TẢN PHÁT TRIỂN & DEVOPS (FOUNDATION & DEVOPS SPECIFICATION)

*Quy chuẩn kỹ thuật dành cho AI Agent điều phối và nhóm phát triển sinh viên. Cấu trúc tối ưu hóa theo mô hình Monorepo, Docker hóa toàn bộ môi trường nội bộ và tự động hóa triển khai qua GitHub Actions lên nền tảng Render.*

---

#### 3.1. CHIẾN LƯỢC KHO MÃ NGUỒN & CẤU TRÚC WORKSPACE (MONOREPO TOPOLOGY)

Đối với đồ án sinh viên có từ 2–5 thành viên, kiến trúc **Monorepo đơn (Single Git Repository)** được lựa chọn để loại bỏ hoàn toàn bài toán lệch phiên bản API Contract giữa Frontend và Backend, đồng thời tập trung toàn bộ cấu hình CI/CD và Docker vào một nguồn duy nhất.

```text
MONOREPO_TREE_SPECIFICATION:
  root/
    ├── .github/
    │     ├── workflows/               # Đặc tả CI/CD GitHub Actions
    │     │     ├── ci-frontend.yml    # Lint, Type-check, Test cho Client
    │     │     ├── ci-backend.yml     # GolangCI-Lint, Unit Tests cho API
    │     │     └── cd-render.yml      # Trigger Webhook Deploy lên Render
    │     └── pull_request_template.md # Mẫu kiểm tra checklist khi tạo PR
    │
    ├── apps/
    │     ├── web/                     # Mã nguồn Next.js 15+ (App Router)
    │     │     ├── Dockerfile.dev     # Cấu hình container phát triển cục bộ
    │     │     ├── Dockerfile.prod    # Container tối ưu hóa multi-stage
    │     │     ├── package.json
    │     │     └── tsconfig.json
    │     │
    │     └── api/                     # Mã nguồn Go Core API (Fiber/Gin)
    │           ├── Dockerfile.dev     # Container hỗ trợ Hot-Reload (Air)
    │           ├── Dockerfile.prod    # Container Scratch / Alpine siêu nhẹ
    │           ├── go.mod
    │           └── go.sum
    │
    ├── deploy/
    │     ├── docker/
    │     │     ├── docker-compose.dev.yml   # Khởi chạy full-stack cục bộ
    │     │     ├── docker-compose.infra.yml # Chỉ chạy DB + Redis (dev native)
    │     │     └── postgres-init/           # Script nạp extensions (ltree, uuid)
    │     │           └── 01-init-ext.sql
    │     │
    │     └── render/
    │           └── render.yaml        # Infrastructure-as-Code (Render Blueprint)
    │
    ├── packages/
    │     └── contracts/               # Đặc tả chung giữa Frontend & Backend
    │           ├── openapi.yaml       # OpenAPI 3.0 REST schema
    │           └── schema.sql         # Source of truth cho DDL Database
    │
    ├── .env.example                   # Biến môi trường mẫu cho local
    └── .gitignore
```

---

#### 3.2. QUY CHUẨN QUẢN TRỊ MÃ NGUỒN & GIT WORKFLOW (VERSION CONTROL)

##### 3.2.1. Phân nhánh & Vòng đời Git (Trunk-based Phân tầng Tinh gọn)

```text
GIT_BRANCH_DAG:
  main [Production Environment - Tự động CD lên Render Live]
    ▲
    │ (Pull Request có ít nhất 1 Review Approved + Pass CI)
    │
  develop [Staging / Dev Environment - Tích hợp toàn nhóm]
    ▲
    │ (Tạo nhánh từ develop, merge ngược lại qua PR)
    ├── feature/{issue_id}-{feature_name}
    ├── fix/{issue_id}-{bug_description}
    └── chore/{tool_or_dependency_name}
```

---

- **Quy tắc bảo vệ nhánh (Branch Protection Rulesets trên GitHub):**
    - Nhánh `main` và `develop`: Khóa push trực tiếp (`git push origin main` bị chặn hoàn toàn).
    - Bắt buộc mở Pull Request (PR) trước khi tích hợp code.
    - Điều kiện merge: Tối thiểu 1 thành viên review và chấp thuận (`Require review approval: 1`); toàn bộ các pipeline CI kiểm tra mã nguồn phải đạt trạng thái xanh (`Pass Status Checks`).

##### 3.2.2. Quy chuẩn Định danh Commit & Phiên bản (Semantic Commits)

Bắt buộc tuân thủ cấu trúc Commit Message theo tiêu chuẩn **Conventional Commits**:

- Định dạng: `<type>(<scope>): <short_summary>`
- **Types cho phép:**
    - `feat`: Thêm tính năng mới (ví dụ: `feat(auth): integrate google oauth flow`).
    - `fix`: Sửa lỗi logic hoặc giao diện (ví dụ: `fix(comment): prevent duplicate vote submission`).
    - `docs`: Bổ sung hoặc sửa tài liệu PRD, README, OpenAPI.
    - `refactor`: Tái cấu trúc code nhưng không thay đổi hành vi nghiệp vụ.
    - `test`: Thêm hoặc chỉnh sửa Unit test/Integration test.
    - `chore`: Cập nhật Dockerfile, thư viện dependencies, cấu hình CI/CD.

---

#### 3.3. ĐẶC TẢ MÔI TRƯỜNG PHÁT TRIỂN NỘI BỘ QUA DOCKER (LOCAL ORCHESTRATION)

Hệ thống cung cấp file điều phối `docker-compose.dev.yml` để sinh viên có thể dựng toàn bộ hạ tầng chỉ với 1 câu lệnh mà không cần cài đặt cục bộ PostgreSQL, Go hay Node.js phiên bản khác nhau trên máy cá nhân.

```text
DOCKER_COMPOSE_SERVICE_TOPOLOGY:
  NETWORK:
    name: "community_dev_net"
    driver: "bridge"

  SERVICES:
    1. infra-db (PostgreSQL 16):
       image: "postgres:16-alpine"
       ports: ["5432:5432"]
       environment:
         POSTGRES_DB: "community_dev"
         POSTGRES_USER: "postgres"
         POSTGRES_PASSWORD: "devpassword123"
       volumes:
         - "pg_data:/var/lib/postgresql/data"
         - "../../deploy/docker/postgres-init:/docker-entrypoint-initdb.d"
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U postgres"]
         interval: 5s
         timeout: 5s
         retries: 5

    2. infra-cache (Redis 7):
       image: "redis:7-alpine"
       ports: ["6379:6379"]
       command: ["redis-server", "--appendonly", "no", "--maxmemory", "128mb"]
       volumes:
         - "redis_data:/data"
       healthcheck:
         test: ["CMD", "redis-cli", "ping"]
         interval: 5s
         retries: 3

    3. core-api (Go Service - Dev Container):
       build_context: "../../apps/api"
       dockerfile: "Dockerfile.dev"
       ports: ["8080:8080"]
       depends_on:
         infra-db: { condition: "service_healthy" }
         infra-cache: { condition: "service_healthy" }
       volumes:
         - "../../apps/api:/app" # Mount code thực tế để kích hoạt Hot-Reload
       environment:
         PORT: 8080
         DATABASE_URL: "postgres://postgres:devpassword123@infra-db:5432/community_dev?sslmode=disable"
         REDIS_ADDR: "infra-cache:6379"
         JWT_SECRET: "local_dev_insecure_jwt_secret_key_32bytes"

    4. web-client (Next.js Service - Dev Container):
       build_context: "../../apps/web"
       dockerfile: "Dockerfile.dev"
       ports: ["3000:3000"]
       depends_on:
         - "core-api"
       volumes:
         - "../../apps/web:/app"
         - "/app/node_modules" # Bảo vệ node_modules container khỏi bị mount đè
       environment:
         PORT: 3000
         NEXT_PUBLIC_API_URL: "http://localhost:8080/api/v1"

  PERSISTENT_VOLUMES:
    - "pg_data"
    - "redis_data"
```

---

##### Yêu cầu Container hóa Tối ưu (Build Specifications)

- **API Service (`Dockerfile.prod`):**
    - Stage 1: Dùng `golang:1.23-alpine` làm build container để biên dịch Go binary (gán cờ `-ldflags="-s -w"` để triệt tiêu symbol tables).
    - Stage 2: Đẩy file binary sang image `alpine:latest` hoặc `scratch`. Kích thước image cuối cùng phải $< 30\text{MB}$.

- **Web Service (`Dockerfile.prod`):**
    - Sử dụng cơ chế Multi-stage Build của Next.js: `deps` $\rightarrow$ `builder` $\rightarrow$ `runner`.
    - Kích hoạt thuộc tính cấu hình `output: "standalone"` trong Next.js để chỉ đóng gói các tệp phụ thuộc thực sự được sử dụng, giảm dung lượng image từ hàng gigabyte xuống dưới $150\text{MB}$.

---

#### 3.4. ĐẶC TẢ QUY TRÌNH CI/CD GITHUB ACTIONS (AUTOMATION GATES)

Mọi thay đổi đưa lên hệ thống kiểm soát phiên bản đều phải vượt qua cổng kiểm tra tự động trước khi được hợp nhất hoặc phát hành.

```text
CI_CD_PIPELINE_DAG:
  [Event: Pull Request to 'develop' or 'main']
         │
         ├───> [Job 1: Static Code Quality Gate]
         │        ├── Web: pnpm dlx biome ci (or eslint + prettier)
         │        └── API: golangci-lint run --timeout=3m
         │
         ├───> [Job 2: Type Integrity & Schema Validation]
         │        ├── Web: tsc --noEmit (Kiểm tra lỗi kiểu dữ liệu TypeScript)
         │        └── Contract: Kiểm tra tính hợp lệ của openapi.yaml
         │
         └───> [Job 3: Automated Test Execution]
                  ├── Web: Vitest unit test cho các helpers, Zustand stores
                  └── API: go test -v -race ./... (Kiểm tra logic nghiệp vụ)
         │
         ▼
  [All Jobs Green?] ─── No ───> [Chặn thao tác Merge trên GitHub UI]
         │
        Yes
         ▼
  [Thực hiện Merge PR vào 'main']
         │
         ▼
  [Job 4: Continuous Deployment - Render Trigger]
         ├── Gửi HTTP POST tới Render Deploy Hook (Frontend Webhook)
         └── Gửi HTTP POST tới Render Deploy Hook (Backend Webhook)
```

---

##### Đặc tả Ma trận Nhiệm vụ Tự động (Action Matrix Specification)

- **Cơ chế Cache tối ưu thời gian chạy (Execution Speed):**
    - Tận dụng `actions/cache` để lưu cache thư mục `~/.cache/go-build` (cho Go) và `~/.local/share/pnpm/store` (cho Frontend). Thời gian chạy của toàn bộ pipeline không được vượt quá 3 phút trên hạ tầng miễn phí của GitHub Runners.

- **Secrets kiểm soát triển khai (Repository Secrets):**
    - `RENDER_WEB_DEPLOY_HOOK_URL`: Đường dẫn hook bí mật của Web Service Frontend.
    - `RENDER_API_DEPLOY_HOOK_URL`: Đường dẫn hook bí mật của Web Service Backend.

---

#### 3.5. THIẾT KẾ HẠ TẦNG TRIỂN KHAI TRÊN NỀN TẢNG RENDER (RENDER CLOUD ARCHITECTURE)

Do đặc thù đồ án sinh viên cần tối ưu hóa tối đa chi phí ($0 chi phí hạ tầng ban đầu), giải pháp triển khai sử dụng hệ sinh thái của **Render** (kết hợp các dịch vụ dữ liệu ngoại vi nếu cần bảo toàn giới hạn miễn phí).

```text
RENDER_INFRASTRUCTURE_BLUEPRINT:
  ENVIRONMENT: "Production"
  REGION: "Singapore (ap-southeast) - Tối ưu độ trễ về Việt Nam"

  SERVICES_TOPOLOGY:
    1. Web Client (Frontend):
       platform: "Render Web Service"
       runtime: "Node"
       plan: "Free"
       build_command: "pnpm install && pnpm build"
       start_command: "node apps/web/.next/standalone/server.js"
       health_check_path: "/"
       auto_deploy: false # Quản lý tập trung qua GitHub Action Webhook

    2. Core API (Backend):
       platform: "Render Web Service"
       runtime: "Docker"
       plan: "Free"
       dockerfilePath: "./apps/api/Dockerfile.prod"
       health_check_path: "/healthz"
       auto_deploy: false

    3. Database (PostgreSQL):
       option_a_render_managed:
         platform: "Render PostgreSQL"
         plan: "Free" # Giới hạn: 1GB storage, tự động thu hồi sau 30 ngày (cần reset)
       option_b_external_recommended:
         provider: "Supabase Free Tier / Neon.tech"
         protocol: "PostgreSQL 16 via Connection Pooling URI"
         advantages: "Không bị thu hồi sau 30 ngày, đầy đủ tiện ích ltree, uuid-ossp"

    4. In-Memory Cache (Redis):
       option_a_render_private_service:
         image: "redis:7-alpine"
         plan: "Free"
       option_b_external_recommended:
         provider: "Upstash Redis"
         protocol: "Serverless Redis / rediss:// URI"
         advantages: "Tối ưu bộ nhớ, miễn phí 10.000 requests/ngày, không tốn RAM máy chủ Render"
```

---

##### Ma trận Biến Môi trường Sản xuất (Production Environment Secrets Matrix)

| Service Target | Tên biến (Key) | Mục đích & Định dạng dữ liệu |
| --- | --- | --- |
| **Core API** | `PORT` | Cổng dịch vụ mạng (Render gán mặc định: `10000`). |
|  | `DATABASE_URL` | Chuỗi kết nối PostgreSQL: `postgres://user:pass@host:5432/dbname?sslmode=require`. |
|  | `REDIS_URL` | Chuỗi kết nối Redis: `rediss://default:pass@host:6379`. |
|  | `JWT_SECRET` | Khóa ký token bảo mật (Chuỗi ngẫu nhiên Base64 tối thiểu 64 ký tự). |
|  | `ALLOWED_ORIGINS` | Tên miền Frontend trên Render: `[https://community-web.onrender.com](https://community-web.onrender.com)`. |
| **Web Client** | `NEXT_PUBLIC_API_URL` | URL công khai của Backend: `[https://community-api.onrender.com/api/v1](https://community-api.onrender.com/api/v1)`. |
|  | `NODE_ENV` | Cố định giá trị: `production`. |

##### Xử lý Giới hạn của Gói Miễn phí (Free Tier Operational Strategy)

- **Khắc phục Cơ chế Ngủ đông (Spin-Down Mitigation):**
    - *Hiện tượng:* Các dịch vụ Web Service miễn phí trên Render sẽ tự động chuyển sang chế độ "ngủ" (Spin-down) sau 15 phút không nhận được bất kỳ request nào. Lần truy cập tiếp theo sẽ chịu độ trễ khởi động lại (Cold Start) từ 50–90 giây.
    - *Giải pháp dành cho sinh viên:*
        1. Thiết lập một công cụ giám sát kiểm tra trạng thái miễn phí (ví dụ: **UptimeRobot** hoặc **Cron-job.org**).
        2. Cấu hình gửi HTTP GET request định kỳ mỗi **10 phút một lần** vào endpoint kiểm tra sức khỏe của API `/healthz` và trang chủ Frontend `/` nhằm duy trì container luôn ở trạng thái kích hoạt (Active/Warm) trong khung giờ demo đồ án.

---

### 4. PHÁT TRIỂN TÍNH NĂNG CỐT LÕI & GHÉP NỐI HỆ THỐNG (CORE DEVELOPMENT & INTEGRATION)

*Tài liệu đặc tả logic nghiệp vụ, giao thức ghép nối và thuật toán thực thi dành cho AI Agent / Machine Engine. Không chứa mã nguồn triển khai.*

---

#### 4.1. PHÂN HỆ ĐỊNH DANH, QUẢN LÝ PHIÊN & TRUYỀN DẪN TOKEN (AUTH SUBSYSTEM)

##### 4.1.1. Luồng Xác thực Kép & Xoay vòng Refresh Token (Token Rotation Protocol)

```text
DAG_FLOW: AUTH_SESSION_AND_TOKEN_ROTATION
  NODES:
    - [CLIENT_RUNTIME: Trình duyệt / Next.js Client]
    - [EDGE_GATEWAY: Next.js Middleware / Reverse Proxy]
    - [CORE_AUTH_API: Go Auth Service]
    - [SESSION_CACHE: Redis Cluster B (Persistent)]
    - [PERSISTENCE_DB: PostgreSQL Users Table]
  EDGES:
    - Step 1: CLIENT_RUNTIME -> CORE_AUTH_API:
        REQUEST: POST /api/v1/auth/login (Credentials hoặc OAuth AuthCode)
    - Step 2: CORE_AUTH_API -> PERSISTENCE_DB:
        QUERY: Xác thực credentials / Upsert OAuth profile
    - Step 3: CORE_AUTH_API -> SESSION_CACHE:
        COMMAND: HSET session:{user_id}:{device_fingerprint}
                 current_token_hash=<SHA256(RT1)>
                 family_id=<UUID>
                 created_at=<TS>
                 expires_at=<TS+7d>
    - Step 4: CORE_AUTH_API -> CLIENT_RUNTIME:
        RESPONSE: HTTP 200 OK
        HEADER: Set-Cookie: access_token=AT1; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900
        HEADER: Set-Cookie: refresh_token=RT1; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800
        BODY: { user_profile_payload }
    - Step 5 (Refresh Cycle): CLIENT_RUNTIME -> CORE_AUTH_API:
        REQUEST: POST /api/v1/auth/refresh (Gửi kèm Cookie RT1)
    - Step 6 (Kiểm tra vi phạm): CORE_AUTH_API -> SESSION_CACHE:
        LOGIC_GATE:
          IF session NOT FOUND: Trả về HTTP 401 UNAUTHORIZED.
          IF current_token_hash == SHA256(RT1):
             Sinh cặp khóa mới (AT2, RT2).
             Cập nhật current_token_hash = SHA256(RT2).
             Lưu previous_token_hash = SHA256(RT1) với TTL 30s (Grace Period chống nghẽn mạng).
             Trả về AT2, RT2 mới cho CLIENT_RUNTIME.
          ELSE IF previous_token_hash == SHA256(RT1) (Trong 30s Grace Period):
             Trả về AT2, RT2 hiện hành (Không xoay vòng thêm).
          ELSE (Phát hiện Tái sử dụng Token / Tấn công đánh cắp RT1):
             Lập tức xóa toàn bộ Session Family: DEL session:{user_id}:*
             Đánh dấu cảnh báo bảo mật tài khoản.
             Trả về HTTP 403 FORBIDDEN.
```

---

##### 4.1.2. Đặc tả Hợp đồng Dữ liệu Phiên (Session Data Contracts)

```yaml
auth_contracts:
  jwt_access_token_claims:
    iss: "community-auth-engine"
    sub: "UUID (User ID)"
    role: "user_role_enum"
    token_version: "Integer"
    space_permissions:
      type: "Array of Objects"
      items: { space_id: "UUID", role: "user_role_enum" }
    iat: "Unix Timestamp"
    exp: "Unix Timestamp (iat + 900)"

  cookie_attributes:
    access_token:
      http_only: true
      secure: true
      same_site: "Lax"
      path: "/"
      ttl: 900
    refresh_token:
      http_only: true
      secure: true
      same_site: "Strict"
      path: "/api/v1/auth/refresh"
      ttl: 604800

  client_auth_interceptor_state_machine:
    states: [AUTHENTICATED, REFRESHING, QUEUED, UNAUTHENTICATED]
    invariants:
      - "Chỉ duy nhất 1 request /api/v1/auth/refresh được chạy tại một thời điểm (Mutex Lock)."
      - "Mọi request 401 tiếp theo trong quá trình REFRESHING phải được đưa vào bộ nhớ đệm Subscriber Queue."
      - "Khi REFRESHING thành công: Re-play toàn bộ Subscriber Queue với Bearer Token mới."
      - "Khi REFRESHING thất bại: Xóa toàn bộ client state, điều hướng về /login?intent_redirect=..."
```

---

#### 4.2. PHÂN HỆ BIÊN TẬP & XỬ LÝ ĐA PHƯƠNG TIỆN ZERO-HOP (CMS PIPELINE)

##### 4.2.1. Luồng Tải File Lên Trực Tiếp & Xác Nhận Hai Pha (Two-Phase Commit Upload)

```text
DAG_FLOW: ZERO_HOP_MEDIA_LIFECYCLE
  NODES:
    - [CLIENT_EDITOR: Tiptap Client Runtime]
    - [CORE_API: Go CMS Service]
    - [STORAGE_BUCKET: Cloudflare R2]
    - [DATABASE: PostgreSQL media_assets]
    - [WORKER: Media Reconciliation Task]
  EDGES:
    - Step 1: CLIENT_EDITOR -> CLIENT_EDITOR:
        ACTION: Người dùng paste ảnh vào Editor.
        COMPUTE: Đọc Magic Bytes (Kiểm tra MIME thực tế: image/jpeg, image/png, image/webp).
        COMPUTE: Client-side resize (Max resolution: 2560x1440, WebP compression quality 85%).
        COMPUTE: Tạo Blurhash string trực tiếp từ Canvas API.
    - Step 2: CLIENT_EDITOR -> CORE_API:
        REQUEST: POST /api/v1/media/presign
        BODY: { file_name: string, file_size: int, mime_type: string, blurhash: string }
    - Step 3: CORE_API -> DATABASE:
        COMMAND: INSERT INTO media_assets (file_key, mime_type, file_size_bytes, blurhash, status)
                 VALUES (generated_uuid_key, mime_type, file_size, blurhash, 'PENDING');
    - Step 4: CORE_API -> CLIENT_EDITOR:
        RESPONSE: { upload_url: presigned_put_url, file_key: generated_uuid_key, blurhash: string }
    - Step 5: CLIENT_EDITOR -> STORAGE_BUCKET:
        REQUEST: HTTP PUT <upload_url>
        BODY: Binary Data (Raw WebP Buffer)
        HEADER: Content-Type: <mime_type>
    - Step 6: CLIENT_EDITOR -> CLIENT_EDITOR:
        ACTION: Chèn node Tiptap: <image-node src="cdn.domain.com/{file_key}" blurhash="{blurhash}" status="loading" />
    - Step 7 (Xác nhận Đăng bài): CLIENT_EDITOR -> CORE_API:
        REQUEST: POST /api/v1/threads (Kèm payload chứa media_keys: [file_key_1, file_key_2])
    - Step 8: CORE_API -> DATABASE:
        COMMAND: BEGIN;
                 INSERT INTO threads (...);
                 UPDATE media_assets SET status = 'ATTACHED' WHERE file_key IN (media_keys);
                 COMMIT;
    - Step 9 (Xử lý dọn dẹp file rác): WORKER -> DATABASE:
        SCHEDULE: Chạy mỗi 01:00 AM UTC
        QUERY: SELECT file_key FROM media_assets WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '24 hours';
        ACTION: Gọi R2 API thực hiện DeleteObjects(keys);
        COMMAND: DELETE FROM media_assets WHERE file_key IN (processed_keys);
```

---

##### 4.2.2. Đặc tả Xác thực JSON AST của Bài viết (Content AST Validation Schema)

Mọi bài viết gửi lên phải tuân thủ nghiêm ngặt cấu trúc cây Abstract Syntax Tree (AST), triệt tiêu nguy cơ tiêm mã HTML độc hại trước khi lưu DB.

```yaml
tiptap_ast_validation_rules:
  root_node:
    type: "doc"
    required_children: ["type", "content"]

  allowed_node_types:
    - "paragraph"
    - "heading"
    - "codeBlock"
    - "blockquote"
    - "bulletList"
    - "orderedList"
    - "listItem"
    - "image"
    - "mention"
    - "horizontalRule"

  node_constraints:
    heading:
      allowed_attrs: { level: { type: "integer", min: 1, max: 4 } }
    codeBlock:
      allowed_attrs: { language: { type: "string", max_length: 32, regex: "^[a-zA-Z0-9_-]+$" } }
      max_text_length: 65536
    image:
      allowed_attrs:
        src: { type: "string", regex: "^https://cdn\\.domain\\.com/[a-f0-9-]{36}\\.[a-z]{3,4}$" }
        blurhash: { type: "string", max_length: 64 }
        alt: { type: "string", max_length: 120 }
    mention:
      allowed_attrs:
        id: { type: "string", regex: "^[a-f0-9-]{36}$" }
        label: { type: "string", max_length: 32 }

  text_sanitization:
    max_total_characters: 50000
    strip_null_bytes: true
    denied_characters: ["\u0000", "\uFFFD"]
```

---

#### 4.3. PHÂN HỆ CÂY BÌNH LUẬN ĐA TẦNG & ẢO HÓA DỮ LIỆU (NESTED COMMENTS)

##### 4.3.1. Thuật toán Tạo Đường Dẫn Phân Cấp (Hierarchical Path Generation)

- Cấu trúc trường `path` dùng định dạng PostgreSQL `ltree` theo hệ cơ số 36 (0-9, a-z), mỗi cấp có độ dài cố định 4 ký tự.
- Định dạng: `{parent_path}.{node_token}`. Ví dụ: `0001.000a.0003`.
- Công thức tính $Token$ cho bình luận con mới:

    $$
    Token = \text{Base36Encode}(\text{MaxChildTokenIndex} + 1)
    $$

    *Nếu nhánh chưa có bình luận con: $Token = \text{"0001"}$.*

```text
PATH_GENERATION_RULES:
  Max_Depth: 8
  Depth_0_Root_Format: "XXXX" (e.g., "0001", "0002")
  Child_Format: "{parent_path}.YYYY" (e.g., "0001.0001")
  Invariant:
    - IF Depth >= 8:
        Không phân nhánh con mới.
        Bình luận tiếp theo tự động quy đổi thành Flat Reply ở Depth 8.
        Thêm thuộc tính AST mention trỏ tới ID của tác giả cấp trên.
```

---

##### 4.3.2. Đặc tả Thuật toán Trải phẳng Cây Client-side (Tree-to-Array Flattening)

Chuyển đổi dữ liệu đệ quy từ Backend thành mảng 1 chiều phục vụ render bằng Virtualizer.

```text
ALGORITHM_SPECIFICATION: FLATTEN_COMMENT_TREE
  INPUT:
    - raw_nodes: Danh sách các Comment Node đã sắp xếp theo path ASC từ SQL.
    - collapsed_paths_set: Tập hợp các chuỗi path bị người dùng bấm thu gọn (Zustand State).

  OUTPUT:
    - display_array: Mảng 1 chiều gồm các phần tử phẳng (FlatCommentItem).

  DATA_STRUCTURE FlatCommentItem:
    {
      id: UUID,
      path: String,
      depth: Integer,
      has_children: Boolean,
      child_count: Integer,
      is_collapsed: Boolean,
      visible: Boolean,
      payload: CommentData
    }

  EXECUTION_STEPS:
    1. Khởi tạo: display_array = [], skip_prefix = NULL.
    2. FOREACH node IN raw_nodes:
         // Bước 2.1: Kiểm tra bỏ qua do nút cha bị thu gọn
         IF skip_prefix IS NOT NULL:
            IF node.path STARTS_WITH skip_prefix:
               CONTINUE; // Bỏ qua không nạp vào mảng hiển thị
            ELSE:
               skip_prefix = NULL; // Ra khỏi nhánh bị thu gọn

         // Bước 2.2: Xác định trạng thái thu gọn tại nút hiện tại
         depth = COUNT_OCCURRENCES(node.path, '.')
         is_collapsed = collapsed_paths_set.CONTAINS(node.path)

         item = FlatCommentItem {
           id: node.id,
           path: node.path,
           depth: depth,
           has_children: (node.child_count > 0),
           child_count: node.child_count,
           is_collapsed: is_collapsed,
           visible: TRUE,
           payload: node
         }

         display_array.PUSH(item)

         // Bước 2.3: Kích hoạt cờ chặn cho toàn bộ nhánh con phía sau
         IF is_collapsed == TRUE:
            skip_prefix = node.path + "."

    3. RETURN display_array.
```

---

##### 4.3.3. Máy Trạng thái Điều hướng Liên kết Sâu (Deep-Link Navigation State Machine)

Khi người dùng mở URL dạng `/thread/slug#comment-c58bd21c`:

```text
STATECHART: COMMENT_DEEP_LINK_LOCATOR
  [INIT: PARSE_HASH_FRAGMENT]
              │
              ▼
  [QUERY_CLIENT_CACHE] ──(Không tìm thấy ID trong bộ nhớ)──> [FETCH_COMMENT_CONTEXT_API]
              │                                                              │
        (Đã có dữ liệu)                                          (Trả về: Root Path,
              │                                                   Parent Chain, Page Offset)
              ▼                                                              │
  [UNCOLLAPSE_PARENTS] <─────────────────────────────────────────────────────┘
  (Tự động xóa toàn bộ path tổ tiên của target khỏi collapsed_paths_set)
              │
              ▼
  [COMPUTE_VIRTUAL_INDEX]
  (Tìm vị trí index tương ứng của comment_id trong display_array)
              │
              ▼
  [SCROLL_VIRTUALIZER_CALL]
  (Kích hoạt rowVirtualizer.scrollToIndex(target_index, { align: 'center' }))
              │
              ▼
  [FLASH_HIGHLIGHT_MUTATION]
  (Áp dụng class UI animation viền sáng trong 2.5s rồi gỡ bỏ)
```

---

#### 4.4. ĐỘNG CƠ BẦU CHỌN & BỘ ĐỆM GHI CHẬM (VOTING & REPUTATION ENGINE)

##### 4.4.1. Đặc tả Logic Đơn vị Nguyên tử Redis Lua Script (Atomic Vote Processor)

Thao tác Vote không ghi trực tiếp PostgreSQL. Gọi qua Redis Script với độ phức tạp $\mathcal{O}(1)$.

```text
LUA_SCRIPT_SPECIFICATION: execute_vote.lua
  KEYS:
    [1] thread:{target_id}:voters       (Hash: user_id -> direction)
    [2] thread:{target_id}:counters     (Hash: upvotes, downvotes, net_score)
    [3] dirty_threads_registry          (Set: Lưu target_id có biến động)
  ARGV:
    [1] user_id                         (String UUID)
    [2] new_direction                   (Integer: 1 hoặc -1)

  ALGORITHM_LOGIC:
    1. current_direction = HGET KEYS[1] ARGV[1] (Mặc định = 0 nếu nil)
    2. target_direction = TO_INTEGER(ARGV[2])

    3. IF current_direction == target_direction THEN
         // Người dùng bấm lại nút cũ -> Hành vi Hủy Vote (Unvote)
         HDEL KEYS[1] ARGV[1]
         IF target_direction == 1 THEN
            HINCRBY KEYS[2] "upvotes" -1
            HINCRBY KEYS[2] "net_score" -1
         ELSE
            HINCRBY KEYS[2] "downvotes" -1
            HINCRBY KEYS[2] "net_score" 1
         END
         final_direction = 0
       ELSE
         // Bầu chọn mới hoặc đảo chiều (Đang Downvote chuyển sang Upvote)
         HSET KEYS[1] ARGV[1] target_direction
         IF current_direction == 0 THEN
            // Bầu mới hoàn toàn
            IF target_direction == 1 THEN
               HINCRBY KEYS[2] "upvotes" 1
               HINCRBY KEYS[2] "net_score" 1
            ELSE
               HINCRBY KEYS[2] "downvotes" 1
               HINCRBY KEYS[2] "net_score" -1
            END
         ELSE
            // Đảo chiều (-1 sang 1 hoặc 1 sang -1)
            IF target_direction == 1 THEN
               HINCRBY KEYS[2] "upvotes" 1
               HINCRBY KEYS[2] "downvotes" -1
               HINCRBY KEYS[2] "net_score" 2
            ELSE
               HINCRBY KEYS[2] "upvotes" -1
               HINCRBY KEYS[2] "downvotes" 1
               HINCRBY KEYS[2] "net_score" -2
            END
         END
         final_direction = target_direction
       END

    4. SADD KEYS[3] target_id // Gắn cờ cần flush vào DB
    5. RETURN { final_direction, HGETALL KEYS[2] }
```

---

##### 4.4.2. Quy trình Xả Dữ liệu Đồng bộ Cơ sở Dữ liệu (Batch Flush Worker Specification)

- **Tần suất kích hoạt:** Định kỳ 5000ms qua Asynq Worker.
- **Quy trình thực thi:**

```text
BATCH_FLUSH_PROTOCOL:
  1. ATOMIC_FETCH_DIRTY_IDS:
     COMMAND: SPOP dirty_threads_registry 100 // Lấy tối đa 100 ID mỗi mẻ
     IF empty THEN TERMINATE_CYCLE.

  2. READ_SNAPSHOT_DATA:
     COMMAND: PIPELINE {
       FOREACH id IN dirty_ids:
         HGETALL thread:{id}:counters
     }

  3. DATABASE_BULK_TRANSACTION (PostgreSQL):
     COMMAND:
       BEGIN TRANSACTION;

       -- Cập nhật đồng loạt bảng thread_counters
       UPDATE thread_counters AS tc
       SET upvotes = c.upvotes,
           downvotes = c.downvotes,
           net_score = (c.upvotes - c.downvotes),
           updated_at = NOW()
       FROM (VALUES
         -- Render dynamic batch data
         ('uuid-1'::uuid, 12, 1),
         ('uuid-2'::uuid, 45, 3)
       ) AS c(thread_id, upvotes, downvotes)
       WHERE tc.thread_id = c.thread_id;

       -- Tính toán lại Hot Score theo công thức Gravity Decay
       UPDATE thread_counters
       SET hot_score = (net_score) / POWER(EXTRACT(EPOCH FROM (NOW() - t.created_at))/3600 + 2, 1.8)
       FROM threads t
       WHERE thread_counters.thread_id = t.id AND t.id IN (dirty_ids);

       COMMIT;

  4. FALLBACK_ON_FAILURE:
     IF DB Transaction Fails:
        COMMAND: SADD dirty_threads_registry (Trả ngược dirty_ids lại Redis Set).
        TRIGGER: Log critical alert to Sentry.
```

---

#### 4.5. ĐỘNG CƠ PHÂN PHỐI BẢNG TIN & HỢP NHẤT TRUY VẤN (FEED AGGREGATOR)

##### 4.5.1. Thuật toán Hợp nhất Bảng tin Động (K-Way Dynamic Feed Merger)

Giải quyết việc trộn các bài viết từ Followed Spaces thông thường (lưu trong Redis User Timeline) với bài viết từ các tác giả KOLs (Fan-out on Read lấy trực tiếp).

```text
ALGORITHM_SPECIFICATION: K_WAY_FEED_MERGER
  INPUT:
    - user_id: UUID
    - requested_limit: Integer (e.g., 20)
    - cursor_score: Float64 (Điểm chặn phân trang)

  PROCESSING_STEPS:
    1. INBOX_RETRIEVAL:
       Lấy 50 Thread ID có điểm < cursor_score từ Redis Set:
       COMMAND: ZREVRANGEBYSCORE feed:user:{user_id} (cursor_score -inf LIMIT 0 50

    2. KOL_POLLING:
       Lấy danh sách KOL IDs mà user_id đang theo dõi:
       kols = SELECT kol_id FROM user_follows WHERE follower_id = user_id AND is_kol = TRUE;

       PARALLEL_GOROUTINES (Cho từng kol_id IN kols):
         COMMAND: ZREVRANGEBYSCORE feed:author:{kol_id} (cursor_score -inf LIMIT 0 20

    3. MIN_HEAP_MERGE (RAM Processing):
       Khởi tạo Min-Heap kích thước tối đa = requested_limit.
       Duyệt đồng thời các luồng dữ liệu (Inbox Stream + Các KOL Streams).
       Tiêu chí so sánh phần tử Heap: Score (Thời gian hoặc Hot Score tùy bộ lọc).

       WHILE các luồng còn phần tử VÀ heap.size < requested_limit:
         Chèn phần tử có điểm cao nhất vào mảng kết quả.
         Loại bỏ phần tử trùng lặp (Deduplication qua Thread ID).

    4. HYDRATE_AND_ENRICH:
       Lấy chi tiết danh sách 20 Thread ID cuối cùng qua PostgreSQL:
       QUERY: SELECT ... FROM threads t JOIN thread_counters tc ON t.id = tc.thread_id WHERE t.id IN (selected_ids);

    5. COMPUTE_NEXT_CURSOR:
       next_cursor = Base64Encode(Score:Last_Thread_ID).
       RETURN { data: HydratedThreads, next_cursor: next_cursor }
```

---

##### 4.5.2. Hợp đồng Phân trang Con trỏ (Cursor Encoding Contract)

```yaml
cursor_specification:
  serialization_format: "Base64(composite_string)"
  components:
    sort_by_hot:
      format: "{hot_score}:{created_at_epoch}:{thread_id}"
      example_raw: "142.5821:1790295330:7c9e6679-7425-40de-944b-e07fc1f90ae7"
      example_base64: "MTQyLjU4MjE6MTc5MDI5NTMzMDo3YzllNjY3OS03NDI1LTQwZGUtOTQ0Yi1lMDdmYzFmOTBhZTc="
    sort_by_new:
      format: "{created_at_epoch}:{thread_id}"
      example_raw: "1790295330:7c9e6679-7425-40de-944b-e07fc1f90ae7"

  sql_predicates:
    sort_by_hot: |
      WHERE (tc.hot_score, t.created_at, t.id) < (:hot_score, :created_at, :thread_id)
      ORDER BY tc.hot_score DESC, t.created_at DESC, t.id DESC
      LIMIT :limit
```

---

#### 4.6. HẠ TẦNG SỰ KIỆN THỜI GIAN THỰC & GOM CỤM THÔNG BÁO (NOTIFICATION HUB)

##### 4.6.1. Hợp đồng Kênh Truyền Server-Sent Events (SSE Transport Contract)

```text
SSE_LIFECYCLE_PROTOCOL:
  CONNECTION_INITIALIZATION:
    Client: GET /api/v1/realtime/events
    Headers:
      Accept: text/event-stream
      Authorization: Bearer <JWT>
      Last-Event-ID: evt_1790295330_0001 (Optional - khi kết nối lại)

    Server Response:
      HTTP/2 200 OK
      Content-Type: text/event-stream
      Cache-Control: no-cache, no-transform
      Connection: keep-alive
      X-Accel-Buffering: no

  HEARTBEAT_INVARIANT:
    Server phải gửi 1 chuỗi Ping Comment mỗi 15 giây để duy trì kết nối qua NAT/Proxy:
    RAW_PACKET: ": ping\n\n"

  RESYNC_UPON_RECONNECT:
    IF Last-Event-ID != NULL:
       Server đọc từ Redis Stream: stream:notify:{user_id}
       Query: XRANGE stream:notify:{user_id} (Last-Event-ID +inf
       Đẩy toàn bộ sự kiện tồn đọng về Client trước khi chuyển sang chế độ Live Listen.
```

---

##### 4.6.2. Thuật toán Gom cụm Thông báo Cửa sổ Trượt (Sliding Window Notification Aggregator)

Ngăn chặn việc gửi dồn dập hàng trăm thông báo khi một bài viết nhận nhiều tương tác trong thời gian ngắn.

```text
DAG_FLOW: NOTIFICATION_AGGREGATION_ENGINE
  NODES:
    - [INTERACTION_PRODUCER: Thao tác Upvote hoặc Reply]
    - [REDIS_BUFFER: Stream & Sorted Set tạm thời]
    - [AGGREGATION_WORKER: BullMQ / Asynq Job]
    - [NOTIFICATION_DB: PostgreSQL User Notifications]
    - [SSE_DISPATCHER: Bộ đẩy Realtime]
  EDGES:
    - Step 1: INTERACTION_PRODUCER -> REDIS_BUFFER:
        COMMAND: ZADD notify_pending:{recipient_id}:{entity_id}:{action_type} <current_timestamp> <actor_id>
        COMMAND: SETNX notify_timer:{recipient_id}:{entity_id}:{action_type} "SCHEDULED" EX 300
    - Step 2:
        IF SETNX return 1 (Chưa có bộ đếm giờ nào cho nhóm này):
           Tạo 1 Delayed Job trong Asynq với thời gian trễ = 300 giây (5 phút).
        ELSE:
           Bỏ qua (Bộ đếm thời gian đang chạy, chỉ việc tích lũy thêm actor_id vào Sorted Set).
    - Step 3 (Sau khi hết 300s, Worker kích hoạt): AGGREGATION_WORKER -> REDIS_BUFFER:
        COMMAND: ZRANGE notify_pending:{recipient_id}:{entity_id}:{action_type} 0 -1
        COMMAND: DEL notify_pending:{recipient_id}:{entity_id}:{action_type}
        COMMAND: DEL notify_timer:{recipient_id}:{entity_id}:{action_type}
    - Step 4: AGGREGATION_WORKER -> AGGREGATION_WORKER:
        COMPUTE_MESSAGE:
          actors = [list_of_actor_ids]
          count = actors.length
          IF count == 1:
             title = "{actor[0].name} đã upvote bài viết của bạn"
          ELSE IF count == 2:
             title = "{actor[0].name} và {actor[1].name} đã upvote bài viết của bạn"
          ELSE:
             title = "{actor[0].name}, {actor[1].name} và {count - 2} người khác đã upvote bài viết của bạn"
    - Step 5: AGGREGATION_WORKER -> NOTIFICATION_DB:
        COMMAND: INSERT INTO notifications (recipient_id, payload_json, is_read)
                 VALUES (recipient_id, generated_payload, FALSE);
    - Step 6: AGGREGATION_WORKER -> SSE_DISPATCHER:
        COMMAND: PUBLISH user_events:{recipient_id} generated_payload
    - Step 7: SSE_DISPATCHER -> Trình duyệt Client:
        DATA_STREAM:
          id: evt_generated_id
          event: aggregated_notification
          data: { generated_payload }
```

---

##### 4.6.3. Đặc tả Hợp đồng Dữ liệu Sự kiện Thời gian thực (SSE Payload Specifications)

```yaml
sse_payload_schemas:
  thread_stats_event:
    event_name: "thread_stats"
    schema:
      thread_id: "UUID"
      upvotes: "Integer"
      downvotes: "Integer"
      net_score: "Integer"
      comment_count: "Integer"
      timestamp: "Unix Timestamp"

  new_comment_node_event:
    event_name: "new_comment_node"
    schema:
      thread_id: "UUID"
      comment_id: "UUID"
      parent_id: "UUID (Nullable)"
      path: "String (ltree format)"
      depth: "Integer"
      author_preview:
        id: "UUID"
        username: "String"
        avatar_url: "String"
      created_at: "ISO8601 String"

  user_notification_event:
    event_name: "user_notification"
    schema:
      notification_id: "UUID"
      type: "UPVOTE_AGGREGATED | COMMENT_REPLY | MENTION"
      target_url: "String (Relative URI)"
      message_text: "String"
      actor_avatars: "Array of Strings (Max 3 URLs)"
      total_actors: "Integer"
      created_at: "ISO8601 String"
```

