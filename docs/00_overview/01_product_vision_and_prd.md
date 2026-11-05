# Tầm Nhìn Sản Phẩm & Đặc Tả Yêu Cầu (Product Vision & PRD)

> **Mã tài liệu:** `SPEC-PRD-OVERVIEW`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Phiên bản:** `v2.0.0` (Hợp nhất chức năng Reddit & Thảo luận Kỹ thuật Chuyên sâu)

---

## 1. TẦM NHÌN SẢN PHẨM & GIÁ TRỊ CỐT LÕI (PRODUCT VISION)

**Acad DevOps** được định vị là mạng xã hội thảo luận kỹ thuật phân tầng cao (High-throughput Technical Discussion Engine) dành cho cộng đồng kỹ sư công nghệ, kiến trúc sư hệ thống, và chuyên gia DevOps/DevSecOps/SRE.

### Vấn Đề Thực Tế Cần Giải Quyết
- Các diễn đàn truyền thống (như vBulletin, phpBB) có tốc độ tải chậm, thiếu cơ chế bình luận phân cấp sâu trực quan và không có khả năng hiển thị dữ liệu lớn mượt mà.
- Các mạng xã hội dòng thời gian ngắn (X, Facebook Groups) thường làm trôi bài viết giá trị, thuật toán ưu tiên bài gây tranh cãi thay vì bài có hàm lượng kỹ thuật cao, không hỗ trợ định dạng code block hay công thức toán chuẩn.
- Thiếu cơ chế đánh giá danh tiếng (Karma) minh bạch và an toàn, dễ bị bot tấn công thao túng điểm số.

### Giải Pháp Đột Phá Của Hệ Thống
1. **Mô hình Subreddit thu nhỏ (Spaces `/s/[slug]`):** Phân chia chủ đề rõ ràng (DevOps, Kiến trúc, Bảo mật, Sự cố thực tế), kiểm soát bởi bộ quy tắc riêng và đội ngũ Moderators.
2. **Cây thảo luận vô hạn cấp $\mathcal{O}(N)$:** Kết hợp PostgreSQL `ltree` và thuật toán ảo hóa DOM, hiển thị hàng nghìn bình luận không lag giật.
3. **Cơ chế biểu quyết nguyên tử & Trọng lực phân rã (Gravity Decay):** Xếp hạng bài viết theo giá trị thực và độ tươi mới qua Redis Lua Script $\mathcal{O}(1)$.
4. **Hệ thống Reddit Chat tức thời bảo mật:** Hỗ trợ nhắn tin 1-1, chat nhóm và hàng đợi kiểm duyệt tin nhắn lạ (Chat Requests) chống spam.

---

## 2. CHỈ SỐ MỤC TIÊU & THƯỚC ĐO THÀNH CÔNG (KPIS & OKRS)

- **North Star Metric:** **Weekly Meaningful Discussions ($WMD$)** - Số lượng bài thảo luận kỹ thuật đạt tối thiểu 5 bình luận chất lượng mỗi tuần.
- **Tỷ lệ giữ chân người dùng (Retention):** $W_4 \text{ Retention} \ge 25\%$.
- **Tỷ lệ đóng góp nội dung:** $\ge 8\%$ người dùng chủ động đăng bài hoặc bình luận (vượt mức tiêu chuẩn 1-9-90 thông thường).
- **Tiêu chuẩn hiệu năng kỹ thuật:**
  - $FCP \le 0.8\text{s}$, $LCP \le 1.2\text{s}$, $INP \le 100\text{ms}$, $CLS = 0$.
  - Khả năng chịu tải Backend: $\ge 5,000 \text{ RPS}$ với độ trễ $P_{95} < 50\text{ms}$.

---

## 3. CHÂN DUNG NGƯỜI DÙNG CỐT LÕI (USER PERSONAS)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CHÂN DUNG NGƯỜI DÙNG (PERSONAS)                  │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ THE LURKER (~80%) │ THE WRITER (~15%) │ THE MODERATOR (~5%)            │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ • Đọc thầm lặng   │ • Viết bài chia sẻ│ • Quản trị không gian (Space)  │
│ • Đến từ Google   │ • Thảo luận sâu   │ • Xử lý Mod Queue & Reports    │
│ • Cần web siêu tốc│ • Tích lũy Karma  │ • Ghim bài, khóa bình luận     │
│ • Không cần login │ • Dùng Tiptap/Code│ • Chống spam & xử lý vi phạm   │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

---

## 4. MA TRẬN YÊU CẦU CHỨC NĂNG (MOSCOW METHODOLOGY)

### Must-Have (Bắt buộc phải có để hệ thống hoạt động)
- [x] Hệ thống xác thực Argon2id, Token Rotation 15m/7d kèm 30s Grace Period và phát hiện xâm nhập Token Reuse Detection.
- [x] Quản lý Không gian thảo luận (Spaces `/s/[slug]`), tham gia/rời khỏi không gian.
- [x] Xuất bản bài viết kỹ thuật (Threads), hỗ trợ gán nhãn Post Flairs.
- [x] Cây bình luận đa tầng PostgreSQL `ltree` Base36 4 ký tự kèm thuật toán trải phẳng mảng tuyến tính $\mathcal{O}(N)$.
- [x] Hệ thống bỏ phiếu nguyên tử Upvote/Downvote qua Redis Lua Script $\mathcal{O}(1)$.
- [x] Thuật toán xếp hạng Hot Feed (Hacker News Gravity Decay) và phân trang con trỏ Base64.
- [x] Trung tâm Quản trị Admin Console 4 tabs (Dashboard, Users, Spaces, Threads).

### Should-Have (Nên có để hoàn thiện trải nghiệm cốt lõi)
- [ ] Phân hệ Reddit Chat: Nhắn tin trực tiếp 1-1, chat nhóm và hàng đợi phê duyệt Chat Requests.
- [ ] Thuật toán sắp xếp "Best" (Wilson Score Confidence Interval) và lọc Top theo thời gian (ngày/tuần/tháng/năm).
- [ ] Tích hợp trình soạn thảo Tiptap Editor và cơ chế tải ảnh trực tiếp qua Cloudflare R2 Presigned URL.
- [ ] Tính năng Bookmark/Save bài viết và quản lý bản nháp (Drafts).
- [ ] Tìm kiếm bài viết có giới hạn phạm vi trong một không gian (In-Space Scoped Search).

### Could-Have (Có thể mở rộng sau khi hoàn thành MVP)
- [ ] Minigames giải trí tích hợp trực tiếp trên giao diện web (như Reddit Games).
- [ ] Huy hiệu thành tựu người dùng (User Badges & Achievements) dựa trên các mốc Karma ($100$, $500$, $1000$).
- [ ] Nguồn cấp tùy chỉnh (Custom Feeds - gom nhóm nhiều Spaces).

### Won't-Have (Không thực hiện ở phiên bản hiện tại)
- [x] Không tích hợp mạng quảng cáo rườm rà (Google AdSense / Banners) làm loãng giao diện tối giản Brutalism.
- [x] Không lưu trữ token bảo mật trên `localStorage` hay `sessionStorage`.
