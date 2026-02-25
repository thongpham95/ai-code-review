# Tài liệu Yêu cầu Sản phẩm (PRD)

## AI Code Review - Ứng dụng Review Code Tự động

**Phiên bản:** 2.3.0
**Ngày cập nhật:** 2026-02-12
**Tác giả:** thongpham95

---

## 1. Tổng quan sản phẩm

### 1.1 Mục đích
AI Code Review là ứng dụng web giúp lập trình viên review code tự động bằng AI, tích hợp sâu với GitHub/GitLab. Phiên bản 2.3 hoàn thiện tính năng đẩy comment trực tiếp lên PR/MR và cho phép chỉnh sửa thủ công feedback của AI.

### 1.2 Vấn đề cần giải quyết
- Code review thủ công tốn nhiều thời gian.
- Thiếu sự nhất quán trong feedback.
- Rào cản ngôn ngữ với các developer không thành thạo tiếng Anh.
- Khó khăn trong việc chia sẻ kết quả review (PDF/In ấn).
- Khó tìm lại review cũ khi cần tham khảo.

### 1.3 Giải pháp
- Review code bằng **Google Gemini Flash** (chế độ duy nhất được sử dụng cho cả tốc độ và chất lượng để tối giản hệ thống).
- Hỗ trợ hoàn toàn Tiếng Việt và Tiếng Anh (Chuyển đổi ngôn ngữ trực tiếp trong màn hình Review Detail).
- **Tương tác 2 chiều**: Push comment lên GitHub/GitLab, chỉnh sửa comment trước khi push.
- Xuất báo cáo review ra PDF.
- Giao diện trực quan với chế độ xem Lưới/Danh sách.
- **Tối ưu trải nghiệm**: Khởi tạo AI Review ngay lập tức (1-click review) và hỗ trợ xử lý nhiều MR/PR URL cùng lúc.
- **Tương tác 2 chiều**: Push comment lên GitHub/GitLab, chỉnh sửa comment trước khi push.
- Xuất báo cáo review ra PDF.
- Giao diện trực quan với chế độ xem Lưới/Danh sách.

---

## 2. Người dùng mục tiêu

### 2.1 Người dùng chính
- **Developer**: Review code cá nhân trước khi tạo MR.
- **Tech Lead**: Review code của thành viên, chỉnh sửa feedback của AI rồi push lên Git.
- **Outsourcing Team**: Cần báo cáo chuyên nghiệp để gửi khách hàng.

### 2.2 Chân dung người dùng (Personas)

**Persona 1: Minh - Senior Dev**
- Cần review nhanh, chính xác cho code phức tạp.
- Chỉnh sửa lại các comment của AI cho phù hợp ngữ cảnh dự án rồi mới push.

**Persona 2: Lan - Junior Dev**
- Cần giải thích chi tiết, dễ hiểu bằng tiếng Việt.
- Sử dụng tính năng 1-click để tự động chạy review code ngay khi tạo review mới.

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
| REV-01 | Webhook/URL/Paste | Nguồn code linh hoạt, hỗ trợ nhập **nhiều MR URLs cùng lúc** | ✅ Hoàn thành / 🟡 Nâng cấp |
| REV-02 | AI Analysis | Phân tích code tìm lỗi, security, performance (Chỉ dùng **Gemini Flash**) | ✅ Hoàn thành |
| REV-03 | **[MỚI] 1-Click Review** | Chọn ngôn ngữ và tự động chạy AI Review ngay khi Submit tạo review | 🟡 Nâng cấp |
| REV-04 | **[MỚI] Tìm kiếm và Quản lý** | Tìm kiếm review theo title, từ khoá. Hỗ trợ **xoá hàng loạt (Bulk Delete)** | ✅ Hoàn thành / 🟡 Nâng cấp |
| REV-05 | **[MỚI] Git Integration** | Push comment lên PR/MR | ✅ Hoàn thành |

### 3.3 Giao diện & Trải nghiệm (P1)
| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| UI-01 | Đa ngôn ngữ | Chuyển ngôn ngữ AI review **trực tiếp trong màn hình Review Detail** | ✅ Hoàn thành / 🟡 Nâng cấp |
| UI-02 | List/Grid View | Tùy chọn hiển thị danh sách Review | ✅ Hoàn thành |
| UI-03 | Smart Sorting | Sắp xếp, nhóm review. Chọn và **xoá hàng loạt** review | ✅ Hoàn thành / 🟡 Nâng cấp |
| UI-04 | **Manual Edit** | Chỉnh sửa/Từ chối AI comment | ✅ Hoàn thành |

### 3.4 Báo cáo & Export (P1)
| ID | Chức năng | Mô tả | Trạng thái |
|----|-----------|-------|------------|
| REP-01 | Export PDF | Xuất kết quả review ra file PDF | ✅ Hoàn thành |

---

## 4. Roadmap & Tính năng tương lai

### Phase 2: UI/UX & Optimization (Hoàn thành — v2.2)
- [x] Hỗ trợ đa ngôn ngữ (i18n).
- [x] Chọn Model AI (Gemini Flash / Pro).
- [x] Giao diện Review List (Grid/List, Sort, Group).
- [x] Export PDF.
- [x] **Tìm kiếm Review** theo title, từ khoá.
- [x] **Đơn giản hoá**: chỉ giữ Gemini, xoá Anthropic/OpenAI.
- [x] **GitHub/GitLab-like UI**: Giao diện review giống GitHub/GitLab.
- [x] **Inline AI Comments**: AI comment hiển thị trực tiếp dưới mỗi file.
- [x] **Unified View**: Gộp Code & AI Review thành 1 giao diện thống nhất.
- [x] **Optimized UI Density**: Giảm padding, hiển thị nhiều nội dung hơn.

### Phase 3: Deep Integration (Đang triển khai — v2.3)

#### 3.1 Git Integration (P0)
- [x] **Push to GitLab**: Đẩy AI comment lên GitLab MR.
- [x] **Push to GitHub**: Đẩy AI comment lên GitHub PR.
- [x] **Comment Selection**: Chọn comment nào muốn push.
- [x] **Push Status Tracking**: Theo dõi comment đã push.
- [x] **Manual Edit Strategy**: Chỉnh sửa nội dung comment trước khi push.

#### 3.2 RAG Enhancement (P1)
- [ ] **Document Library**: Quản lý tài liệu context (persistent).
- [ ] **Project Association**: Gắn tài liệu với dự án.
- [ ] **Smart Chunking**: Chia nhỏ tài liệu lớn, chọn phần liên quan.
- [ ] **Multi-format Support**: MD, TXT, PDF, Code.

#### 3.3 Webhook Auto-Review (P2)
- [ ] **GitLab Webhook**: Tự động review khi có MR mới.
- [ ] **GitHub Webhook**: Tự động review khi có PR mới.
- [ ] **Auto-post Results**: Tự động đăng kết quả lên MR/PR.

> Chi tiết: Xem `IMPLEMENTATION_PLAN_PHASE3.md`

---

## 5. Kiến trúc Kỹ thuật

### 5.1 Tech Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, `react-to-print`.
- **Backend**: Next.js API Routes, `better-sqlite3`.
- **AI**: Vercel AI SDK — **Chỉ dùng Google Gemini Flash**.

### 5.2 Quản lý Source Code
- **Branching Strategy**: Feature branching (`feature/ten-tinh-nang`).

---

## 6. Phụ lục
- **Glossary**:
    - **RAG**: Retrieval-Augmented Generation (AI học từ tài liệu).
    - **Diff**: Sự khác biệt giữa 2 phiên bản code.
    - **Gemini Flash**: Model tĩnh gọn, tối ưu tốc độ và chất lượng cho mọi bài toán review.
