import { google } from "@ai-sdk/google"
import { streamText } from "ai"
import { JiraService } from "@/lib/jira-service"
import { GitLabService } from "@/lib/gitlab-service"
import { SHARED_APIS, matchEndpoints, matchKeywords } from "@/lib/shared-apis"
import { createMobileApiReport, updateMobileApiReport } from "@/lib/review-store"

interface AnalyzeRequest {
    jiraUrl: string
    jiraConfig: { host: string; email: string; apiToken: string }
    gitlabConfig?: { baseUrl: string; token: string; projectId: string; branch?: string }
    language?: string
}

function extractVersionId(url: string): string | null {
    const match = url.match(/versions\/(\d+)/)
    return match ? match[1] : null
}

function isApiRelevantFile(path: string): boolean {
    const lower = path.toLowerCase()
    const relevant = ["controller", "service", "dto", "request", "response", "router", "route", "api", "endpoint"]
    const excluded = ["test", "spec", "frontend", ".md", ".txt", "migration", "config"]
    return relevant.some(k => lower.includes(k)) && !excluded.some(k => lower.includes(k))
}

export async function POST(req: Request) {
    const body: AnalyzeRequest = await req.json()
    const { jiraUrl, jiraConfig, gitlabConfig, language = "vi" } = body
    const isVi = language === "vi"

    const versionId = extractVersionId(jiraUrl)
    if (!versionId) {
        return Response.json({ error: isVi ? "URL Jira release không hợp lệ. Cần có /versions/{id}" : "Invalid Jira release URL. Must contain /versions/{id}" }, { status: 400 })
    }

    // Create report record
    const report = createMobileApiReport({ versionId, jiraUrl })

    try {
        // Step 1: Fetch Jira issues in this release
        const jira = new JiraService(jiraConfig)
        const jql = `project = TVT AND fixVersion = ${versionId} ORDER BY issuetype ASC`
        const searchResult = await jira.searchIssues(jql, 100)

        const issues = searchResult.issues.map(issue => ({
            key: issue.key,
            summary: issue.fields.summary,
            issueType: issue.fields.issuetype?.name || "Unknown",
            status: issue.fields.status?.name || "Unknown",
        }))

        updateMobileApiReport(report.id, { jiraIssues: issues })

        if (issues.length === 0) {
            const emptyMsg = isVi
                ? `# Không tìm thấy issue nào trong release v${versionId}\n\nKhông có issue nào được gắn fixVersion = ${versionId}.`
                : `# No issues found in release v${versionId}\n\nNo issues with fixVersion = ${versionId}.`
            updateMobileApiReport(report.id, { status: "completed", reportMarkdown: emptyMsg, summary: { breaking: 0, nonBreaking: 0, noImpact: 0 } })
            return new Response(emptyMsg, { headers: { "Content-Type": "text/plain" } })
        }

        // Step 2 & 3: Try GitLab diff analysis
        let analysisMethod = "jira-only"
        let allDiffs: { path: string; diff: string; commitTitle: string; ticketKey: string }[] = []

        if (gitlabConfig?.baseUrl && gitlabConfig?.token && gitlabConfig?.projectId) {
            try {
                const gitlab = new GitLabService(gitlabConfig.baseUrl, gitlabConfig.token)
                const branch = gitlabConfig.branch || "tvt_qc"
                const ticketIds = issues.map(i => i.key)

                // Search commits for each ticket
                const allCommitShas = new Map<string, { sha: string; title: string; ticketKey: string }>()

                for (const ticketId of ticketIds) {
                    try {
                        const commits = await gitlab.searchCommits(gitlabConfig.projectId, ticketId, branch)
                        for (const c of commits) {
                            if (!allCommitShas.has(c.id)) {
                                allCommitShas.set(c.id, { sha: c.id, title: c.title, ticketKey: ticketId })
                            }
                        }
                    } catch {
                        // Skip individual ticket search failures
                    }
                }

                // Fallback: if no commits found via search, get recent commits and filter
                if (allCommitShas.size === 0) {
                    try {
                        const recentCommits = await gitlab.getRecentCommits(gitlabConfig.projectId, branch, 50)
                        for (const c of recentCommits) {
                            const matchedTicket = ticketIds.find(t => c.title.includes(t) || c.message.includes(t))
                            if (matchedTicket) {
                                allCommitShas.set(c.id, { sha: c.id, title: c.title, ticketKey: matchedTicket })
                            }
                        }
                    } catch {
                        // GitLab not reachable - fall back to Jira-only
                    }
                }

                // Get diffs for each commit
                if (allCommitShas.size > 0) {
                    analysisMethod = "gitlab-diff"
                    for (const [, commit] of allCommitShas) {
                        try {
                            const diffs = await gitlab.getCommitDiff(gitlabConfig.projectId, commit.sha)
                            for (const d of diffs) {
                                if (isApiRelevantFile(d.new_path)) {
                                    allDiffs.push({
                                        path: d.new_path,
                                        diff: d.diff.substring(0, 3000),
                                        commitTitle: commit.title,
                                        ticketKey: commit.ticketKey,
                                    })
                                }
                            }
                        } catch {
                            // Skip individual diff failures
                        }
                    }
                }
            } catch {
                // GitLab connection failed entirely - use Jira-only
            }
        }

        // Step 4: Cross-reference with shared APIs
        const matchedApis = new Set<string>()
        if (analysisMethod === "gitlab-diff" && allDiffs.length > 0) {
            const allDiffText = allDiffs.map(d => d.diff).join("\n")
            const matched = matchEndpoints(allDiffText)
            matched.forEach(api => matchedApis.add(api.endpoint))
        }

        // Build AI prompt
        const sharedApisList = SHARED_APIS.map(a => `${a.method} ${a.endpoint} (${a.module} / ${a.name})`).join("\n")

        let analysisContext: string
        if (analysisMethod === "gitlab-diff" && allDiffs.length > 0) {
            const diffsText = allDiffs.map(d =>
                `--- File: ${d.path} (Commit: ${d.commitTitle}, Ticket: ${d.ticketKey}) ---\n${d.diff}`
            ).join("\n\n")

            analysisContext = isVi
                ? `## Phương pháp phân tích: GitLab Diff
## Số commits phân tích: ${allCommitShas_size(allDiffs)}
## Số file API-related: ${allDiffs.length}

### Danh sách 94 Shared APIs (Mobile sử dụng):
${sharedApisList}

### Code diffs từ các commit trong release:
${diffsText}

### API endpoints khớp sơ bộ:
${matchedApis.size > 0 ? [...matchedApis].join("\n") : "Không có endpoint nào khớp trực tiếp"}`
                : `## Analysis method: GitLab Diff
## Commits analyzed: ${new Set(allDiffs.map(d => d.commitTitle)).size}
## API-related files: ${allDiffs.length}

### 94 Shared APIs list (used by Mobile):
${sharedApisList}

### Code diffs from release commits:
${diffsText}

### Preliminary endpoint matches:
${matchedApis.size > 0 ? [...matchedApis].join("\n") : "No direct endpoint matches found"}`
        } else {
            // Jira-only analysis
            const issuesText = issues.map(i => `- [${i.key}] (${i.issueType}) ${i.summary}`).join("\n")
            const keywordMatches = issues.map(i => {
                const matches = matchKeywords(i.summary)
                return matches.length > 0 ? `${i.key}: ${matches.join(", ")}` : null
            }).filter(Boolean).join("\n")

            analysisContext = isVi
                ? `## Phương pháp: Phân tích Jira-only (không có GitLab)
## Lưu ý: Không có code diff — phân tích dựa trên tiêu đề và mô tả ticket

### Danh sách 94 Shared APIs (Mobile sử dụng):
${sharedApisList}

### Issues trong release:
${issuesText}

### Keyword matches sơ bộ:
${keywordMatches || "Không phát hiện keyword API nào"}`
                : `## Method: Jira-only analysis (no GitLab access)
## Note: No code diffs available — analysis based on ticket titles and descriptions

### 94 Shared APIs list (used by Mobile):
${sharedApisList}

### Issues in release:
${issuesText}

### Preliminary keyword matches:
${keywordMatches || "No API keywords detected"}`
        }

        // Group shared APIs by module for the verification summary
        const apisByModule: Record<string, { name: string; method: string; endpoint: string }[]> = {}
        for (const api of SHARED_APIS) {
            if (!apisByModule[api.module]) apisByModule[api.module] = []
            apisByModule[api.module].push({ name: api.name, method: api.method, endpoint: api.endpoint })
        }
        const modulesSummary = Object.entries(apisByModule)
            .map(([mod, apis]) => `- **${mod}** (${apis.length} APIs): ${apis.map(a => `\`${a.endpoint}\``).join(", ")}`)
            .join("\n")

        const systemPrompt = isVi
            ? `Bạn là chuyên gia phân tích API backend. Kiểm tra từng ticket trong release có ảnh hưởng đến 94 Shared API mà Mobile đang dùng hay không.

Output ĐÚNG 2 phần, theo thứ tự:

---

# Release v{versionId} — Kết quả

Nếu KHÔNG có API nào bị ảnh hưởng: ghi "✅ Không có Shared API nào bị ảnh hưởng trong release này." rồi chuyển sang phần 2.

Nếu CÓ API bị ảnh hưởng, với MỖI API trình bày:

### 🔴 \`METHOD /path\` — tên API
> 1-2 dòng mô tả ngắn gọn thay đổi là gì, ảnh hưởng Mobile thế nào.

| | Trước | Sau |
|---|---|---|
| **Input** | \`paramName: type\` | \`paramName: type\` (**MỚI**) |
| **Output** | \`fieldName: type\` | ~~\`fieldName\`~~ (**ĐÃ XÓA**) |

Dùng **in đậm** để highlight thay đổi, ~~gạch ngang~~ cho field bị xóa. Chỉ hiển thị field thay đổi, không liệt kê field giữ nguyên.

Dùng 🔴 cho breaking, 🟡 cho non-breaking.

---

# Chi tiết kiểm tra

## 📋 Quy trình

| # | Bước | Mô tả |
|---|---|---|
| 1 | 📥 Thu thập | Lấy {n} tickets từ Jira release v{versionId} |
| 2 | 🔍 Quét source | Tìm commits trên GitLab liên kết với từng ticket (hoặc ghi "Jira-only" nếu không có GitLab) |
| 3 | 📂 Lọc files | Lọc files liên quan API (Controller, DTO, Request, Response, Router) |
| 4 | 🔗 Đối chiếu | So khớp code diff với 94 Shared API endpoints của Mobile |
| 5 | 🤖 Phân tích | AI phân tích Input/Output thay đổi cho từng API khớp |

## 🎫 Kiểm tra từng ticket

| Ticket | Loại | Phạm vi | API liên quan | Kết luận |
|---|---|---|---|---|
| TVT-XXXX | Bug/Task | mô tả 1 dòng | tên API hoặc "—" | ✅/🔴/🟡 |

## 📑 Danh sách API đã đối chiếu (${SHARED_APIS.length} endpoints)
${modulesSummary}`
            : `You are a backend API analysis expert. Check each release ticket against the 94 Shared APIs used by Mobile.

Output EXACTLY 2 parts, in this order:

---

# Release v{versionId} — Results

If NO APIs are affected: write "✅ No Shared APIs affected in this release." then move to part 2.

If APIs ARE affected, for EACH affected API:

### 🔴 \`METHOD /path\` — API name
> 1-2 lines describing what changed and how it impacts Mobile.

| | Before | After |
|---|---|---|
| **Input** | \`paramName: type\` | \`paramName: type\` (**NEW**) |
| **Output** | \`fieldName: type\` | ~~\`fieldName\`~~ (**REMOVED**) |

Use **bold** to highlight changes, ~~strikethrough~~ for removed fields. Only show changed fields, not unchanged ones.

Use 🔴 for breaking, 🟡 for non-breaking.

---

# Verification Details

## 📋 Process

| # | Step | Description |
|---|---|---|
| 1 | 📥 Collect | Fetched {n} tickets from Jira release v{versionId} |
| 2 | 🔍 Scan source | Searched GitLab commits linked to each ticket (or "Jira-only" if no GitLab) |
| 3 | 📂 Filter files | Filtered API-related files (Controller, DTO, Request, Response, Router) |
| 4 | 🔗 Cross-reference | Matched code diffs against 94 Shared API endpoints used by Mobile |
| 5 | 🤖 Analyze | AI analyzed Input/Output changes for each matched API |

## 🎫 Per-ticket check

| Ticket | Type | Scope | Related API | Verdict |
|---|---|---|---|---|
| TVT-XXXX | Bug/Task | 1-line desc | API name or "—" | ✅/🔴/🟡 |

## 📑 APIs cross-referenced (${SHARED_APIS.length} endpoints)
${modulesSummary}`

        const userContent = analysisContext

        const aiModel = google("gemini-2.5-flash")

        const result = streamText({
            model: aiModel,
            system: systemPrompt,
            messages: [{ role: "user", content: userContent }],
            onFinish: async ({ text }) => {
                // Count breaking/non-breaking changes from the generated report
                const breakingCount = (text.match(/🔴/g) || []).length
                const nonBreakingCount = (text.match(/🟡/g) || []).length

                updateMobileApiReport(report.id, {
                    status: "completed",
                    reportMarkdown: text,
                    summary: {
                        breaking: Math.max(0, breakingCount - 1), // subtract section header
                        nonBreaking: Math.max(0, nonBreakingCount - 1),
                        noImpact: issues.length - Math.max(0, breakingCount - 1) - Math.max(0, nonBreakingCount - 1),
                    },
                })
            },
        })

        return result.toTextStreamResponse()
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        updateMobileApiReport(report.id, { status: "error", reportMarkdown: `Error: ${errorMessage}` })

        if (errorMessage.includes("API key") || errorMessage.includes("auth") || errorMessage.includes("401")) {
            return Response.json(
                { error: isVi ? "API key Gemini không hợp lệ. Vui lòng cấu hình GOOGLE_GENERATIVE_AI_API_KEY." : "Invalid Gemini API key. Please configure GOOGLE_GENERATIVE_AI_API_KEY." },
                { status: 401 }
            )
        }
        return Response.json({ error: `Analysis failed: ${errorMessage}` }, { status: 500 })
    }
}

// Helper to count unique commits from diffs
function allCommitShas_size(diffs: { commitTitle: string }[]): number {
    return new Set(diffs.map(d => d.commitTitle)).size
}
