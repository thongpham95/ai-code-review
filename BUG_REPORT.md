# Bug Report

## Status
RESOLVED (Issue #1) → INVESTIGATING (Issue #2)

## Bug Title
Issue #1: Button overflow và thiếu sticky header - **RESOLVED**
Issue #2: Code blocks trong Analysis Report full width - **INVESTIGATING**

## Bug Description
Giao diện "Thông tin Bug" trong mục Phân tích Bug (Jira Bug Analyzer) có 3 vấn đề:
1. Các button Git Provider (GitHub, GitLab, Self-hosted) và nút "Bắt đầu phân tích" tràn ra ngoài bên phải trên một số kích thước màn hình
2. Khi scroll xuống xem Báo cáo phân tích, người dùng mất context về Jira ticket đang xem
3. Thiếu thông tin chi tiết của ticket (summary, status, priority, assignee) với link mở ra Jira

## Steps to Reproduce
1. Truy cập Dashboard > Jira Bug Analyzer
2. Kết nối Jira và Git account
3. Nhập một Jira ticket key và nhấn "Bắt đầu phân tích"
4. Quan sát layout của card "Thông tin Bug" - button tràn trên màn hình ~900-1100px
5. Khi report dài, scroll xuống - mất context về ticket đang xem

## Actual Result
- Button tràn ra ngoài viewport trên màn hình medium
- Không có thông tin sticky về ticket đang phân tích
- Không hiển thị chi tiết ticket (summary, status, assignee, etc.)
- Không có link để mở Jira ticket

## Expected Result
- Layout responsive không bị tràn ở mọi kích thước màn hình
- Header sticky hiển thị thông tin ticket đang xem khi scroll
- Hiển thị thông tin chi tiết ticket: summary, status, priority, assignee
- Link clickable để mở ticket trên Jira

## Context
- **Error Message**: N/A (UI issue)
- **Screenshots**: N/A
- **Environment**: Web app, Next.js + Tailwind CSS

---

## Root Cause Analysis

### Issue 1: Button Overflow

**File:** `src/app/dashboard/jira-analyzer/page.tsx:222-299`

```
Layout hiện tại:
┌─────────────────────────────────────────────────────────────────────────┐
│ CardContent (flex-col md:flex-row gap-4)                                │
│ ┌──────────────┬───────────────┬────────────────────┬─────────────────┐ │
│ │ Ticket Key   │ Repository    │ Git Provider       │ Submit          │ │
│ │ w-[200px]    │ w-[250px]     │ 3 buttons no-wrap  │ flex-1          │ │
│ │ shrink-0     │ shrink-0      │ shrink-0           │                 │ │
│ └──────────────┴───────────────┴────────────────────┴─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
         ↓ Trên màn hình ~900-1100px ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 200px + 250px + 3 buttons (~300px) + submit = ~750px+                   │
│ Nhưng container có padding, gap → không đủ chỗ → tràn                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Nguyên nhân:**
- Các element có `shrink-0` nên không co lại được
- Git Provider buttons trong `flex gap-2` không wrap
- Không có breakpoint trung gian giữa mobile và desktop

### Issue 2: No Sticky Header

**File:** `src/app/dashboard/jira-analyzer/page.tsx:208-378`

**Nguyên nhân:**
- Card "Thông tin Bug" không có `sticky top-*` class
- Không có separate component để hiển thị current ticket info
- Cấu trúc layout không tách biệt form input và ticket display

### Issue 3: Missing Ticket Details

**File:** `src/app/dashboard/jira-analyzer/page.tsx`

**Nguyên nhân:**
- Hiện tại chỉ có input field cho ticket key
- API trả về đầy đủ ticket data nhưng không lưu vào state để display
- Không có UI component hiển thị ticket metadata

---

## Proposed Fixes

### Fix Option 1 (Recommended): Refactor Layout + Add Sticky Ticket Banner

**Approach:**
1. **Refactor form layout** để responsive hơn:
   - Sử dụng CSS Grid với responsive columns
   - Wrap git provider buttons trên màn hình nhỏ hơn

2. **Add sticky ticket banner:**
   - Tạo component hiển thị current ticket info
   - Sticky ở top khi scroll, collapse khi ở đầu trang
   - Hiển thị: Ticket Key, Summary, Status, Priority, Assignee
   - Link mở Jira ticket

3. **Fetch và display ticket info:**
   - Tạo API endpoint `/api/jira/ticket` để fetch ticket info riêng
   - Lưu ticket data vào state sau khi nhấn analyze
   - Hiển thị ngay khi có data

**Files to change:**
- `src/app/dashboard/jira-analyzer/page.tsx` - Main refactor

**Layout mới:**
```
┌────────────────────────────────────────────────────────────────┐
│ Sticky Ticket Banner (khi có ticket)                          │
│ [BUG-123] Summary text... | In Progress | High | @assignee 🔗 │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│ Thông tin Bug Card (Form)                                      │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Row 1: [Ticket Key] [Repository]                            ││
│ │ Row 2: [Git Provider: GitHub | GitLab | Self-hosted]        ││
│ │ Row 3: [Bắt đầu phân tích button]                           ││
│ └─────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│ Báo cáo phân tích (Report)                                     │
│ ...                                                            │
└────────────────────────────────────────────────────────────────┘
```

### Fix Option 2 (Alternative): Minimal Fix

Chỉ fix overflow bằng cách thêm `flex-wrap` và điều chỉnh responsive breakpoints. Không thêm sticky header.

**Trade-offs:**
- Nhanh hơn nhưng không cải thiện UX khi scroll
- Không hiển thị ticket details

---

---

## Fix Applied

### Files Changed:
1. **`src/app/dashboard/jira-analyzer/page.tsx`**
   - Added `TicketInfo` interface để lưu thông tin ticket
   - Added state `ticketInfo` và `formRef`
   - Refactored form layout: sử dụng CSS Grid (`grid-cols-1 sm:grid-cols-2`) thay vì flex với fixed widths
   - Added `flex-wrap` cho Git Provider buttons
   - Added **Sticky Ticket Banner** hiển thị khi có ticket:
     - Ticket key với link mở Jira (icon external link)
     - Summary (truncate với `line-clamp-1`)
     - Status, Priority badges
     - Assignee info
   - Banner sticky ở top với backdrop blur effect

2. **`src/app/api/jira/ticket/route.ts`** (NEW)
   - API endpoint để fetch ticket metadata
   - Returns: key, summary, status, priority, assignee, jiraUrl

### Test Results:
- TypeScript: ✅ No errors
- Layout responsive: ✅ Grid-based, no overflow

### Verification:
Cần user verify trên browser với các kích thước màn hình khác nhau.

---

## Verification Plan

### Manual Test Steps:
1. Test layout trên các kích thước: 375px (mobile), 768px (tablet), 1024px, 1280px, 1440px
2. Nhập ticket key và analyze - verify sticky banner xuất hiện
3. Scroll xuống report - verify banner vẫn visible
4. Click link Jira - verify mở đúng trang
5. Test dark mode và light mode

### Edge Cases:
- Ticket với summary rất dài
- Ticket không có assignee
- Responsive behavior khi resize browser
- Mobile touch interaction

---

# Issue #2: Code Blocks Full Width

## Bug Description
Code blocks trong phần "Báo cáo phân tích" luôn hiển thị full width, ngay cả khi chỉ chứa vài ký tự. Điều này không tối ưu về mặt giao diện.

## Root Cause Analysis

**File:** `src/app/dashboard/jira-analyzer/page.tsx:444`

```tsx
// Hiện tại: không có max-width
<div className="rounded-md border ... my-4 overflow-hidden shadow-sm">
```

Code block wrapper không có constraint về max-width → luôn full width của container.

## Proposed Fix

Thêm `max-w-[75%]` hoặc `max-w-3xl` vào code block wrapper:

```tsx
// Sau: giới hạn max-width 75%
<div className="max-w-[75%] rounded-md border ... my-4 overflow-hidden shadow-sm">
```

**Trade-offs:**
- `max-w-[75%]`: Responsive theo container, luôn 3/4
- `max-w-3xl` (48rem): Fixed width, có thể không phù hợp ở một số screen sizes

**Đề xuất:** Dùng `max-w-[75%]` để responsive hơn.

## Fix Applied (Issue #2)

**File Changed:** `src/app/dashboard/jira-analyzer/page.tsx:444`

```diff
- <div className="rounded-md border border-zinc-200 ...">
+ <div className="max-w-[75%] rounded-md border border-zinc-200 ...">
```

**Verification:** Cần user verify trên browser.

---

# Issue #3: Code Block Display Optimization

## Bug Description
Code blocks trong báo cáo phân tích hiển thị không tối ưu:
- Single-line code vẫn hiển thị full code block → chiếm quá nhiều không gian
- Thiếu syntax highlighting cho code

## Root Cause Analysis

**File:** `src/app/dashboard/jira-analyzer/page.tsx:438-462`

```tsx
code({ node, inline, className, children, ...props }) {
    if (!inline) {
        // Luôn render code block cho non-inline code
        // Không phân biệt single-line vs multi-line
    }
}
```

**Vấn đề:** Không check số dòng của code trước khi quyết định render style.

## Proposed Fix

Thêm logic phân biệt single-line vs multi-line:

```tsx
code({ node, inline, className, children, ...props }) {
    const codeString = String(children).replace(/\n$/, '')
    const isSingleLine = !codeString.includes('\n')

    // Single line non-inline → render như highlighted text
    if (!inline && isSingleLine) {
        return <code className="font-semibold bg-yellow-100 dark:bg-yellow-900/30 ...">
    }

    // Multi-line → full code block
    if (!inline) {
        return <div className="code-block">...
    }

    // Inline → giữ nguyên
}
```

**Trade-offs:**
- Không cần install thêm package
- Clean hơn nhưng không có syntax highlight
- Có thể add `react-syntax-highlighter` sau nếu cần

## Fix Applied (Issue #3)

**File Changed:** `src/app/dashboard/jira-analyzer/page.tsx:438-475`

Logic mới:
1. **Inline code** (`backticks`) → `bg-muted` styling (giữ nguyên)
2. **Single-line code block** → highlighted text với `bg-amber-50` (vàng nhạt), `w-fit`
3. **Multi-line code block** → full code block với `max-w-[75%]`

**Verification:** Cần user verify trên browser.
