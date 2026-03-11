# Product Requirements Document: Jira Bug Analyzer

## 1. Product Overview
Tính năng **Jira Bug Analyzer** được tích hợp vào ứng dụng `ai-code-review` để hỗ trợ Developer phân tích và tìm nguyên nhân (root cause) của các bug từ Jira. Bằng cách kết nối trực tiếp với tài khoản Jira và tích hợp sẵn với dịch vụ Git (GitHub/GitLab), hệ thống sẽ tự động lấy thông tin từ Jira, lấy source code từ repository, gọi AI model (dựa trên hướng dẫn từ `jira-bug-analyzer` skill) để trả về một báo cáo phân tích chi tiết kèm hướng dẫn fix lỗi.

## 2. Goals & Objectives
- **Primary goal:** Giảm thời gian debug cho developer bằng cách tự động hóa quá trình thu thập thông tin và phân tích nguyên nhân lỗi.
- **Success metrics:** AI có thể đọc đúng source code liên quan, chỉ ra chính xác root cause và xuất format báo cáo Markdown chuẩn dễ đọc.

## 3. Target Users
- **Developer / Tech Lead:** Những người trực tiếp fix bug, cần tiết kiệm thời gian đọc hiểu code cũ để tìm nguyên nhân.
- **QC / Tester:** (Tùy chọn) Sử dụng để có thêm insight về lỗi trước khi báo cáo cho dev.

## 4. Features & Requirements

### Core Features (MVP)
- [ ] **Feature 1: Jira Integration (OAuth/Login)**
  - Cho phép người dùng kết nối (link) ứng dụng trực tiếp với tài khoản Jira của họ (ví dụ thông qua OAuth) trên trang Settings. Quản lý xác thực thay vì tự nhập cấu hình thủ công.
- [ ] **Feature 2: Bug Analyzer UI**
  - Một giao diện chuyên dụng tại `/dashboard/jira-analyzer`.
  - Form nhập liệu: Chỉ cần nhập `Ticket Key` (VD: PROJ-123). Hệ thống sẽ sử dụng nguồn source code từ cấu hình GitHub/GitLab hiện có của người dùng.
  - Nút Submit với hiệu ứng loading.
- [ ] **Feature 3: Jira & Git Repositories Integration (Backend)**
  - API endpoint gọi đến Jira REST API lấy thông tin Ticket bằng token của user đã xác thực.
  - Quét source code trực tiếp thông qua API của GitHub hoặc GitLab integration đã được cấu hình từ trước, tự động nhắm mục tiêu vào repo gắn liền với project.
- [ ] **Feature 4: AI Analysis Output**
  - Gửi dữ liệu (Ticket + Code files context) lên OpenAI/Anthropic thông qua `ai` SDK.
  - Áp dụng system prompt từ `jira-bug-analyzer` để format trả về dạng Markdown.
  - Hiển thị kết quả real-time (stream) hoặc dạng tài liệu Markdown sử dụng `react-markdown`.

## 5. User Flows

```
[Mở Dashboard] → [Chọn Jira Analyzer ở Sidebar] 
                       ↓
[Nhập Jira Ticket Key] → [Click "Phân tích Bug"]
                       ↓
[Hệ thống gọi Jira API lấy info] → [Hệ thống kéo code từ GitHub/GitLab liên kết] 
                       ↓
[AI Model phân tích dữ liệu] → [Hiển thị Bug Analysis Report (Markdown)]
```

## 6. Wireframes

### Screen: Jira Bug Analyzer (`/dashboard/jira-analyzer`)
```text
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Sidebar       |  Jira Bug Analyzer                  │
│  - Overview           |                                     │
│  - Gitlab Integration   |                                     │
│  - Jira Analyzer (NEW)|  [ Ticket Key (e.g. BUG-123) ]      │
│  - Settings           |  [ Bắt đầu phân tích (Btn)   ]      │
│                       |                                     │
│                       |  ---------------------------------  │
│                       |  |                               |  │
│                       |  | # Bug Analysis Report         |  │
│                       |  | ## Root Cause                 |  │
│                       |  | ...                           |  │
│                       |  ---------------------------------  │
└─────────────────────────────────────────────────────────────┘
```

## 7. Technical Architecture

### Tech Stack
- **Frontend:** Next.js App Router, React Hook Form, Tailwind CSS, shadcn/ui.
- **Backend:** Next.js Route Handlers (`/api/jira/analyze`).
- **Integration:** Jira REST API (fetch/axios).
- **AI / LLM:** Sử dụng Gemini-Flash và Gemini-Pro qua `@ai-sdk/google` kết hợp với prompt của `jira-bug-analyzer`.
  - **Gemini-Flash:** Chuyên dụng cho việc phân tích, đọc code và tổng hợp thông tin nhanh từ Jira/GitLab/GitHub.
  - **Gemini-Pro:** Chuyên dụng cho suy luận sâu, debug, phân tích root cause và suy nghĩ đề xuất thay đổi (solution fix).
- **Markdown Render:** `react-markdown` kết hợp `react-syntax-highlighter` (nếu cần).

### API Design
| Endpoint | Method | Description | Request | Response |
| -------- | ------ | ----------- | ------- | -------- |
| `/api/jira/analyze` | POST | Analyze a Jira bug ticket | `{ ticketKey }` | Stream (AI Response) / JSON Report |

## 8. UI/UX Guidelines
- Kế thừa component button, input, badge từ hệ thống UI hiện tại (shadcn).
- Báo cáo Markdown hiển thị rõ ràng, highlight syntax cho block code.
- Xử lý mượt mà các trạng thái loading, lỗi API Jira (VD: sai token).
