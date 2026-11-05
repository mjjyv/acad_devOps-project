# Động Cơ Nhắn Tin Tức Thời & Kiểm Duyệt Tin Nhắn (Realtime Chat Engine)

> **Mã tài liệu:** `CORE-REALTIME-CHAT`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Tham chiếu Reddit:** Phần Reddit Chats trong [`docs/reddit.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/reddit.md)

---

## 1. MÔ TẢ PHẠM VI HỘI THOẠI (CHAT SCOPING)

Hệ thống nhắn tin tức thời nội bộ hỗ trợ 2 hình thức đối thoại chính:
1. **Direct Chat (1-1):** Cuộc trò chuyện riêng tư giữa hai kỹ sư qua tên tài khoản (`u/[username]`).
2. **Group Chat (Nhóm):** Kênh trao đổi chung giữa nhiều thành viên cùng sở thích, cùng dự án hoặc đội ngũ quản trị viên của một không gian.

---

## 2. CƠ CHẾ BẢO MẬT & HÀNG ĐỢI DUYỆT TIN NHẮN LẠ (CHAT REQUESTS QUEUE)

Nhằm phòng chống triệt để tình trạng tin nhắn rác (spam) và quấy rối:
- **Nguyên tắc tin nhắn lạ:** Nếu hai người dùng chưa từng tương tác và chưa thuộc cùng một kênh chat được phê duyệt, tin nhắn đầu tiên gửi đến sẽ rơi vào trạng thái `PENDING` trong bảng `chat_requests`.
- **Quyền hạn của người nhận:**
  - **Chấp nhận (Accept):** Mở phiên trò chuyện chính thức, cho phép nhận thông báo đẩy thời gian thực và lịch sử tin nhắn.
  - **Bỏ qua (Ignore / Decline):** Ẩn tin nhắn khỏi danh sách hiển thị, không gửi thông báo thông báo cho người gửi.
  - **Chặn / Báo cáo (Block / Report):** Đưa người gửi vào danh sách đen (Blacklist), cấm gửi tin nhắn vĩnh viễn và tự động đẩy cảnh báo vào hàng đợi kiểm duyệt (Mod Queue).

---

## 3. CƠ CHẾ NHÁNH THẢO LUẬN TRONG CHAT (CHAT THREADS) & TRỰC QUAN LINH HOẠT

- **Chat Threads:** Tương tự tính năng của Reddit Chats và Slack, người dùng có thể nhấp vào một tin nhắn cụ thể trong Group Chat để mở nhánh trao đổi phụ (`parent_message_id`), giúp thảo luận kỹ thuật sâu một vấn đề mà không làm trôi dòng tin nhắn chung của nhóm.
- **Trực quan hóa linh hoạt:**
  - Chế độ **Docked / Floating:** Khung chat nổi ở góc dưới bên phải màn hình.
  - Chế độ **Pop-out Window (`↗`):** Nhấp biểu tượng mở rộng để chuyển sang tab trình duyệt độc lập toàn màn hình.
  - Chế độ **Minimized:** Thu nhỏ gọn thành một biểu tượng tin nhắn kèm số lượng chưa đọc.
