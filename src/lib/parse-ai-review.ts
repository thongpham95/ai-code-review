/**
 * Parse AI review response into file-specific comments
 * Supports both English and Vietnamese AI responses
 */

export interface AIFileComment {
    fileName: string
    status: "ok" | "needs_changes" | "unknown"
    issues: AIIssue[]
    rawContent: string
}

export interface AIIssue {
    description: string
    line?: number
    currentCode?: string
    suggestedFix?: string
    severity: "error" | "warning" | "info" | "suggestion"
}

export interface ParsedAIReview {
    quickSummary?: string
    qualityScore?: number
    qualityReason?: string
    fileComments: AIFileComment[]
    rawMarkdown: string
}

/**
 * Parse the full AI response markdown into structured data
 */
export function parseAIReview(markdown: string): ParsedAIReview {
    const result: ParsedAIReview = {
        fileComments: [],
        rawMarkdown: markdown,
    }

    if (!markdown) return result

    // Extract Quick Summary (English & Vietnamese)
    const summaryMatch = markdown.match(
        /##\s*(?:Quick Summary|Tóm tắt nhanh)[:\s]*\n([^\n#]+)/i
    )
    if (summaryMatch) {
        result.quickSummary = summaryMatch[1].trim()
    }

    // Extract Quality Score
    const scoreMatch = markdown.match(
        /##\s*(?:Code Quality Score|Điểm chất lượng code)[:\s]*\n[^\d]*(\d+)[^\d]*\/?\s*10/i
    )
    if (scoreMatch) {
        result.qualityScore = parseInt(scoreMatch[1], 10)
    }

    // Extract file-by-file reviews
    // Pattern: ### 📄 `filename.ext` or ### `filename.ext` or ### filename.ext
    const filePattern = /###\s*(?:📄\s*)?[`']?([^`'\n]+\.[a-zA-Z0-9]+)[`']?\s*\n([\s\S]*?)(?=###\s*(?:📄\s*)?[`']?[^\n]+\.[a-zA-Z0-9]+|$)/gi

    let match
    while ((match = filePattern.exec(markdown)) !== null) {
        const fileName = match[1].trim()
        const content = match[2].trim()

        const fileComment: AIFileComment = {
            fileName,
            status: "unknown",
            issues: [],
            rawContent: content,
        }

        // Detect status
        if (/✅\s*OK|Status:\s*✅/i.test(content)) {
            fileComment.status = "ok"
        } else if (/⚠️|Needs Changes|Cần chỉnh sửa/i.test(content)) {
            fileComment.status = "needs_changes"
        }

        // Parse issues within this file section
        const issues = parseFileIssues(content)
        fileComment.issues = issues

        result.fileComments.push(fileComment)
    }

    return result
}

/**
 * Parse issues from a file section content
 */
function parseFileIssues(content: string): AIIssue[] {
    const issues: AIIssue[] = []

    // Pattern for structured issues (English & Vietnamese)
    // **Issue:** or **Vấn đề:** followed by description
    const issuePattern = /\*\*(?:Issue|Vấn đề)[:\s]*\*\*\s*([^\n]+)/gi
    const linePattern = /\*\*(?:Line|Dòng)[:\s]*\*\*\s*(\d+)/gi
    const currentCodePattern = /\*\*(?:Current code|Code hiện tại)[:\s]*\*\*\s*\n```[^\n]*\n([\s\S]*?)```/gi
    const suggestedPattern = /\*\*(?:Suggested fix|Đề xuất sửa)[:\s]*\*\*\s*\n```[^\n]*\n([\s\S]*?)```/gi

    // Find all issues
    let issueMatch
    const issueMatches: { index: number; description: string }[] = []

    while ((issueMatch = issuePattern.exec(content)) !== null) {
        issueMatches.push({
            index: issueMatch.index,
            description: issueMatch[1].trim(),
        })
    }

    // For each issue, try to find associated line number, code snippets
    for (let i = 0; i < issueMatches.length; i++) {
        const currentIssue = issueMatches[i]
        const nextIssueIndex = issueMatches[i + 1]?.index || content.length
        const issueSection = content.slice(currentIssue.index, nextIssueIndex)

        const issue: AIIssue = {
            description: currentIssue.description,
            severity: detectSeverity(currentIssue.description),
        }

        // Extract line number
        const lineMatch = /\*\*(?:Line|Dòng)[:\s]*\*\*\s*(\d+)/i.exec(issueSection)
        if (lineMatch) {
            issue.line = parseInt(lineMatch[1], 10)
        }

        // Extract current code
        const codeMatch = /\*\*(?:Current code|Code hiện tại)[:\s]*\*\*\s*\n```[^\n]*\n([\s\S]*?)```/i.exec(issueSection)
        if (codeMatch) {
            issue.currentCode = codeMatch[1].trim()
        }

        // Extract suggested fix
        const fixMatch = /\*\*(?:Suggested fix|Đề xuất sửa)[:\s]*\*\*\s*\n```[^\n]*\n([\s\S]*?)```/i.exec(issueSection)
        if (fixMatch) {
            issue.suggestedFix = fixMatch[1].trim()
        }

        issues.push(issue)
    }

    // If no structured issues found, look for bullet points
    if (issues.length === 0) {
        const bulletPattern = /^[-*]\s+(.+)$/gm
        let bulletMatch
        while ((bulletMatch = bulletPattern.exec(content)) !== null) {
            const text = bulletMatch[1].trim()
            // Skip if it's just "OK" or status indicator
            if (text.length > 10 && !/^✅|^Status/i.test(text)) {
                issues.push({
                    description: text,
                    severity: detectSeverity(text),
                })
            }
        }
    }

    return issues
}

/**
 * Detect issue severity based on keywords
 */
function detectSeverity(text: string): AIIssue["severity"] {
    const lowerText = text.toLowerCase()

    if (
        /error|lỗi|critical|security|injection|xss|vulnerability|bug|crash|null pointer|exception/i.test(lowerText)
    ) {
        return "error"
    }

    if (
        /warning|cảnh báo|deprecated|unused|inefficient|performance|memory leak/i.test(lowerText)
    ) {
        return "warning"
    }

    if (
        /suggest|đề xuất|recommend|consider|could|should|better|improve|refactor/i.test(lowerText)
    ) {
        return "suggestion"
    }

    return "info"
}

/**
 * Get file comment by filename (partial match supported)
 */
export function getFileComment(
    parsedReview: ParsedAIReview,
    fileName: string
): AIFileComment | null {
    // Exact match first
    const exact = parsedReview.fileComments.find(
        (fc) => fc.fileName === fileName
    )
    if (exact) return exact

    // Partial match (file might be referenced without full path)
    const partial = parsedReview.fileComments.find(
        (fc) =>
            fileName.endsWith(fc.fileName) ||
            fc.fileName.endsWith(fileName) ||
            fileName.includes(fc.fileName) ||
            fc.fileName.includes(fileName.split("/").pop() || "")
    )
    return partial || null
}
