# AI Code Review Extension

[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-blue)](https://code.visualstudio.com/)
[![Version](https://img.shields.io/badge/version-0.1.0-green)](https://github.com/thongpham95/ai-code-review)

Trợ lý Review Code Tự Động cho VS Code, tích hợp sức mạnh của OpenAI, Gemini, Claude và Ollama.
Mô phỏng vai trò của một Senior Technical Lead để review code, lập kế hoạch review, tìm lỗi (bugs) và đăng nhận xét (comments) lên GitLab MR / GitHub PR.

> **Note**: Đây là phiên bản VS Code Extension (legacy). Phiên bản Web App mới hơn có tại [AI Code Review Web](https://github.com/thongpham95/ai-code-review).

## 🚀 Tính Năng Chính

### 1. Hỗ Trợ Đa LLM (Multi-LLM)
| Provider | Models | Mô tả |
|----------|--------|-------|
| **OpenAI** | GPT-4o, GPT-4 Turbo | API key required |
| **Google** | Gemini 1.5 Pro | API key required |
| **Anthropic** | Claude 3.5 Sonnet | API key required |
| **Ollama** | qwen2.5-coder, llama3, etc. | Local LLM - tự động cài đặt |

### 2. Quy Trình Human-in-the-Loop
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   Quét      │───▶│ REVIEW_PLAN  │───▶│   AI        │───▶│REVIEW_RESULT │
│  Workspace  │    │    .md       │    │  Review     │    │    .md       │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
       │                  │                   │                   │
       │                  ▼                   │                   ▼
       │           [User duyệt]              │            [User duyệt]
       │                                      │                   │
       └──────────────────────────────────────┴───────────────────┘
                                                                  │
                                                                  ▼
                                                        ┌──────────────┐
                                                        │  Push lên    │
                                                        │  GitLab/     │
                                                        │  GitHub      │
                                                        └──────────────┘
```

- **Kế Hoạch Review (Review Plan)**: Extension phân tích workspace/diff và đề xuất `REVIEW_PLAN.md`. Bạn cần duyệt kế hoạch này trước khi quá trình review bắt đầu.
- **Kết Quả Review (Review Result)**: Các comment được ghi vào file `REVIEW_RESULT.md` trước tiên. Bạn có thể chỉnh sửa/xóa chúng trước khi xuất bản.
- **Tự Kiểm Tra (Self-Audit)**: AI tự động kiểm tra lại các comment của chính mình để loại bỏ các nhận xét sáo rỗng (noise) trước khi hiển thị cho bạn.

### 3. Tích Hợp SCM (Source Control Management)
- **GitLab**: Hỗ trợ cả GitLab.com (SaaS) và Self-Managed GitLab
- **GitHub**: Kết nối qua GitHub OAuth
- **Xuất Bản Comment**: Đẩy các comment đã được duyệt từ `REVIEW_RESULT.md` trực tiếp lên thảo luận của Merge Request hoặc Pull Request

### 4. Tạo Mô Tả PR (PR Description Generator)
- Tự động tạo file `PR_DESCRIPTION.md` chuyên nghiệp dựa trên các thay đổi trong code
- Hỗ trợ tạo từ URL MR/PR hoặc từ thay đổi local trong workspace

### 5. Giao Diện GUI
- **Activity Bar Panel**: Icon trong sidebar VS Code để truy cập nhanh
- **Status Bar**: Hiển thị trạng thái review và người dùng đã đăng nhập
- **Webview UI**: Giao diện trực quan để quản lý quy trình review

## 📦 Cài Đặt

Extension này được đóng gói dưới dạng file `.vsix`.

1. Tải file `ai-code-review-0.1.0.vsix`
2. Mở VS Code
3. Vào tab Extensions (`Ctrl+Shift+X`)
4. Bấm vào dấu `...` (Views and More Actions) > **Install from VSIX...**
5. Chọn file vừa tải về

## 🛠 Hướng Dẫn Sử Dụng

### Bước 0: Đăng nhập SCM (Tùy chọn)

1. Chạy lệnh **"AI Review: Đăng nhập GitLab"** hoặc **"AI Review: Đăng nhập GitHub"**
2. Đối với GitLab:
   - Chọn **"GitLab.com (SaaS)"** nếu dùng bản cloud
   - Chọn **"Self-Managed GitLab"** nếu dùng server riêng (nhập URL của bạn)
3. Nhập Personal Access Token (PAT) khi được hỏi

### Bước 1: Cấu Hình LLM

1. Mở Command Palette (`Ctrl+Shift+P`)
2. Chạy lệnh **"AI Review: Cấu hình LLM"**
3. Chọn nhà cung cấp:
   - **OpenAI**: Nhập API Key (sk-...)
   - **Gemini**: Nhập API Key
   - **Claude**: Nhập API Key
   - **Ollama**: Extension sẽ tự động kiểm tra và hỗ trợ cài đặt nếu chưa có

### Bước 2: Phân Tích & Lập Kế Hoạch

| Lệnh | Mô tả |
|------|-------|
| **"AI Review: Quét & Phân tích Workspace"** | Review các file nội bộ trong workspace |
| **"AI Review: Review từ URL"** | Review từ GitLab MR / GitHub PR URL |

Sau khi chạy, file `REVIEW_PLAN.md` sẽ được tạo ra. Hãy đọc và kiểm tra nó.

### Bước 3: Thực Thi Review

1. Chạy lệnh **"AI Review: Duyệt Kế Hoạch & Bắt đầu Review"**
2. Chọn chế độ:
   - **Diff Mode**: Chỉ review các thay đổi (diffs)
   - **Full Audit**: Review toàn bộ file quan trọng
3. Chờ AI thực hiện review
4. Kết quả sẽ được lưu vào file `REVIEW_RESULT.md`

### Bước 4: Xuất Bản (Publish)

1. Xem xét file `REVIEW_RESULT.md`
2. Chỉnh sửa hoặc xóa các comment không phù hợp
3. Chạy lệnh **"AI Review: Duyệt & Đẩy Comment lên SCM"**
4. Xác nhận để đẩy các comment lên MR/PR của bạn

### Phụ: Các Lệnh Khác

| Lệnh | Mô tả |
|------|-------|
| **"AI Review: Tạo Mô Tả PR/MR"** | Tự động tạo PR description chuyên nghiệp |
| **"AI Review: Dừng Review & Giải phóng Ollama"** | Dừng quy trình và giải phóng RAM/GPU |

## ⚙️ Cấu Hình

Các settings có thể chỉnh trong VS Code Settings:

| Setting | Default | Mô tả |
|---------|---------|-------|
| `aiCodeReview.llmProvider` | `openai` | LLM provider (openai/gemini/claude/ollama) |
| `aiCodeReview.llmApiKey` | `` | API Key (dự phòng) |
| `aiCodeReview.llmModel` | `` | Model cụ thể (để trống = mặc định) |
| `aiCodeReview.ollamaEndpoint` | `http://localhost:11434` | Endpoint cho Ollama |
| `aiCodeReview.reviewLanguage` | `vi` | Ngôn ngữ review (vi/en) |
| `aiCodeReview.gitlabHost` | `https://gitlab.com` | GitLab host URL |

## 🔧 Yêu Cầu Hệ Thống

- VS Code 1.85 trở lên
- Kết nối Internet (nếu dùng Cloud LLMs)
- RAM 16GB+ (khuyến nghị nếu dùng Local LLM/Ollama)

## 📁 Cấu Trúc Project

```
legacy_extension/
├── src/
│   ├── extension.ts          # Entry point
│   ├── auth/
│   │   └── authService.ts    # GitHub/GitLab authentication
│   ├── llm/
│   │   ├── llmService.ts     # Multi-LLM abstraction
│   │   └── ollamaSetup.ts    # Ollama auto-setup
│   ├── scanner/
│   │   └── scanner.ts        # Workspace/URL scanner
│   ├── review/
│   │   ├── reviewEngine.ts   # Core review logic
│   │   ├── reviewResultManager.ts
│   │   ├── scmPublisher.ts   # Push to GitLab/GitHub
│   │   └── prDescriptionGenerator.ts
│   └── ui/
│       ├── statusBar.ts      # Status bar management
│       └── mainViewProvider.ts # Webview GUI
├── resources/
│   └── icon.svg              # Activity bar icon
├── package.json              # Extension manifest
└── README.md                 # This file
```

## 📝 Các File Output

| File | Mô tả |
|------|-------|
| `REVIEW_PLAN.md` | Kế hoạch review do AI đề xuất |
| `REVIEW_RESULT.md` | Kết quả review với các comments |
| `PR_DESCRIPTION.md` | Mô tả PR/MR được tạo tự động |

## 🔄 Liên Quan

- **Web App Version**: [thongphm/ai-codereview](https://hub.docker.com/r/thongphm/ai-codereview) - Phiên bản web app với giao diện đẹp hơn, hỗ trợ nhiều MR/PR cùng lúc
- **Docker Image**: `docker pull thongphm/ai-codereview:latest`

## 📄 Giấy Phép

MIT
