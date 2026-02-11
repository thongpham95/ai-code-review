# AI Code Review

Ứng dụng web review code tự động sử dụng AI, hỗ trợ tích hợp GitLab và nhiều mô hình AI khác nhau.

## Tính năng chính

- **Authentication**: GitHub OAuth, GitLab OAuth, GitLab Self-Hosted (PAT)
- **AI Review**: OpenAI (Cloud) và Ollama (Local)
- **GitLab Integration**: Fetch Merge Request tự động
- **Pattern Scanner**: Phát hiện lỗi phổ biến
- **Đa ngôn ngữ**: Hỗ trợ Tiếng Anh và Tiếng Việt
- **Context Documents**: Upload PDF, Word, Excel làm context

## Quick Start

```bash
# Clone repository
git clone https://github.com/thongpham95/ai-code-review.git
cd ai-code-review

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your secrets

# Run development server
npm run dev
```

Truy cập http://localhost:3000

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

## License

MIT
