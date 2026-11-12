## KHUNG TÀI LIỆU PHÂN TÍCH & THIẾT KẾ HỆ THỐNG CHUẨN (SYSTEM ANALYSIS & DESIGN LIFECYCLE FRAMEWORK)

> **Hướng dẫn sử dụng khung:** Thay thế toàn bộ các trường trong ngoặc vuông `[...]` bằng thông tin đặc thù của dự án. Cấu trúc gồm **6 Giai đoạn** độc lập nhưng kế thừa chặt chẽ (MECE), áp dụng được cho mọi quy mô từ đồ án nghiên cứu (R&D) đến hệ thống phần mềm doanh nghiệp.

- **Tên dự án / Hệ thống:** `[Tên Dự Án]`
- **Mã định danh / Phiên bản:** `[PRJ-CODE - v1.0]`
- **Ngăn xếp công nghệ cốt lõi:** `[Backend Framework / Frontend / Database / Infrastructure]`
- **Phạm vi áp dụng:** Toàn bộ vòng đời Phân tích, Thiết kế, Kiểm thử và Triển khai.

## GIAI ĐOẠN 1: NGHIÊN CỨU NỀN TẢNG & KHẢO SÁT CÔNG NGHỆ LÕI (FOUNDATIONAL RESEARCH & FEASIBILITY)

### 1. Tổng quan Đề tài & Mục tiêu R&D

#### 1.1. Định danh bài toán, bối cảnh và tính cấp thiết

- **Bối cảnh thực tiễn (Status Quo):** Mô tả hiện trạng vận hành, sự phân mảnh công cụ hoặc nút thắt quy trình mà người dùng/doanh nghiệp đang gặp phải `[Mô tả 2–3 vấn đề cốt lõi]`.
- **Rủi ro & Hạn chế hiện hữu:** Phân tích các rào cản về hiệu năng, chi phí, bảo mật dữ liệu hoặc khả năng mở rộng của các giải pháp hiện tại `[Mô tả rủi ro]`.
- **Tính cấp thiết (Target State):** Xác định giá trị cốt lõi hệ thống mới mang lại qua bảng đối chiếu:

| Khía cạnh đánh giá                        | Hiện trạng (Status Quo)            | Mục tiêu hệ thống (Target State)   |
| ----------------------------------------- | ---------------------------------- | ---------------------------------- |
| **[Tiêu chí 1: Quy trình / Kiến trúc]**   | `[Mô tả hạn chế hiện tại]`         | `[Giải pháp hợp nhất / tối ưu]`    |
| **[Tiêu chí 2: Dữ liệu / Bảo mật]**       | `[Mô tả rủi ro dữ liệu]`           | `[Cơ chế bảo vệ / sở hữu dữ liệu]` |
| **[Tiêu chí 3: Hiệu năng / Trải nghiệm]** | `[Mô tả độ trễ / trải nghiệm kém]` | `[Chỉ số trải nghiệm mục tiêu]`    |

#### 1.2. Mục tiêu nghiên cứu khoa học / công nghệ (Research Objectives - RO)

- **RO1 – [Tên mục tiêu 1 - Vd: Cơ chế đồng bộ / Xử lý lõi]:** `[Mô tả bài toán kỹ thuật cần giải quyết và phương pháp tiếp cận]`.
- **RO2 – [Tên mục tiêu 2 - Vd: Tối ưu hiệu năng / Thuật toán]:** `[Mô tả mô hình toán học hoặc giải thuật cải tiến]`.
- **RO3 – [Tên mục tiêu 3 - Vd: Bảo mật / Tích hợp thông minh]:** `[Mô tả kiến trúc bảo toàn dữ liệu hoặc tự động hóa]`.

#### 1.3. Mục tiêu sản phẩm kỹ thuật chuyển giao (Engineering Deliverables)

1. **Phân hệ Máy chủ (Backend / Core Services):** `[Mô tả API, kiến trúc tầng, ORM, xác thực]`.
2. **Phân hệ Khách (Client Applications):** `[Mô tả Web App / Desktop App / Mobile App]`.
3. **Phân hệ Tương tác & Xử lý nền (Real-time & Background Workers):** `[Mô tả luồng thời gian thực, hàng đợi, tác vụ định kỳ]`.
4. **Phân hệ Mở rộng / Trí tuệ nhân tạo (AI / Integrations):** `[Mô tả các mô-đun tích hợp bên thứ ba hoặc AI]`.

#### 1.4. Giới hạn phạm vi và Giả định hệ thống (Scope Boundaries & Assumptions)

- **Giới hạn phạm vi (In-Scope vs. Out-of-Scope):**
    - *Loại hình dữ liệu hỗ trợ:* `[Văn bản, đa phương tiện, giao dịch, luồng sự kiện...]`.
    - *Ngưỡng quy mô tải thiết kế:* `[Số lượng người dùng đồng thời / dung lượng dữ liệu tối đa]`.
    - *Ranh giới miễn trừ:* `[Các tính năng không thuộc phạm vi phiên bản hiện tại]`.

- **Giả định hệ thống (Assumptions):** `[Điều kiện về phần cứng thiết bị đầu cuối, hạ tầng mạng, môi trường triển khai]`.

### 2. Khảo sát Tài liệu & Đánh giá Công nghệ Hiện đại (SOTA)

#### 2.1. Ma trận tổng hợp khảo sát công nghệ

| Phân vùng kỹ thuật                 | Công nghệ / Giải pháp hiện hữu | Giải pháp đề tài lựa chọn | Lý do lựa chọn cốt lõi                  |
| ---------------------------------- | ------------------------------ | ------------------------- | --------------------------------------- |
| **[Phân vùng 1: Giao thức mạng]**  | `[Công nghệ A, B]`             | `[Công nghệ lựa chọn]`    | `[Ưu thế về độ trễ / băng thông]`       |
| **[Phân vùng 2: Lưu trữ dữ liệu]** | `[Công nghệ C, D]`             | `[Công nghệ lựa chọn]`    | `[Ưu thế về tính nhất quán / truy vấn]` |
| **[Phân vùng 3: Xử lý đặc thù]**   | `[Công nghệ E, F]`             | `[Công nghệ lựa chọn]`    | `[Ưu thế về tài nguyên / bảo mật]`      |

#### 2.2. Phân tích so sánh chi tiết theo từng nhóm công nghệ

*(Lặp lại cấu trúc bảng dưới đây cho từng bài toán kỹ thuật quan trọng)*

| Tiêu chí kỹ thuật              | Giải pháp 1: `[Tên]` | Giải pháp 2: `[Tên]` | Giải pháp 3 (Lựa chọn): `[Tên]` |
| ------------------------------ | -------------------- | -------------------- | ------------------------------- |
| **Bản chất kiến trúc**         | `[Mô tả]`            | `[Mô tả]`            | `[Mô tả]`                       |
| **Hiệu năng & Độ trễ**         | `[Chỉ số]`           | `[Chỉ số]`           | `[Chỉ số]`                      |
| **Khả năng mở rộng & Bảo trì** | `[Đánh giá]`         | `[Đánh giá]`         | `[Đánh giá]`                    |
| **Hạn chế cố hữu**             | `[Nhược điểm]`       | `[Nhược điểm]`       | `[Cách khắc phục]`              |

### 3. Phân tích Khoảng trống Công nghệ & Đề xuất Giải pháp (Gap Analysis)

#### 3.1. Bài toán đánh đổi / Nghịch lý hiện tại (The Core Trade-off / Trilemma)

Phân tích sự xung đột giữa các yếu tố cốt lõi (ví dụ: *Hiệu năng vs. Tính nhất quán*, *Tiện lợi đám mây vs. Quyền riêng tư*, *Chi phí vs. Độ sẵn sàng*) mà các hệ thống đơn lẻ chưa giải quyết trọn vẹn.

#### 3.2. Đề xuất Kiến trúc Giải pháp (Proposed Architecture)

Trình bày nguyên lý thiết kế đột phá để phá vỡ thế đánh đổi trên:

1. **Nguyên tắc 1 – [Tách tầng dữ liệu / Phân rã trách nhiệm]:** `[Mô tả]`.
2. **Nguyên tắc 2 – [Thuật toán / Cơ chế tối ưu hóa]:** `[Mô tả kèm công thức toán học nếu có]`.
3. **Nguyên tắc 3 – [Kiểm soát lưu lượng / Bảo mật theo thiết kế]:** `[Mô tả]`.

#### 3.3. Các giả thuyết nghiên cứu & Tiêu chí kiểm định (Research Hypotheses)

- **Giả thuyết 1 ($H_1$):** *"[Phát biểu giả thuyết về hiệu năng/độ trễ]"* $\rightarrow$ **Tiêu chí kiểm định:** `[Ngưỡng định lượng cụ thể, vd: Độ trễ < 50ms]`.
- **Giả thuyết 2 ($H_2$):** *"[Phát biểu giả thuyết về khả năng chịu tải/băng thông]"* $\rightarrow$ **Tiêu chí kiểm định:** `[Ngưỡng định lượng cụ thể, vd: Giảm > 95% gói tin]`.
- **Giả thuyết 3 ($H_3$):** *"[Phát biểu giả thuyết về tài nguyên/bảo mật]"* $\rightarrow$ **Tiêu chí kiểm định:** `[Ngưỡng định lượng cụ thể, vd: RAM < 50MB / 0 Byte rò rỉ]`.

## GIAI ĐOẠN 2: KỸ NGHỆ YÊU CẦU HỆ THỐNG (REQUIREMENTS ENGINEERING)

### 1. Phân tích Actor, Tác nhân & Bối cảnh Sử dụng

#### 1.1. Ma trận Chân dung Người dùng (User Personas & Context Matrix)

| Mã Actor   | Tên Actor & Vai trò | Bối cảnh vận hành      | Mục tiêu cốt lõi   | Điểm đau (Pain Points) | Phân cấp quyền hạn         |
| ---------- | ------------------- | ---------------------- | ------------------ | ---------------------- | -------------------------- |
| **ACT-01** | `[Vai trò 1]`       | `[Môi trường sử dụng]` | `[Mục tiêu chính]` | `[Khó khăn hiện tại]`  | `[Quyền đọc/ghi/quản trị]` |
| **ACT-02** | `[Vai trò 2]`       | `[Môi trường sử dụng]` | `[Mục tiêu chính]` | `[Khó khăn hiện tại]`  | `[Quyền đọc/ghi/quản trị]` |
| **ACT-03** | `[Vai trò 3]`       | `[Môi trường sử dụng]` | `[Mục tiêu chính]` | `[Khó khăn hiện tại]`  | `[Quyền đọc/ghi/quản trị]` |

#### 1.2. Đặc tả Tác nhân Hệ thống Tự động (System Autonomous Agents)

| Mã Agent   | Tên Tác nhân             | Môi trường thực thi    | Giao thức đầu vào       | Đầu ra dữ liệu & Ràng buộc             |
| ---------- | ------------------------ | ---------------------- | ----------------------- | -------------------------------------- |
| **AGT-01** | `[Vd: AI Worker]`        | `[Server RAM / Edge]`  | `[Stream / Queue]`      | `[Kết quả đầu ra & Quy tắc bảo mật]`   |
| **AGT-02** | `[Vd: Realtime Relay]`   | `[WebSocket Server]`   | `[Binary / JSON]`       | `[Cơ chế phát sóng & Giới hạn tốc độ]` |
| **AGT-03** | `[Vd: Cron / Ingestion]` | `[Background Service]` | `[Scheduler / Channel]` | `[Dữ liệu đồng bộ định kỳ]`            |

### 2. Đặc tả Yêu cầu Chức năng theo các Trụ cột Cốt lõi (Functional Requirements)

*(Phân chia hệ thống thành $N$ trụ cột chức năng không chồng chéo - MECE)*

#### 2.1. Trụ cột 1: `[Tên Phân hệ / Trụ cột 1]`

- **FR-[MÃ]-01: `[Tên chức năng]`**
    - **Đặc tả nghiệp vụ:** `[Mô tả chi tiết hành vi hệ thống]`.
    - **Ràng buộc kỹ thuật:** `[Định dạng dữ liệu, thư viện, giao thức bắt buộc]`.
    - **Tiêu chí nghiệm thu (Acceptance Criteria):** `[Điều kiện đầu vào $\rightarrow$ Kết quả đo lường được]`.

#### 2.2. Trụ cột 2: `[Tên Phân hệ / Trụ cột 2]`

*(Áp dụng mẫu đặc tả FR tương tự)*

### 3. Đặc tả Yêu cầu Phi chức năng (Non-Functional Requirements - NFR)

#### 3.1. Nhóm NFR 1: An ninh, Quyền riêng tư & Sở hữu Dữ liệu (Security & Privacy)

- **NFR-SEC-01 (Xác thực & Phân quyền):** `[Cơ chế Token, RBAC/PBAC, mã hóa đường truyền]`.
- **NFR-SEC-02 (Bảo vệ & Lưu trữ Dữ liệu):** `[Chính sách lưu giữ dữ liệu, mã hóa dữ liệu tĩnh, ẩn danh hóa]`.
- **NFR-SEC-03 (Chống tấn công & Cô lập):** `[Chống XSS, CSRF, Injection, Sandboxing]`.

#### 3.2. Nhóm NFR 2: Hiệu năng & Độ trễ (Performance & Latency)

- **NFR-PERF-01 (Thời gian phản hồi & Độ trễ):** `[Ngưỡng phản hồi API < X ms; độ trễ thời gian thực < Y ms]`.
- **NFR-PERF-02 (Dấu chân tài nguyên phần cứng):** `[Giới hạn tiêu thụ CPU, RAM lúc nghỉ và lúc tải đỉnh]`.
- **NFR-PERF-03 (Thông lượng & Chịu tải):** `[Số lượng kết nối đồng thời CCU, số request/giây RPS]`.

#### 3.3. Nhóm NFR 3: Độ tin cậy & Phục hồi Sự cố (Reliability & Resilience)

- **NFR-REL-01 (Tính sẵn sàng & Ngoại tuyến):** `[Cam kết Uptime % hoặc khả năng hoạt động Offline]`.
- **NFR-REL-02 (Tự phục hồi & Hội tụ):** `[Cơ chế Retry Exponential Backoff, tự động hòa giải xung đột]`.
- **NFR-REL-03 (Quản lý vòng đời trạng thái tạm):** `[Thời gian sống TTL của phiên, bộ nhớ đệm]`.

#### 3.4. Nhóm NFR 4: Tính tương tác & Chuẩn hóa (Interoperability & Standards)

- **NFR-INT-01 (Chuẩn giao tiếp & Tài liệu hóa):** `[RESTful OpenAPI 3.0, chuẩn định dạng dữ liệu mở]`.
- **NFR-INT-02 (Tương thích đa nền tảng):** `[Hệ điều hành, trình duyệt, thiết bị hỗ trợ]`.

### 4. Ma trận Truy xuất Yêu cầu (Traceability Matrix)

| Mục tiêu Nghiên cứu (Giai đoạn 1) | Yêu cầu Chức năng (FR) | Yêu cầu Phi chức năng (NFR) | Cơ chế Kiểm chứng Thực nghiệm            |
| --------------------------------- | ---------------------- | --------------------------- | ---------------------------------------- |
| **RO1:** `[Tên RO1]`              | `FR-01`, `FR-02`       | `NFR-SEC-01`, `NFR-REL-02`  | `[Kịch bản kiểm thử đối soát]`           |
| **RO2:** `[Tên RO2]`              | `FR-03`, `FR-04`       | `NFR-PERF-01`, `NFR-INT-01` | `[Kịch bản đo lường benchmark]`          |
| **RO3:** `[Tên RO3]`              | `FR-05`, `FR-06`       | `NFR-PERF-03`, `NFR-SEC-02` | `[Kịch bản kiểm thử áp lực / kiểm toán]` |

## GIAI ĐOẠN 3: THIẾT KẾ KIẾN TRÚC TỔNG THỂ & HẠ TẦNG CÔNG NGHỆ (SYSTEM ARCHITECTURE DESIGN)

### 1. Kiến trúc Phân tầng Hệ thống (Multi-Tier Architecture)

```đoạn mã
graph TB
    subgraph ClientTier ["1. TẦNG KHÁCH & THIẾT BỊ BIÊN (CLIENT / EDGE TIER)"]
        ClientApp1["[Ứng dụng Web / Mobile]"]
        ClientApp2["[Ứng dụng Desktop / Local Engine]"]
    end

    subgraph TransportTier ["2. TẦNG GIAO TIẾP & ĐỒNG BỘ (API GATEWAY & REALTIME TIER)"]
        APIGateway["[REST / GraphQL API Gateway]"]
        RealtimeHub["[WebSocket / SignalR / Message Broker]"]
    end

    subgraph BusinessTier ["3. TẦNG NGHIỆP VỤ & XỬ LÝ NỀN (APPLICATION & WORKER TIER)"]
        CoreLogic["[Core Domain & Application Services]"]
        BgWorkers["[Background Workers & Schedulers]"]
    end

    subgraph DataAITier ["4. TẦNG LƯU TRỮ & TRÍ TUỆ NHÂN TẠO (PERSISTENCE & AI TIER)"]
        PrimaryDB[("[Primary Database]")]
        CacheVector[("[Cache / Vector / Graph Store]")]
        AIService["[AI Orchestration & Inference Engine]"]
    end

    ClientApp1 <-->|HTTPS / JSON| APIGateway
    ClientApp2 <-->|WSS / Binary| RealtimeHub
    APIGateway --> CoreLogic
    RealtimeHub --> CoreLogic
    CoreLogic --> BgWorkers
    CoreLogic --> PrimaryDB
    CoreLogic --> CacheVector
    BgWorkers --> AIService
```

- **Mô tả trách nhiệm từng tầng:**
    1. **Tầng Khách (Client Tier):** `[Trách nhiệm hiển thị, lưu trữ cục bộ, xử lý lạc quan Optimistic UI]`.
    2. **Tầng Giao tiếp (Transport Tier):** `[Định tuyến, cân bằng tải, nén gói tin, quản lý kết nối]`.
    3. **Tầng Nghiệp vụ (Business Tier):** `[Thực thi quy tắc miền, CQRS, xử lý bất đồng bộ]`.
    4. **Tầng Dữ liệu & AI (Data & AI Tier):** `[Lưu trữ bền vững, lập chỉ mục tìm kiếm, suy luận mô hình]`.

### 2. Lựa chọn & Thiết kế Ngăn xếp Công nghệ (Tech Stack & Solution Blueprint)

#### 2.1. Ma trận Quyết định Kỹ thuật

| Phân vùng kiến trúc     | Công nghệ lựa chọn | Công nghệ thay thế cân nhắc | Lập luận kỹ thuật & Chỉ số đánh đổi                     |
| ----------------------- | ------------------ | --------------------------- | ------------------------------------------------------- |
| **Client Runtime**      | `[Tên công nghệ]`  | `[Phương án B]`             | `[So sánh RAM, tốc độ khởi động, hệ sinh thái]`         |
| **Backend Framework**   | `[Tên công nghệ]`  | `[Phương án B]`             | `[So sánh thông lượng, kiểm soát kiểu, bảo trì]`        |
| **Giao thức Realtime**  | `[Tên công nghệ]`  | `[Phương án B]`             | `[So sánh độ trễ, cơ chế fallback, kích thước gói tin]` |
| **Cơ sở dữ liệu & ORM** | `[Tên công nghệ]`  | `[Phương án B]`             | `[So sánh tính ACID, khả năng mở rộng, truy vấn]`       |

#### 2.2. Cấu trúc Giải pháp & Phân rã Thư mục (Solution Structural Blueprint)

```plaintext
[Project.Root.Solution]/
├── src/
│   ├── [Project].Domain/           # Thực thể lõi, Value Objects, Domain Events (Không phụ thuộc ngoài)
│   ├── [Project].Application/      # Use Cases (CQRS), Interfaces, DTO Contracts, Validators
│   ├── [Project].Infrastructure/   # Triển khai DB (ORM), Realtime Hubs, Background Jobs, AI, Auth
│   ├── [Project].WebAPI/           # Controllers/Endpoints, Middlewares, DI Configuration
│   └── apps/
│       └── [client-app]/           # Mã nguồn giao diện người dùng & Tương tác biên
├── packages/
│   └── [shared-contracts]/         # Định nghĩa kiểu dữ liệu dùng chung giữa Client & Server
└── tests/
    ├── [Project].UnitTests/        # Kiểm thử đơn vị nghiệp vụ
    └── [Project].IntegrationTests/ # Kiểm thử tích hợp hệ thống
```

### 3. Kiến trúc An toàn, Xác thực & Bảo mật Hạ tầng (Security Architecture)

#### 3.1. Mô hình Xác thực & Phân quyền (Authentication & Authorization)

- **Cơ chế cấp phát thẻ xác thực:** `[JWT Bearer / OAuth2 / OIDC, thuật toán ký số, vòng đời Access/Refresh Token]`.
- **Chính sách phân quyền (Authorization Policies):** `[Mô tả các vai trò Role và quyền hạn chi tiết trên từng Endpoint/Hub]`.

#### 3.2. Kiến trúc Phòng thủ Đa lớp & Cô lập Thực thi (Defense-in-Depth)

- **Lớp 1 – Lọc & Mã hóa đầu vào:** `[Validation schema, chống Injection, mã hóa thực thể HTML]`.
- **Lớp 2 – Cô lập môi trường thực thi:** `[Sandboxing, Content Security Policy (CSP), CORS]`.
- **Lớp 3 – Bảo vệ đường truyền & Tài nguyên:** `[TLS 1.3, Rate Limiting, Throttling chống DDoS/Packet Storm]`.

#### 3.3. Kiến trúc Vòng đời Dữ liệu & Tuân thủ Bảo mật (Data Lifecycle & Privacy)

- **Chính sách lưu trữ dữ liệu tạm thời (Ephemeral Data):** `[Cơ chế quản lý trên RAM, thời gian tự hủy TTL, không ghi log nhạy cảm]`.
- **Chính sách bảo mật dữ liệu người dùng / AI:** `[Ranh giới cô lập dữ liệu, mã hóa dữ liệu nghỉ Encryption-at-Rest]`.

## GIAI ĐOẠN 4: MÔ HÌNH HÓA HÀNH VI, LUỒNG DỮ LIỆU & GIAO THỨC (BEHAVIORAL & INTERACTION DESIGN)

### 1. Mô hình hóa Ca sử dụng (Use Case Modeling)

#### 1.1. Biểu đồ Use Case Tổng thể

```đoạn mã
flowchart LR
    subgraph Actors ["Tác nhân"]
        A1["[Actor 1]"]
        A2["[Actor 2]"]
        Sys["[System Agent]"]
    end

    subgraph SubSystem1 ["Phân hệ 1: [Tên]"]
        UC1["UC-01: [Tên ca sử dụng]"]
        UC2["UC-02: [Tên ca sử dụng]"]
    end

    subgraph SubSystem2 ["Phân hệ 2: [Tên]"]
        UC3["UC-03: [Tên ca sử dụng]"]
        UC4["UC-04: [Tên ca sử dụng]"]
    end

    A1 --> UC1
    A1 --> UC2
    A2 --> UC3
    Sys --> UC4
```

#### 1.2. Bảng Đặc tả Chi tiết các Ca sử dụng Then chốt

*(Lặp lại bảng này cho 3–5 Use Case phức tạp nhất của hệ thống)*

| Thuộc tính                            | Nội dung đặc tả                                                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mã & Tên Use Case**                 | `UC-SPEC-01`: `[Tên ca sử dụng]`                                                                                                                                               |
| **Tác nhân chính**                    | `[Actor thực hiện]`                                                                                                                                                            |
| **Điều kiện tiên quyết**              | `[Trạng thái hệ thống và quyền hạn cần có trước khi bắt đầu]`                                                                                                                  |
| **Luồng sự kiện chính (Main Flow)**   | <br>1. `[Bước 1: Hành động của Actor]`<br>2. `[Bước 2: Xử lý của Client]`<br>3. `[Bước 3: Truyền tin & Xử lý của Server]`<br>4. `[Bước 4: Phản hồi & Cập nhật trạng thái]`<br> |
| **Luồng ngoại lệ (Exceptional Flow)** | <br>* **E1 (`[Lỗi mạng/xác thực]`):** `[Cách hệ thống xử lý và thông báo]`<br>* **E2 (`[Xung đột dữ liệu]`):** `[Cơ chế phục hồi]`<br>                                         |
| **Hậu điều kiện (Post-conditions)**   | `[Trạng thái dữ liệu đảm bảo sau khi kết thúc]`                                                                                                                                |

### 2. Mô hình hóa Quy trình Động & Luồng Tương tác (Dynamic Modeling)

#### 2.1. Biểu đồ Hoạt động (Activity Diagram) – `[Tên Quy trình Nghiệp vụ]`

```đoạn mã
flowchart TD
    Start([Bắt đầu]) --> Step1["[Bước xử lý 1]"]
    Step1 --> Check{"[Điều kiện rẽ nhánh?]"}
    Check -- Không --> Fallback["[Xử lý ngoại lệ / Lưu cục bộ]"]
    Fallback --> Step1
    Check -- Có --> Step2["[Xử lý đồng bộ / Giao dịch]"]
    Step2 --> Step3["[Cập nhật trạng thái cuối]"]
    Step3 --> End([Kết thúc])
```

#### 2.2. Biểu đồ Tuần tự (Sequence Diagram) – `[Tên Luồng Giao tiếp Thời gian thực]`

```đoạn mã
sequenceDiagram
    autonumber
    actor Client as [Client Node]
    participant Gateway as [API / Realtime Gateway]
    participant Service as [Core Service / Engine]
    participant Store as [Database / Memory Store]

    Client->>Gateway: [1. Gửi yêu cầu / Bản tin (Payload)]
    Gateway->>Gateway: [2. Xác thực & Kiểm soát lưu lượng]
    Gateway->>Service: [3. Chuyển tiếp xử lý nghiệp vụ]
    Service->>Store: [4. Truy vấn / Ghi nhận trạng thái]
    Store-->>Service: [5. Kết quả thực thi]
    Service-->>Gateway: [6. Dữ liệu phản hồi]
    Gateway-->>Client: [7. Phát sóng / Trả kết quả]
```

### 3. Mô hình Trạng thái (State Machine Diagrams)

#### 3.1. Vòng đời Trạng thái của Thực thể Cốt lõi (`[Entity Name Lifecycle]`)

```đoạn mã
stateDiagram-v2
    [*] --> Draft: Khởi tạo bản nháp
    Draft --> Processing: Gửi xử lý / Đồng bộ
    Processing --> Active: Xác thực & Xuất bản thành công
    Processing --> Draft: Lỗi kiểm thực (Trả về chỉnh sửa)
    Active --> Archived: Hết hạn / Lưu trữ
    Archived --> [*]
```

#### 3.2. Vòng đời Trạng thái Phiên Kết nối / Dữ liệu Tạm thời

*(Mô tả các trạng thái: `Disconnected` $\rightarrow$ `Connecting` $\rightarrow$ `Connected` $\rightarrow$ `Reconnecting` $\rightarrow$ `Evicted/Closed` kèm thời gian chờ Timeout/TTL)*

## GIAI ĐOẠN 5: THIẾT KẾ CẤU TRÚC DỮ LIỆU, GIAO THỨC & MÔ HÌNH LƯU TRỮ (STRUCTURAL & DATA DESIGN)

### 1. Mô hình hóa Cấu trúc Logic (Structural Design)

#### 1.1. Biểu đồ Lớp Tầng Miền (Domain Class Diagram)

```đoạn mã
classDiagram
    class BaseEntity {
        <<Abstract>>
        +Guid Id
        +DateTime CreatedAtUtc
        +DateTime? ModifiedAtUtc
    }

    class ParentEntity {
        +string Title
        +string Status
        +ICollection~ChildEntity~ Children
        +ExecuteBusinessRule()
    }

    class ChildEntity {
        +Guid ParentId
        +string Content
        +int Order
    }

    BaseEntity <|-- ParentEntity
    BaseEntity <|-- ChildEntity
    ParentEntity "1" *-- "0..*" ChildEntity : Contains
```

### 2. Thiết kế Cơ sở Dữ liệu Đa mô hình (Multi-Model Storage Design)

#### 2.1. Chiến lược Phân bổ Động cơ Lưu trữ (Storage Allocation Matrix)

| Loại dữ liệu                          | Động cơ lưu trữ lựa chọn           | Mô hình nhất quán         | Mục đích & Đặc thù truy vấn             |
| ------------------------------------- | ---------------------------------- | ------------------------- | --------------------------------------- |
| **Dữ liệu giao dịch & Phân cấp**      | `[PostgreSQL / SQL Server]`        | Strong Consistency (ACID) | Toàn vẹn tham chiếu, giao dịch phức tạp |
| **Dữ liệu cục bộ / Tìm kiếm văn bản** | `[SQLite / FTS5 / IndexedDB]`      | Local-First / Eventual    | Đọc/ghi ngoại tuyến, tìm kiếm toàn văn  |
| **Dữ liệu không gian ngữ nghĩa**      | `[pgvector / sqlite-vec / Qdrant]` | Eventual Consistency      | Tìm kiếm tương đồng Cosine, RAG         |
| **Dữ liệu trạng thái tạm thời**       | `[Redis / In-Memory RAM]`          | Ephemeral (TTL)           | Phiên kết nối, bộ đệm tốc độ cao        |

#### 2.2. Thiết kế Lược đồ Cơ sở Dữ liệu Quan hệ (ERD)

```đoạn mã
erDiagram
    USERS ||--o{ PARENT_ENTITIES : owns
    PARENT_ENTITIES ||--o{ CHILD_ENTITIES : contains

    USERS {
        uuid id PK
        varchar user_name UK
        varchar email UK
        varchar password_hash
        timestamptz created_at_utc
    }

    PARENT_ENTITIES {
        uuid id PK
        uuid user_id FK
        varchar title
        varchar slug UK
        boolean is_active
        timestamptz created_at_utc
        bytea row_version
    }

    CHILD_ENTITIES {
        uuid id PK
        uuid parent_id FK
        text content
        int sequence_order
    }
```

- **Chiến lược Toàn vẹn & Chỉ mục (Integrity & Indexing):**
    - *Khóa & Ràng buộc:* `[Quy tắc ON DELETE RESTRICT/CASCADE, Unique Constraints]`.
    - *Kiểm soát đồng thời:* `[Optimistic Concurrency qua RowVersion/Timestamp]`.
    - *Chỉ mục tối ưu:* `[Danh sách B-Tree Index, Composite Index, Partial Index cho truy vấn nóng]`.

#### 2.3. Thiết kế Lưu trữ Mở rộng (NoSQL / Vector / Knowledge Graph – Nếu có)

- **Đặc tả Vector Store:** `[Tên mô hình Embedding, số chiều D, hệ đo khoảng cách Cosine/L2, tham số chỉ mục HNSW: M, efConstruction, efSearch]`.
- **Đặc tả Đồ thị Tri thức (Property Graph):** `[Định nghĩa các nhãn Nút (Nodes) và các loại Cạnh quan hệ có hướng (Edges)]`.

### 3. Đặc tả Giao thức Truyền thông & API (Protocol & Interface Specification)

#### 3.1. Ma trận Giao thức Truyền thông

| Kênh truyền thông    | Giao thức & Định dạng            | Cổng / Endpoint   | Mô hình giao tiếp  | Giới hạn kích thước / Độ trễ       |
| -------------------- | -------------------------------- | ----------------- | ------------------ | ---------------------------------- |
| **Service API**      | `HTTPS / REST JSON`              | `/api/v1/*`       | Request – Response | `[Payload < 5MB, Latency < 100ms]` |
| **Realtime Channel** | `WSS / Binary (MessagePack)`     | `/hubs/*`         | Pub-Sub / RPC      | `[Packet < 100B, Latency < 50ms]`  |
| **Internal / IPC**   | `[gRPC / Tauri IPC / OS Scheme]` | `[Tên giao thức]` | Native Call        | `[Latency < 10ms]`                 |

#### 3.2. Đặc tả Hợp đồng Dữ liệu (Data Transfer Contracts / DTOs)

```json
{
  "version": 1,
  "id": "00000000-0000-0000-0000-000000000000",
  "timestampUtc": "2026-01-01T00:00:00Z",
  "payload": {
    "attribute1": "string",
    "attribute2": 0
  }
}
```

#### 3.3. Danh mục Giao diện Lập trình RESTful API (OpenAPI 3.0)

- **Quy chuẩn chung:** Tiền tố `/api/v1/`, chuẩn hóa phản hồi lỗi theo RFC 7807 (`ProblemDetails`), phân trang chuẩn (`pageIndex`, `pageSize`, `totalCount`).
- **Bảng phân nhóm Endpoints:**

| Nhóm nghiệp vụ          | Phương thức & Đường dẫn                 | Mô tả chức năng                           | Mã phản hồi HTTP    |
| ----------------------- | --------------------------------------- | ----------------------------------------- | ------------------- |
| **Xác thực**            | `POST /api/v1/auth/login`               | Xác thực danh tính, cấp phát Token        | `200`, `401`        |
| **Quản trị tài nguyên** | `GET /api/v1/[resources]`               | Truy vấn danh sách có lọc & phân trang    | `200`, `400`        |
| **Tạo mới**             | `POST /api/v1/[resources]`              | Khởi tạo thực thể mới (kiểm thực đầu vào) | `201`, `400`, `403` |
| **Cập nhật / Xóa**      | `PUT / DELETE /api/v1/[resources]/{id}` | Cập nhật hoặc xóa mềm tài nguyên          | `200`, `204`, `404` |

#### 3.4. Đặc tả Giao thức Thời gian thực (Realtime Events & RPC)

- **Phương thức Client gọi Server (Invocations):** `[Tên hàm(tham số) $\rightarrow$ Mô tả hành động]`.
- **Sự kiện Server phát sóng xuống Client (Listeners):** `[Tên sự kiện(payload) $\rightarrow$ Mô tả cập nhật UI]`.
- **Cơ chế kiểm soát kết nối:** `[Chu kỳ Ping/Pong Heartbeat, thời gian Timeout ngắt kết nối, bộ lọc Rate Limiter]`.

## GIAI ĐOẠN 6: KẾ HOẠCH THỰC NGHIỆM, ĐÁNH GIÁ & LỘ TRÌNH R&D (VERIFICATION, VALIDATION & ROADMAPPING)

### 1. Phương pháp Thực nghiệm & Xây dựng Proof of Concept (PoC)

#### 1.1. Kiến trúc Môi trường Kiểm thử (Testbed Topology)

- **Công cụ sinh tải (Load Generator):** `[K6 / JMeter / Playwright mô phỏng N người dùng đồng thời]`.
- **Công cụ mô phỏng mạng (Network Emulator):** `[tc/netem giả lập độ trễ WAN, mất gói Packet Loss, Jitter]`.
- **Hệ thống giám sát (Observability):** `[Prometheus / OpenTelemetry / Memory Profiler]`.

#### 1.2. Đặc tả Các Kịch bản Kiểm chứng Cốt lõi (PoC Benchmarks)

- **PoC 1 – [Tên kịch bản: Vd: Kiểm thử chịu tải & Đồng bộ thời gian thực]:** `[Thiết lập môi trường, số lượng nút mạng, thông số đo đạc]`.
- **PoC 2 – [Tên kịch bản: Vd: Kiểm thử hiệu năng xử lý dữ liệu / AI]:** `[Thiết lập tập dữ liệu mẫu, giới hạn phần cứng, chỉ số đầu ra]`.
- **PoC 3 – [Tên kịch bản: Vd: Kiểm toán an ninh & Rò rỉ bộ nhớ/ổ đĩa]:** `[Quy trình quét Heap Dump, Disk Artifacts, Penetration Test]`.

### 2. Khung Tiêu chí Đánh giá Định lượng (Evaluation Metrics & Benchmarks)

| Mã chỉ số  | Tên chỉ số & Đơn vị                          | Phương pháp / Công thức đo                                                       | Ngưỡng mục tiêu | Kết quả đạt được | Đánh giá       |
| ---------- | -------------------------------------------- | -------------------------------------------------------------------------------- | --------------- | ---------------- | -------------- |
| **MTR-01** | **Độ trễ đầu-cuối (Latency)** (`ms`)         | $T_{\text{total}} = T_{\text{process}} + T_{\text{network}} + T_{\text{render}}$ | `< [X] ms`      | `[Kết quả đo]`   | `[ĐẠT / VƯỢT]` |
| **MTR-02** | **Thông lượng xử lý (Throughput)** (`req/s`) | Tổng số giao dịch thành công / giây tại tải đỉnh                                 | `> [Y] req/s`   | `[Kết quả đo]`   | `[ĐẠT / VƯỢT]` |
| **MTR-03** | **Tài nguyên RAM / CPU** (`MB` / `%`)        | Working Set Memory ở trạng thái nghỉ & tải nặng                                  | `< [Z] MB`      | `[Kết quả đo]`   | `[ĐẠT / VƯỢT]` |
| **MTR-04** | **Độ chính xác / Chất lượng** (`%`)          | Tỷ lệ chính xác đầu ra (`Precision / Recall / F1`)                               | `>= [W] %`      | `[Kết quả đo]`   | `[ĐẠT / VƯỢT]` |
| **MTR-05** | **An toàn dữ liệu (Leak Audit)** (`Bytes`)   | Dung lượng dữ liệu nhạy cảm tồn dư trên đĩa/log                                  | `0 Bytes`       | `[Kết quả đo]`   | `[ĐẠT CHUẨN]`  |

### 3. Kế hoạch Phân rã Công việc & Lộ trình Triển khai (WBS & Roadmap)

#### 3.1. Phân rã Cấu trúc Công việc theo Sprint (Work Breakdown Structure)

```đoạn mã
gantt
    title LỘ TRÌNH TRIỂN KHAI DỰ ÁN THEO SPRINT
    dateFormat  YYYY-MM-DD
    axisFormat  %d/%m

    section Sprint 1: Nền móng & Core
    T1.1 Khởi tạo kiến trúc & Contracts      :s1_1, 2026-01-01, 5d
    T1.2 Xây dựng lõi xử lý & Bảo mật cơ bản :s1_2, after s1_1, 5d

    section Sprint 2: Nghiệp vụ & Lưu trữ
    T2.1 Thiết kế DB & Triển khai API lõi    :s2_1, after s1_2, 7d
    T2.2 Phát triển giao diện Client chính   :s2_2, after s2_1, 7d

    section Sprint 3: Tích hợp & Nâng cao
    T3.1 Kết nối Realtime / Background Jobs  :s3_1, after s2_2, 7d
    T3.2 Tích hợp AI / Tính năng mở rộng     :s3_2, after s3_1, 7d

    section Sprint 4: Kiểm thử & Tối ưu
    T4.1 Kiểm thử tải, bảo mật & Sửa lỗi     :s4_1, after s3_2, 7d
    T4.2 Đóng gói, tài liệu hóa & Bàn giao   :s4_2, after s4_1, 5d
```

#### 3.2. Hệ thống Mốc Kiểm soát Chất lượng (Quality Gates / Definition of Done)

- **Quality Gate 1 (Cuối Sprint 1):** Hoàn thiện 100% hợp đồng dữ liệu (Contracts/Schemas); biên dịch sạch không lỗi kiểu tĩnh.
- **Quality Gate 2 (Cuối Sprint 2):** Hoàn thành luồng nghiệp vụ CRUD cốt lõi; độ bao phủ Unit Test đạt $\ge [80\%]$.
- **Quality Gate 3 (Cuối Sprint 3):** Tích hợp thông suốt toàn bộ các phân hệ; đáp ứng ngưỡng độ trễ giao tiếp thời gian thực.
- **Quality Gate 4 (Cuối Sprint 4):** Vượt qua bài kiểm thử chịu tải (Stress Test) và kiểm toán an ninh; sẵn sàng triển khai thực tế.

#### 3.3. Ma trận Quản trị Rủi ro Kỹ thuật (Technical Risk Management)

| Mã rủi ro  | Nhận diện nguy cơ                | Xác suất / Mức độ           | Kịch bản tác động                            | Chiến lược giảm thiểu (Mitigation)               | Phương án dự phòng (Contingency)                  |
| ---------- | -------------------------------- | --------------------------- | -------------------------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| **RSK-01** | `[Nghẽn cổ chai mạng / tải cao]` | `[Cao / Nguy cấp]`          | `[Sập kết nối hoặc tăng độ trễ vượt ngưỡng]` | `[Áp dụng Throttling, Caching, nén dữ liệu]`     | `[Kích hoạt Rate Limiter, tự động ngắt tải phụ]`  |
| **RSK-02** | `[Rò rỉ / Xung đột dữ liệu]`     | `[Trung bình / Cao]`        | `[Mất tính toàn vẹn hoặc lộ thông tin]`      | `[Áp đặt cơ chế khóa, kiểm soát giao dịch ACID]` | `[Khôi phục từ bản sao lưu / Cô lập dịch vụ lỗi]` |
| **RSK-03** | `[Lỗi tương thích môi trường]`   | `[Trung bình / Trung bình]` | `[Ứng dụng không chạy trên một số thiết bị]` | `[Chuẩn hóa giao thức mở, kiểm thử đa nền tảng]` | `[Cung cấp chế độ tương thích / Fallback UI]`     |