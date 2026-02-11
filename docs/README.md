# AI Code Review

Ứng dụng web review code tự động sử dụng AI, hỗ trợ tích hợp GitLab và nhiều mô hình AI khác nhau.

## Tổng quan

AI Code Review là một ứng dụng Next.js cho phép:
- Review code tự động bằng AI (OpenAI, Ollama local)
- Tích hợp GitLab để fetch Merge Request
- Quét pattern để phát hiện lỗi phổ biến
- Hỗ trợ đa ngôn ngữ (Tiếng Anh, Tiếng Việt)
- Upload tài liệu context (PDF, Word, Excel)

## Công nghệ sử dụng

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| Next.js | 16.1.6 | Framework React fullstack |
| React | 19.2.3 | UI Library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | - | Component library |
| NextAuth | 5.0 beta | Authentication |
| AI SDK | 6.x | Tích hợp AI providers |
| better-sqlite3 | 12.x | Database local |
| Ollama | - | Local AI models |

## Cấu trúc thư mục

```
ai-code-review/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── auth/           # Authentication APIs
│   │   │   ├── review/         # AI Review API
│   │   │   ├── reviews/        # CRUD Reviews
│   │   │   ├── gitlab/         # GitLab integration
│   │   │   └── documents/      # Document upload
│   │   ├── dashboard/          # Dashboard pages
│   │   │   ├── reviews/        # Review list & detail
│   │   │   └── settings/       # AI settings
│   │   └── login/              # Login page
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── dashboard/          # Dashboard components
│   │   └── settings/           # Settings components
│   ├── lib/                    # Utilities
│   │   ├── gitlab-service.ts   # GitLab API client
│   │   ├── pattern-scanner.ts  # Code pattern detection
│   │   ├── review-store.ts     # SQLite storage
│   │   └── document-parser.ts  # PDF/Word parser
│   └── types/                  # TypeScript types
├── docs/                       # Documentation
├── scripts/                    # Utility scripts
└── public/                     # Static assets
```

## Cài đặt

### Yêu cầu
- Node.js 20+
- pnpm hoặc npm
- Ollama (optional, cho local AI)

### Bước 1: Clone repository
```bash
git clone https://github.com/thongpham95/ai-code-review.git
cd ai-code-review
```

### Bước 2: Cài đặt dependencies
```bash
npm install
```

### Bước 3: Cấu hình environment
```bash
cp .env.example .env.local
```

Chỉnh sửa `.env.local`:
```env
# NextAuth
AUTH_SECRET=your-secret-key

# GitHub OAuth (optional)
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret

# GitLab OAuth (optional)
AUTH_GITLAB_ID=your-gitlab-client-id
AUTH_GITLAB_SECRET=your-gitlab-client-secret

# OpenAI (optional)
OPENAI_API_KEY=your-openai-api-key
```

### Bước 4: Chạy development server
```bash
npm run dev
```

Truy cập http://localhost:3000

## Sử dụng

### 1. Đăng nhập
- **GitHub/GitLab OAuth**: Click nút đăng nhập tương ứng
- **GitLab Self-Hosted**: Nhập URL instance và Personal Access Token

### 2. Tạo Review mới
- **Paste Code**: Dán trực tiếp code cần review
- **GitLab MR URL**: Nhập URL Merge Request để tự động fetch diff

### 3. Chạy AI Review
- Chọn ngôn ngữ output (EN/VI)
- Click "Run AI Review"
- Xem kết quả với code snippet và đề xuất sửa

### 4. Cấu hình AI
- Vào Settings > AI Configuration
- Chọn Cloud (OpenAI) hoặc Local (Ollama)
- Test connection trước khi sử dụng

## Docker

### Build và chạy
```bash
# Build image
docker build -t ai-code-review .

# Chạy container
docker run -p 3000:3000 ai-code-review
```

### Docker Compose
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/pat-login` | Đăng nhập GitLab PAT |
| DELETE | `/api/auth/pat-login` | Đăng xuất PAT |
| GET | `/api/auth/session-info` | Lấy thông tin session |
| GET | `/api/reviews` | Danh sách reviews |
| GET | `/api/reviews/[id]` | Chi tiết review |
| POST | `/api/reviews/start` | Tạo review mới |
| POST | `/api/review/analyze` | Chạy AI analysis |
| POST | `/api/gitlab/fetch-mr` | Fetch GitLab MR |
| POST | `/api/documents/upload` | Upload tài liệu context |

## Tính năng

### Đã hoàn thành
- [x] Đăng nhập GitHub/GitLab OAuth
- [x] Đăng nhập GitLab Self-Hosted (PAT)
- [x] Tạo review từ code paste
- [x] Fetch GitLab Merge Request
- [x] AI Review với OpenAI
- [x] AI Review với Ollama local
- [x] Pattern Scanner
- [x] Chọn ngôn ngữ output (EN/VI)
- [x] Quick Summary banner
- [x] Review theo từng file với code snippet
- [x] Upload tài liệu context (PDF, Word, Excel)
- [x] Responsive UI

### Đang phát triển
- [ ] GitHub PR integration
- [ ] Inline code comments
- [ ] Export report (PDF, Markdown)
- [ ] Team collaboration

## License

MIT License - Xem file [LICENSE](../LICENSE) để biết thêm chi tiết.

## Tác giả

- **thongpham95** - [GitHub](https://github.com/thongpham95)
