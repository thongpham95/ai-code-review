import { google } from "@ai-sdk/google";
import { generateText, streamText } from "ai";
import { JiraService, type JiraConfig } from "@/lib/jira-service";
import { GitLabService } from "@/lib/gitlab-service";
import { GitHubService } from "@/lib/github-service";

/**
 * POST /api/jira/analyze
 * 
 * Receives a Jira ticket key + git config, fetches Jira issue info,
 * scans related source code from GitHub/GitLab, then runs AI analysis
 * using Gemini Flash (data gathering) + Gemini Pro (deep analysis).
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            ticketKey,
            jiraConfig,
            gitConfig,
            language = "vi",
        } = body as {
            ticketKey: string;
            jiraConfig: JiraConfig;
            gitConfig?: {
                provider: "github" | "gitlab" | "gitlab-selfhosted";
                token: string;
                repoUrl?: string;       // e.g. "owner/repo" for GitHub or "group/project" for GitLab
                baseUrl?: string;       // for self-hosted GitLab
            };
            language?: "vi" | "en";
        };

        if (!ticketKey || !jiraConfig?.host || !jiraConfig?.email || !jiraConfig?.apiToken) {
            return Response.json(
                { error: "Missing required fields: ticketKey and Jira credentials" },
                { status: 400 }
            );
        }

        // ─── Step 1: Fetch Jira issue data ───────────────────────────
        const jira = new JiraService(jiraConfig);
        let issueData;
        try {
            issueData = await jira.getIssue(ticketKey);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            return Response.json(
                { error: `Failed to fetch Jira issue: ${msg}` },
                { status: 400 }
            );
        }

        // Convert ADF description to plain text
        const description = JiraService.adfToText(issueData.fields.description);
        const comments = issueData.fields.comment?.comments?.map(c => ({
            author: c.author.displayName,
            body: typeof c.body === "string" ? c.body : JiraService.adfToText(c.body),
            created: c.created,
        })) || [];

        const linkedIssues = issueData.fields.issuelinks?.map(link => {
            const related = link.inwardIssue || link.outwardIssue;
            return related ? `${related.key}: ${related.fields.summary} (${related.fields.status.name})` : null;
        }).filter(Boolean) || [];

        // ─── Step 2: Gather source code from Git (if configured) ─────
        let sourceCodeContext = "";

        if (gitConfig?.token && gitConfig?.repoUrl) {
            try {
                // Extract keywords from the bug to search for relevant files
                const keywords = extractKeywords(issueData.fields.summary, description);

                if (gitConfig.provider === "github") {
                    sourceCodeContext = await fetchGitHubCodeContext(
                        gitConfig.token,
                        gitConfig.repoUrl,
                        keywords
                    );
                } else {
                    // GitLab or GitLab self-hosted
                    const baseUrl = gitConfig.baseUrl || "https://gitlab.com";
                    sourceCodeContext = await fetchGitLabCodeContext(
                        gitConfig.token,
                        gitConfig.repoUrl,
                        baseUrl,
                        keywords
                    );
                }
            } catch (e) {
                console.error("Error fetching source code:", e);
                sourceCodeContext = `[Could not fetch source code: ${e instanceof Error ? e.message : "Unknown error"}]`;
            }
        }

        // ─── Step 3: Build context data summary with Gemini Flash ────
        const jiraContext = buildJiraContext(issueData, description, comments, linkedIssues);
        const isVietnamese = language === "vi";

        // ─── Step 4: Deep analysis with Gemini Pro ──────────────────
        const systemPrompt = buildAnalysisSystemPrompt(isVietnamese);
        const userPrompt = buildAnalysisUserPrompt(
            ticketKey,
            jiraContext,
            sourceCodeContext,
            isVietnamese
        );

        const aiModel = google("gemini-2.5-pro");

        const result = streamText({
            model: aiModel,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error("Jira analyze error:", error);
        
        // Handle AI SDK / Gemini Quota Errors
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.toLowerCase().includes("exhausted")) {
            return Response.json(
                { error: "API quota exceeded. Please check your Gemini API limits, try again later, or configure a custom API key in Settings." },
                { status: 429 }
            );
        }
        
        return Response.json(
            { error: `Analysis failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}

// ═══════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════

function extractKeywords(summary: string, description: string): string[] {
    const text = `${summary} ${description}`.toLowerCase();
    // Remove noise words
    const stopWords = new Set([
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "shall",
        "should", "may", "might", "can", "could", "must", "need", "bug", "issue",
        "error", "fix", "when", "where", "what", "how", "why", "not", "this",
        "that", "with", "for", "from", "into", "and", "or", "but", "in", "on",
        "at", "to", "of", "if", "as", "by", "it", "its", "no", "so", "up",
        "lỗi", "khi", "không", "bị", "và", "các", "của", "cho", "được", "tại",
        "trong", "từ", "theo", "đến", "với", "là", "có", "một", "những", "này",
    ]);

    const words = text
        .replace(/[^a-zA-Z0-9àáạảãăắằẳẵặâấầẩẫậèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựýỳỵỷỹđ_.\-/]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

    // Get unique keywords, max 10
    return [...new Set(words)].slice(0, 10);
}

async function fetchGitHubCodeContext(
    token: string,
    repoPath: string, // "owner/repo"
    keywords: string[]
): Promise<string> {
    const github = new GitHubService("https://api.github.com", token);
    const [owner, repo] = repoPath.split("/");

    if (!owner || !repo) return "[Invalid GitHub repo path]";

    let context = "";
    const searchQuery = keywords.slice(0, 5).join("+");

    // Use GitHub code search API to find relevant files
    const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}+repo:${owner}/${repo}&per_page=5`;

    const searchRes = await fetch(searchUrl, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
        },
    });

    if (searchRes.ok) {
        const searchData = await searchRes.json();
        const files = searchData.items || [];

        for (const file of files.slice(0, 5)) {
            // Fetch raw file content
            const contentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`;
            const contentRes = await fetch(contentUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.raw+json",
                },
            });

            if (contentRes.ok) {
                const content = await contentRes.text();
                // Limit each file to 200 lines
                const lines = content.split("\n").slice(0, 200).join("\n");
                context += `\n### 📄 ${file.path}\n\`\`\`\n${lines}\n\`\`\`\n`;
            }
        }
    }

    return context || "[No relevant source files found via GitHub search]";
}

async function fetchGitLabCodeContext(
    token: string,
    projectPath: string,
    baseUrl: string,
    keywords: string[]
): Promise<string> {
    const encodedPath = encodeURIComponent(projectPath);
    let context = "";

    // Use GitLab search API to find relevant files
    for (const keyword of keywords.slice(0, 5)) {
        const searchUrl = `${baseUrl}/api/v4/projects/${encodedPath}/search?scope=blobs&search=${encodeURIComponent(keyword)}&per_page=3`;

        const searchRes = await fetch(searchUrl, {
            headers: {
                "PRIVATE-TOKEN": token,
                "Content-Type": "application/json",
            },
        });

        if (searchRes.ok) {
            const results = await searchRes.json();

            for (const result of results.slice(0, 2)) {
                // Avoid duplicates
                if (context.includes(result.filename)) continue;

                // Fetch full file content
                const filePath = encodeURIComponent(result.filename);
                const fileUrl = `${baseUrl}/api/v4/projects/${encodedPath}/repository/files/${filePath}/raw?ref=main`;

                const fileRes = await fetch(fileUrl, {
                    headers: { "PRIVATE-TOKEN": token },
                });

                if (fileRes.ok) {
                    const content = await fileRes.text();
                    const lines = content.split("\n").slice(0, 200).join("\n");
                    context += `\n### 📄 ${result.filename}\n\`\`\`\n${lines}\n\`\`\`\n`;
                }
            }
        }
    }

    return context || "[No relevant source files found via GitLab search]";
}

function buildJiraContext(
    issue: { key: string; fields: Record<string, unknown> },
    description: string,
    comments: { author: string; body: string; created: string }[],
    linkedIssues: (string | null)[]
): string {
    const f = issue.fields as Record<string, unknown>;
    const status = (f.status as { name: string })?.name || "Unknown";
    const priority = (f.priority as { name: string })?.name || "None";
    const assignee = (f.assignee as { displayName: string })?.displayName || "Unassigned";
    const reporter = (f.reporter as { displayName: string })?.displayName || "Unknown";
    const issueType = (f.issuetype as { name: string })?.name || "Bug";

    let context = `# Jira Ticket: ${issue.key}
**Type:** ${issueType}
**Summary:** ${(f.summary as string) || "N/A"}
**Status:** ${status}
**Priority:** ${priority}
**Assignee:** ${assignee}
**Reporter:** ${reporter}

## Description
${description || "No description provided."}
`;

    if (comments.length > 0) {
        context += `\n## Comments (${comments.length})\n`;
        for (const c of comments.slice(0, 10)) {
            context += `\n**${c.author}** (${new Date(c.created).toLocaleDateString()}):\n${c.body}\n`;
        }
    }

    if (linkedIssues.length > 0) {
        context += `\n## Linked Issues\n`;
        for (const link of linkedIssues) {
            context += `- ${link}\n`;
        }
    }

    return context;
}

function buildAnalysisSystemPrompt(isVietnamese: boolean): string {
    if (isVietnamese) {
        return `Bạn là một **Senior Developer** với nhiều năm kinh nghiệm debug và fix bug trong các hệ thống phức tạp. Nhiệm vụ của bạn là nhận bug từ Jira, phân tích sâu từ nhiều nguồn (tài liệu, source code, design), xác định root cause chính xác và đề xuất solution cụ thể mà developer có thể implement ngay.

## Mindset
Khi phân tích bug, bạn không chỉ nhìn vào hiện tượng bề mặt. Bạn đào sâu vào data flow, business logic, và architecture để hiểu TẠI SAO bug xảy ra, không chỉ bug xảy ra Ở ĐÂU. Mỗi solution phải đủ cụ thể để developer đọc xong là biết cần sửa gì, ở file nào, theo hướng nào.

## Format Output
Trả về dạng Markdown theo cấu trúc sau:

# Bug Analysis Report

## 1. Tổng quan
[Tóm tắt ngắn gọn bug: chức năng bị ảnh hưởng, kiến trúc liên quan]

## 2. Mô tả Bug
[Mô tả chính xác bug biểu hiện như thế nào dựa trên Jira ticket]

## 3. Steps to Reproduce
1. [Step 1]
2. [Step 2]
...

## 4. Root Cause Analysis
**File liên quan:** \`path/to/file\`
**Nguyên nhân:** [Giải thích chi tiết nguyên nhân gốc rễ trong code]

## 5. Solution đề xuất
**Mức độ ảnh hưởng:** CAO / TRUNG BÌNH / THẤP
**File cần sửa:** \`path/to/file\`

[Mô tả solution cụ thể, kèm code snippet]

\`\`\`language
// Code fix đề xuất
\`\`\`

## 6. Verification
[Cách kiểm tra sau khi fix]

## 7. Ghi chú
[Các lưu ý quan trọng cho developer]

---

**Lưu ý chất lượng:**
- Không đoán mò — nếu không chắc, liệt kê các khả năng và cách verify.
- Code snippet phải dựa trên source code thực tế đã phân tích.
- Luôn đề cập side effects có thể xảy ra.
- Luôn đề xuất cách verify fix không gây regression.`;
    }

    return `You are a **Senior Developer** with extensive experience debugging and fixing bugs in complex systems. Your task is to analyze bugs from Jira, perform deep analysis from multiple sources (docs, source code, design), identify exact root causes and propose specific solutions that developers can implement immediately.

## Mindset
When analyzing bugs, you don't just look at surface symptoms. You dig deep into data flow, business logic, and architecture to understand WHY bugs happen, not just WHERE. Each solution must be specific enough that a developer knows exactly what to change, in which file, and in what direction.

## Output Format
Return in Markdown with this structure:

# Bug Analysis Report

## 1. Overview
[Brief summary: affected functionality, related architecture]

## 2. Bug Description
[Exact bug manifestation based on Jira ticket]

## 3. Steps to Reproduce
1. [Step 1]
2. [Step 2]
...

## 4. Root Cause Analysis
**Related file:** \`path/to/file\`
**Cause:** [Detailed root cause explanation in code]

## 5. Proposed Solution
**Impact Level:** HIGH / MEDIUM / LOW
**Files to change:** \`path/to/file\`

[Specific solution description with code snippet]

\`\`\`language
// Proposed code fix
\`\`\`

## 6. Verification
[How to verify after fix]

## 7. Notes
[Important notes for developers]

---

**Quality notes:**
- Don't guess — if uncertain, list possibilities and how to verify each.
- Code snippets must be based on actual analyzed source code.
- Always mention potential side effects.
- Always suggest how to verify fix doesn't cause regressions.`;
}

function buildAnalysisUserPrompt(
    ticketKey: string,
    jiraContext: string,
    sourceCodeContext: string,
    isVietnamese: boolean
): string {
    const codeSection = sourceCodeContext
        ? `\n\n---\n\n# Source Code Context\nCác file source code liên quan đã được tìm thấy từ repository:\n${sourceCodeContext}`
        : "";

    if (isVietnamese) {
        return `Hãy phân tích bug ticket **${ticketKey}** dưới đây và đưa ra root cause analysis + solution fix cụ thể.

${jiraContext}
${codeSection}

Hãy phân tích theo cấu trúc đã quy định trong system prompt. Viết toàn bộ bằng tiếng Việt.`;
    }

    return `Analyze the bug ticket **${ticketKey}** below and provide root cause analysis + specific fix solution.

${jiraContext}
${codeSection}

Follow the structure defined in the system prompt. Write the full analysis in English.`;
}
