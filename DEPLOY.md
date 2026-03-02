# 🚀 Hướng dẫn Deploy - AI Code Review (Phase 4)

## Docker Hub

**Image Name**: `thongphm/ai-codereview`
**Tags**:
- `latest` - Phiên bản mới nhất (Phase 4)
- `phase4` - Phiên bản Phase 4 cố định

**Docker Hub URL**: https://hub.docker.com/r/thongphm/ai-codereview

---

## Quick Deploy (Recommended)

### Option 1: Docker Run (Đơn giản nhất)

```bash
docker pull thongphm/ai-codereview:latest

docker run -d \
  --name ai-code-review \
  -p 3000:3000 \
  -e AUTH_SECRET="your-secret-key-here" \
  -e GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key" \
  -e AUTH_GITHUB_ID="your-github-oauth-id" \
  -e AUTH_GITHUB_SECRET="your-github-oauth-secret" \
  -v ai-code-review-data:/app/data \
  --restart unless-stopped \
  thongphm/ai-codereview:latest
```

Sau đó truy cập: **http://localhost:3000**

---

### Option 2: Docker Compose (Khuyên dùng cho production)

**Bước 1**: Tạo file `docker-compose.yml`:

```yaml
services:
  app:
    image: thongphm/ai-codereview:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - AUTH_SECRET=${AUTH_SECRET}
      - GOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY}
      # GitHub OAuth (optional)
      - AUTH_GITHUB_ID=${AUTH_GITHUB_ID}
      - AUTH_GITHUB_SECRET=${AUTH_GITHUB_SECRET}
      # GitLab OAuth (optional)
      - AUTH_GITLAB_ID=${AUTH_GITLAB_ID}
      - AUTH_GITLAB_SECRET=${AUTH_GITLAB_SECRET}
    volumes:
      - app-data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  app-data:
    driver: local
```

**Bước 2**: Tạo file `.env`:

```env
AUTH_SECRET=your-super-secret-key-min-32-chars

# Google Gemini (Bắt buộc)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# GitHub OAuth (Tùy chọn)
AUTH_GITHUB_ID=your-github-oauth-id
AUTH_GITHUB_SECRET=your-github-oauth-secret

# GitLab OAuth (Tùy chọn)
AUTH_GITLAB_ID=your-gitlab-oauth-id
AUTH_GITLAB_SECRET=your-gitlab-oauth-secret
```

**Bước 3**: Chạy:

```bash
docker-compose up -d
```

**Kiểm tra logs**:

```bash
docker-compose logs -f app
```

**Dừng**:

```bash
docker-compose down
```

---

## Environment Variables (Biến môi trường)

### Bắt buộc

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `AUTH_SECRET` | Secret key cho NextAuth (min 32 chars) | `openssl rand -base64 32` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key của Google Gemini | Lấy tại: https://aistudio.google.com/apikey |

### Tùy chọn (OAuth)

| Biến | Mô tả |
|------|-------|
| `AUTH_GITHUB_ID` | GitHub OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `AUTH_GITLAB_ID` | GitLab OAuth App ID |
| `AUTH_GITLAB_SECRET` | GitLab OAuth App Secret |

---

## Deploy trên Cloud

### Deploy trên Railway

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Deploy
railway up
```

### Deploy trên Render

1. Tạo new Web Service
2. Chọn "Docker"
3. Nhập image: `thongphm/ai-codereview:latest`
4. Port: `3000`
5. Thêm Environment Variables (xem bảng trên)
6. Deploy

### Deploy trên AWS ECS / Google Cloud Run / Azure Container Apps

Sử dụng image: **`thongphm/ai-codereview:latest`**

---

## Troubleshooting

### Container không khởi động

```bash
# Xem logs
docker logs ai-code-review

# Hoặc với docker-compose
docker-compose logs app
```

### Port 3000 bị chiếm

Thay đổi port mapping:

```bash
# Ví dụ: chạy trên port 8080
docker run -p 8080:3000 thongphm/ai-codereview:latest
```

### Database không persist

Đảm bảo volume được mount đúng:

```bash
docker volume ls | grep ai-code-review
```

---

## Health Check

Kiểm tra app đang chạy:

```bash
curl http://localhost:3000/
```

Nếu thành công sẽ trả về HTTP 200.

---

## Backup & Restore Database

### Backup

```bash
# Copy SQLite database từ container
docker cp ai-code-review:/app/data/reviews.db ./backup.db
```

### Restore

```bash
# Copy database vào container
docker cp ./backup.db ai-code-review:/app/data/reviews.db
docker restart ai-code-review
```

---

## Update to Latest Version

```bash
# Pull image mới nhất
docker pull thongphm/ai-codereview:latest

# Restart container
docker-compose down
docker-compose up -d

# Hoặc với docker run
docker stop ai-code-review
docker rm ai-code-review
# Chạy lại lệnh docker run ở trên
```

---

## Support

- **GitHub Issues**: https://github.com/thongpham95/ai-code-review/issues
- **Documentation**: Xem folder `docs/`

---

## Phase 4 Features

✨ **100% AI-Powered Review** - Loại bỏ pattern scanner
✨ **Custom Review Rules** - Nhập focus area khi tạo review
✨ **Quick Summary** - Tóm tắt 1-3 dòng trong danh sách
✨ **Problematic Files Navigation** - Quick links tới files có vấn đề
✨ **1-Click Copy Fix** - Copy code đã sửa dễ dàng
✨ **Multi-language AI** - English & Vietnamese output

---

**Built with ❤️ by @thongpham95**
