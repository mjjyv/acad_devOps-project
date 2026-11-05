# TÀI LIỆU HƯỚNG DẪN VẬN HÀNH: QUY TRÌNH KIỂM THỬ TOÀN DIỆN, API TESTING, LOGGING VÀ CÁC CHIẾN THUẬT VẬN HÀNH DÀNH CHO AI AGENT

---

## 1. NGUYÊN TẮC TỐI CAO: VÒNG LẶP KIỂM THỬ KHÉP KÍN & TỰ SỬA LỖI (CLOSED-LOOP SELF-HEALING)

Agent không bao giờ được coi một tác vụ là hoàn tất nếu chỉ mới viết xong mã nguồn hoặc chỉ biên dịch thành công. Mọi tính năng, module, hoặc bản vá đều bắt buộc phải trải qua vòng lặp kiểm định thực tế:

```
[Viết mã / Tái cấu trúc] 
        │
        ▼
[Biên dịch sạch (0 Error, 0 Warning)]
        │
        ▼
[Ưu tiên Test API / Chạy Test Suite] ──(Có lỗi / Sai lệch đầu ra)──┐
        │                                                          │
        ▼ (Thành công)                                             ▼
[Ghi vết Log & Đối soát Payload]                         [Phân tích Log / Stack Trace]
        │                                                          │
        ▼                                                          ▼
[Bàn giao & Commit Git]                                  [Tự sửa lỗi (Self-Correction)]
```

---

## 2. CHIẾN LƯỢC KIỂM THỬ ƯU TIÊN API (API-FIRST TESTING PROTOCOL)

Khi hệ thống có tầng giao tiếp mạng hoặc cung cấp dịch vụ, kiểm thử API ở mức tích hợp (Integration/Contract Testing) là thước đo chính xác nhất về tính khả dụng thực tế của phần mềm.

### 2.1. Quy trình 4 bước kiểm thử API bắt buộc
1. **Khởi chạy môi trường dịch vụ (Service Spin-up):**
   * Đảm bảo ứng dụng backend và các phụ thuộc (Database, Cache, Mock Services) đang hoạt động ở trạng thái sẵn sàng nhận request.
   * Xác định cổng (port), base URL và endpoint cụ thể.

2. **Thực thi lệnh gọi API thực tế:**
   * Sử dụng công cụ dòng lệnh không phụ thuộc giao diện (ví dụ: `curl`, `httpie`, hoặc script automated test) để gửi request.
   * Truyền đầy đủ Headers chuẩn: `Content-Type: application/json`, `Accept: application/json`, và `Authorization: Bearer <token>` (nếu endpoint yêu cầu quyền truy cập).

3. **Ghi nhận Log & Kiểm tra đầu ra (Output & Response Verification):**
   * **Bắt buộc lưu log kết quả:** Mọi request và response phải được in ra màn hình hoặc ghi vào file log kiểm thử tạm thời (`test-run.log`).
   * **Kiểm tra mã trạng thái HTTP (Status Code):**
     * Yêu cầu hợp lệ: `200 OK`, `201 Created`, `204 No Content`.
     * Yêu cầu sai dữ liệu: `400 Bad Request`, `422 Unprocessable Entity`.
     * Phân quyền: `401 Unauthorized`, `403 Forbidden`.
     * Không tồn tại / Xung đột: `404 Not Found`, `409 Conflict`.
     * Lỗi máy chủ: Tuyệt đối **không được xuất hiện `500 Internal Server Error`**. Mọi ngoại lệ không mong muốn đều bị coi là lỗi nghiêm trọng cần khắc phục ngay.
   * **Kiểm tra Schema & Payload đầu ra:**
     * Đối soát các trường bắt buộc (required fields), định dạng kiểu dữ liệu (UUID, ISO-8601 Datetime, boolean, array rỗng thay vì `null`).
     * Xác thực thông điệp phản hồi lỗi (Error Message Contract) có đúng cấu trúc chuẩn hóa của hệ thống hay không (ví dụ: ProblemDetails RFC 7807).

4. **Xác thực trạng thái dữ liệu ngầm (Side-Effect Verification):**
   * Đối với các request gây biến đổi trạng thái (POST, PUT, PATCH, DELETE), Agent phải truy vấn lại bằng API GET tương ứng hoặc chạy câu lệnh SQL trực tiếp vào cơ sở dữ liệu để xác nhận dữ liệu đã được ghi, sửa, hoặc xóa đúng quy cách.

### 2.2. Phân tích Log và Tự khắc phục lỗi (Diagnostics & Remediation)
* **Khi phát hiện lỗi (Status 4xx/5xx ngoài dự kiến hoặc Payload sai lệch):**
  1. Trích xuất ngay thông điệp lỗi (Error payload), server log, và stack trace từ terminal chạy ứng dụng.
  2. Xác định nguyên nhân gốc rễ (Root Cause):
     * *Lỗi Validation / Data Binding:* Dữ liệu đầu vào thiếu trường hoặc sai kiểu dữ liệu?
     * *Lỗi Database / Foreign Key:* Thiếu seed data, sai quan hệ bảng, hoặc migration chưa chạy?
     * *Lỗi Business Logic:* Sai điều kiện kiểm tra nghiệp vụ, xử lý null pointer, hoặc concurrency conflict?
  3. Tiến hành sửa mã nguồn trực tiếp vào file gây lỗi.
  4. Chạy lại chính xác kịch bản cURL/API gây lỗi trước đó để chứng minh lỗi đã được giải quyết hoàn toàn.

---

## 3. CÁC CHIẾN THUẬT VẬN HÀNH QUAN TRỌNG KHÁC (CRITICAL AGENT TACTICS)

### 3.1. Chiến thuật Lập kế hoạch theo Phân tầng MECE (Mutually Exclusive, Collectively Exhaustive)
* **Chia tách bài toán:** Trước khi viết code, phân rã yêu cầu thành các nhiệm vụ con không trùng lặp và bao quát toàn bộ bài toán.
* **Thứ tự triển khai:**
  1. *Data Model / Entities / Contracts:* Định nghĩa cấu trúc dữ liệu và giao ước API trước.
  2. *Data Access / Repositories / Migration:* Xử lý tầng lưu trữ.
  3. *Business Logic / Services:* Xử lý quy tắc nghiệp vụ và điều kiện biên.
  4. *API Controllers / Transport Layer:* Phơi bày endpoints.
  5. *Validation, Filters & Middlewares:* Chặn lỗi đầu vào và xử lý ngoại lệ toàn cục.

### 3.2. Chiến thuật Cô lập Môi trường & Quản lý Dữ liệu Kiểm thử (Test Data Management)
* **Dữ liệu hạt giống độc lập (Seed Data Isolation):** Không bao giờ dựa vào dữ liệu ngẫu nhiên đã có sẵn từ trước. Agent phải tự chuẩn bị hoặc chạy migration sinh ra tập dữ liệu kiểm thử tối thiểu (Minimum Viable Test Dataset) trước khi chạy API test.
* **Tính bất biến và lặp lại (Idempotency):** Các kịch bản kiểm thử phải có khả năng chạy lại nhiều lần mà không bị lỗi do dữ liệu bị trùng lặp khóa chính hoặc vi phạm ràng buộc Unique Key.

### 3.3. Chiến thuật Quản lý Ngân sách Ngữ cảnh (Context Budgeting & Token Economy)
* **Tra cứu đúng trọng tâm (Just-In-Time Retrieval):** Chỉ đọc chính xác các tệp tin liên quan trực tiếp đến tác vụ hiện tại. Không đọc hàng loạt thư mục tài liệu lớn để tránh cạn kiệt context window và suy giảm độ chính xác của suy luận.
* **Định vị chính xác:** Sử dụng các công cụ tìm kiếm theo từ khóa hoặc đường dẫn file cụ thể thay vì duyệt cây thư mục không định hướng.

### 3.4. Chiến thuật Lập trình Phòng thủ (Defensive Engineering)
* **Không nuốt ngoại lệ (No Silent Failures):** Nghiêm cấm việc dùng khối `try-catch` trống hoặc chỉ in log cảnh báo rồi bỏ qua lỗi mà không xử lý hoặc re-throw đúng cách.
* **Xác thực dữ liệu biên (Boundary Verification):** Luôn kiểm tra các trường hợp: chuỗi rỗng `""`, chuỗi quá dài, số âm, mảng rỗng `[]`, giá trị `null`, giá trị phân trang lớn bất thường (`pageSize=100000`), và dữ liệu đặc biệt (ký tự unicode, injection payloads).

### 3.5. Chiến thuật Atomic Commits & Lưu trữ Bằng chứng Nghiệm thu (Proof of Work)
* **Commit nguyên tử (Atomic Git Commits):** Mỗi lần commit chỉ giải quyết trọn vẹn một mục tiêu kỹ thuật cụ thể. Không gom nhiều tính năng chưa được kiểm thử vào một commit chung.
* **Bằng chứng văn bản:** Mỗi phase hoặc tính năng hoàn tất phải đi kèm:
  * File tài liệu hướng dẫn kiểm thử (chứa sẵn script/cURL mẫu để dev hoặc CI/CD có thể chạy lại ngay lập tức).
  * Biên bản nghiệm thu ghi nhận kết quả chạy test, mã commit hash, và trạng thái build thực tế.

---

## 4. CHECKLIST ĐỊNH NGHĨA HOÀN THÀNH (DEFINITION OF DONE - DOD)

Trước khi xác nhận hoàn thành bất kỳ nhiệm vụ nào với người dùng, Agent phải tự kiểm tra 8 tiêu chí sau:

- [ ] 1. Toàn bộ mã nguồn đã được biên dịch thành công (0 Error, 0 Warning).
- [ ] 2. Dịch vụ/Backend đã khởi chạy thử nghiệm thành công trên môi trường cục bộ.
- [ ] 3. Đã chạy thực tế kịch bản API Happy Path (Kết quả trả về HTTP 200/201 và body chuẩn).
- [ ] 4. Đã chạy thực tế kịch bản API Negative Path (Dữ liệu sai bị chặn bởi HTTP 400/404/422 rõ ràng, không có lỗi 500).
- [ ] 5. Đã kiểm tra log thực thi, không còn ngoại lệ ẩn (unhandled exceptions) hoặc warning rò rỉ bộ nhớ.
- [ ] 6. Dữ liệu ngầm trong cơ sở dữ liệu đã được đối soát qua truy vấn.
- [ ] 7. Đã viết hoặc cập nhật tài liệu kiểm thử mẫu (Test Guide) với các câu lệnh cURL/script thực thi.
- [ ] 8. Mã nguồn đã được commit và push lên nhánh làm việc với thông điệp chuẩn Conventional Commits.
