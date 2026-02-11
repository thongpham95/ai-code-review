# Báo cáo Lỗi

## Lịch sử các lỗi đã phát hiện và sửa

---

## Bug #1: Nút "Connect" GitLab Self-Hosted không hoạt động

### Trạng thái
✅ ĐÃ SỬA

### Mô tả lỗi
Khi sử dụng GitLab Self-Hosted authentication:
- "Test Connection" hoạt động đúng, hiện "Connected! GitLab X.X"
- Click "Connect" không có phản hồi - user vẫn ở trang login
- Không hiện thông báo lỗi

### Các bước tái hiện
1. Vào trang `/login`
2. Nhập GitLab Self-Hosted URL (ví dụ: `https://gitlab.mycompany.com`)
3. Nhập Personal Access Token
4. Click "Test Connection" → Hiện thành công
5. Click "Connect" → Không có gì xảy ra, vẫn ở trang login

### Nguyên nhân
**Redirect loop** do middleware authentication check.

```
User click "Connect"
        ↓
handleSelfHostedLogin() chạy
        ↓
Lưu token vào sessionStorage
window.location.href = "/dashboard"
        ↓
Middleware chặn request
        ↓
isLoggedIn = !!req.auth  →  FALSE (không có NextAuth session)
        ↓
Middleware redirect về "/login"
        ↓
User quay lại trang login (loop!)
```

**Lý do thất bại:**
- `handleSelfHostedLogin()` sử dụng **sessionStorage** để lưu PAT token
- Middleware check `req.auth` yêu cầu **NextAuth session** (cookies)
- PAT auth bypass NextAuth hoàn toàn → không có session cookie
- Middleware thấy `req.auth = null` → redirect về login

### Giải pháp áp dụng
**Option 1: Cookie-based PAT Session**

Files đã thay đổi:

1. **`src/app/api/auth/pat-login/route.ts`** (MỚI)
   - POST: Validate PAT với GitLab API (`/api/v4/user`)
   - Set HTTP-only `gitlab-pat-session` cookie với user info
   - DELETE: Xóa PAT session cookie

2. **`src/app/api/auth/session-info/route.ts`** (MỚI)
   - GET: Trả về session hiện tại (OAuth hoặc PAT)
   - Dùng bởi UserNav để hiện user info

3. **`src/app/login/page.tsx`**
   - Thêm `isConnecting` state cho loading indicator
   - `handleSelfHostedLogin()` gọi `/api/auth/pat-login` API
   - Hiện loading spinner trên nút Connect

4. **`src/middleware.ts`**
   - Check cả `req.auth` (OAuth) VÀ `gitlab-pat-session` cookie (PAT)
   - User với cả 2 loại auth đều có thể vào dashboard

5. **`src/components/dashboard/user-nav.tsx`**
   - Fetch session từ `/api/auth/session-info` API
   - Hiện user info cho cả OAuth và PAT users
   - Logout handle cả 2: OAuth signOut + PAT cookie deletion

### Flow sau khi sửa
```
User click "Connect"
        ↓
POST /api/auth/pat-login (validate PAT với GitLab)
        ↓
Server set HTTP-only cookie: gitlab-pat-session
        ↓
Redirect đến /dashboard
        ↓
Middleware check: req.auth HOẶC gitlab-pat-session cookie
        ↓
Cookie tìm thấy → Cho phép truy cập!
```

---

## Bug #2: Language dropdown và Run AI Review button bị cắt trên mobile

### Trạng thái
✅ ĐÃ SỬA

### Mô tả lỗi
Trên màn hình nhỏ (mobile):
- Language selector dropdown bị ẩn một phần
- Nút "Run AI Review" bị cắt

### Nguyên nhân
- Container padding `p-4 md:p-6` chiếm quá nhiều space
- Controls container thiếu `shrink-0`
- Fixed widths không adapt theo screen size

### Giải pháp
Files đã thay đổi:

**`src/app/dashboard/reviews/[id]/page.tsx`**
- Giảm padding: `p-2 md:p-4 lg:p-6`
- Thêm `shrink-0` vào controls container
- Dropdown width responsive: `w-[70px] md:w-[100px]`
- Rút gọn dropdown labels: "EN" / "VI" thay vì tên đầy đủ
- Button text responsive: "Review" trên mobile, "Run AI Review" trên desktop
- Giảm icon và font sizes trên mobile

---

## Bug #3: Tiếng Việt không hoạt động với Ollama

### Trạng thái
✅ ĐÃ SỬA

### Mô tả lỗi
Khi chọn Vietnamese language, Ollama vẫn trả về response bằng tiếng Anh.

### Nguyên nhân
- Chỉ thêm một dòng instruction "write in Vietnamese" không đủ mạnh
- Local models như Ollama cần TOÀN BỘ prompt bằng tiếng Việt
- Section headers trong prompt vẫn bằng tiếng Anh

### Giải pháp
**`src/app/api/review/analyze/route.ts`**
- Tạo system prompt hoàn toàn riêng biệt cho tiếng Việt
- Tất cả section headers bằng tiếng Việt: "Tóm tắt nhanh", "Các vấn đề phát hiện", etc.
- Thêm instruction mạnh: "QUAN TRỌNG: Viết TOÀN BỘ phản hồi bằng TIẾNG VIỆT"

**`src/app/dashboard/reviews/[id]/page.tsx`**
- Cập nhật `extractQuickSummary()` để handle Vietnamese headers ("Tóm tắt nhanh")

---

## Template báo cáo lỗi mới

```markdown
## Tiêu đề lỗi
[Mô tả ngắn gọn]

### Trạng thái
🔴 ĐANG ĐIỀU TRA | 🟡 ĐANG SỬA | ✅ ĐÃ SỬA

### Mô tả lỗi
[Chi tiết về lỗi]

### Các bước tái hiện
1. ...
2. ...
3. ...

### Kết quả thực tế
[Điều gì xảy ra]

### Kết quả mong đợi
[Điều gì nên xảy ra]

### Nguyên nhân
[Phân tích nguyên nhân gốc]

### Giải pháp
[Mô tả cách sửa]

### Files đã thay đổi
- file1.tsx: [mô tả thay đổi]
- file2.ts: [mô tả thay đổi]

### Kiểm tra
- [ ] Test case 1
- [ ] Test case 2
```
