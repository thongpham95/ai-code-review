# Bug Report

## Status
FIX APPLIED - PENDING VERIFICATION

## Bug Title
GitHub PR URLs incorrectly routed to GitLab API; Missing Git account management UI

## Bug Description
Two related issues:
1. **URL Routing Bug**: When pasting a GitHub PR URL (e.g., `https://github.com/owner/repo/pull/123`) in the "Connect URL" tab, the app always calls the GitLab API which fails with "Invalid GitLab MR URL" error
2. **Missing Feature**: No UI to manage Git provider accounts (GitHub, GitLab, self-hosted GitLab tokens) - users must manually configure in localStorage

## Steps to Reproduce
1. Go to Dashboard → New Review
2. Select "Connect URL" tab
3. Paste a GitHub PR URL: `https://github.com/owner/repo/pull/123`
4. Click "Start Review"
5. Error: "Failed to fetch MR: Invalid GitLab MR URL..."

## Actual Result
- GitHub PR URLs fail with GitLab validation error
- No way to configure GitHub token in UI

## Expected Result
- GitHub PR URLs should be detected and fetched via GitHub API
- Settings page should allow configuring tokens for GitHub, GitLab, and self-hosted GitLab

## Context
- **Error Message**: "Failed to fetch MR: Invalid GitLab MR URL. Expected format: https://gitlab.com/group/project/-/merge_requests/123. Check your GitLab token in Settings."
- **Environment**: Next.js app with existing GitLab service, newly added GitHub service

---

## Root Cause Analysis

### URL Flow (Current - Broken)
```
User pastes URL → new/page.tsx:133 → /api/gitlab/fetch-mr → GitLabService.parseMrUrl()
                                                                   ↓
                                             Returns null for GitHub URLs
                                                                   ↓
                                             "Invalid GitLab MR URL" error
```

### Key Files:
| File | Issue |
|------|-------|
| `src/app/dashboard/reviews/new/page.tsx:133` | Always calls `/api/gitlab/fetch-mr` regardless of URL |
| `src/app/api/gitlab/fetch-mr/route.ts:13-15` | Validates URL as GitLab format only |
| `src/lib/github-service.ts` | Has `parsePrUrl()` but no fetch endpoint |
| Missing | `/api/github/fetch-pr` endpoint |
| `src/app/dashboard/settings/page.tsx` | No Git account management section |

### Why It Fails:
1. `new/page.tsx` has no URL type detection - hardcoded to call GitLab API
2. No GitHub PR fetch endpoint exists (only push-comments was created)
3. GitLab's `parseMrUrl()` returns `null` for non-GitLab URLs
4. Settings page has no way to save/manage Git provider tokens

---

## Proposed Fixes

### Fix Option 1 (Recommended): Full Git Provider Support

**Changes Required**:

| File | Change |
|------|--------|
| `src/app/api/github/fetch-pr/route.ts` | **NEW** - Create GitHub PR fetch endpoint |
| `src/app/dashboard/reviews/new/page.tsx` | Add URL type detection, route to correct API |
| `src/components/settings/git-accounts-form.tsx` | **NEW** - Git accounts management component |
| `src/app/dashboard/settings/page.tsx` | Add Git Accounts section |

**Flow After Fix**:
```
User pastes URL → Detect URL type → Route to correct API
                       │
          ┌────────────┴────────────┐
          ↓                         ↓
   GitHub PR URL             GitLab MR URL
          ↓                         ↓
   /api/github/fetch-pr      /api/gitlab/fetch-mr
```

**Settings UI**:
```
┌─────────────────────────────────────────────┐
│ Git Accounts                                 │
├─────────────────────────────────────────────┤
│ ○ GitHub.com                                │
│   Token: [ghp_***************] [Save]        │
│                                              │
│ ○ GitLab.com                                │
│   Token: [glpat-***************] [Save]      │
│                                              │
│ ○ Self-hosted GitLab                        │
│   URL:   [https://gitlab.company.com]       │
│   Token: [***************] [Save]            │
└─────────────────────────────────────────────┘
```

### Fix Option 2 (Alternative): URL Detection Only
- Add URL detection in `new/page.tsx`
- Show "GitHub PRs not yet supported" error for GitHub URLs
- **Trade-off**: Quick fix but doesn't add GitHub support

---

## Verification Plan

### Manual Testing
1. Create new review with GitHub PR URL → Should fetch PR files
2. Create new review with GitLab MR URL → Should continue working
3. Settings → Git Accounts → Save GitHub token → Verify persists
4. Settings → Git Accounts → Save GitLab token → Verify persists

### Edge Cases
- Invalid URLs (not GitHub or GitLab)
- Self-hosted GitLab URLs
- Private repos without token
- Expired/invalid tokens

---

## Fix Applied

### Files Changed

| File | Change |
|------|--------|
| `src/app/api/github/fetch-pr/route.ts` | **NEW** - GitHub PR fetch endpoint using GitHubService |
| `src/app/dashboard/reviews/new/page.tsx` | Added URL type detection (GitHub vs GitLab), routes to correct API |
| `src/components/settings/git-accounts-form.tsx` | **NEW** - Git accounts management with GitHub, GitLab, Self-hosted GitLab |
| `src/app/dashboard/settings/page.tsx` | Added Git Accounts section above AI Config |

### Test Results
- TypeScript compilation: PASS
- Dev server: Compiling successfully

### Verification Steps
1. Go to Settings → Git Accounts → Add your GitHub token
2. Go to New Review → Paste a GitHub PR URL → Should fetch successfully
3. Go to New Review → Paste a GitLab MR URL → Should continue working
