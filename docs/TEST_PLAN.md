# Kế hoạch Kiểm thử (Test Plan)

## Tổng quan
Kiểm thử các tính năng mới đã triển khai: Google Workspace Auth, Theo dõi Bình luận Đã Push, Theo dõi Người dùng, Tối ưu UI, và Theo dõi Token AI.

---

## 1. Kiểm tra Build & Type-Check
- [x] `npm run build` — Biên dịch thành công, không có lỗi TypeScript
- [ ] `npm run lint` — Kiểm tra coding standards

## 2. Kiểm tra Xác thực Google (Feature 1)
- [ ] **TC-AUTH-01**: Google Provider đã được khai báo trong `src/auth.ts`
- [ ] **TC-AUTH-02**: Callback `signIn` kiểm tra email phải kết thúc bằng `@tvtgroup.io`
- [ ] **TC-AUTH-03**: Biến môi trường `AUTH_GOOGLE_ID` và `AUTH_GOOGLE_SECRET` đã được thêm vào `.env.example`
- [ ] **TC-AUTH-04**: Tài khoản không phải `@tvtgroup.io` bị chặn khi đăng nhập qua Google
- [ ] **TC-AUTH-05**: GitHub/GitLab login vẫn hoạt động bình thường

## 3. Kiểm tra Theo dõi Bình luận Đã Push (Feature 2)
- [ ] **TC-PUSH-01**: API `/api/reviews/[id]` trả về `pushedComments` cùng với review data
- [ ] **TC-PUSH-02**: File có bình luận đã push hiển thị badge "Pushed" trên header
- [ ] **TC-PUSH-03**: Trạng thái `pushedCommentFiles` được cập nhật đúng từ API response
- [ ] **TC-PUSH-04**: Các file có bình luận AI tự động mở rộng (auto-expand)

## 4. Kiểm tra Theo dõi Người dùng (Feature 3)
- [ ] **TC-USER-01**: Cột `userId` và `userName` đã được thêm vào bảng `reviews` (migration)
- [ ] **TC-USER-02**: API `/api/reviews/start` lưu `userId` và `userName` từ session
- [ ] **TC-USER-03**: Trang danh sách reviews hiển thị tên người dùng trên mỗi card/list item
- [ ] **TC-USER-04**: Dropdown lọc theo người dùng (User Filter) hoạt động đúng
- [ ] **TC-USER-05**: Khi chọn user filter, chỉ hiển thị reviews của user đó

## 5. Kiểm tra Theo dõi Token AI (Feature 5)
- [ ] **TC-TOKEN-01**: Cột `tokenUsage` đã được thêm vào bảng `reviews` (migration)
- [ ] **TC-TOKEN-02**: API `/api/review/analyze` lưu `tokenUsage` qua callback `onFinish` 
- [ ] **TC-TOKEN-03**: API `/api/usage` trả về tổng token dùng trong ngày và breakdown theo user
- [ ] **TC-TOKEN-04**: `TokenUsageBadge` hiển thị trên toolbar dashboard
- [ ] **TC-TOKEN-05**: Trang chi tiết review hiển thị số token đã dùng
- [ ] **TC-TOKEN-06**: Badge token auto-refresh mỗi 30 giây
- [ ] **TC-TOKEN-07**: Hàm `getDailyTokenUsage()` trả về dữ liệu đúng format
- [ ] **TC-TOKEN-08**: `getStats()` bao gồm `dailyTokens` trong response

## 6. Kiểm tra Giao diện (Feature 4 - Cơ bản)
- [ ] **TC-UI-01**: Token Usage Badge hiển thị đúng trên dashboard toolbar
- [ ] **TC-UI-02**: User name hiển thị trên Grid Card và List Item
- [ ] **TC-UI-03**: Token count hiển thị trên Grid Card và List Item
- [ ] **TC-UI-04**: "Pushed" badge hiển thị trên file header
- [ ] **TC-UI-05**: Trang chi tiết review hiển thị userName và tokenUsage

## 7. Kiểm tra Tích hợp (Integration)
- [ ] **TC-INT-01**: Toàn bộ flow: Tạo review → Chạy AI → Lưu token → Hiển thị trên dashboard
- [ ] **TC-INT-02**: Push comment → Refresh → Hiển thị badge "Pushed"
- [ ] **TC-INT-03**: Nhiều users tạo reviews → Filter dropdown hiển thị đầy đủ tên users

---

## Kết quả Kiểm thử

| Test Case | Trạng thái | Ghi chú |
| --- | --- | --- |
| Build & Type-Check | ✅ PASS | `npm run build` thành công |
| ... | PENDING | ... |
