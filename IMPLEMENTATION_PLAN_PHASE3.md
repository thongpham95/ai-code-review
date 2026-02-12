# Phase 3: Deep Integration - Implementation Plan

**Version:** 3.0.0
**Target:** Q3 2026
**Status:** Planning

---

## Overview

Phase 3 focuses on deep integration features that transform AI Code Review from a standalone tool into an integrated part of the development workflow.

---

## Feature 1: Rich Diff View with AI Comments ✅ COMPLETED

**Status:** ✅ Already implemented in v2.1.1

### What was done:
- [x] Unified GitHub/GitLab-like code review interface
- [x] Inline AI comments below each file
- [x] Collapsible file blocks with expand/collapse
- [x] Quality score display
- [x] Pattern scan issues inline
- [x] Copy-to-clipboard per file
- [x] Horizontal/vertical scroll fixed
- [x] Reduced padding, optimized screen density

---

## Feature 2: Git Integration (Comment/Push to GitLab/GitHub)

**Priority:** P0 - High Impact
**Estimated Effort:** 2-3 weeks

### 2.1 Objectives
- Push AI review comments directly to GitLab/GitHub MR/PR
- Allow users to select which comments to push
- Support comment threads on specific lines

### 2.2 Technical Approach

#### Option A: GitLab API Integration (Recommended)
```
User → Select comments → POST to /api/gitlab/comment → GitLab API
```

**GitLab API Endpoints:**
- `POST /projects/:id/merge_requests/:mr_iid/notes` - Add MR comment
- `POST /projects/:id/merge_requests/:mr_iid/discussions` - Add discussion thread
- `POST /projects/:id/repository/commits/:sha/comments` - Line-specific comment

#### Option B: GitHub API Integration
```
User → Select comments → POST to /api/github/comment → GitHub API
```

**GitHub API Endpoints:**
- `POST /repos/:owner/:repo/pulls/:pull_number/comments` - PR review comment
- `POST /repos/:owner/:repo/pulls/:pull_number/reviews` - Submit review

### 2.3 Implementation Tasks

#### Backend
- [ ] **API-01**: Create `/api/gitlab/push-comments` endpoint
  - Accept: reviewId, comments[], mrUrl
  - Map AI comments to GitLab note format
  - Handle authentication (use existing PAT)

- [ ] **API-02**: Create `/api/github/push-comments` endpoint
  - Same functionality for GitHub
  - Detect provider from sourceUrl

- [ ] **API-03**: Add comment tracking in database
  - Track which comments were pushed
  - Avoid duplicate pushes

#### Frontend
- [ ] **UI-01**: Add "Push to GitLab" button in review page
- [ ] **UI-02**: Comment selection checkboxes
- [ ] **UI-03**: Push confirmation dialog
- [ ] **UI-04**: Push status indicators (pushed/pending)

### 2.4 Data Model

```sql
-- Add to existing schema
CREATE TABLE pushed_comments (
    id TEXT PRIMARY KEY,
    reviewId TEXT NOT NULL,
    commentIndex INTEGER NOT NULL,
    provider TEXT NOT NULL, -- 'gitlab' | 'github'
    externalId TEXT,        -- GitLab/GitHub comment ID
    pushedAt TEXT NOT NULL,
    FOREIGN KEY (reviewId) REFERENCES reviews(id)
);
```

### 2.5 User Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Review Detail Page                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [File: src/app.ts]                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ☑ AI Comment: "Consider using const here"           │    │
│  │ ☐ AI Comment: "Add error handling"                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [Push Selected to GitLab] [Push All]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature 3: RAG / Context Documents (Enhanced)

**Priority:** P1 - Medium Impact
**Estimated Effort:** 1-2 weeks

### 3.1 Current State
- Basic document upload exists
- Documents are passed to AI prompt as context

### 3.2 Enhancements

#### 3.2.1 Persistent Document Library
- [ ] **DB-01**: Store uploaded documents in database
- [ ] **DB-02**: Associate documents with projects (not just reviews)
- [ ] **UI-01**: Document management page
- [ ] **UI-02**: Select documents per review from library

#### 3.2.2 Smart Chunking (for large docs)
- [ ] **AI-01**: Split large documents into chunks
- [ ] **AI-02**: Use embeddings for relevant chunk selection
- [ ] **AI-03**: Only send relevant chunks to AI (save tokens)

#### 3.2.3 Document Types Support
- [ ] **PARSE-01**: Markdown (.md)
- [ ] **PARSE-02**: Plain text (.txt)
- [ ] **PARSE-03**: PDF (basic text extraction)
- [ ] **PARSE-04**: Code files as documentation

### 3.3 Data Model

```sql
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,        -- 'markdown' | 'text' | 'pdf' | 'code'
    projectId TEXT,            -- Optional project association
    userId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
);

CREATE TABLE review_documents (
    reviewId TEXT NOT NULL,
    documentId TEXT NOT NULL,
    PRIMARY KEY (reviewId, documentId),
    FOREIGN KEY (reviewId) REFERENCES reviews(id),
    FOREIGN KEY (documentId) REFERENCES documents(id)
);
```

### 3.4 User Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Settings → Documents                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📄 API_GUIDELINES.md          [Delete]                    │
│  📄 CODING_STANDARDS.txt       [Delete]                    │
│  📄 architecture.md            [Delete]                    │
│                                                             │
│  [+ Upload New Document]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ New Review → Context Documents                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Select documents to include:                               │
│  ☑ API_GUIDELINES.md                                       │
│  ☑ CODING_STANDARDS.txt                                    │
│  ☐ architecture.md                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature 4: Webhook Auto-Review (Bonus)

**Priority:** P2 - Nice to Have
**Estimated Effort:** 1 week

### 4.1 Concept
- GitLab/GitHub webhook triggers auto-review on new MR/PR
- Results posted back as comment

### 4.2 Implementation
- [ ] **HOOK-01**: Webhook endpoint `/api/webhooks/gitlab`
- [ ] **HOOK-02**: MR event parsing
- [ ] **HOOK-03**: Auto-trigger review pipeline
- [ ] **HOOK-04**: Auto-post results to MR

---

## Priority & Timeline

| Feature | Priority | Effort | Target |
|---------|----------|--------|--------|
| Rich Diff View | P0 | - | ✅ Done |
| Git Integration | P0 | 2-3 weeks | Week 1-3 |
| RAG Enhancement | P1 | 1-2 weeks | Week 4-5 |
| Webhook Auto-Review | P2 | 1 week | Week 6 |

---

## Dependencies

1. **GitLab/GitHub PAT** - Already implemented via OAuth
2. **SQLite schema updates** - Migration needed
3. **API rate limits** - Handle gracefully

---

## Success Metrics

- [ ] Users can push AI comments to GitLab MR
- [ ] Comments appear correctly in MR diff view
- [ ] Document library persists across sessions
- [ ] Large documents are chunked effectively

---

## Next Steps

1. **Immediately**: Update PRD.md with Phase 3 details
2. **Week 1**: Start Git Integration (GitLab first)
3. **Week 3**: Test with real GitLab MRs
4. **Week 4**: RAG Enhancement
5. **Week 6**: Webhook (if time permits)

---

## Notes

- Rich Diff View was moved to Phase 2 as v2.1.1 enhancement (completed)
- Git Integration is the highest-value Phase 3 feature
- RAG Enhancement builds on existing document upload feature
