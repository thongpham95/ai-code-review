# Implementation Plan: Jira Bug Analyzer

## Phase 1: Planning & Setup
- [x] Tạo PRD.md
- [x] Tạo IMPLEMENTATION_PLAN.md
- [x] Xác nhận kế hoạch với User (Human Review)

## Phase 2: Core Infrastructure (Jira Integration & Settings)
- [x] Cập nhật trang Settings (`/dashboard/settings`):
  - Thêm phần **Jira Integration** cho phép người dùng Login / Authenticate với Jira (OAuth 2.0 hoặc tương đương).
- [x] Xử lý lưu trữ Jira Tokens an toàn (có thể sử dụng `next-auth` hoặc cơ chế hiện tại kết hợp DB SQLite).
- [x] Tạo file service `/src/lib/jira-service.ts` với hàm `getJiraIssue(issueKey)` sử dụng token của User.

## Phase 3: Feature Implementation (UI & API)
- [x] Re-use hoặc tạo thêm các module đọc source code từ GitHub/GitLab service hiện có (ví dụ `/src/lib/gitlab-service.ts`, `/src/lib/github-service.ts`) thay vì quét file local.  Hàm này sẽ nhận đầu vào là keyword bug để locate the relevant files từ repo.
- [x] Tạo API Route `/src/app/api/jira/analyze/route.ts`:
  - Tiếp nhận `ticketKey` (Giả định app đã biết user đang kết nối với repo Git nào, hoặc cho chọn repo).
  - Gọi `jira-service.ts` để lấy thông tin ticket.
  - Phối hợp với Git providers (GitHub/GitLab) để lấy files list và file contents (giới hạn file quan trọng).
  - Sử dụng AI SDK ráp system prompt của "Jira Bug Analyzer" và kết hợp 2 models:
    - Chạy context data / code analysis bằng `Gemini-Flash`
    - Dùng `Gemini-Pro` stream/return dữ liệu báo cáo markdown để phân tích root cause sâu và solution.
- [x] Tạo Frontend UI `/src/app/dashboard/jira-analyzer/page.tsx`:
  - Form với `react-hook-form` để nhập liệu `ticketKey`. Khung UI có thể show ra list các repo Git đã linked.
  - Khu vực hiển thị kết quả xử lý markdown (dùng `react-markdown`).
- [x] Cập nhật SidebarNav (`/src/components/dashboard/sidebar-nav.tsx`) thêm link đến trang Jira Analyzer.

## Phase 4: UI/UX Polish
- [x] Thêm loading spinner hoặc skeleton trong lúc chờ AI generate kết quả.
- [x] Xử lý error boundaries (Bắt lỗi khi nhập sai Ticket Key hoặc sai thông tin xác thực Jira).
- [x] Thêm localization (i18n) cho tính năng (nếu có hỗ trợ).

## Phase 5: Testing & Verification
Xin lưu ý sau khi hoàn thành Phase 4, AI sẽ tạo `TEST_PLAN.md` và dừng lại đợi User phê duyệt trước khi test theo quy trình vibe-builder.

- [ ] Lên kịch bản kiểm thử (Test Plan) cho việc Fetch Jira.
- [ ] Lên kịch bản kiểm thử API generate report.
- [ ] Test End-to-End quy trình từ giao diện.

---

## Verification Plan

1. **Jira Settings Verification**:
   - Truy cập `/dashboard/settings`.
   - Tiến hành quy trình đăng nhập Jira.
   - Xác minh token được lấy và lưu trữ thành công.

2. **Jira Bug Analyzer UI Verification**:
   - Điều hướng tới `/dashboard/jira-analyzer`.
   - Xác nhận giao diện hiển thị đúng form input (chỉ cần Ticket Key).
   - Kiểm tra hiển thị liên kết với GitLab/GitHub đã thành công (nếu có).

3. **API & AI Logic Verification**:
   - Sử dụng một Ticket Key thực tế và một GitHub/GitLab Repo.
   - Nhấn Submit, API fetch được thông tin từ Jira.
   - Code scanner gọi đến GitLab/GitHub APIs thành công và lấy code content.
   - AI render kết quả Markdown chuẩn SKILL.md.
