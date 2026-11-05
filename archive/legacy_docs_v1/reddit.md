# Tổng quan chức năng Reddit

Hệ thống chức năng của Reddit được cấu trúc theo 4 nhóm độc lập và toàn diện (MECE) sau:

### 1. Cấu trúc Tổ chức Cộng đồng & Nội dung

- Subreddit (`r/[tên_cộng_đồng]`): Đơn vị tổ chức cốt lõi của Reddit. Mỗi subreddit là một diễn đàn độc lập xoay quanh một chủ đề cụ thể (như tài chính `r/Economics`, trò chuyện địa phương `r/vozforums`). Mỗi cộng đồng có quy tắc riêng (Subreddit Rules), hệ thống kiểm duyệt viên (Moderators), bảng ghim thông báo (Community Highlights) và tài nguyên tham khảo (Wiki/FAQ). Người dùng có thể bấm **Join** để theo dõi hoặc tự tạo subreddit riêng qua tính năng **Start a community**.
- **Định dạng Bài đăng (Posts):** Cho phép người dùng chia sẻ đa dạng định dạng gồm văn bản (Text), hình ảnh, liên kết ngoài (Link dẫn nguồn tin tức), và video. Bài viết thường đi kèm nhãn phân loại (Post Flair như *News*, *Statistics*) để phân loại chủ đề.
- **Thảo luận phân nhánh (Nested Comments):** Bình luận được tổ chức theo cấu trúc cây (phân cấp cha - con), giúp các cuộc đối thoại nhánh không bị lẫn lộn vào dòng bình luận chung.

### 2. Cơ chế Tương tác, Xếp hạng & Đánh giá

- **Hệ thống Điểm biểu quyết (Upvote / Downvote):** Người dùng trực tiếp chấm điểm nội dung bằng hai nút mũi tên lên/xuống. Tổng số upvote trừ downvote quyết định thứ hạng bài viết và đóng góp vào điểm danh tiếng (Karma) của tài khoản đăng tải.
- **Hệ thống Phân phối & Sắp xếp Feed (Sorting):**
    - Cung cấp các thuật toán sắp xếp linh hoạt: **Best** (cân bằng giữa tương tác và sở thích cá nhân), **Hot** (nội dung đang nhận lượng tương tác lớn đột biến), **New** (thời gian mới nhất), và **Top** (nhiều vote nhất theo ngày/tháng/năm).
    - Hỗ trợ chuyển đổi giao diện xem bài đăng (Card view hoặc Compact view).

- **Tương tác trực tiếp:** Tính năng gửi tin nhắn cá nhân/nhóm (Chat), chia sẻ liên kết (Share), thông báo (Notifications), và lưu trữ bài viết.

### 3. Điều hướng & Khám phá (Navigation & Feeds)

- **Bảng điều hướng luồng tin (Feeds):**
    - **Home (Trang chủ):** Hiển thị nội dung từ các subreddit đã tham gia, chia thành hai tab **For You** (được gợi ý theo thuật toán) và **Following** (theo dõi trực tiếp).
    - **Popular:** Tổng hợp các bài viết có tương tác cao nhất trên toàn cầu hoặc theo khu vực mà không phụ thuộc vào danh sách theo dõi.
    - **News:** Tập hợp các bài viết thuộc chủ đề tin tức, chính trị, xã hội từ các nguồn uy tín.

- **Explore Communities (Khám phá):** Phân mục cộng đồng theo danh mục chuyên sâu (Công nghệ, Game, Kinh tế, Văn hóa Internet, Thể thao...) kèm thống kê lượng truy cập hàng tuần để người dùng tìm kiếm cộng đồng phù hợp.
- **Custom Feeds (Nguồn cấp tùy chỉnh):** Cho phép gom nhóm nhiều subreddit khác nhau vào một trang tổng hợp riêng biệt mà không cần phải bấm Join từng subreddit.
- **Thanh tìm kiếm (Global & In-Subreddit Search):** Tìm kiếm bài viết, tác giả hoặc giới hạn phạm vi tìm kiếm trực tiếp bên trong một subreddit đang duyệt.

### 4. Tài khoản, Dịch vụ & Mở rộng (User Platform)

- **Hồ sơ Cá nhân (`u/[username]`):** Lưu trữ lịch sử bài đăng, bình luận, điểm Karma, thành tựu (Achievements), bản nháp bài viết chưa đăng (Drafts), và cho phép tùy biến ngoại hình đại diện (Avatar).
- **Giải trí tích hợp (Games on Reddit):** Tích hợp các minigame nhanh ngay trên giao diện web (như *Color Maps*, *Merge Puzzle Game*, *Glyph*, *Orbitals*) mà không cần cài đặt thêm.
- **Thương mại hóa & Tính năng nâng cao:**
    - **Earn:** Cơ chế tham gia chương trình trả thưởng cho các nhà sáng tạo nội dung đóng góp giá trị cao.
    - **Reddit Premium:** Gói thuê bao trả phí hỗ trợ trải nghiệm duyệt web không quảng cáo và mở khóa các huy hiệu độc quyền.
    - **Advertise & Reddit Pro:** Công cụ quản trị dành cho doanh nghiệp để tạo chiến dịch quảng cáo hoặc quản lý phân tích dữ liệu tương tác thương hiệu.

# Reddit Chats

Hệ thống nhắn tin tức thời (Instant Messaging) nội bộ của Reddit, cho phép người dùng giao tiếp trực tiếp ngoài các luồng thảo luận công khai trên subreddit. Chức năng này được cấu trúc theo 3 nhóm cốt lõi:

### 1. Khởi tạo & Phạm vi Hội thoại (Initiation & Scoping)

- **Direct Chat (Nhắn tin trực tiếp 1-1):** Cho phép tìm kiếm người nhận thông qua tên tài khoản (`Type username(s)`) để thiết lập phiên đối thoại riêng tư theo thời gian thực.
- **Group Chat (Nhắn tin nhóm):** Hỗ trợ thêm đồng thời nhiều tài khoản vào khung tạo chat để tạo nhóm thảo luận chung giữa các Redditor cùng sở thích hoặc cộng tác viên dự án.
- **Điểm kích hoạt:** Bắt đầu thông qua nút **Start new chat**, biểu tượng tạo mới (`+`) trên thanh công cụ, hoặc nhắn trực tiếp từ trang hồ sơ của người dùng khác.

### 2. Tổ chức & Điều hướng Không gian Chat (Navigation & Layout)

- **Threads (Nhánh thảo luận):** Phân mục quản lý các chuỗi tin nhắn hoặc nhánh thảo luận con, giúp tách biệt các mạch trao đổi theo chủ đề cụ thể mà không làm loãng dòng tin chính.
- **Quản lý danh sách hộp thư:**
    - Biểu tượng điều khiển nhanh phía trên hỗ trợ thao tác hàng loạt (đánh dấu đã đọc toàn bộ) và lọc/tùy chỉnh trạng thái tin nhắn.
    - Danh mục bên trái hiển thị danh sách các hội thoại đang hoạt động theo thứ tự thời gian tương tác gần nhất.

- **Cơ chế hiển thị linh hoạt:** Hỗ trợ mở bung chat ra một tab/cửa sổ trình duyệt độc lập (biểu tượng Pop-out `↗`), thu nhỏ xuống góc màn hình (`⌵`), hoặc đóng hoàn toàn (`✕`) để không che khuất luồng duyệt bài.

### 3. Cơ chế Kiểm duyệt & Quyền riêng tư (Privacy & Moderation)

- **Chat Requests (Yêu cầu tin nhắn):** Tin nhắn khởi tạo từ người lạ sẽ được đưa vào hàng đợi kiểm duyệt; người nhận có quyền **Chấp nhận (Accept)**, **Bỏ qua (Ignore/Decline)**, hoặc **Chặn/Báo cáo (Block/Report)** tài khoản gửi trước khi mở phiên trò chuyện chính thức.
- **Tích hợp liên kết nội bộ:** Hỗ trợ chia sẻ trực tiếp các bài đăng (Posts), liên kết subreddit (`r/...`), hình ảnh, biểu tượng cảm xúc (Snoomojis) và ảnh GIF trực tiếp trong luồng chat.