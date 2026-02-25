# Test Plan

## AI Code Review - Kế hoạch kiểm thử

**Phiên bản:** 1.0.0
**Ngày cập nhật:** 2026-02-11

---

## 1. Tổng quan

### 1.1 Mục tiêu
- Đảm bảo tất cả chức năng hoạt động đúng
- Phát hiện và sửa lỗi trước khi release
- Kiểm tra performance và security
- Đảm bảo UX tốt trên các thiết bị

### 1.2 Phạm vi
- Authentication (OAuth, PAT)
- Code Review workflow
- AI Integration (OpenAI, Ollama)
- GitLab Integration
- UI/UX responsive

### 1.3 Môi trường test

| Môi trường | URL | Database |
|------------|-----|----------|
| Development | localhost:3000 | SQLite (local) |
| Staging | staging.example.com | SQLite |
| Production | app.example.com | SQLite |

---

## 2. Test Cases

### 2.1 Authentication Tests

#### TC-AUTH-01: GitHub OAuth Login
| Item | Detail |
|------|--------|
| **Mô tả** | Đăng nhập bằng GitHub OAuth |
| **Precondition** | User có tài khoản GitHub |
| **Steps** | 1. Vào trang /login<br>2. Click "Sign in with GitHub"<br>3. Authorize trên GitHub<br>4. Redirect về app |
| **Expected** | User được redirect về /dashboard, thấy avatar và tên |
| **Priority** | P0 |

#### TC-AUTH-02: GitLab OAuth Login
| Item | Detail |
|------|--------|
| **Mô tả** | Đăng nhập bằng GitLab.com OAuth |
| **Precondition** | User có tài khoản GitLab.com |
| **Steps** | 1. Vào trang /login<br>2. Click "Sign in with GitLab.com"<br>3. Authorize trên GitLab<br>4. Redirect về app |
| **Expected** | User được redirect về /dashboard |
| **Priority** | P0 |

#### TC-AUTH-03: GitLab Self-Hosted PAT Login
| Item | Detail |
|------|--------|
| **Mô tả** | Đăng nhập GitLab Self-Hosted bằng PAT |
| **Precondition** | User có GitLab self-hosted instance và PAT |
| **Steps** | 1. Vào trang /login<br>2. Nhập GitLab URL<br>3. Nhập Personal Access Token<br>4. Click "Test Connection"<br>5. Click "Connect" |
| **Expected** | - Test Connection hiện "Connected!"<br>- Connect redirect về /dashboard<br>- User info hiện trong dropdown |
| **Priority** | P0 |

#### TC-AUTH-04: PAT Login Invalid Token
| Item | Detail |
|------|--------|
| **Mô tả** | Đăng nhập với PAT không hợp lệ |
| **Precondition** | - |
| **Steps** | 1. Nhập GitLab URL hợp lệ<br>2. Nhập PAT sai<br>3. Click "Connect" |
| **Expected** | Hiện toast error "Invalid token or unauthorized" |
| **Priority** | P0 |

#### TC-AUTH-05: Logout OAuth User
| Item | Detail |
|------|--------|
| **Mô tả** | Đăng xuất user OAuth |
| **Precondition** | User đã đăng nhập bằng OAuth |
| **Steps** | 1. Click avatar dropdown<br>2. Click "Log out" |
| **Expected** | Redirect về /login, session bị xóa |
| **Priority** | P0 |

#### TC-AUTH-06: Logout PAT User
| Item | Detail |
|------|--------|
| **Mô tả** | Đăng xuất user PAT |
| **Precondition** | User đã đăng nhập bằng PAT |
| **Steps** | 1. Click avatar dropdown<br>2. Click "Log out" |
| **Expected** | Redirect về /login, cookie và sessionStorage bị xóa |
| **Priority** | P0 |

#### TC-AUTH-07: Protected Route Without Auth
| Item | Detail |
|------|--------|
| **Mô tả** | Truy cập /dashboard khi chưa đăng nhập |
| **Precondition** | User chưa đăng nhập |
| **Steps** | 1. Truy cập trực tiếp /dashboard |
| **Expected** | Redirect về /login |
| **Priority** | P0 |

---

### 2.2 Review Creation Tests

#### TC-REV-01: Create Review from Pasted Code
| Item | Detail |
|------|--------|
| **Mô tả** | Tạo review từ code paste |
| **Precondition** | User đã đăng nhập |
| **Steps** | 1. Vào /dashboard/reviews/new<br>2. Click tab "Paste Code"<br>3. Paste code vào textarea<br>4. Chọn ngôn ngữ AI<br>5. Click "Start Review" |
| **Expected** | - Review được tạo<br>- Pattern scan results hiện kèm theo AI tự động bắt đầu stream review kết quả |
| **Priority** | P0 |

#### TC-REV-02: Create Review from GitLab MR
| Item | Detail |
|------|--------|
| **Mô tả** | Tạo review từ 1 hoặc nhiều GitLab MR URLs |
| **Precondition** | User đã đăng nhập, có GitLab PAT trong session |
| **Steps** | 1. Vào /dashboard/reviews/new<br>2. Click tab "Connect URL"<br>3. Nhập một hoặc nhiều GitLab MR URLs<br>4. Chọn ngôn ngữ AI<br>5. Click "Start Review" |
| **Expected** | - Tất cả MR diff được fetch gộp chung<br>- Review được tạo và tự động chạy AI stream ngay lập tức |
| **Priority** | P0 |

#### TC-REV-03: Create Review with Context Documents
| Item | Detail |
|------|--------|
| **Mô tả** | Tạo review với tài liệu context |
| **Precondition** | User đã đăng nhập |
| **Steps** | 1. Vào /dashboard/reviews/new<br>2. Upload 1 PDF file<br>3. Paste code<br>4. Click "Start Review" |
| **Expected** | - Document được upload và extract text<br>- Review được tạo với context |
| **Priority** | P1 |

#### TC-REV-04: View Review List
| Item | Detail |
|------|--------|
| **Mô tả** | Xem danh sách reviews |
| **Precondition** | Có ít nhất 1 review đã tạo |
| **Steps** | 1. Vào /dashboard/reviews |
| **Expected** | - Danh sách reviews hiện đúng<br>- Hiện title, status, time ago<br>- Click vào card mở review detail |
| **Priority** | P0 |

#### TC-REV-05: View Review Detail
| Item | Detail |
|------|--------|
| **Mô tả** | Xem chi tiết review |
| **Precondition** | Có review đã tạo |
| **Steps** | 1. Click vào review card từ list |
| **Expected** | - Hiện 3 tabs: Code & Files, Issues, AI Review<br>- Inline language switcher hiển thị tại view detail<br>- Có thể đổi ngôn ngữ và Re-run AI review |
| **Priority** | P0 |

#### TC-REV-06: Bulk Delete Reviews
| Item | Detail |
|------|--------|
| **Mô tả** | Xóa nhiều reviews cùng lúc |
| **Precondition** | Có ít nhất 2 reviews |
| **Steps** | 1. Mở danh sách reviews<br>2. Tick chọn checkbox của 2 reviews<br>3. Click "Xoá đã chọn" |
| **Expected** | Trạng thái table thay đổi, 2 reviews biến mất, hiển thị toast success |
| **Priority** | P1 |

---

### 2.3 AI Analysis Tests

#### TC-AI-01: Run AI Review with Ollama (English)
| Item | Detail |
|------|--------|
| **Mô tả** | Chạy AI review bằng Ollama, output English |
| **Precondition** | - Ollama đang chạy<br>- Model đã pull<br>- Review đã tạo |
| **Steps** | 1. Mở review detail<br>2. Chọn language "EN"<br>3. Click "Run AI Review" |
| **Expected** | - Streaming response hiện từng chunk<br>- Quick Summary banner hiện<br>- Markdown rendered đúng<br>- File-by-file review format |
| **Priority** | P0 |

#### TC-AI-02: Run AI Review with Ollama (Vietnamese)
| Item | Detail |
|------|--------|
| **Mô tả** | Chạy AI review bằng Ollama, output Vietnamese |
| **Precondition** | - Ollama đang chạy<br>- Review đã tạo |
| **Steps** | 1. Mở review detail<br>2. Chọn language "VI"<br>3. Click "Run AI Review" |
| **Expected** | - Response hoàn toàn bằng tiếng Việt<br>- Headers: "Tóm tắt nhanh", "Điểm chất lượng code"<br>- Quick Summary banner hiện "Tóm tắt nhanh" |
| **Priority** | P0 |

#### TC-AI-03: Run AI Review with OpenAI
| Item | Detail |
|------|--------|
| **Mô tả** | Chạy AI review bằng OpenAI |
| **Precondition** | - OPENAI_API_KEY configured<br>- Settings: useLocal = false |
| **Steps** | 1. Vào Settings, chọn Cloud provider<br>2. Mở review detail<br>3. Click "Run AI Review" |
| **Expected** | - Response từ OpenAI GPT-4<br>- Streaming hoạt động |
| **Priority** | P1 |

#### TC-AI-04: AI Review Connection Error
| Item | Detail |
|------|--------|
| **Mô tả** | Test error khi Ollama không chạy |
| **Precondition** | Ollama không chạy |
| **Steps** | 1. Mở review detail<br>2. Click "Run AI Review" |
| **Expected** | Toast error "Cannot connect to Ollama" |
| **Priority** | P1 |

#### TC-AI-05: Test Ollama Connection
| Item | Detail |
|------|--------|
| **Mô tả** | Test connection đến Ollama |
| **Precondition** | Ollama đang chạy |
| **Steps** | 1. Vào Settings<br>2. Enable "Use Local AI"<br>3. Click "Test Connection" |
| **Expected** | Status hiện "Running" với danh sách models |
| **Priority** | P1 |

---

### 2.4 UI/UX Tests

#### TC-UI-01: Responsive - Mobile View
| Item | Detail |
|------|--------|
| **Mô tả** | Test UI trên mobile (< 640px) |
| **Precondition** | - |
| **Steps** | 1. Mở app trên mobile viewport<br>2. Navigate qua các trang |
| **Expected** | - Sidebar collapse thành hamburger menu<br>- Language dropdown và Review button không bị cắt<br>- Cards stack vertically |
| **Priority** | P1 |

#### TC-UI-02: Responsive - Tablet View
| Item | Detail |
|------|--------|
| **Mô tả** | Test UI trên tablet (768px - 1024px) |
| **Precondition** | - |
| **Steps** | 1. Mở app trên tablet viewport<br>2. Navigate qua các trang |
| **Expected** | - 2 column grid cho review cards<br>- Sidebar visible |
| **Priority** | P1 |

#### TC-UI-03: Dark Mode Toggle
| Item | Detail |
|------|--------|
| **Mô tả** | Toggle dark/light mode |
| **Precondition** | - |
| **Steps** | 1. Click theme toggle button<br>2. Switch giữa dark và light |
| **Expected** | - Theme thay đổi ngay lập tức<br>- Preference được lưu |
| **Priority** | P2 |

#### TC-UI-04: Long Title Truncation
| Item | Detail |
|------|--------|
| **Mô tả** | Title dài bị truncate đúng |
| **Precondition** | Review có title dài > 100 chars |
| **Steps** | 1. Xem review list |
| **Expected** | - Title bị truncate với "..."<br>- Hover hiện full title |
| **Priority** | P1 |

---

### 2.5 Pattern Scanner Tests

#### TC-PAT-01: Detect console.log
| Item | Detail |
|------|--------|
| **Mô tả** | Phát hiện console.log |
| **Input** | `console.log("debug")` |
| **Expected** | Warning: "Console statement found" |
| **Priority** | P1 |

#### TC-PAT-02: Detect Hardcoded Secret
| Item | Detail |
|------|--------|
| **Mô tả** | Phát hiện API key hardcoded |
| **Input** | `const apiKey = "sk-1234567890"` |
| **Expected** | Error: "Potential hardcoded secret" |
| **Priority** | P0 |

#### TC-PAT-03: Detect TODO/FIXME
| Item | Detail |
|------|--------|
| **Mô tả** | Phát hiện TODO comments |
| **Input** | `// TODO: implement this` |
| **Expected** | Info: "TODO/FIXME comment found" |
| **Priority** | P2 |

---

### 2.6 GitLab Integration Tests

#### TC-GL-01: Fetch Valid MR
| Item | Detail |
|------|--------|
| **Mô tả** | Fetch MR hợp lệ |
| **Precondition** | PAT có quyền read_api |
| **Steps** | 1. Nhập valid MR URL<br>2. Start review |
| **Expected** | - MR title, description fetched<br>- All changed files fetched |
| **Priority** | P0 |

#### TC-GL-02: Fetch MR Invalid URL
| Item | Detail |
|------|--------|
| **Mô tả** | Fetch MR với URL sai format |
| **Input** | `https://gitlab.com/invalid-url` |
| **Expected** | Toast info: "Could not fetch MR diff" |
| **Priority** | P1 |

#### TC-GL-03: Fetch MR Unauthorized
| Item | Detail |
|------|--------|
| **Mô tả** | Fetch MR không có quyền |
| **Precondition** | PAT không có quyền vào project |
| **Expected** | Error message về authorization |
| **Priority** | P1 |

---

## 3. Non-Functional Tests

### 3.1 Performance Tests

| Test | Target | Method |
|------|--------|--------|
| Page Load | < 2s | Lighthouse |
| API Response | < 500ms | k6 |
| AI Streaming | First chunk < 1s | Manual |
| Large File Review | < 10s for 1000 lines | Manual |

### 3.2 Security Tests

| Test | Check | Status |
|------|-------|--------|
| XSS Prevention | Input sanitization | ✅ |
| CSRF Protection | NextAuth tokens | ✅ |
| SQL Injection | Parameterized queries | ✅ |
| Cookie Security | HTTP-only, SameSite | ✅ |
| Secrets Exposure | No secrets in client | ✅ |

### 3.3 Compatibility Tests

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ✅ |
| Firefox | Latest | ✅ |
| Safari | Latest | ✅ |
| Edge | Latest | ✅ |
| Mobile Safari | iOS 15+ | ✅ |
| Chrome Android | Latest | ✅ |

---

## 4. Test Execution

### 4.1 Test Schedule

| Phase | Duration | Focus |
|-------|----------|-------|
| Unit Tests | Ongoing | Pattern scanner, parsers |
| Integration | Per feature | API endpoints |
| E2E | Before release | Full workflows |
| Regression | After fixes | All critical paths |

### 4.2 Test Environment Setup

```bash
# Local testing
npm run dev

# With Ollama
ollama serve
ollama pull qwen2.5-coder:7b

# Docker testing
docker-compose up -d
```

### 4.3 Bug Reporting Template

```markdown
## Bug Title
[Mô tả ngắn gọn]

## Steps to Reproduce
1. ...
2. ...

## Expected Result
[Điều gì nên xảy ra]

## Actual Result
[Điều gì thực sự xảy ra]

## Environment
- Browser:
- OS:
- Version:

## Screenshots
[Nếu có]
```

---

## 5. Test Coverage Goals

| Area | Target | Current |
|------|--------|---------|
| Auth Flow | 100% | 100% |
| Review CRUD | 100% | 100% |
| AI Integration | 90% | 85% |
| UI Components | 80% | 75% |
| Edge Cases | 70% | 60% |

---

## 6. Sign-off Criteria

### 6.1 Release Criteria
- [ ] Tất cả P0 tests pass
- [ ] Không có P0/P1 bugs open
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] Documentation updated

### 6.2 Approvers
- Dev Lead: Review code quality
- QA Lead: Test coverage
- Product Owner: Feature completeness
