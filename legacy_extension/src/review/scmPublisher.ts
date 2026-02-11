import * as vscode from 'vscode';
import axios from 'axios';
import { AuthService } from '../auth/authService';
import { FileReviewResult } from './reviewResultManager';

export interface SCMTarget {
    platform: 'gitlab' | 'github';
    project: string;  // e.g., "user/repo" or "group/subgroup/repo"
    mrId: string;      // MR/PR number
    host?: string;     // for self-managed GitLab
}

export class SCMPublisher {
    private auth: AuthService;

    constructor(auth: AuthService) {
        this.auth = auth;
    }

    /**
     * Hỏi người dùng nhập URL MR/PR rồi parse.
     */
    async promptForTarget(): Promise<SCMTarget | null> {
        const url = await vscode.window.showInputBox({
            prompt: 'Dán URL Merge Request / Pull Request để post comment',
            placeHolder: 'https://gitlab.com/user/repo/-/merge_requests/1',
            validateInput: (value) => {
                if (!value) { return 'URL không được để trống'; }
                try {
                    new URL(value);
                    return null;
                } catch {
                    return 'URL không hợp lệ';
                }
            }
        });

        if (!url) { return null; }
        return this.parseUrl(url);
    }

    /**
     * Post comments lên SCM (GitLab MR hoặc GitHub PR).
     */
    async publishComments(target: SCMTarget, results: FileReviewResult[]): Promise<{ success: number; failed: number }> {
        const token = this.auth.getToken();
        if (!token) {
            throw new Error('Chưa đăng nhập. Vui lòng đăng nhập trước.');
        }

        const session = this.auth.getCurrentSession();
        let success = 0;
        let failed = 0;

        if (target.platform === 'gitlab') {
            for (const result of results) {
                for (const comment of result.comments) {
                    try {
                        await this.postGitLabComment(target, token, result.filePath, comment);
                        success++;
                    } catch (err: any) {
                        console.error(`Lỗi post comment: ${err.message}`);
                        failed++;
                    }
                }
            }
        } else if (target.platform === 'github') {
            // GitHub: post tất cả comments trong 1 review
            try {
                await this.postGitHubReview(target, token, results);
                success = results.reduce((sum, r) => sum + r.comments.length, 0);
            } catch (err: any) {
                console.error(`Lỗi post GitHub review: ${err.message}`);
                failed = results.reduce((sum, r) => sum + r.comments.length, 0);
            }
        }

        return { success, failed };
    }

    /**
     * Post comment lên GitLab MR dưới dạng Discussion.
     */
    private async postGitLabComment(
        target: SCMTarget,
        token: string,
        filePath: string,
        comment: { line: number; comment: string; severity: string; suggestion?: string }
    ): Promise<void> {
        const host = target.host || vscode.workspace.getConfiguration('aiCodeReview')
            .get<string>('gitlabHost') || 'https://gitlab.com';

        const icon = comment.severity === 'error' ? '🔴'
            : comment.severity === 'warning' ? '🟡' : '🔵';

        let body = `${icon} **[${comment.severity.toUpperCase()}]** ${comment.comment}`;
        if (comment.suggestion) {
            body += `\n\n💡 **Gợi ý:**\n\`\`\`suggestion:-0+0\n${comment.suggestion}\n\`\`\``;
        }
        body += `\n\n---\n_Comment được tạo bởi AI Code Review Extension_`;

        const apiUrl = `${host}/api/v4/projects/${encodeURIComponent(target.project)}/merge_requests/${target.mrId}/discussions`;

        await axios.post(apiUrl, {
            body,
            position: {
                base_sha: 'HEAD~1',
                start_sha: 'HEAD~1',
                head_sha: 'HEAD',
                position_type: 'text',
                new_path: filePath,
                new_line: comment.line
            }
        }, {
            headers: { 'PRIVATE-TOKEN': token, 'Content-Type': 'application/json' }
        });
    }

    /**
     * Post review comments lên GitHub PR.
     */
    private async postGitHubReview(
        target: SCMTarget,
        token: string,
        results: FileReviewResult[]
    ): Promise<void> {
        const comments = results.flatMap(r =>
            r.comments.map(c => {
                const icon = c.severity === 'error' ? '🔴'
                    : c.severity === 'warning' ? '🟡' : '🔵';

                let body = `${icon} **[${c.severity.toUpperCase()}]** ${c.comment}`;
                if (c.suggestion) {
                    body += `\n\n💡 **Gợi ý:**\n\`\`\`suggestion\n${c.suggestion}\n\`\`\``;
                }

                return {
                    path: r.filePath,
                    line: c.line,
                    body
                };
            })
        );

        const apiUrl = `https://api.github.com/repos/${target.project}/pulls/${target.mrId}/reviews`;

        await axios.post(apiUrl, {
            event: 'COMMENT',
            body: '🤖 **AI Code Review** - Đánh giá tự động bởi AI Code Review Extension',
            comments
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Post comment đơn giản lên GitLab MR (không require position — fallback).
     */
    async postSimpleGitLabComment(
        target: SCMTarget,
        token: string,
        body: string
    ): Promise<void> {
        const host = target.host || vscode.workspace.getConfiguration('aiCodeReview')
            .get<string>('gitlabHost') || 'https://gitlab.com';

        const apiUrl = `${host}/api/v4/projects/${encodeURIComponent(target.project)}/merge_requests/${target.mrId}/notes`;

        await axios.post(apiUrl, { body }, {
            headers: { 'PRIVATE-TOKEN': token, 'Content-Type': 'application/json' }
        });
    }

    /**
     * Parse URL Merge Request/Pull Request.
     */
    parseUrl(url: string): SCMTarget {
        const u = new URL(url);

        // GitHub
        if (u.hostname === 'github.com' || u.hostname.includes('github')) {
            const match = u.pathname.match(/^\/([^/]+\/[^/]+)\/pull\/(\d+)/);
            if (match) {
                return { platform: 'github', project: match[1], mrId: match[2] };
            }
            throw new Error('URL GitHub không phải là Pull Request. Ví dụ: https://github.com/user/repo/pull/1');
        }

        // GitLab (bao gồm self-managed)
        const mrMatch = u.pathname.match(/^\/(.+?)\/-\/merge_requests\/(\d+)/);
        if (mrMatch) {
            return {
                platform: 'gitlab',
                project: mrMatch[1],
                mrId: mrMatch[2],
                host: `${u.protocol}//${u.host}`
            };
        }

        throw new Error('URL không phải là Merge Request hoặc Pull Request hợp lệ.');
    }

    /**
     * Format toàn bộ kết quả review thành 1 comment markdown (fallback).
     */
    formatReviewAsSingleComment(results: FileReviewResult[]): string {
        let body = `## 🤖 AI Code Review\n\n`;
        const totalComments = results.reduce((sum, r) => sum + r.comments.length, 0);

        if (totalComments === 0) {
            body += `✅ Không tìm thấy vấn đề nào. Code đạt chất lượng tốt!\n`;
            return body;
        }

        for (const result of results) {
            if (result.comments.length === 0) { continue; }

            body += `### 📄 \`${result.filePath}\`\n\n`;

            for (const comment of result.comments) {
                const icon = comment.severity === 'error' ? '🔴'
                    : comment.severity === 'warning' ? '🟡' : '🔵';

                body += `- ${icon} **Dòng ${comment.line}**: ${comment.comment}\n`;
                if (comment.suggestion) {
                    body += `  💡 \`${comment.suggestion}\`\n`;
                }
            }
            body += `\n`;
        }

        body += `\n---\n_Tạo bởi AI Code Review Extension_`;
        return body;
    }
}
