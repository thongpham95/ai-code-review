# AI Code Review

Ứng dụng web review code tự động sử dụng AI (Google Gemini Flash), hỗ trợ tích hợp GitLab và GitHub.

## Tính năng chính

- **100% AI-Powered Review**: Tập trung hoàn toàn vào đánh giá sâu của Google Gemini Flash — không còn sử dụng pattern scanner tĩnh.
- **Custom Review Rules**: Người dùng có thể nhập trọng tâm review cụ thể (ví dụ: "Tập trung bắt lỗi bảo mật", "Kiểm tra chuẩn code React") — AI sẽ tuân theo.
- **Quick Summary**: Mỗi review trong danh sách hiển thị 1-3 dòng tóm tắt nhanh từ AI, giúp nắm bắt tổng quan ngay lập tức.
- **Problematic Files Navigation**: Sau khi AI review xong, panel "Files có vấn đề" hiển thị trên đầu trang — click để nhảy thẳng tới file cần chú ý.
- **1-Click Copy Fix**: Nút copy code đã sửa tích hợp sẵn trong mỗi issue mà AI phát hiện.
- **GitLab & GitHub Integration**: Lấy thông tin từ **nhiều MR/PR cùng lúc**, Push AI Comments trực tiếp lên GitLab/GitHub.
- **1-Click Review**: Tự động chạy AI Review ngay sau khi tạo review — không cần bước trung gian.
- **Authentication**: GitHub OAuth, GitLab OAuth, GitLab Self-Hosted (PAT).
- **Manual Review Control**: Chỉnh sửa, từ chối hoặc cập nhật comment của AI trước khi push.
- **Đa ngôn ngữ AI**: Chọn ngôn ngữ đầu ra AI (English/Tiếng Việt) trực tiếp trên giao diện.
- **Context Documents**: Upload PDF, Word, Excel làm context cho AI hiểu nghiệp vụ.
- **Streamlined UI**: Hỗ trợ bulk-delete review, dark mode và diff view trực quan.

## Quick Start

```bash
# Clone repository
git clone https://github.com/thongpham95/ai-code-review.git
cd ai-code-review

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your secrets (GOOGLE_GENERATIVE_AI_API_KEY, etc.)

# Run development server
npm run dev
```

Truy cập http://localhost:3001

## Docker

```bash
# Build và chạy
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Documentation

Xem chi tiết tại folder [docs/](docs/):

- [README.md](docs/README.md) - Hướng dẫn chi tiết
- [PRD.md](docs/PRD.md) - Product Requirements Document
- [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) - Kế hoạch triển khai
- [TEST_PLAN.md](docs/TEST_PLAN.md) - Kế hoạch kiểm thử
- [BUG_REPORT.md](docs/BUG_REPORT.md) - Lịch sử lỗi

## Tech Stack

| Công nghệ | Phiên bản |
|-----------|-----------|
| Next.js | 16.1.6 |
| React | 19.2.3 |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| NextAuth | 5.0 beta |
| AI SDK | 6.x |
| Google Gemini | Flash |

## Changelog (Phase 4)

- ❌ Loại bỏ hoàn toàn Pattern Scanner — tập trung 100% AI review
- ✨ Thêm Custom Review Rules / Focus Area khi tạo review
- 📝 Hiển thị Quick Summary (1-3 dòng) trên danh sách reviews
- 🎯 Thêm panel "Files có vấn đề" với quick navigation links
- 📋 1-Click Copy Fix tích hợp trong AI suggestions
- 💾 Lưu quickSummary vào DB để hiển thị nhanh trong danh sách
- 🗃️ Thêm field `customRules` và `quickSummary` vào schema DB

## License

MIT
