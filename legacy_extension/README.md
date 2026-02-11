# AI Code Review Extension

Trợ lý Review Code Tự Động cho VS Code, tích hợp sức mạnh của OpenAI, Gemini, Claude và Ollama.
Mô phỏng vai trò của một Senior Technical Lead để review code, lập kế hoạch review, tìm lỗi (bugs) và đăng nhận xét (comments) lên GitLab MR / GitHub PR.

## 🚀 Tính Năng Chính

### 1. Hỗ Trợ Đa LLM (Multi-LLM)
- **OpenAI**: GPT-4o, GPT-4 Turbo
- **Google**: Gemini 1.5 Pro
- **Anthropic**: Claude 3.5 Sonnet
- **Ollama (Local)**: Tự động cài đặt & chạy mô hình cục bộ (ví dụ: qwen2.5-coder) để bảo mật tối đa.

### 2. Quy Trình Human-in-the-Loop (Con người tham gia)
- **Kế Hoạch Review (Review Plan)**: Extension phân tích workspace/diff và đề xuất `REVIEW_PLAN.md`. Bạn cần duyệt kế hoạch này trước khi quá trình review bắt đầu.
- **Kết Quả Review (Review Result)**: Các comment được ghi vào file `REVIEW_RESULT.md` trước tiên. Bạn có thể chỉnh sửa/xóa chúng trước khi xuất bản.
- **Tự Kiểm Tra (Self-Audit)**: AI tự động kiểm tra lại các comment của chính mình để loại bỏ các nhận xét sáo rỗng (noise) trước khi hiển thị cho bạn.

### 3. Tích Hợp SCM (Source Control Management)
- **GitLab & GitHub**: Kết nối bảo mật thông qua Personal Access Tokens.
- **Xuất Bản Comment**: Đẩy các comment đã được duyệt từ `REVIEW_RESULT.md` trực tiếp lên thảo luận của Merge Request hoặc Pull Request.

### 4. Tạo Mô Tả PR (PR Description Generator)
- Tự động tạo file `PR_DESCRIPTION.md` chuyên nghiệp dựa trên các thay đổi trong code của bạn.

## 📦 Cài Đặt

Extension này được đóng gói dưới dạng file `.vsix`.

1.  Tải file `ai-code-review-0.1.0.vsix`.
2.  Mở VS Code.
3.  Vào tab Extensions (`Ctrl+Shift+X`).
4.  Bấm vào dấu `...` (Views and More Actions) > **Install from VSIX...**
5.  Chọn file vừa tải về.

## 🛠 Hướng Dẫn Sử Dụng

### Bước 0: Đăng nhập SCM (Tùy chọn)
1.  Chạy lệnh **"AI Review: Đăng nhập GitLab"** hoặc **"GitHub"**.
2.  Đối với GitLab:
    -   Chọn **"GitLab.com (SaaS)"** nếu dùng bản cloud.
    -   Chọn **"Self-Managed GitLab"** nếu dùng server riêng (nhập URL của bạn).
3.  Nhập Personal Access Token (PAT) khi được hỏi.

### Bước 1: Cấu Hình LLM
1.  Mở Command Palette (`Ctrl+Shift+P`).
2.  Chạy lệnh **"AI Review: Cấu hình LLM"**.
3.  Chọn nhà cung cấp (ví dụ: Ollama).
    - Nếu chọn Ollama, extension sẽ kiểm tra và hỗ trợ cài đặt tự động nếu chưa có.

### Bước 2: Phân Tích & Lập Kế Hoạch
1.  Chạy lệnh **"AI Review: Quét & Phân tích Workspace"** cho các file nội bộ.
    - HOẶC chạy **"AI Review: Review từ URL"** cho GitLab/GitHub MRs.
2.  File `REVIEW_PLAN.md` sẽ được tạo ra. Hãy đọc và kiểm tra nó.

### Bước 3: Thực Thi Review
1.  Chạy lệnh **"AI Review: Duyệt Kế Hoạch & Bắt đầu Review"**.
2.  Chọn chế độ **Diff Mode** (chỉ review thay đổi) hoặc **Full Audit** (toàn bộ file quan trọng).
3.  Chờ AI thực hiện review. Kết quả sẽ được lưu vào file `REVIEW_RESULT.md`.

### Bước 4: Xuất Bản (Publish)
1.  Xem xét file `REVIEW_RESULT.md`.
2.  Chạy lệnh **"AI Review: Duyệt & Đẩy Comment lên SCM"**.
3.  Xác nhận để đẩy các comment lên MR/PR của bạn.

### Phụ: Dừng & Dọn Dẹp
- Chạy lệnh **"AI Review: Dừng Review & Giải phóng Ollama"** để dừng quy trình đang chạy và tắt server Ollama cục bộ nhằm giải phóng RAM.

## 🔧 Yêu Cầu Hệ Thống
- VS Code 1.85 trở lên
- Kết nối Internet (nếu dùng Cloud LLMs)
- RAM 16GB+ (khuyến nghị nếu dùng Local LLM/Ollama)

## 📄 Giấy Phép
MIT
