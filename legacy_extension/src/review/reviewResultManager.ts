import * as fs from 'fs';
import * as path from 'path';
import { LLMService, ReviewComment } from '../llm/llmService';

export interface FileReviewResult {
    filePath: string;
    comments: ReviewComment[];
}

export class ReviewResultManager {
    private llm: LLMService;

    constructor(llm: LLMService) {
        this.llm = llm;
    }

    /**
     * Self-Audit: LLM tự kiểm tra lại danh sách comments, loại bỏ noise.
     */
    async selfAudit(results: FileReviewResult[]): Promise<FileReviewResult[]> {
        const totalComments = results.reduce((sum, r) => sum + r.comments.length, 0);
        if (totalComments === 0) { return results; }

        // Serialize comments cho LLM
        const commentsSummary = results.map(r => ({
            file: r.filePath,
            comments: r.comments.map(c => ({
                line: c.line,
                severity: c.severity,
                comment: c.comment,
                suggestion: c.suggestion
            }))
        }));

        const auditPrompt = `Danh sách comments review cần kiểm tra lại:\n\n${JSON.stringify(commentsSummary, null, 2)}`;

        const auditedResponse = await this.llm.chat(SELF_AUDIT_PROMPT, auditPrompt);

        try {
            // Parse lại kết quả đã lọc
            const jsonMatch = auditedResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const audited = JSON.parse(jsonMatch[0]) as Array<{
                    file: string;
                    comments: ReviewComment[];
                }>;

                return audited
                    .filter(a => a.comments && a.comments.length > 0)
                    .map(a => ({
                        filePath: a.file,
                        comments: a.comments.filter((c: any) =>
                            typeof c.line === 'number' &&
                            typeof c.comment === 'string' &&
                            ['info', 'warning', 'error'].includes(c.severity)
                        )
                    }));
            }
        } catch {
            // Nếu parse thất bại, giữ nguyên
        }

        return results;
    }

    /**
     * Ghi kết quả review vào REVIEW_RESULT.md
     */
    writeResultFile(rootPath: string, results: FileReviewResult[], mrUrl?: string): string {
        const filePath = path.join(rootPath, 'REVIEW_RESULT.md');

        let content = `# 📋 Kết Quả Code Review\n\n`;
        content += `> **Thời gian**: ${new Date().toLocaleString('vi-VN')}\n`;
        if (mrUrl) {
            content += `> **Merge Request**: ${mrUrl}\n`;
        }
        content += `> **Trạng thái**: ⏳ Đang chờ duyệt\n\n`;
        content += `---\n\n`;

        const totalComments = results.reduce((sum, r) => sum + r.comments.length, 0);
        const errorCount = results.reduce((sum, r) => sum + r.comments.filter(c => c.severity === 'error').length, 0);
        const warningCount = results.reduce((sum, r) => sum + r.comments.filter(c => c.severity === 'warning').length, 0);
        const infoCount = results.reduce((sum, r) => sum + r.comments.filter(c => c.severity === 'info').length, 0);

        content += `## 📊 Tổng Kết\n\n`;
        content += `| Loại | Số lượng |\n`;
        content += `|------|----------|\n`;
        content += `| 🔴 Error | ${errorCount} |\n`;
        content += `| 🟡 Warning | ${warningCount} |\n`;
        content += `| 🔵 Info | ${infoCount} |\n`;
        content += `| **Tổng** | **${totalComments}** |\n\n`;

        if (totalComments === 0) {
            content += `✅ **Không tìm thấy vấn đề nào. Code đạt chất lượng tốt!**\n`;
        } else {
            content += `---\n\n## 📝 Chi Tiết Từng File\n\n`;

            for (const result of results) {
                if (result.comments.length === 0) { continue; }

                content += `### 📄 \`${result.filePath}\`\n\n`;

                for (const comment of result.comments) {
                    const icon = comment.severity === 'error' ? '🔴'
                        : comment.severity === 'warning' ? '🟡' : '🔵';

                    content += `#### ${icon} [${comment.severity.toUpperCase()}] Dòng ${comment.line}`;
                    if (comment.endLine) {
                        content += `-${comment.endLine}`;
                    }
                    content += `\n\n`;
                    content += `${comment.comment}\n\n`;

                    if (comment.suggestion) {
                        content += `**💡 Gợi ý:**\n\`\`\`\n${comment.suggestion}\n\`\`\`\n\n`;
                    }
                }

                content += `---\n\n`;
            }
        }

        content += `\n## ⚡ Hành Động\n\n`;
        content += `- Chạy lệnh **"AI Review: Duyệt & Đẩy Comment lên SCM"** để post comment lên Merge Request.\n`;
        content += `- Hoặc chỉnh sửa file này trước khi duyệt.\n`;

        fs.writeFileSync(filePath, content, 'utf-8');
        return filePath;
    }

    /**
     * Đọc REVIEW_RESULT.md và parse lại thành danh sách comments.
     */
    readResultFile(rootPath: string): FileReviewResult[] {
        const filePath = path.join(rootPath, 'REVIEW_RESULT.md');
        if (!fs.existsSync(filePath)) {
            throw new Error('Không tìm thấy file REVIEW_RESULT.md. Vui lòng chạy review trước.');
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const results: FileReviewResult[] = [];

        // Parse markdown sections
        const fileRegex = /### 📄 `(.+?)`/g;
        const sections = content.split(/### 📄 `/);

        for (let i = 1; i < sections.length; i++) {
            const section = sections[i];
            const filePathMatch = section.match(/^(.+?)`/);
            if (!filePathMatch) { continue; }
            const fp = filePathMatch[1];

            const comments: ReviewComment[] = [];
            const commentRegex = /#### (?:🔴|🟡|🔵) \[(ERROR|WARNING|INFO)\] Dòng (\d+)(?:-(\d+))?\n\n([\s\S]*?)(?=####|---|\n## |$)/g;
            let match;

            while ((match = commentRegex.exec(section)) !== null) {
                const severity = match[1].toLowerCase() as 'error' | 'warning' | 'info';
                const line = parseInt(match[2]);
                const endLine = match[3] ? parseInt(match[3]) : undefined;
                const body = match[4].trim();

                // Tách comment và suggestion
                const suggestionMatch = body.match(/\*\*💡 Gợi ý:\*\*\n```\n([\s\S]*?)\n```/);
                const comment = body.replace(/\*\*💡 Gợi ý:\*\*\n```[\s\S]*?```/, '').trim();
                const suggestion = suggestionMatch?.[1];

                comments.push({ line, endLine, comment, severity, suggestion });
            }

            if (comments.length > 0) {
                results.push({ filePath: fp, comments });
            }
        }

        return results;
    }
}

const SELF_AUDIT_PROMPT = `Bạn là một Tech Lead khó tính đang kiểm tra lại kết quả code review từ một reviewer khác.

NHIỆM VỤ: Lọc và cải thiện danh sách comments review.

QUY TẮC:
1. LOẠI BỎ những comment:
   - Không chính xác hoặc sai về mặt kỹ thuật
   - Quá chi tiết vụn vặt (nitpick) như styling, naming conventions nhỏ
   - Trùng lặp hoặc nói cùng một vấn đề
   - Không actionable (chỉ mô tả mà không đề xuất giải pháp)

2. GIỮ LẠI những comment:
   - Bug thực sự (logic errors, null pointer, security issues)
   - Performance problems nghiêm trọng
   - Thiếu error handling quan trọng
   - Vi phạm best practices có ảnh hưởng thực tế

3. CẢI THIỆN:
   - Viết lại comment cho rõ ràng, ngắn gọn hơn
   - Đảm bảo mỗi comment có gợi ý sửa cụ thể

TRẢ VỀ JSON ARRAY cùng format đầu vào (nhóm theo file):
[
  {
    "file": "path/to/file",
    "comments": [
      { "line": 10, "comment": "...", "severity": "error"|"warning"|"info", "suggestion": "..." }
    ]
  }
]

Nếu tất cả comments đều vụn vặt → trả về mảng rỗng: []`;
