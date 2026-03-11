# 🚀 Hướng dẫn Triển khai (Deploy) - AI Code Review (Phase 4)

## Docker Hub

**Tên Image**: `thongphm/ai-codereview`
**Thẻ (Tags)**:
- `latest` - Phiên bản mới nhất (Phase 4)
- `phase4` - Phiên bản Phase 4 cố định

**Docker Hub URL**: https://hub.docker.com/r/thongphm/ai-codereview

---

## Triển khai Nhanh (Khuyên dùng)

### Cách 1: Chạy trực tiếp Docker (Đơn giản nhất)

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

### Cách 2: Sử dụng Docker Compose (Khuyên dùng cho production)

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
      # GitHub OAuth (Tùy chọn)
      - AUTH_GITHUB_ID=${AUTH_GITHUB_ID}
      - AUTH_GITHUB_SECRET=${AUTH_GITHUB_SECRET}
      # GitLab OAuth (Tùy chọn)
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

**Bước 3**: Chạy lệnh:

```bash
docker-compose up -d
```

**Kiểm tra logs**:

```bash
docker-compose logs -f app
```

**Dừng server**:

```bash
docker-compose down
```

---

## Giải thích Biến Môi Trường (Environment Variables)

### Bắt buộc

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `AUTH_SECRET` | Secret key cho NextAuth (tối thiểu 32 ký tự) | `openssl rand -base64 32` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key của Google Gemini | Lấy tại: https://aistudio.google.com/apikey |

### Tùy chọn (OAuth)

| Biến | Mô tả |
|------|-------|
| `AUTH_GITHUB_ID` | Client ID mặc định của GitHub OAuth App |
| `AUTH_GITHUB_SECRET` | Client Secret của GitHub OAuth App |
| `AUTH_GITLAB_ID` | Client ID của GitLab OAuth App |
| `AUTH_GITLAB_SECRET` | Client Secret của GitLab OAuth App |

---

## Triển khai trên Môi trường Đám Máy (Cloud)

### Triển khai trên Railway

```bash
# 1. Cài đặt Railway CLI
npm install -g @railway/cli

# 2. Đăng nhập
railway login

# 3. Triển khai
railway up
```

### Triển khai trên Render

1. Tạo một "Web Service" dự án mới
2. Chọn loại "Docker"
3. Nhập đường dẫn image: `thongphm/ai-codereview:latest`
4. Cấu hình Port: `3000`
5. Thêm các Biến Môi Trường (như bảng trên)
6. Triển khai

### Triển khai trên AWS ECS / Google Cloud Run / Azure Container Apps

Chỉ cần sử dụng nguyên container image gốc: **`thongphm/ai-codereview:latest`**

---

## Gỡ Lỗi (Troubleshooting)

### Docker/Container không lên

```bash
# Xem logs
docker logs ai-code-review

# Hoặc bằng docker-compose
docker-compose logs app
```

### Xung đột Port (Port 3000 bị chiếm)

Thay đổi ánh xạ port cho docker:

```bash
# Ví dụ: chạy trên port 8080
docker run -p 8080:3000 thongphm/ai-codereview:latest
```

### Cơ sở dữ liệu (Database) không lưu trữ lâu dài

Đảm bảo volume được cung cấp mount chính xác vào thư mục dữ liệu quy định:

```bash
docker volume ls | grep ai-code-review
```

---

## Kiểm tra Sức Khỏe Dịch vụ (Health Check)

Kiểm tra app đang chạy bình thường chưa:

```bash
curl http://localhost:3000/
```

Nếu thành công sẽ trả về trạng thái HTTP 200.

---

## Sao Lưu và Phục Hồi Cơ Sở Dữ Liệu (Backup & Restore Database)

### Sao lưu (Backup)

```bash
# Lấy file SQLite database từ container ra thư mục hiện tại
docker cp ai-code-review:/app/data/reviews.db ./backup.db
```

### Phục hồi (Restore)

```bash
# Đẩy database trả lại vào container
docker cp ./backup.db ai-code-review:/app/data/reviews.db
docker restart ai-code-review
```

---

## Cập Nhật Lên Phiên Bản Mới Nhất

```bash
# Kéo image mới nhất từ mạng
docker pull thongphm/ai-codereview:latest

# Khởi động lại container (có sử dụng docker-compose)
docker-compose down
docker-compose up -d

# Hoặc cập nhật trên docker run thường thuần túy
docker stop ai-code-review
docker rm ai-code-review
# Chạy lại lệnh docker run như bình thường ban đầu
```

---

## Hỗ trợ Kỹ thuật

- **GitHub Issues**: https://github.com/thongpham95/ai-code-review/issues
- **Tài liệu tham khảo (Documentation)**: Xem thư mục `docs/`

---

## Tính năng Chính ở Phase 4

✨ **100% Phân tích dựa trên AI (AI-Powered Review)** - Loại bỏ trình scan dựa theo biểu thức khuôn mẫu cũ
✨ **Quy tắc Tự chỉnh (Custom Review Rules)** - Nhập khu vực đặc biệt cần chú ý khi tạo review
✨ **Tóm tắt Nhanh (Quick Summary)** - Tóm lược cực mạnh 1-3 dòng gọn nhẹ ngoài dashboard
✨ **Điều hướng Tập tin Lỗi Nhanh** - Đi thẳng đến các tệp mã nguồn đáng ngờ dễ dàng
✨ **1 Chạm Copy Fix** - Hỗ trợ sao lưu ngay các đoạn chỉnh sửa nhanh mà AI kiến nghị
✨ **Đa ngôn ngữ AI** - Cung cấp định dạng kết quả tiếng Anh & Tiếng Việt

---

**Built with ❤️ by @thongpham95**
