# Implementation Plan

## AI Code Review - Kế hoạch triển khai

**Phiên bản:** 1.0.0
**Ngày cập nhật:** 2026-02-11

---

## 1. Tổng quan kiến trúc

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  Login Page  │  │  Dashboard   │  │   Settings   │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│         │                 │                 │                           │
│         └─────────────────┼─────────────────┘                           │
│                           │                                              │
│                    ┌──────▼──────┐                                      │
│                    │   Next.js   │                                      │
│                    │  App Router │                                      │
│                    └──────┬──────┘                                      │
└───────────────────────────┼──────────────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────────────┐
│                      API LAYER                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  /api/auth   │  │ /api/reviews │  │ /api/review  │                  │
│  │  - pat-login │  │  - GET list  │  │  - analyze   │                  │
│  │  - session   │  │  - POST new  │  │  (streaming) │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│         │                 │                 │                           │
│         │                 │                 │                           │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐                     │
│  │   NextAuth  │  │   SQLite    │  │ AI Provider │                     │
│  │  (session)  │  │  (storage)  │  │ OpenAI/     │                     │
│  │             │  │             │  │ Ollama      │                     │
│  └─────────────┘  └─────────────┘  └─────────────┘                     │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │   GitHub     │  │   GitLab     │  │   OpenAI    │                   │
│  │   OAuth      │  │   API/OAuth  │  │   API       │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CODE REVIEW FLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. INPUT                  2. PROCESS                 3. OUTPUT         │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐     │
│  │ Paste Code  │────┐     │  Pattern    │          │   Quick     │     │
│  └─────────────┘    │     │  Scanner    │────┐     │   Summary   │     │
│                     │     └─────────────┘    │     └─────────────┘     │
│  ┌─────────────┐    │                        │                          │
│  │ GitLab MR   │────┼────▶┌─────────────┐    │     ┌─────────────┐     │
│  │   URL       │    │     │    AI       │────┼────▶│  File-by-   │     │
│  └─────────────┘    │     │  Analysis   │    │     │  File Review│     │
│                     │     └─────────────┘    │     └─────────────┘     │
│  ┌─────────────┐    │                        │                          │
│  │  Context    │────┘                        │     ┌─────────────┐     │
│  │  Documents  │                             └────▶│   Score &   │     │
│  └─────────────┘                                   │   Fixes     │     │
│                                                    └─────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Module Implementation

### 2.1 Authentication Module

**Files:**
- `src/auth.ts` - NextAuth configuration
- `src/middleware.ts` - Route protection
- `src/app/api/auth/pat-login/route.ts` - PAT login API
- `src/app/api/auth/session-info/route.ts` - Session info API
- `src/app/login/page.tsx` - Login UI

**Implementation Details:**

```typescript
// Authentication Types
type AuthType = "oauth" | "gitlab-pat"

interface SessionInfo {
    type: AuthType
    user: {
        name: string
        email: string
        image: string
    }
}

// Middleware Logic
const isLoggedIn = isOAuthLoggedIn || isPatLoggedIn
if (isOnDashboard && !isLoggedIn) {
    redirect("/login")
}
```

**Flow:**
1. User chọn method đăng nhập (OAuth hoặc PAT)
2. Với OAuth: NextAuth xử lý redirect và callback
3. Với PAT: API validate token với GitLab, set HTTP-only cookie
4. Middleware check cookie/session trước khi cho vào dashboard

### 2.2 Review Management Module

**Files:**
- `src/lib/review-store.ts` - SQLite storage
- `src/app/api/reviews/[id]/route.ts` - Get single review, Delete review
- `src/app/api/reviews/route.ts` - Bulk delete reviews (DELETE)
- `src/app/api/reviews/start/route.ts` - Start new review

**Database Schema:**

```sql
CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    source TEXT,
    sourceUrl TEXT,
    code TEXT,
    files TEXT,  -- JSON array
    patternResults TEXT,  -- JSON array
    aiAnalysis TEXT,
    contextDocuments TEXT,  -- JSON array
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**API Endpoints:**

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| GET | `/api/reviews` | - | `{ reviews: Review[], stats: Stats }` |
| DELETE | `/api/reviews` | `{ ids: string[] }` | `{ success: boolean }` |
| GET | `/api/reviews/[id]` | - | `Review` |
| POST | `/api/reviews/start` | `{ title, source, code, files, mrUrls, lang }` | `{ reviewId, patternScan }` |

### 2.3 AI Analysis Module

**Files:**
- `src/app/api/review/analyze/route.ts` - AI analysis API

**Implementation:**

```typescript
// Prompt Structure (Vietnamese)
const systemPrompt = `
Bạn là một chuyên gia review code cấp cao.

## Tóm tắt nhanh
(1-2 câu, tối đa 100 ký tự)

## Điểm chất lượng code
(1-10 với giải thích)

## Review theo từng file

### 📄 \`filename.ts\`
**Trạng thái:** ✅ OK hoặc ⚠️ Cần chỉnh sửa

**Vấn đề:** ...
**Code hiện tại:** \`\`\`code\`\`\`
**Đề xuất sửa:** \`\`\`code\`\`\`
`

// Streaming Response
const stream = new ReadableStream({
    async start(controller) {
        // Stream chunks from AI
        controller.enqueue(encoder.encode(chunk))
    }
})
```

**AI Providers:**

| Provider | Config | Use Case |
|----------|--------|----------|
| Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` | Flash-only siêu nhanh, mặc định |
| Ollama | `localUrl`, `localModel` | Local, private, free |

### 2.4 Pattern Scanner Module

**Files:**
- `src/lib/pattern-scanner.ts`

**Patterns Detected:**

| Rule | Severity | Pattern |
|------|----------|---------|
| `console-log` | warning | `console.log` trong production |
| `todo-fixme` | info | `TODO`, `FIXME` comments |
| `hardcoded-secret` | error | API keys, passwords hardcoded |
| `any-type` | warning | TypeScript `any` type |
| `eval-usage` | error | `eval()` usage |

### 2.5 GitLab Integration Module

**Files:**
- `src/lib/gitlab-service.ts`
- `src/app/api/gitlab/fetch-mr/route.ts`

**Implementation:**

```typescript
class GitLabService {
    async getMergeRequestChanges(
        projectPath: string,
        mrIid: number
    ): Promise<GitLabMR> {
        const url = `${this.baseUrl}/api/v4/projects/${encodedPath}/merge_requests/${mrIid}/changes`
        return fetch(url, { headers: this.getHeaders() })
    }
}
```

### 2.6 Document Parser Module

**Files:**
- `src/lib/document-parser.ts`
- `src/app/api/documents/upload/route.ts`

**Supported Formats:**

| Format | Library | Max Size |
|--------|---------|----------|
| PDF | `pdf-parse` | 10MB |
| Word (.docx) | `mammoth` | 5MB |
| Excel (.xlsx) | `xlsx` | 5MB |
| Text/Markdown | Native | 1MB |

---

## 3. Component Implementation

### 3.1 UI Components (shadcn/ui)

```
src/components/ui/
├── avatar.tsx      # User avatar
├── badge.tsx       # Status badges
├── button.tsx      # Action buttons
├── card.tsx        # Content cards
├── dialog.tsx      # Modal dialogs
├── dropdown-menu.tsx
├── form.tsx        # Form handling
├── input.tsx       # Text inputs
├── label.tsx       # Form labels
├── select.tsx      # Dropdowns
├── separator.tsx   # Visual dividers
├── sheet.tsx       # Side panels
├── switch.tsx      # Toggle switches
├── tabs.tsx        # Tab navigation
└── textarea.tsx    # Multi-line input
```

### 3.2 Dashboard Components

```
src/components/dashboard/
├── sidebar-nav.tsx  # Desktop navigation
├── mobile-nav.tsx   # Mobile navigation
└── user-nav.tsx     # User dropdown menu
```

### 3.3 Settings Components

```
src/components/settings/
└── ai-config-form.tsx  # AI configuration form
```

---

## 4. API Implementation

### 4.1 API Route Structure

```
src/app/api/
├── auth/
│   ├── pat-login/
│   │   └── route.ts      # POST: login, DELETE: logout
│   └── session-info/
│       └── route.ts      # GET: current session
├── reviews/
│   ├── route.ts          # GET: list, stats
│   ├── [id]/
│   │   └── route.ts      # GET: single review
│   └── start/
│       └── route.ts      # POST: create review
├── review/
│   └── analyze/
│       └── route.ts      # POST: AI analysis (streaming)
├── gitlab/
│   └── fetch-mr/
│       └── route.ts      # POST: fetch MR diff
└── documents/
    └── upload/
        └── route.ts      # POST: upload document
```

### 4.2 Error Handling

```typescript
// Standard error response
return Response.json(
    { error: "Error message" },
    { status: 400 | 401 | 404 | 500 }
)

// Error codes
const ErrorCodes = {
    INVALID_TOKEN: "Invalid token or unauthorized",
    GITLAB_ERROR: "GitLab API error",
    AI_ERROR: "AI analysis failed",
    UPLOAD_ERROR: "File upload failed"
}
```

---

## 5. State Management

### 5.1 Client State

```typescript
// localStorage
- "ai-config": AI configuration
- "gitlab-self-hosted-config": GitLab URL & token

// sessionStorage
- "gitlab-pat": Personal Access Token
- "gitlab-url": GitLab instance URL

// Cookies (HTTP-only)
- "gitlab-pat-session": PAT session data
- NextAuth session cookies
```

### 5.2 Server State

```typescript
// SQLite Database
- reviews table: All review data

// In-memory
- Streaming AI responses
```

---

## 6. Deployment

### 6.1 Docker Configuration

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### 6.2 Environment Variables

```env
# Required
AUTH_SECRET=xxx

# Optional - OAuth
AUTH_GITHUB_ID=xxx
AUTH_GITHUB_SECRET=xxx
AUTH_GITLAB_ID=xxx
AUTH_GITLAB_SECRET=xxx

# Optional - AI
OPENAI_API_KEY=xxx
```

### 6.3 CI/CD Pipeline

```yaml
# GitHub Actions
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
      - name: Push to registry
      - name: Deploy to server
```

---

## 7. Testing Strategy

### 7.1 Unit Tests
- Pattern scanner rules
- Document parser functions
- GitLab URL parsing

### 7.2 Integration Tests
- API endpoints
- Authentication flows
- Database operations

### 7.3 E2E Tests
- Complete review workflow
- GitLab MR fetch
- AI analysis

---

## 8. Performance Optimization

### 8.1 Frontend
- Next.js App Router với React Server Components
- Streaming UI cho AI responses
- Lazy loading cho components

### 8.2 Backend
- SQLite với WAL mode
- Connection pooling cho external APIs
- Response streaming

### 8.3 Caching
- Static assets caching
- API response caching (where applicable)

---

## 9. Security Measures

### 9.1 Authentication
- HTTP-only cookies
- CSRF protection (NextAuth)
- Session expiration

### 9.2 Data Protection
- Input sanitization
- SQL injection prevention (parameterized queries)
- XSS prevention (React default escaping)

### 9.3 API Security
- Rate limiting
- Request validation
- Error message sanitization
