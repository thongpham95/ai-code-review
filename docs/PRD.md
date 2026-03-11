# Tài liệu Yêu cầu Sản phẩm (PRD)

## 1. Tổng quan Sản phẩm
Công cụ AI Code Review tự động hóa quá trình đánh giá mã nguồn bằng Google Gemini. Các yêu cầu mới nhằm mục tiêu cải thiện bảo mật, tính dễ sử dụng, khả năng theo dõi truy vết đồng thời cung cấp giao diện lập trình viên chuyên nghiệp hơn.

## 2. Mục tiêu & Định hướng
- **Bảo mật**: Bảo vệ API keys của AI bằng cách chỉ cho phép các tài khoản thuộc công ty (`@tvtgroup.io`) truy cập hệ thống.
- **Tính khả dụng (Usability)**: Cải thiện việc theo dõi bình luận để người dùng không nhìn thấy hoặc vô tình đẩy (push) lại các bình luận đã được đẩy lên Git. Tự động mở rộng (auto-expand) các file có lỗi.
- **Theo dõi (Tracking)**: Theo dõi người dùng nào đã thực hiện phiên review để đảm bảo trách nhiệm và đánh giá mức độ sử dụng.
- **Thẩm mỹ (Aesthetics)**: Cung cấp giao diện khối (block-based) cao cấp, mang tính kỹ thuật, sử dụng typography chuyên nghiệp (JetBrains Mono, IBM Plex Sans) nhắm tới Tech Lead và Developer.

## 3. Người dùng Mục tiêu
- **Lập trình viên (Developers)**: Cần phản hồi AI nhanh chóng, đáng tin cậy mà không phải tự dò kiểm tra xem bình luận nào đã được đẩy lên Git rồi.
- **Trưởng nhóm Kỹ thuật (Tech Leads)**: Theo dõi việc sử dụng AI trong team, biết ai đang review MR nào, và đảm bảo chất lượng mã nguồn.

## 4. Các tính năng & Yêu cầu

### Tính năng Cốt lõi
- [ ] **Tính năng 1: Xác thực Google Workspace**
  - Tích hợp đăng nhập bằng Google OAuth.
  - Hạn chế truy cập đặc quyền chỉ dành cho email đuôi `@tvtgroup.io`.
  - Chuyển hướng người dùng chưa xác thực về trang đăng nhập.
- [ ] **Tính năng 2: Theo dõi Bình luận Đã Push & Tự mở rộng**
  - Truy xuất `pushed_comments` (bình luận đã đẩy) từ cơ sở dữ liệu.
  - Giao diện (UI) phân biệt rõ ràng các bình luận đã đẩy (trạng thái chỉ đọc hoặc ẩn khỏi hàng chờ "push").
  - Tự động mở rộng các file trên UI nếu nhận được bình luận lỗi từ AI.
- [ ] **Tính năng 3: Theo dõi Người dùng trên Review**
  - Lưu trữ `userId` và `userName` khi phiên review được tạo.
  - Hiển thị tên/avatar của tác giả trên mỗi mục đánh giá (review item) ở trang dashboard.
  - Thêm dropdown lọc danh sách reviews theo từng người dùng.
- [ ] **Tính năng 4: Tối ưu UI Chuyên nghiệp**
  - Áp dụng hệ thống thiết kế "Công cụ Lập trình viên" (Developer Tools): Màu Slate/Dark chủ đạo, Độ tương phản cao.
  - Sử dụng Font `JetBrains Mono` cho code/số và `IBM Plex Sans` cho văn bản nội dung.
  - Đảm bảo tất cả các thành phần bấm được đều có `cursor-pointer`, hiệu ứng chuyển động mượt mà, và dùng hệ thống icon SVG tiêu chuẩn (loại bỏ emoji).
- [ ] **Tính năng 5: Theo dõi Số lượng Token AI đã dùng**
  - Theo dõi và hiển thị số lượng token đã dùng cho mỗi lần thực hiện review mã nguồn.
  - Hiển thị bảng tóm tắt mức sử dụng chi tiết (vd: tổng số lượng token đã dùng trong ngày) ở trang chủ hoặc trên thanh công cụ (toolbar) để dễ theo dõi.

## 5. Kiến trúc Kỹ thuật

### Thay đổi Database (SQLite)
- **Bảng `reviews`**: Thêm cột `userId TEXT`, `userName TEXT`, và `tokenUsage INTEGER`.
- **Bảng `daily_usage`**: Thêm bảng hoặc logic để theo dõi tổng số token sử dụng trong ngày (`date` và `totalTokens`).

### Cơ sở hạ tầng
- NextAuth v5 cho Google Provider.
- `better-sqlite3` cho việc lưu trữ dữ liệu bền vững.
- Next.js App Router.

## 6. Hướng dẫn UI/UX
- **Bảng màu (Color Stack)**: 
  - Màu chính (Primary): `#1E293B`
  - Chọn/Kích hoạt (Selected/Active): `#22C55E`
  - Nền (Background): `#0F172A`
  - Chữ (Text): `#F8FAFC`
- **Kiểu chữ (Typography)**: `JetBrains Mono` (Tiêu đề/Code), `IBM Plex Sans` (Nội dung).
- **Icons**: Chỉ dùng hệ thống Lucide React. Loại bỏ emoji.
