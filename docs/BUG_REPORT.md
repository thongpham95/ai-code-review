# Báo Cáo Lỗi (Bug Report)

## Trạng Thái
ĐÃ CẬP NHẬT SỬA LỖI - CHỜ XÁC NHẬN

## Tiêu Đề Lỗi
Auth UntrustedHost và SQLite SQLITE_CANTOPEN errors khi deploy lên AWS

## Mô tả Lỗi
Sau khi deploy Docker container lên AWS với domain `aicodereview.paydaes.tvtgroup.io`, app gặp 2 lỗi:
1. NextAuth không tin tưởng host, chặn tất cả auth requests.
2. SQLite không thể mở file database do vấn đề phân quyền.

## Các Bước Tái Hiện
1. Build Docker image với `docker buildx build --platform linux/amd64`
2. Push lên Docker Hub
3. Deploy trên AWS với `docker-compose -f docker-compose.prod.yml up -d`
4. Truy cập `https://aicodereview.paydaes.tvtgroup.io`

## Kết quả Thực tế
- Các yêu cầu Auth bị từ chối với lỗi: `UntrustedHost: Host must be trusted`
- Các thao tác Database thất bại với lỗi: `SqliteError: unable to open database file (SQLITE_CANTOPEN)`

## Kết quả Mong đợi
- Auth hoạt động bình thường với domain production.
- Database có thể đọc/ghi bình thường.

## Bối cảnh (Context)
- **Thông báo lỗi**:
  - `[auth][error] UntrustedHost: Host must be trusted. URL was: https://aicodereview.paydaes.tvtgroup.io/api/auth/session`
  - `SqliteError: unable to open database file { code: 'SQLITE_CANTOPEN' }`
- **Môi trường**: AWS, Docker, Next.js 16.1.6, NextAuth v5

---

## Phân tích Nguyên nhân Cốt lõi (Root Cause Analysis)

### Lỗi 1: UntrustedHost

```
Luồng Yêu cầu (Request Flow):
+------------------------------------------------------------------+
| Client -> Reverse Proxy -> Docker Container (port 3000)          |
|                                                                   |
| Host header: aicodereview.paydaes.tvtgroup.io                    |
|                     |                                             |
| NextAuth kiểm tra: Host này có đáng tin? -> KHÔNG (mặc định)     |
|                     |                                             |
| TỪ CHỐI với lỗi UntrustedHost                                    |
+------------------------------------------------------------------+
```

**File**: `src/auth.ts:5-31`

NextAuth v5 mặc định KHÔNG tin tưởng bất kỳ host nào trong production để bảo vệ chống tấn công CSRF. Cần phải kích hoạt rõ ràng `trustHost: true` trong cấu hình.

### Lỗi 2: SQLite CANTOPEN Error

```
Sai đường dẫn (Path Mismatch):
+------------------------------------------------------------------+
| Code mong đợi:    /app/reviews.db  (process.cwd() = /app)        |
| Volume mounts:    /app/data  (app-data volume)                   |
| Quyền của User:   nextjs CHỈ CÓ THỂ ghi vào /app/data            |
|                                                                   |
| Kết quả: Không thể tạo /app/reviews.db -> SQLITE_CANTOPEN        |
+------------------------------------------------------------------+
```

**File**: `src/lib/review-store.ts:25`
```typescript
const DB_PATH = path.join(process.cwd(), "reviews.db");  // = /app/reviews.db
```

**File**: `Dockerfile:67`
```dockerfile
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data  # Chỉ /app/data có quyền ghi
```

**File**: `docker-compose.prod.yml:24`
```yaml
volumes:
  - app-data:/app/data  # Mount vào /app/data, không phải /app
```

Database path `/app/reviews.db` không nằm trong phần volume mount `/app/data`, và user `nextjs` không có quyền ghi vào `/app`.

---

## Phương án Khắc phục (Proposed Fixes)

### Fix 1: UntrustedHost (Khuyên dùng)

**Cách A: Thêm `trustHost: true` trong auth.ts**
```typescript
// src/auth.ts
export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,  // <- Thêm dòng này
    providers: [...],
})
```

**Cách B: Thiết lập biến môi trường**
```yaml
# docker-compose.prod.yml
environment:
  - AUTH_TRUST_HOST=true
```

-> **Khuyên chọn Cách A** vì nó tường minh trong code và không phụ thuộc vào cấu hình biến môi trường.

### Fix 2: SQLite Path (Khuyên dùng)

**Sửa đường dẫn database để sử dụng thư mục /app/data:**
```typescript
// src/lib/review-store.ts
const DB_PATH = path.join(process.cwd(), "data", "reviews.db");  // = /app/data/reviews.db
```

Điều này đảm bảo file database nằm trong:
- Khối volume đã ánh xạ (`app-data:/app/data`) -> giữ nguyên dữ liệu khi container khởi động lại.
- Thư mục có quyền ghi cho user `nextjs`.

---

## Kế hoạch Kiểm thử (Verification Plan)

### Các bước kiểm tra thủ công
1. Rebuild Docker image sau khi fix
2. Push lên Docker Hub
3. Redeploy lại trên AWS
4. Kiểm chứng:
   - Auth: Truy cập dashboard, không còn lỗi UntrustedHost
   - Database: Tạo review mới, không còn lỗi SQLITE_CANTOPEN
   - Dữ liệu duy trì: Khởi động lại container, dữ liệu vẫn còn

### Câu lệnh thao tác
```bash
# Rebuild và push
docker buildx build --platform linux/amd64 -t thongphm/ai-codereview:latest --push .

# Trên Server AWS
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## Đã Áp Dụng Khắc Phục (Fix Applied)

### Các File Bị Thay Đổi

1. **src/auth.ts** - Đã thêm `trustHost: true` vào cấu hình NextAuth
   ```typescript
   export const { handlers, signIn, signOut, auth } = NextAuth({
       trustHost: true,  // <- ADDED
       providers: [...]
   })
   ```

2. **src/lib/review-store.ts:25** - Thay đổi đường dẫn database
   ```typescript
   // Trước đây:
   const DB_PATH = path.join(process.cwd(), "reviews.db");

   // Sau khi sửa:
   const DB_PATH = path.join(process.cwd(), "data", "reviews.db");
   ```

### Kết quả Kiểm thử
- Local tests: Bỏ qua (yêu cầu Docker deployment để kiểm chứng)
- Cần rebuild Docker image và deploy lên AWS để kiểm tra thực tế.

### Bước Tiếp Theo
1. Mở Docker Desktop
2. Chạy: `docker buildx build --platform linux/amd64 -t thongphm/ai-codereview:latest --push .`
3. Trên AWS: `docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml pull && docker-compose -f docker-compose.prod.yml up -d`
4. Xác minh lỗi đã được giải quyết
