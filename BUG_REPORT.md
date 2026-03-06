# Bug Report

## Status
FIX IMPLEMENTED - PENDING VERIFICATION

## Bug Title
Auth UntrustedHost va SQLite CANTOPEN errors khi deploy len AWS

## Bug Description
Sau khi deploy Docker container len AWS voi domain `aicodereview.paydaes.tvtgroup.io`, app gap 2 loi:
1. NextAuth khong tin tuong host, chan tat ca auth requests
2. SQLite khong the mo database file do permission issues

## Steps to Reproduce
1. Build Docker image voi `docker buildx build --platform linux/amd64`
2. Push len Docker Hub
3. Deploy tren AWS voi `docker-compose -f docker-compose.prod.yml up -d`
4. Truy cap `https://aicodereview.paydaes.tvtgroup.io`

## Actual Result
- Auth requests bi reject voi error: `UntrustedHost: Host must be trusted`
- Database operations fail voi error: `SqliteError: unable to open database file (SQLITE_CANTOPEN)`

## Expected Result
- Auth hoat dong binh thuong voi domain production
- Database co the doc/ghi binh thuong

## Context
- **Error Messages**:
  - `[auth][error] UntrustedHost: Host must be trusted. URL was: https://aicodereview.paydaes.tvtgroup.io/api/auth/session`
  - `SqliteError: unable to open database file { code: 'SQLITE_CANTOPEN' }`
- **Environment**: AWS, Docker, Next.js 16.1.6, NextAuth v5

---

## Root Cause Analysis

### Bug 1: UntrustedHost Error

```
Request Flow:
+------------------------------------------------------------------+
| Client -> Reverse Proxy -> Docker Container (port 3000)          |
|                                                                   |
| Host header: aicodereview.paydaes.tvtgroup.io                    |
|                     |                                             |
| NextAuth checks: Is this host trusted? -> NO (default behavior)  |
|                     |                                             |
| REJECT with UntrustedHost error                                  |
+------------------------------------------------------------------+
```

**File**: `src/auth.ts:5-31`

NextAuth v5 mac dinh KHONG tin tuong bat ky host nao trong production de bao ve chong CSRF attacks. Can explicitly enable `trustHost: true` trong config.

### Bug 2: SQLite CANTOPEN Error

```
Path Mismatch:
+------------------------------------------------------------------+
| Code expects:     /app/reviews.db  (process.cwd() = /app)        |
| Volume mounts:    /app/data  (app-data volume)                   |
| User permissions: nextjs can ONLY write to /app/data             |
|                                                                   |
| Result: Cannot create /app/reviews.db -> SQLITE_CANTOPEN         |
+------------------------------------------------------------------+
```

**File**: `src/lib/review-store.ts:25`
```typescript
const DB_PATH = path.join(process.cwd(), "reviews.db");  // = /app/reviews.db
```

**File**: `Dockerfile:67`
```dockerfile
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data  # Only /app/data is writable
```

**File**: `docker-compose.prod.yml:24`
```yaml
volumes:
  - app-data:/app/data  # Mount to /app/data, not /app
```

Database path `/app/reviews.db` khong nam trong volume mount `/app/data`, va user `nextjs` khong co quyen ghi vao `/app`.

---

## Proposed Fixes

### Fix 1: UntrustedHost (Recommended)

**Option A: Add `trustHost: true` in auth.ts**
```typescript
// src/auth.ts
export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,  // <- Add this line
    providers: [...],
})
```

**Option B: Set environment variable**
```yaml
# docker-compose.prod.yml
environment:
  - AUTH_TRUST_HOST=true
```

-> **Recommend Option A** vi no explicit trong code va khong phu thuoc vao env config.

### Fix 2: SQLite Path (Recommended)

**Change database path to use /app/data directory:**
```typescript
// src/lib/review-store.ts
const DB_PATH = path.join(process.cwd(), "data", "reviews.db");  // = /app/data/reviews.db
```

Dieu nay dam bao database file nam trong:
- Volume mount (`app-data:/app/data`) -> persist data across container restarts
- Directory co write permission cho user `nextjs`

---

## Verification Plan

### Manual Test Steps
1. Rebuild Docker image sau khi fix
2. Push len Docker Hub
3. Redeploy tren AWS
4. Verify:
   - Auth: Truy cap dashboard, khong co UntrustedHost error
   - Database: Tao review moi, khong co SQLITE_CANTOPEN error
   - Data persistence: Restart container, data van con

### Commands
```bash
# Rebuild va push
docker buildx build --platform linux/amd64 -t thongphm/ai-codereview:latest --push .

# On AWS server
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## Fix Applied

### Files Changed

1. **src/auth.ts** - Added `trustHost: true` to NextAuth config
   ```typescript
   export const { handlers, signIn, signOut, auth } = NextAuth({
       trustHost: true,  // <- ADDED
       providers: [...]
   })
   ```

2. **src/lib/review-store.ts:25** - Changed database path
   ```typescript
   // Before:
   const DB_PATH = path.join(process.cwd(), "reviews.db");

   // After:
   const DB_PATH = path.join(process.cwd(), "data", "reviews.db");
   ```

### Test Results
- Local tests: N/A (requires Docker deployment to verify)
- Need to rebuild Docker image and deploy to AWS for verification

### Next Steps
1. Start Docker Desktop
2. Run: `docker buildx build --platform linux/amd64 -t thongphm/ai-codereview:latest --push .`
3. On AWS: `docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml pull && docker-compose -f docker-compose.prod.yml up -d`
4. Verify errors are resolved
