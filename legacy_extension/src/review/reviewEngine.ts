import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LLMService, ReviewComment } from '../llm/llmService';
import { AuthService } from '../auth/authService';
import { ReviewResultManager, FileReviewResult } from './reviewResultManager';

export class ReviewEngine {
    private llm: LLMService;
    private auth: AuthService;
    private resultManager: ReviewResultManager;

    constructor(llm: LLMService, auth: AuthService) {
        this.llm = llm;
        this.auth = auth;
        this.resultManager = new ReviewResultManager(llm);
    }

    /**
     * Chạy review trên workspace.
     * Kết quả ghi vào REVIEW_RESULT.md (KHÔNG tạo comment trong editor).
     * @param rootPath Đường dẫn thư mục gốc
     * @param mode 'diff' (chỉ review thay đổi) hoặc 'full' (toàn bộ file quan trọng)
     * @param mrUrl URL MR/PR (optional, để ghi vào REVIEW_RESULT.md)
     * @returns Đường dẫn file REVIEW_RESULT.md
     */
    async runReview(rootPath: string, mode: 'diff' | 'full', mrUrl?: string): Promise<string> {
        // Lấy danh sách file cần review
        let filesToReview: string[];
        if (mode === 'diff') {
            filesToReview = await this.getChangedFiles(rootPath);
        } else {
            filesToReview = this.getReviewableFiles(rootPath);
        }

        if (filesToReview.length === 0) {
            vscode.window.showInformationMessage('Không tìm thấy file nào cần review.');
            return '';
        }

        // Đọc Review Plan nếu có
        let reviewPlanContext = '';
        const planPath = path.join(rootPath, 'REVIEW_PLAN.md');
        if (fs.existsSync(planPath)) {
            reviewPlanContext = fs.readFileSync(planPath, 'utf-8');
        }

        const allResults: FileReviewResult[] = [];

        // Bước 1: Review từng file → Draft comments
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'AI Code Review',
                cancellable: true
            },
            async (progress, cancelToken) => {
                for (let i = 0; i < filesToReview.length; i++) {
                    if (cancelToken.isCancellationRequested) { break; }

                    const file = filesToReview[i];
                    progress.report({
                        message: `[Bước 1/2] Đang review (${i + 1}/${filesToReview.length}): ${path.basename(file)}`,
                        increment: (80 / filesToReview.length)
                    });

                    try {
                        const comments = await this.reviewFile(rootPath, file, reviewPlanContext);
                        if (comments.length > 0) {
                            allResults.push({ filePath: file, comments });
                        }
                    } catch (err: any) {
                        console.error(`Lỗi review file ${file}:`, err.message);
                    }
                }

                // Bước 2: Self-Audit — LLM tự lọc comments
                if (allResults.length > 0) {
                    progress.report({
                        message: '[Bước 2/2] Self-Audit: Đang lọc comments...',
                        increment: 10
                    });

                    try {
                        const auditedResults = await this.resultManager.selfAudit(allResults);
                        // Ghi kết quả đã lọc
                        const resultPath = this.resultManager.writeResultFile(rootPath, auditedResults, mrUrl);
                        progress.report({ message: '✅ Hoàn tất!', increment: 10 });
                        return resultPath;
                    } catch {
                        // Nếu self-audit lỗi, ghi kết quả chưa lọc
                        const resultPath = this.resultManager.writeResultFile(rootPath, allResults, mrUrl);
                        return resultPath;
                    }
                } else {
                    const resultPath = this.resultManager.writeResultFile(rootPath, [], mrUrl);
                    return resultPath;
                }
            }
        );

        // Ghi kết quả ra file (backup nếu withProgress không return)
        const resultPath = path.join(rootPath, 'REVIEW_RESULT.md');
        if (!fs.existsSync(resultPath)) {
            this.resultManager.writeResultFile(rootPath, allResults, mrUrl);
        }

        return resultPath;
    }

    /**
     * Review một file cụ thể: đọc nội dung, gửi cho LLM, trả về comments.
     */
    private async reviewFile(
        rootPath: string,
        relativePath: string,
        reviewPlanContext: string
    ): Promise<ReviewComment[]> {
        const fullPath = path.join(rootPath, relativePath);
        const content = fs.readFileSync(fullPath, 'utf-8');

        const lines = content.split('\n');
        const chunks = this.chunkFile(lines, relativePath);
        const allComments: ReviewComment[] = [];

        for (const chunk of chunks) {
            const prompt = this.buildReviewPrompt(relativePath, chunk.content, reviewPlanContext);
            const response = await this.llm.chat(SYSTEM_PROMPT_REVIEWER, prompt);

            const comments = this.parseReviewComments(response);

            // Adjust line numbers based on chunk offset
            for (const comment of comments) {
                comment.line = chunk.startLine + comment.line - 1;
                if (comment.endLine) {
                    comment.endLine = chunk.startLine + comment.endLine - 1;
                }
                allComments.push(comment);
            }
        }

        return allComments;
    }

    /**
     * Chia file thành các chunk nhỏ hơn để LLM xử lý.
     */
    private chunkFile(
        lines: string[],
        filePath: string
    ): Array<{ content: string; startLine: number }> {
        const MAX_CHUNK_LINES = 200;
        const chunks: Array<{ content: string; startLine: number }> = [];

        if (lines.length <= MAX_CHUNK_LINES) {
            chunks.push({ content: lines.join('\n'), startLine: 1 });
        } else {
            for (let i = 0; i < lines.length; i += MAX_CHUNK_LINES) {
                const chunkLines = lines.slice(i, i + MAX_CHUNK_LINES);
                chunks.push({
                    content: chunkLines.map((l, idx) => `${i + idx + 1}: ${l}`).join('\n'),
                    startLine: i + 1
                });
            }
        }

        return chunks;
    }

    /**
     * Lấy danh sách file thay đổi (cho Diff mode) qua git.
     */
    private async getChangedFiles(rootPath: string): Promise<string[]> {
        try {
            const gitExt = vscode.extensions.getExtension('vscode.git');
            if (!gitExt) { return []; }
            const git = gitExt.exports.getAPI(1);
            const repo = git.repositories[0];
            if (!repo) { return []; }

            const changes = [
                ...repo.state.workingTreeChanges,
                ...repo.state.indexChanges
            ];

            return changes
                .map((c: any) => vscode.workspace.asRelativePath(c.uri))
                .filter((f: string) => this.isReviewableExtension(f));
        } catch {
            return [];
        }
    }

    /**
     * Lấy tất cả file có thể review (cho Full Audit mode).
     */
    private getReviewableFiles(rootPath: string, relativePath = ''): string[] {
        const IGNORE_DIRS = new Set([
            'node_modules', '.git', 'dist', 'build', 'out', '.next',
            '__pycache__', '.venv', 'venv', 'target', 'coverage'
        ]);

        const fullPath = path.join(rootPath, relativePath);
        const entries = fs.readdirSync(fullPath, { withFileTypes: true });
        let files: string[] = [];

        for (const entry of entries) {
            if (entry.name.startsWith('.')) { continue; }
            if (IGNORE_DIRS.has(entry.name)) { continue; }

            const entryRel = relativePath ? `${relativePath}/${entry.name}` : entry.name;

            if (entry.isDirectory()) {
                files.push(...this.getReviewableFiles(rootPath, entryRel));
            } else if (this.isReviewableExtension(entry.name)) {
                files.push(entryRel);
            }
        }

        return files;
    }

    private isReviewableExtension(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return [
            '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.kt',
            '.go', '.rs', '.rb', '.php', '.cs', '.cpp', '.c',
            '.vue', '.svelte', '.swift', '.dart'
        ].includes(ext);
    }

    /**
     * Parse output từ LLM thành mảng ReviewComment.
     */
    private parseReviewComments(response: string): ReviewComment[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.filter((c: any) =>
                    typeof c.line === 'number' &&
                    typeof c.comment === 'string' &&
                    ['info', 'warning', 'error'].includes(c.severity)
                );
            }
        } catch { /* fallback */ }

        // Fallback: parse line-based format
        const comments: ReviewComment[] = [];
        const lineRegex = /(?:line|dòng)\s*(\d+)(?:\s*-\s*(\d+))?[:\s]*(.+)/gi;
        let match;

        while ((match = lineRegex.exec(response)) !== null) {
            comments.push({
                line: parseInt(match[1]),
                endLine: match[2] ? parseInt(match[2]) : undefined,
                comment: match[3].trim(),
                severity: response.toLowerCase().includes('error') || response.toLowerCase().includes('lỗi')
                    ? 'warning' : 'info'
            });
        }

        return comments;
    }

    getResultManager(): ReviewResultManager {
        return this.resultManager;
    }

    private buildReviewPrompt(filePath: string, content: string, reviewPlan: string): string {
        const lang = vscode.workspace.getConfiguration('aiCodeReview')
            .get<string>('reviewLanguage') || 'vi';

        return `## File: ${filePath}
${reviewPlan ? `\n## Ngữ cảnh kế hoạch review:\n${reviewPlan.substring(0, 2000)}\n` : ''}
## Nội dung code:
\`\`\`
${content}
\`\`\`

Hãy review code trên và trả về kết quả dạng JSON.
Ngôn ngữ comment: ${lang === 'vi' ? 'Tiếng Việt' : 'English'}`;
    }
}

const SYSTEM_PROMPT_REVIEWER = `Bạn là một Senior Technical Lead đang review code.

NHIỆM VỤ: Review đoạn code được cung cấp và tìm:
1. 🔴 BUG / LỖI NGHIÊM TRỌNG: Lỗi logic, null pointer, race condition, SQL injection, v.v.
2. 🟡 CẢNH BÁO: Code smell, anti-pattern, performance issues, thiếu error handling
3. 🔵 GỢI Ý: Cải thiện readability, naming, best practices

QUAN TRỌNG:
- Chỉ comment khi THỰC SỰ có vấn đề. KHÔNG comment vào code đúng để tránh noise.
- Ưu tiên chất lượng hơn số lượng.
- Comment ngắn gọn, trực tiếp, actionable.

TRẢ VỀ JSON ARRAY:
[
  {
    "line": <số dòng>,
    "endLine": <số dòng kết thúc (optional)>,
    "comment": "<nhận xét>",
    "severity": "error" | "warning" | "info",
    "suggestion": "<code gợi ý sửa (optional)>"
  }
]

Nếu code tốt, không có vấn đề → trả về mảng rỗng: []`;
