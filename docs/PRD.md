# Tài liệu Yêu cầu Sản phẩm (PRD)

## AI Code Review - Ứng dụng Review Code Tự động

**Phiên bản:** 2.0.0
**Ngày cập nhật:** 2026-02-12
**Tác giả:** thongpham95

---

## 1. Tổng quan sản phẩm

### 1.1 Mục đích
AI Code Review là ứng dụng web giúp lập trình viên review code tự động bằng AI, tích hợp với GitLab để tối ưu hóa quy trình code review trong team. Phiên bản 2.0 tập trung vào trải nghiệm người dùng (UX), đa ngôn ngữ và tính năng báo cáo chuyên nghiệp.

### 1.2 Vấn đề cần giải quyết
- Code review thủ công tốn nhiều thời gian.
- Thiếu sự nhất quán trong feedback.
- Rào cản ngôn ngữ với các developer không thành thạo tiếng Anh.
- Khó khăn trong việc chia sẻ kết quả review (PDF/In ấn).
- Việc cấu hình API Key phức tạp cho người dùng cuối.

### 1.3 Giải pháp
- Review code bằng AI với nhiều lựa chọn model (Tiết kiệm/Cân bằng/Pro).
- Hỗ trợ hoàn toàn Tiếng Việt và Tiếng Anh.
- Xuất báo cáo review ra PDF.
- Giao diện trực quan với chế độ xem Lưới/Danh sách và Diff View chi tiết.
- Cấu hình API Key linh hoạt (Server default hoặc User override).

---

## 2. Người dùng mục tiêu

### 2.1 Người dùng chính
- **Developer**: Review code cá nhân trước khi tạo MR.
- **Tech Lead**: Review code của thành viên, cần công cụ hỗ trợ nhanh.
- **Outsourcing Team**: Cần báo cáo chuyên nghiệp để gửi khách hàng.

### 2.2 Chân dung người dùng (Personas)

**Persona 1: Minh - Senior Dev**
- Cần review nhanh, chính xác.
- Thích giao diện tối ưu, phím tắt.
- Sử dụng model "Pro" cho các tính năng phức tạp.

**Persona 2: Lan - Junior Dev**
- Cần giải thích chi tiết, dễ hiểu bằng tiếng Việt.
- Sử dụng model "Tiết kiệm" hoặc "Cân bằng" để học hỏi hàng ngày.

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
| REV-03 | **[MỚI] Model Selection** | Chọn model theo nhu cầu: Tiết kiệm (Gemini Flash), Cân bằng, Pro | 🔄 Phase 2 |
| REV-04 | **[MỚI] Default API Key** | Hệ thống tự configure key, user không cần setup | 🔄 Phase 2 |

### 3.3 Giao diện & Trải nghiệm (P1)
| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| UI-01 | **[MỚI] Đa ngôn ngữ** | Chuyển đổi Tiếng Anh / Tiếng Việt | 🔄 Phase 2 |
| UI-02 | **[MỚI] List/Grid View** | Tùy chọn hiển thị danh sách Review | 🔄 Phase 2 |
| UI-03 | **[MỚI] Smart Sorting** | Sắp xếp, nhóm review theo ngày, điểm số | 🔄 Phase 2 |
| UI-04 | **[MỚI] Rich Diff View** | Xem diff code cũ/mới kèm comment của AI | 🔄 Phase 2 |

### 3.4 Báo cáo & Export (P1)
| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| REP-01 | **[MỚI] Export PDF** | Xuất kết quả review ra file PDF format chuẩn | 🔄 Phase 2 |

---

## 4. Roadmap & Tính năng tương lai

### Phase 2: UI/UX & Optimization (Hiện tại)
- [ ] Hỗ trợ đa ngôn ngữ (i18n).
- [ ] Chọn Model AI khi tạo review & bỏ trang Settings cũ.
- [ ] Quản lý API Key phía server.
- [ ] Giao diện Review List (Grid/List, Filter).
- [ ] Export PDF.
- [ ] Rich Diff Viewer.

### Phase 3: Deep Integration (Dự kiến Q3 2026)
- [ ] **Git Integration**: Sử dụng tài khoản Git đang login để comment/push code trực tiếp từ app.
- [ ] **RAG / NotebookLM**: Upload tài liệu dự án (PDF/Word) để AI "học" context dự án (Design System, Business Logic) và review dựa trên context đó.

---

## 5. Kiến trúc Kỹ thuật (Cập nhật)

### 5.1 Tech Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, `react-to-print`, `react-diff-viewer-continued`.
- **Backend**: Next.js API Routes, `better-sqlite3`.
- **AI**: Vercel AI SDK (Google, Anthropic, OpenAI).

### 5.2 Quản lý Source Code
- **Branching Strategy**: Feature branching (`feature/ten-tinh-nang`).
- **Phase 2 Branch**: `feature/phase2-ui-ux`.

---

## 6. Phụ lục
- **Glossary**:
    - **RAG**: Retrieval-Augmented Generation (AI học từ tài liệu).
    - **Diff**: Sự khác biệt giữa 2 phiên bản code.
