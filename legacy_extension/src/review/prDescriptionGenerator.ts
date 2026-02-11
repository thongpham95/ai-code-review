import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { LLMService } from '../llm/llmService';
import { AuthService } from '../auth/authService';

export class PRDescriptionGenerator {
    private llm: LLMService;
    private auth: AuthService;

    constructor(llm: LLMService, auth: AuthService) {
        this.llm = llm;
        this.auth = auth;
    }

    /**
     * Tạo mô tả PR từ URL MR/PR.
     */
    async generateFromUrl(url: string): Promise<string> {
        const token = this.auth.getToken();
        if (!token) {
            throw new Error('Vui lòng đăng nhập trước.');
        }

        const parsed = this.parseUrl(url);
        let diffContent = '';
        let files: string[] = [];
        let mrTitle = '';

        if (parsed.platform === 'gitlab') {
            const host = parsed.host || vscode.workspace.getConfiguration('aiCodeReview')
                .get<string>('gitlabHost') || 'https://gitlab.com';

            // Lấy MR info
            const mrUrl = `${host}/api/v4/projects/${encodeURIComponent(parsed.project)}/merge_requests/${parsed.mrId}`;
            const mrResponse = await axios.get(mrUrl, {
                headers: { 'PRIVATE-TOKEN': token }
            });
            mrTitle = mrResponse.data.title || '';

            // Lấy diffs
            const diffUrl = `${host}/api/v4/projects/${encodeURIComponent(parsed.project)}/merge_requests/${parsed.mrId}/diffs`;
            const diffResponse = await axios.get(diffUrl, {
                headers: { 'PRIVATE-TOKEN': token }
            });
            diffContent = diffResponse.data.map((d: any) =>
                `--- ${d.old_path}\n+++ ${d.new_path}\n${d.diff}`
            ).join('\n\n');
            files = diffResponse.data.map((d: any) => d.new_path);

        } else if (parsed.platform === 'github') {
            // Lấy PR info
            const prUrl = `https://api.github.com/repos/${parsed.project}/pulls/${parsed.mrId}`;
            const prResponse = await axios.get(prUrl, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }
            });
            mrTitle = prResponse.data.title || '';

            // Lấy diffs
            const filesUrl = `https://api.github.com/repos/${parsed.project}/pulls/${parsed.mrId}/files`;
            const filesResponse = await axios.get(filesUrl, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }
            });
            diffContent = filesResponse.data.map((f: any) =>
                `--- ${f.filename}\n${f.patch || '(binary file)'}`
            ).join('\n\n');
            files = filesResponse.data.map((f: any) => f.filename);
        }

        // Gọi LLM để tạo mô tả
        const prompt = this.buildPrompt(mrTitle, files, diffContent);
        const description = await this.llm.chat(SYSTEM_PROMPT_PR_DESC, prompt);

        return description;
    }

    /**
     * Tạo mô tả PR từ Git diff local.
     */
    async generateFromWorkspace(rootPath: string): Promise<string> {
        try {
            const gitExt = vscode.extensions.getExtension('vscode.git');
            if (!gitExt) {
                throw new Error('Git extension không khả dụng.');
            }
            const git = gitExt.exports.getAPI(1);
            const repo = git.repositories[0];
            if (!repo) {
                throw new Error('Không tìm thấy git repository.');
            }

            const changes = [
                ...repo.state.workingTreeChanges,
                ...repo.state.indexChanges
            ];

            if (changes.length === 0) {
                throw new Error('Không có thay đổi nào trong workspace.');
            }

            const files = changes.map((c: any) => vscode.workspace.asRelativePath(c.uri));
            let diffContent = '';

            // Đọc nội dung thay đổi
            for (const change of changes) {
                try {
                    const filePath = change.uri.fsPath;
                    const content = fs.readFileSync(filePath, 'utf-8');
                    diffContent += `\n--- ${vscode.workspace.asRelativePath(change.uri)}\n${content.substring(0, 3000)}\n\n`;
                } catch { /* bỏ qua */ }
            }

            const prompt = this.buildPrompt('', files, diffContent);
            return await this.llm.chat(SYSTEM_PROMPT_PR_DESC, prompt);
        } catch (err: any) {
            throw new Error(`Lỗi phân tích workspace: ${err.message}`);
        }
    }

    /**
     * Ghi mô tả vào file PR_DESCRIPTION.md.
     */
    writeDescriptionFile(rootPath: string, description: string): string {
        const filePath = path.join(rootPath, 'PR_DESCRIPTION.md');
        fs.writeFileSync(filePath, description, 'utf-8');
        return filePath;
    }

    private buildPrompt(title: string, files: string[], diff: string): string {
        return `## Thông tin MR/PR
${title ? `**Tiêu đề**: ${title}\n` : ''}
**Files thay đổi (${files.length} files)**:
${files.map(f => `- ${f}`).join('\n')}

## Diff content (truncated):
\`\`\`diff
${diff.substring(0, 15000)}
\`\`\``;
    }

    private parseUrl(url: string): {
        platform: 'github' | 'gitlab';
        project: string;
        mrId: string;
        host?: string;
    } {
        const u = new URL(url);

        if (u.hostname === 'github.com' || u.hostname.includes('github')) {
            const match = u.pathname.match(/^\/([^/]+\/[^/]+)\/pull\/(\d+)/);
            if (match) {
                return { platform: 'github', project: match[1], mrId: match[2] };
            }
        }

        const mrMatch = u.pathname.match(/^\/(.+?)\/-\/merge_requests\/(\d+)/);
        if (mrMatch) {
            return {
                platform: 'gitlab',
                project: mrMatch[1],
                mrId: mrMatch[2],
                host: `${u.protocol}//${u.host}`
            };
        }

        throw new Error('URL không phải là MR/PR hợp lệ.');
    }
}

const SYSTEM_PROMPT_PR_DESC = `Bạn là một Senior Developer viết mô tả cho Merge Request / Pull Request.

Dựa trên diff được cung cấp, hãy tạo mô tả MR/PR chi tiết bằng tiếng Việt với format Markdown:

# [Tiêu đề ngắn gọn mô tả thay đổi]

## 📋 Tổng Quan
[Mô tả ngắn gọn mục đích của MR/PR này]

## 🔄 Thay Đổi Chính
- [Liệt kê các thay đổi quan trọng]

## 📁 Files Ảnh Hưởng
[Bảng liệt kê files và loại thay đổi]

| File | Thay Đổi |
|------|----------|
| path/to/file | Mô tả ngắn |

## 🧪 Hướng Dẫn Test
- [Các bước kiểm tra thay đổi này]

## ⚠️ Lưu Ý
[Các điểm cần chú ý khi review hoặc merge]

## 📈 Ảnh Hưởng
- [ ] Breaking changes: Có/Không
- [ ] Database migration: Có/Không
- [ ] Config changes: Có/Không

QUY TẮC:
- Viết ngắn gọn, chuyên nghiệp
- Tập trung vào WHY (tại sao) hơn WHAT (cái gì)
- Nêu rõ ảnh hưởng và rủi ro nếu có`;
