# Bug Report

## Status
FIX APPLIED - PENDING VERIFICATION

## Bug Title
GitHub và GitLab OAuth login không hoạt động

## Bug Description
Khi click vào nút "Sign in with GitHub" hoặc "Sign in with GitLab.com", không có gì xảy ra hoặc báo lỗi. OAuth login không hoạt động.

## Steps to Reproduce
1. Vào trang `/login`
2. Click "Sign in with GitHub" hoặc "Sign in with GitLab.com"
3. Không được redirect đến OAuth provider

## Actual Result
- Form submit với method GET đến URL sai
- Không redirect đến GitHub/GitLab OAuth page

## Expected Result
- Redirect đến GitHub/GitLab OAuth authorization page
- Sau khi authorize, redirect về app với session

---

## Root Cause Analysis

### Vấn đề 1: GitHub provider không có config

**File:** `src/auth.ts:7`

```typescript
// HIỆN TẠI (sai)
providers: [
    GitHub,  // ← Không có clientId/clientSecret config
    ...
]
```

NextAuth v5 yêu cầu explicit config cho mọi provider.

### Vấn đề 2: Form action sai pattern cho NextAuth v5

**File:** `src/app/login/page.tsx:135-146`

```typescript
// HIỆN TẠI (sai)
<form action="/api/auth/signin/github" method="GET">
```

NextAuth v5:
- Sign-in endpoint yêu cầu **POST** request
- Hoặc sử dụng `signIn()` function từ `next-auth/react`

### Flow Diagram

```
HIỆN TẠI (không hoạt động):
┌─────────────┐    GET     ┌─────────────────────────┐
│ Click Login │ ────────→  │ /api/auth/signin/github │ → 404 hoặc không xử lý
└─────────────┘            └─────────────────────────┘

CẦN SỬA:
┌─────────────┐  signIn()  ┌─────────────────────────┐    redirect    ┌─────────┐
│ Click Login │ ────────→  │ NextAuth handles        │ ────────────→  │ GitHub  │
└─────────────┘            └─────────────────────────┘                └─────────┘
```

## Proposed Fixes

### Fix Option 1: Sử dụng signIn() function (Recommended)

**Files cần thay đổi:**
1. `src/auth.ts` - Thêm config cho GitHub provider
2. `src/app/login/page.tsx` - Sử dụng `signIn()` từ next-auth/react

**Approach:**
```typescript
// auth.ts
GitHub({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
}),

// login/page.tsx
import { signIn } from "next-auth/react"

<Button onClick={() => signIn("github")}>
    Sign in with GitHub
</Button>
```

**Ưu điểm:** Đúng cách sử dụng NextAuth v5, handle CSRF tự động

### Fix Option 2: Sử dụng Server Action

Tạo server action để gọi signIn từ server-side.

**Ưu điểm:** Không cần SessionProvider wrap
**Nhược điểm:** Phức tạp hơn

## Verification Plan

### Manual Testing
1. Click "Sign in with GitHub" → Redirect đến GitHub OAuth
2. Authorize → Redirect về app với session
3. Click "Sign in with GitLab.com" → Redirect đến GitLab OAuth
4. User info hiện trong dropdown menu

### Edge Cases
- Nếu không có env vars → Hiện message rõ ràng
- Cancel OAuth → Quay về login page

---

## Fix Applied

### Files Changed

1. **`src/auth.ts`**
   - Thêm explicit config cho GitHub provider với `clientId` và `clientSecret`

2. **`src/app/login/page.tsx`**
   - Import `signIn` từ `next-auth/react`
   - Thay `<form action="...">` bằng `<Button onClick={() => signIn("github/gitlab")}>`
   - Thêm `callbackUrl: "/dashboard"` để redirect sau khi login

### Test Results
- TypeScript compilation: ✅ PASS
- Cần user verify OAuth flow với GitHub/GitLab credentials

### Lưu ý
Để OAuth hoạt động, bạn cần cấu hình trong `.env.local`:
```env
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret
AUTH_GITLAB_ID=your-gitlab-client-id
AUTH_GITLAB_SECRET=your-gitlab-client-secret
```
