# Product Requirements Document (PRD)

## AI Code Review - Ứng dụng Review Code Tự động

**Phiên bản:** 1.0.0
**Ngày cập nhật:** 2026-02-11
**Tác giả:** thongpham95

---

## 1. Tổng quan sản phẩm

### 1.1 Mục đích
AI Code Review là ứng dụng web giúp lập trình viên review code tự động bằng AI, tích hợp với GitLab để streamline quy trình code review trong team.

### 1.2 Vấn đề cần giải quyết
- Code review thủ công tốn nhiều thời gian
- Thiếu consistency trong feedback giữa các reviewer
- Khó phát hiện các lỗi phổ biến và security issues
- Barrier ngôn ngữ với các developer không nói tiếng Anh

### 1.3 Giải pháp
- AI-powered code review với feedback chi tiết
- Hỗ trợ đa ngôn ngữ (Tiếng Anh, Tiếng Việt)
- Tích hợp GitLab để fetch MR tự động
- Pattern scanning để phát hiện lỗi phổ biến
- Hỗ trợ cả cloud AI và local AI (Ollama)

---

## 2. Người dùng mục tiêu

### 2.1 Primary Users
- **Lập trình viên**: Muốn review code nhanh trước khi tạo MR
- **Tech Lead**: Cần tool hỗ trợ review code của team
- **Solo developer**: Không có người review, cần AI hỗ trợ

### 2.2 Secondary Users
- **QA Engineer**: Kiểm tra code quality trước testing
- **Junior Developer**: Học hỏi từ AI feedback

### 2.3 User Personas

**Persona 1: Minh - Senior Developer**
- Làm việc tại startup với 5 developers
- Cần review nhiều MR mỗi ngày
- Muốn tool hỗ trợ để tăng tốc review process

**Persona 2: Hương - Junior Developer**
- Mới vào nghề 1 năm
- Muốn học best practices từ code review
- Thích feedback bằng tiếng Việt để dễ hiểu

---

## 3. Yêu cầu chức năng

### 3.1 Authentication (P0 - Must Have)

| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| AUTH-01 | GitHub OAuth | Đăng nhập bằng tài khoản GitHub | ✅ Done |
| AUTH-02 | GitLab.com OAuth | Đăng nhập bằng tài khoản GitLab.com | ✅ Done |
| AUTH-03 | GitLab Self-Hosted | Đăng nhập bằng PAT cho GitLab private | ✅ Done |
| AUTH-04 | Session management | Quản lý session cho cả OAuth và PAT | ✅ Done |
| AUTH-05 | Logout | Đăng xuất và xóa session | ✅ Done |

### 3.2 Code Review (P0 - Must Have)

| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| REV-01 | Paste code | Dán trực tiếp code cần review | ✅ Done |
| REV-02 | GitLab MR fetch | Fetch diff từ GitLab MR URL | ✅ Done |
| REV-03 | Pattern scan | Quét pattern phát hiện lỗi phổ biến | ✅ Done |
| REV-04 | AI analysis | Phân tích code bằng AI | ✅ Done |
| REV-05 | Streaming response | Stream AI response real-time | ✅ Done |
| REV-06 | Review history | Lưu và xem lại các review | ✅ Done |

### 3.3 AI Configuration (P0 - Must Have)

| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| AI-01 | Cloud AI (OpenAI) | Sử dụng OpenAI GPT-4 | ✅ Done |
| AI-02 | Local AI (Ollama) | Sử dụng Ollama với các model local | ✅ Done |
| AI-03 | Model selection | Chọn model AI muốn sử dụng | ✅ Done |
| AI-04 | Connection test | Test kết nối đến AI provider | ✅ Done |

### 3.4 Output & Display (P1 - Should Have)

| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| OUT-01 | Language selection | Chọn ngôn ngữ output (EN/VI) | ✅ Done |
| OUT-02 | Quick summary | Hiển thị tóm tắt ngắn ở đầu | ✅ Done |
| OUT-03 | File-by-file review | Review từng file với code snippet | ✅ Done |
| OUT-04 | Suggested fixes | Đề xuất code đã sửa | ✅ Done |
| OUT-05 | Code quality score | Điểm chất lượng code 1-10 | ✅ Done |

### 3.5 Context Documents (P1 - Should Have)

| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| DOC-01 | PDF upload | Upload PDF làm context | ✅ Done |
| DOC-02 | Word upload | Upload .docx làm context | ✅ Done |
| DOC-03 | Excel upload | Upload .xlsx làm context | ✅ Done |
| DOC-04 | URL reference | Thêm URL làm reference | ✅ Done |

### 3.6 UI/UX (P1 - Should Have)

| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| UI-01 | Responsive design | Hoạt động tốt trên mobile | ✅ Done |
| UI-02 | Dark mode | Hỗ trợ dark/light theme | ✅ Done |
| UI-03 | Loading states | Hiển thị loading indicators | ✅ Done |
| UI-04 | Toast notifications | Thông báo toast cho actions | ✅ Done |

### 3.7 Future Features (P2 - Nice to Have)

| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| FUT-01 | GitHub PR integration | Tích hợp GitHub Pull Requests | 🔜 Planned |
| FUT-02 | Inline comments | Comment trực tiếp trên code | 🔜 Planned |
| FUT-03 | Export report | Export PDF/Markdown report | 🔜 Planned |
| FUT-04 | Team workspace | Collaboration features | 🔜 Planned |
| FUT-05 | Webhook integration | Auto-review on MR create | 🔜 Planned |

---

## 4. Yêu cầu phi chức năng

### 4.1 Performance
- Thời gian load trang < 2 giây
- AI response streaming không bị delay đáng kể
- Hỗ trợ review file lớn (> 1000 lines)

### 4.2 Security
- HTTP-only cookies cho session
- HTTPS cho tất cả connections
- Không lưu credentials vào database
- PAT token chỉ lưu trong session, không persist

### 4.3 Reliability
- Graceful error handling
- Retry logic cho API calls
- Offline support cho local AI

### 4.4 Scalability
- Stateless API design
- SQLite cho single-instance, có thể migrate PostgreSQL
- Horizontal scaling với container

---

## 5. Technical Architecture

### 5.1 Tech Stack
```
Frontend:
├── Next.js 16 (App Router)
├── React 19
├── TypeScript
├── Tailwind CSS 4
└── shadcn/ui

Backend:
├── Next.js API Routes
├── NextAuth v5
├── AI SDK (Vercel)
└── better-sqlite3

AI Providers:
├── OpenAI (cloud)
└── Ollama (local)

Infrastructure:
├── Docker
├── GitHub Actions (CI/CD)
└── VPS/Cloud deployment
```

### 5.2 Data Flow
```
User Input → API Route → Pattern Scanner → AI Provider → Stream Response → UI Update
     ↓
  SQLite (review history)
```

### 5.3 Authentication Flow
```
OAuth Flow:
User → NextAuth → GitHub/GitLab → Callback → Session Cookie → Dashboard

PAT Flow:
User → API /pat-login → Validate with GitLab → Set HTTP-only Cookie → Dashboard
```

---

## 6. Success Metrics

### 6.1 KPIs
- **Adoption**: Số users active hàng tháng
- **Engagement**: Số reviews được tạo
- **Satisfaction**: User feedback rating

### 6.2 Targets (3 months)
- 100 active users
- 1000 reviews completed
- 4.0/5.0 satisfaction rating

---

## 7. Roadmap

### Phase 1: MVP (Completed)
- ✅ Basic authentication
- ✅ Code paste & review
- ✅ GitLab MR integration
- ✅ AI review với OpenAI/Ollama

### Phase 2: Enhancement (Current)
- ✅ Multi-language support
- ✅ File-by-file review
- ✅ Context documents
- 🔄 GitHub PR integration

### Phase 3: Collaboration (Q2 2026)
- Team workspaces
- Shared review history
- Role-based access

### Phase 4: Enterprise (Q3 2026)
- Self-hosted enterprise version
- SSO integration
- Audit logs
- Custom AI models

---

## 8. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AI API rate limits | High | Medium | Local Ollama fallback |
| GitLab API changes | Medium | Low | Version pinning, monitoring |
| Security breach | High | Low | Regular audits, encryption |
| Performance issues | Medium | Medium | Caching, optimization |

---

## 9. Appendix

### 9.1 Glossary
- **MR**: Merge Request (GitLab)
- **PR**: Pull Request (GitHub)
- **PAT**: Personal Access Token
- **Ollama**: Local AI runtime

### 9.2 References
- [Next.js Documentation](https://nextjs.org/docs)
- [GitLab API Documentation](https://docs.gitlab.com/ee/api/)
- [Ollama Documentation](https://ollama.ai/docs)
