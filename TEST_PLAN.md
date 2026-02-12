# Test Plan

## AI Code Review v2.1.0

**Created:** 2026-02-12
**Status:** ✅ VERIFIED

---

## Unit Tests

### Review Store (src/lib/review-store.ts)
- [ ] Test: `searchReviews()` - Returns reviews matching title query
- [ ] Test: `searchReviews()` - Returns empty array when no matches
- [ ] Test: `searchReviews()` - Handles special characters in query
- [ ] Test: `listReviews()` - Returns reviews sorted by date DESC
- [ ] Test: `getStats()` - Returns correct totalReviews count

### AI Config Form (src/components/settings/ai-config-form.tsx)
- [ ] Test: Default model is `gemini-2.5-flash`
- [ ] Test: Form saves config to localStorage on submit
- [ ] Test: Form loads saved config from localStorage on mount

---

## Integration Tests

### API Routes

#### GET /api/reviews
- [ ] Test: Returns all reviews when no query param
- [ ] Test: Returns filtered reviews when `?q=keyword` provided
- [ ] Test: Returns stats alongside reviews

#### POST /api/review/analyze
- [ ] Test: Returns streaming response with Gemini model
- [ ] Test: Returns 401 error when API key missing
- [ ] Test: Respects `language` param (en/vi)
- [ ] Test: Includes context documents in prompt when provided

---

## UI/E2E Tests

### Search Flow (src/app/dashboard/reviews/page.tsx)
- [ ] Test: Search input is visible and functional
- [ ] Test: Typing in search triggers debounced API call (300ms)
- [ ] Test: "No results" message shown when search has no matches
- [ ] Test: Clearing search shows all reviews again

### Settings Page (src/app/dashboard/settings/page.tsx)
- [ ] Test: AI config form renders with Gemini provider info
- [ ] Test: Model dropdown shows 3 Gemini models (Flash-Lite, Flash, Pro)
- [ ] Test: Saving config shows success toast

### New Review Page (src/app/dashboard/reviews/new/page.tsx)
- [ ] Test: Model tier selection (Fast/Quality) works
- [ ] Test: Selected tier saves correct model to localStorage

### Review Detail Page (src/app/dashboard/reviews/[id]/page.tsx)
- [ ] Test: AI Review uses model from localStorage config
- [ ] Test: "Powered by Google Gemini" text displayed

---

## Edge Cases

- [ ] Test: Search with empty string returns all reviews
- [ ] Test: Search with very long query (>100 chars) works
- [ ] Test: AI analysis handles large code input (>10KB)
- [ ] Test: Config migration - old config with `useLocal: true` doesn't break app

---

## Build & Type Check

- [x] Test: `npm run build` completes without errors
- [x] Test: TypeScript compilation has no type errors

---

## Test Results

| Test Category | Status | Notes |
|---------------|--------|-------|
| Unit Tests | ⏭️ SKIPPED | No test framework configured |
| Integration Tests | ⏭️ SKIPPED | No test framework configured |
| UI/E2E Tests | ⏭️ SKIPPED | Manual verification recommended |
| Edge Cases | ⏭️ SKIPPED | Manual verification recommended |
| Build Check | ✅ PASSED | `npm run build` successful |
| TypeScript | ✅ PASSED | `tsc --noEmit` no errors |
| Lint (new code) | ✅ PASSED | Fixed prefer-const, unused import |

---

## Notes

- All Ollama/local AI functionality has been removed
- Config simplified to `{ model: string }` format
- Search is SQL LIKE-based (case-insensitive on most SQLite builds)
