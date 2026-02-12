# Tài liệu Yêu cầu Sản phẩm (PRD)

## AI Code Review - Ứng dụng Review Code Tự động

**Phiên bản:** 2.1.0
**Ngày cập nhật:** 2026-02-12
**Tác giả:** thongpham95

---

## 1. Tổng quan sản phẩm

### 1.1 Mục đích
AI Code Review là ứng dụng web giúp lập trình viên review code tự động bằng AI, tích hợp với GitLab để tối ưu hóa quy trình code review trong team. Phiên bản 2.1 đơn giản hoá AI provider (chỉ dùng Google Gemini miễn phí), thêm tính năng tìm kiếm review, và hoàn thiện trải nghiệm đa ngôn ngữ.

### 1.2 Vấn đề cần giải quyết
- Code review thủ công tốn nhiều thời gian.
- Thiếu sự nhất quán trong feedback.
- Rào cản ngôn ngữ với các developer không thành thạo tiếng Anh.
- Khó khăn trong việc chia sẻ kết quả review (PDF/In ấn).
- Khó tìm lại review cũ khi cần tham khảo.

### 1.3 Giải pháp
- Review code bằng **Google Gemini** (miễn phí) — 2 chế độ: Nhanh và Chất lượng.
- Hỗ trợ hoàn toàn Tiếng Việt và Tiếng Anh.
- **Tìm kiếm review** theo title, từ khoá.
- Xuất báo cáo review ra PDF.
- Giao diện trực quan với chế độ xem Lưới/Danh sách.

---

## 2. Người dùng mục tiêu

### 2.1 Người dùng chính
- **Developer**: Review code cá nhân trước khi tạo MR.
- **Tech Lead**: Review code của thành viên, cần công cụ hỗ trợ nhanh.
- **Outsourcing Team**: Cần báo cáo chuyên nghiệp để gửi khách hàng.

### 2.2 Chân dung người dùng (Personas)

**Persona 1: Minh - Senior Dev**
- Cần review nhanh, chính xác.
- Dùng "Chất lượng" (Gemini Pro) cho code phức tạp.
- Tìm kiếm review cũ để tham khảo.

**Persona 2: Lan - Junior Dev**
- Cần giải thích chi tiết, dễ hiểu bằng tiếng Việt.
- Dùng "Nhanh" (Gemini Flash) để review hàng ngày.

---

## 3. Yêu cầu chức năng

### 3.1 Authentication (P0)
| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| AUTH-01 | GitHub/GitLab OAuth | Đăng nhập bằng tài khoản Git | ✅ Hoàn thành |
| AUTH-02 | Session Management | Quản lý phiên làm việc an toàn | ✅ Hoàn thành |

### 3.2 Code Review Core (P0)
| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| REV-01 | Webhook/URL/Paste | Nguồn code linh hoạt | ✅ Hoàn thành |
| REV-02 | AI Analysis | Phân tích code tìm lỗi, security, performance | ✅ Hoàn thành |
| REV-03 | Model Selection | 2 chế độ Gemini: Nhanh (Flash) / Chất lượng (Pro) | ✅ Hoàn thành |
| REV-04 | **[MỚI] Tìm kiếm Review** | Tìm kiếm review theo title, từ khoá | ✅ Hoàn thành |

### 3.3 Giao diện & Trải nghiệm (P1)
| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| UI-01 | Đa ngôn ngữ | Chuyển đổi Tiếng Anh / Tiếng Việt | ✅ Hoàn thành |
| UI-02 | List/Grid View | Tùy chọn hiển thị danh sách Review | ✅ Hoàn thành |
| UI-03 | Smart Sorting | Sắp xếp, nhóm review theo ngày, số lỗi | ✅ Hoàn thành |

### 3.4 Báo cáo & Export (P1)
| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| REP-01 | Export PDF | Xuất kết quả review ra file PDF | ✅ Hoàn thành |

---

## 4. Roadmap & Tính năng tương lai

### Phase 2: UI/UX & Optimization (Hoàn thành — v2.1)
- [x] Hỗ trợ đa ngôn ngữ (i18n).
- [x] Chọn Model AI (Gemini Flash / Pro).
- [x] Giao diện Review List (Grid/List, Sort, Group).
- [x] Export PDF.
- [x] **Tìm kiếm Review** theo title, từ khoá.
- [x] **Đơn giản hoá**: chỉ giữ Gemini, xoá Anthropic/OpenAI.

### Phase 3: Deep Integration (Dự kiến Q3 2026)
- [ ] **Git Integration**: Comment/push code trực tiếp từ app.
- [ ] **RAG / NotebookLM**: Upload tài liệu để AI học context dự án.
- [ ] **Rich Diff View**: Xem diff kèm AI comment inline.

---

## 5. Kiến trúc Kỹ thuật

### 5.1 Tech Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, `react-to-print`.
- **Backend**: Next.js API Routes, `better-sqlite3`.
- **AI**: Vercel AI SDK — **chỉ Google Gemini** (Flash + Pro).

### 5.2 Quản lý Source Code
- **Branching Strategy**: Feature branching (`feature/ten-tinh-nang`).

---

## 6. Phụ lục
- **Glossary**:
    - **RAG**: Retrieval-Augmented Generation (AI học từ tài liệu).
    - **Diff**: Sự khác biệt giữa 2 phiên bản code.
    - **Gemini Flash**: Model nhanh, miễn phí, phù hợp review hàng ngày.
    - **Gemini Pro**: Model mạnh hơn, phù hợp code phức tạp.
