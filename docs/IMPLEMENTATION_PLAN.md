# Kế hoạch Triển khai (Implementation Plan)

## Mô tả Mục tiêu
Triển khai hệ thống xác thực Google Workspace (Giới hạn tài khoản `@tvtgroup.io`), ẩn/đánh dấu các bình luận đã đẩy lên git, hiển thị người dùng nào đã chạy đánh giá MR kèm bộ lọc, và tối ưu hóa UI để bắt mắt đối tượng Developer/Tech Lead chuyên nghiệp hơn.

## Các Thay đổi Đề xuất

### 1. Nâng cấp Xác thực (Authentication Updates)
- **`src/auth.ts`**
  - [MỚI] Thêm Google Provider.
  - [SỬA] Thêm `signIn` callback để kiểm tra `profile.email` kết thúc bằng `@tvtgroup.io`.
- **`.env.example`**
  - [SỬA] Thêm `AUTH_GOOGLE_ID` và `AUTH_GOOGLE_SECRET`.

### 2. Theo dõi Người dùng đánh giá (User Tracking for Reviews)
- **`src/lib/review-store.ts`**
  - [SỬA] Cập nhật giao diện (interface) `Review` để thêm `userId` và `userName`.
  - [SỬA] Trong `getDb`: Cập nhật cấu trúc database với migration `ALTER TABLE reviews ADD COLUMN userId TEXT; ALTER TABLE reviews ADD COLUMN userName TEXT;`.
  - [SỬA] Cập nhật `createReview`, `searchReviews`, và `listReviews` để xử lý các dữ liệu người dùng này.
- **`src/app/api/review/route.ts`** (hoặc nơi tạo review)
  - [SỬA] Trích xuất thông tin người dùng từ NextAuth session và chuyển đến `createReview()`.

### 3. Theo dõi Bình luận Đã Push (Pushed Comments Tracking)
- **`src/app/api/reviews/[id]/route.ts`**
  - [SỬA] Lấy các bình luận đã đẩy thông qua `getPushedComments(id)` và trả về cùng với dữ liệu review chung.
- **`src/app/dashboard/reviews/[id]/page.tsx`**
  - [SỬA] Dẫn dữ liệu `pushedComments` ngược xuống component `InlineComment`.
  - [SỬA] Mặc định tự động mở rộng (auto-expand) những file nào đang có vấn đề/bình luận.
- **`src/components/review/inline-comment.tsx`**
  - [SỬA] Nhận tham số prop `isPushed`. Nếu đã push, tắt chức năng sửa/xóa, hiển thị nhãn "Already Pushed", hoặc ẩn nút push trong hàng đợi.

### 4. Tối ưu Giao diện UI/UX
- **`src/app/layout.tsx`**
  - [SỬA] Thêm import Google Fonts cho `JetBrains Mono` và `IBM Plex Sans`. Cập nhật font family dùng toàn trang.
- **`tailwind.config.ts` / `app/globals.css`**
  - [SỬA] Áp dụng màu sắc Developer design system mới (màu Slate, Green nhấn) vào các biến CSS.
- **`src/app/dashboard/reviews/page.tsx`**
  - [SỬA] Hiển thị tên `userName` trong các component `ReviewGridCard` và `ReviewListItem`.
  - [SỬA] Thêm bộ phận Select filter dành cho Lọc người dùng lập ra dựa trên những user hiện hành trong danh sách `reviews`.

### 5. Theo dõi Lượng sử dụng Token AI
- **`src/lib/review-store.ts`**
  - [SỬA] Cập nhật giao diện `Review` để thêm thuộc tính `tokenUsage` (số nguyên).
  - [MỚI] Thêm hàm logic `getDailyTokenUsage()` để thống kê tổng số token đã dùng trong ngày.
- **`src/app/api/review/analyze/route.ts`**
  - [SỬA] Lấy thông số token đã dùng từ phản hồi của Gemini API.
  - [SỬA] Lưu `tokenUsage` vào cơ sở dữ liệu sau khi phiên review hoàn tất.
- **`src/app/dashboard/layout.tsx` hoặc `src/components/dashboard/sidebar-nav.tsx` (Thanh công cụ)**
  - [SỬA] Truy xuất và hiển thị tóm tắt tổng số token đã dùng trong ngày trên toàn hệ thống.
- **`src/app/dashboard/reviews/[id]/page.tsx`**
  - [SỬA] Hiển thị chi tiết `tokenUsage` cho phiên review đang được xem.

## Kế hoạch Kiểm chứng (Verification Plan)

### Kiểm thử Tự động (Automated Tests)
- Chạy Next.js build (`npm run build`) để kiểm tra cú pháp và rà soát lỗi type.
- Chạy `npm run lint` để kiểm tra chuẩn định dạng nếu có.

### Xác minh Thủ công (Manual Verification)
1. **Google Auth**: Cấu hình các biến ảo `.env`, thử đăng nhập bằng tài khoản không thuộc đuôi `@tvtgroup.io` (sẽ bị chặn rớt). Đăng nhập bằng tài khoản hợp lệ (sẽ chui lọt thành công).
2. **Review Creation**: Bắt đầu một tiến trình review mới, xác nhận review lưu lại đúng tên của user đang login.
3. **Filtering**: Quay về dashboard, chọn sử dụng ô Filter, chọn các bộ lọc user để đánh giá review list thay đổi đúng chức năng.
4. **Pushed Comments**: Bật một chi tiết review, thử ra lệnh push bình luận lên, reset (F5) trang lại. Bắt sóng thấy bình luận hiển thị tag "đã Push" và file chứa nó phải tự động mở rộng theo mặc đinh.
5. **UI Aesthetics**: Xác minh phông chữ, mức tương phản của dark mode, trạng thái hover (di chuột) bắt mắt hiệu ứng chuyển động, không để sót cái emoji nào làm icon thay vào sử dụng Lucide.
6. **Token Usage**: Chạy một đánh giá, kiểm tra xem số lượng token có hiển thị trên trang chi tiết đánh giá không. Đảm bảo tổng số lượng dùng trong ngày hiển thị trên thanh công cụ được cập nhật tự động.
