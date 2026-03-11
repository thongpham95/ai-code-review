## Tài liệu Tham khảo Dự án Vibe Builder

### ⛔ KHÔI PHỤC NGỮ CẢNH (CONTEXT OVERFLOW RECOVERY)
**Khi ngữ cảnh bị quá tải hoặc bạn cảm thấy mất phương hướng trong một phiên làm việc dài:**
1. Đọc lại kỹ năng (skill) vibe-builder: `.agent/skills/vibe-builder/SKILL.md`
2. Đọc lại `IMPLEMENTATION_PLAN.md` để kiểm tra tiến độ hiện tại
3. Đọc lại `TEST_PLAN.md` (nếu có) để kiểm tra trạng thái kiểm thử
4. Tuân thủ nghiêm ngặt quy trình làm việc - đặc biệt là các điểm kiểm tra (checkpoints) dưới đây!

### ⚠️ CÁC ĐIỂM KIỂM TRA QUY TRÌNH BAO GỒM BẮT BUỘC (MANDATORY WORKFLOW CHECKPOINTS - KHÔNG ĐƯỢC BỎ QUA!)
| Sau Giai đoạn | Hành động |
| --- | --- |
| Hoàn thành Phase 3 (Lập trình - Coding) | → Tạo TEST_PLAN.md → **⛔ DỪNG LẠI CHỜ NGƯỜI DUYỆT (STOP for Human review)** |
| Phê duyệt Phase 4 (Kế hoạch Kiểm thử - Test Plan) | → Tự động thực thi các test |
| Hoàn thành Phase 5 (Kiểm thử - Testing) | → Báo cáo kết quả → Tiến vào vòng lặp Phase 6 |

**QUAN TRỌNG:** Sau khi hoàn tất TẤT CẢ các tác vụ lập trình (coding tasks), bạn PHẢI:
1. Tạo file TEST_PLAN.md
2. **⛔ DỪNG LẠI và chờ sự phê duyệt của con người**
3. KHÔNG chạy bất kỳ test nào cho đến khi Con người duyệt xong file TEST_PLAN.md!

### Tóm tắt Dự án (Project Summary)
- **Loại Ứng dụng**: Next.js Web App dùng cho AI Code Review
- **Công nghệ (Tech Stack)**: TypeScript + Next.js + Tailwind CSS + Auth.js + SQLite
- **Các tính năng cốt lõi**: Đăng nhập bằng Google Auth (@tvtgroup.io), Theo dõi các lời bình và ý kiến đánh giá (Ẩn và tắt những nội dung Pushed comments), Quản lý và theo dõi truy vết thành viên Review theo danh bạ (User Tracking for Reviews), Nâng cao thẩm định khung giao diện cho hợp với nhóm tay nghề chuyên nghiệp chuẩn mức Developer/Tech Lead
- **Giai đoạn Hiện tại**: Phase 1 (Nghiên cứu - Research)

### Tài liệu Chính (Primary Documentation)
- `PRD.md` - Đầy đủ các yêu cầu sản phẩm
- `IMPLEMENTATION_PLAN.md` - Theo dõi công việc (có các checkbox)
- `TEST_PLAN.md` - Các trường hợp kiểm thử (test cases) và kết quả (dành cho Phase 4)

### Nguyên tắc Lập trình (Coding Guidelines)
- Tuân thủ `IMPLEMENTATION_PLAN.md` theo từng nhiệm vụ đã đề ra
- Sử dụng ngôn ngữ có định dạng Type (typed language) đúng theo những gì được ghi trong PRD.md
- Đánh dấu các nhiệm vụ hoàn thành với ký hiệu `[x]`
- Giữ code ngắn gọn, không thừa thãi và cực kỳ tập trung đúng mục đích
