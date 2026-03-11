# AI Code Review

[![Docker Image](https://img.shields.io/badge/Docker-thongphm%2Fai--codereview-blue)](https://hub.docker.com/r/thongphm/ai-codereview)
[![Version](https://img.shields.io/badge/version-1.0.5-green)](https://github.com/thongpham95/ai-code-review/releases)

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

### Development

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

### Docker (Local)

```bash
# Build và chạy local
docker-compose up -d

# Hoặc build manual
docker build -t ai-codereview .
docker run -p 3000:3000 ai-codereview
```

## Production Deployment

### Option 1: Docker Hub (Recommended)

Image có sẵn trên Docker Hub: `thongphm/ai-codereview:latest`

```bash
# Pull image
docker pull thongphm/ai-codereview:latest

# Tạo file .env với các secrets
cat > .env << EOF
AUTH_SECRET=your-secret-key-here
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
AUTH_URL=https://your-domain.com
EOF

# Chạy với docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Build từ Source

```bash
# Build image cho linux/amd64 (cho AWS/server x86)
docker buildx build --platform linux/amd64 -t your-username/ai-codereview:latest --push .

# Hoặc sử dụng GitHub Actions (tự động build khi push lên main)
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | Secret key cho NextAuth session |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Google Gemini API key |
| `AUTH_URL` | Yes (prod) | URL của app (https://your-domain.com) |
| `AUTH_GITHUB_ID` | No | GitHub OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | No | GitHub OAuth App Client Secret |
| `AUTH_GITLAB_ID` | No | GitLab OAuth App ID |
| `AUTH_GITLAB_SECRET` | No | GitLab OAuth App Secret |
| `OPENAI_API_KEY` | No | OpenAI API key (alternative) |

### Deploy lên AWS/Server

1. SSH vào server
2. Tạo file `.env` với các secrets
3. Download `docker-compose.prod.yml`:
   ```bash
   curl -O https://raw.githubusercontent.com/thongpham95/ai-code-review/main/docker-compose.prod.yml
   ```
4. Chạy:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Update lên version mới

```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## CI/CD

Project sử dụng GitHub Actions để tự động build và push Docker image:

- **Trigger**: Push lên `main` branch hoặc tạo tag `v*`
- **Output**: `thongphm/ai-codereview:latest` và version tags
- **Platform**: `linux/amd64`

Xem workflow tại [.github/workflows/docker-build.yml](.github/workflows/docker-build.yml)

## Documentation

Xem chi tiết tại folder [docs/](docs/):

- [README.md](docs/README.md) - Hướng dẫn chi tiết
- [PRD.md](docs/PRD.md) - Product Requirements Document
- [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) - Kế hoạch triển khai
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Hướng dẫn deploy production
- [TEST_PLAN.md](docs/TEST_PLAN.md) - Kế hoạch kiểm thử

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
| SQLite | better-sqlite3 |
| Docker | Multi-stage build |

## Changelog

### v1.0.5 (Current)
- Updated legacy VS Code extension documentation
- Improved README with complete feature documentation

### v1.0.4
- Add GitLab permission check: Only users with merge access can push AI comments
- Show permission status in Push Comments dialog (checking/allowed/denied)
- Backend protection: 403 error if user lacks merge permission

### v1.0.3
- Fix GitLab push comments fallback when line not in diff
- Comments now post as general notes with file/line context when line-specific fails

### v1.0.2
- Fix GitLab self-hosted push comments (line_code calculation)
- Fix AUTH_TRUST_HOST for production deployment
- Fix SQLite database path for Docker volumes
- Add GitHub Actions CI/CD

### v1.0.1
- Initial Docker Hub release
- Production-ready Docker image

### Phase 4 Features
- Loại bỏ hoàn toàn Pattern Scanner — tập trung 100% AI review
- Thêm Custom Review Rules / Focus Area khi tạo review
- Hiển thị Quick Summary (1-3 dòng) trên danh sách reviews
- Thêm panel "Files có vấn đề" với quick navigation links
- 1-Click Copy Fix tích hợp trong AI suggestions
- Lưu quickSummary vào DB để hiển thị nhanh trong danh sách

## License

MIT
