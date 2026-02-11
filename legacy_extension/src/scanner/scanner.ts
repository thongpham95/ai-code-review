import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LLMService } from '../llm/llmService';
import { AuthService } from '../auth/authService';
import axios from 'axios';

export interface ScanResult {
    fileTree: string;
    configFiles: Record<string, string>;
    techStackSummary: string;
    reviewPlan: string;
    totalFiles: number;
    languages: string[];
}

/** Các file cấu hình quan trọng cần đọc để phân tích */
const CONFIG_FILES = [
    'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'tsconfig.json', 'jsconfig.json',
    '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml',
    '.prettierrc', '.prettierrc.json',
    'pom.xml', 'build.gradle', 'build.gradle.kts',
    'requirements.txt', 'Pipfile', 'pyproject.toml', 'setup.py', 'setup.cfg',
    'Cargo.toml',
    'go.mod', 'go.sum',
    'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
    '.env.example', '.env.sample',
    'Makefile', 'CMakeLists.txt',
    'README.md', 'CONTRIBUTING.md',
    'angular.json', 'next.config.js', 'next.config.mjs', 'nuxt.config.ts',
    'vite.config.ts', 'vite.config.js', 'webpack.config.js',
    '.github/workflows/*.yml', '.gitlab-ci.yml'
];

/** Thư mục cần bỏ qua */
const IGNORE_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', 'out', '.next',
    '__pycache__', '.venv', 'venv', 'target', '.idea', '.vscode',
    'vendor', 'coverage', '.nyc_output', '.cache', '.turbo'
]);

/** Extension → Ngôn ngữ mapping */
const EXT_LANG_MAP: Record<string, string> = {
    '.ts': 'TypeScript', '.tsx': 'TypeScript (React)',
    '.js': 'JavaScript', '.jsx': 'JavaScript (React)',
    '.py': 'Python', '.java': 'Java', '.kt': 'Kotlin',
    '.go': 'Go', '.rs': 'Rust', '.rb': 'Ruby',
    '.php': 'PHP', '.cs': 'C#', '.cpp': 'C++', '.c': 'C',
    '.swift': 'Swift', '.dart': 'Dart',
    '.vue': 'Vue', '.svelte': 'Svelte',
    '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS',
    '.sql': 'SQL', '.sh': 'Shell'
};

export class Scanner {
    private llm: LLMService;

    constructor(llm: LLMService) {
        this.llm = llm;
    }

    /**
     * Quét workspace cục bộ.
     */
    async scanWorkspace(rootPath: string): Promise<ScanResult> {
        // 1. Duyệt file tree
        const { tree, files, langCount } = this.walkDirectory(rootPath, '', 0);

        // 2. Đọc config files
        const configFiles: Record<string, string> = {};
        for (const file of files) {
            const basename = path.basename(file);
            if (CONFIG_FILES.includes(basename)) {
                try {
                    const content = fs.readFileSync(path.join(rootPath, file), 'utf-8');
                    // Giới hạn kích thước để tiết kiệm token
                    configFiles[file] = content.length > 5000
                        ? content.substring(0, 5000) + '\n... (truncated)'
                        : content;
                } catch { /* bỏ qua file không đọc được */ }
            }
        }

        // 3. Tính ngôn ngữ chính
        const languages = Object.entries(langCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([lang]) => lang);

        // 4. Gọi LLM phân tích
        const analysisPrompt = this.buildAnalysisPrompt(tree, configFiles, languages);
        const techStackSummary = await this.llm.chat(
            SYSTEM_PROMPT_SCANNER,
            analysisPrompt
        );

        // 5. Tạo Review Plan
        const reviewPlan = await this.llm.chat(
            SYSTEM_PROMPT_PLANNER,
            `Dựa trên phân tích sau, tạo kế hoạch review chi tiết bằng tiếng Việt:\n\n${techStackSummary}\n\nFile tree:\n${tree}\n\nTổng số file: ${files.length}\nNgôn ngữ chính: ${languages.join(', ')}`
        );

        return {
            fileTree: tree,
            configFiles,
            techStackSummary,
            reviewPlan,
            totalFiles: files.length,
            languages
        };
    }

    /**
     * Quét từ URL (MR/PR/Repo).
     */
    async scanFromUrl(url: string, auth: AuthService): Promise<ScanResult> {
        const parsed = this.parseUrl(url);
        const token = auth.getToken();

        if (!token) {
            throw new Error('Vui lòng đăng nhập trước khi review từ URL.');
        }

        let files: string[] = [];
        let diffContent = '';

        if (parsed.type === 'merge_request' && parsed.platform === 'gitlab') {
            // Lấy diff từ GitLab MR
            const host = vscode.workspace.getConfiguration('aiCodeReview')
                .get<string>('gitlabHost') || 'https://gitlab.com';
            const apiUrl = `${host}/api/v4/projects/${encodeURIComponent(parsed.project!)}/merge_requests/${parsed.mrId}/diffs`;
            const response = await axios.get(apiUrl, {
                headers: { 'PRIVATE-TOKEN': token }
            });
            diffContent = response.data.map((d: any) =>
                `--- ${d.old_path}\n+++ ${d.new_path}\n${d.diff}`
            ).join('\n\n');
            files = response.data.map((d: any) => d.new_path);
        } else if (parsed.type === 'pull_request' && parsed.platform === 'github') {
            // Lấy diff từ GitHub PR
            const apiUrl = `https://api.github.com/repos/${parsed.project}/pulls/${parsed.mrId}/files`;
            const response = await axios.get(apiUrl, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }
            });
            diffContent = response.data.map((f: any) =>
                `--- ${f.filename}\n${f.patch || '(binary file)'}`
            ).join('\n\n');
            files = response.data.map((f: any) => f.filename);
        } else {
            throw new Error('Chỉ hỗ trợ URL Merge Request (GitLab) hoặc Pull Request (GitHub).');
        }

        // Phân tích diff bằng LLM
        const techStackSummary = await this.llm.chat(
            SYSTEM_PROMPT_SCANNER,
            `Phân tích diff sau đây từ ${parsed.platform} ${parsed.type}:\n\nFiles thay đổi: ${files.join(', ')}\n\nDiff:\n${diffContent.substring(0, 10000)}`
        );

        const reviewPlan = await this.llm.chat(
            SYSTEM_PROMPT_PLANNER,
            `Dựa trên phân tích diff từ ${parsed.platform}:\n\n${techStackSummary}\n\nFiles thay đổi:\n${files.join('\n')}`
        );

        return {
            fileTree: files.join('\n'),
            configFiles: {},
            techStackSummary,
            reviewPlan,
            totalFiles: files.length,
            languages: []
        };
    }

    /**
     * Duyệt đệ quy cây thư mục, trả về tree string + danh sách files.
     */
    private walkDirectory(
        rootPath: string,
        relativePath: string,
        depth: number
    ): { tree: string; files: string[]; langCount: Record<string, number> } {
        const fullPath = path.join(rootPath, relativePath);
        const entries = fs.readdirSync(fullPath, { withFileTypes: true });
        let tree = '';
        let files: string[] = [];
        const langCount: Record<string, number> = {};
        const indent = '  '.repeat(depth);

        // Sắp xếp: thư mục trước, file sau
        entries.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) { return -1; }
            if (!a.isDirectory() && b.isDirectory()) { return 1; }
            return a.name.localeCompare(b.name);
        });

        for (const entry of entries) {
            if (entry.name.startsWith('.') && entry.name !== '.env.example') { continue; }
            if (IGNORE_DIRS.has(entry.name)) { continue; }

            const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

            if (entry.isDirectory()) {
                tree += `${indent}📁 ${entry.name}/\n`;
                if (depth < 4) { // Giới hạn độ sâu
                    const sub = this.walkDirectory(rootPath, entryRelPath, depth + 1);
                    tree += sub.tree;
                    files.push(...sub.files);
                    for (const [lang, count] of Object.entries(sub.langCount)) {
                        langCount[lang] = (langCount[lang] || 0) + count;
                    }
                }
            } else {
                tree += `${indent}📄 ${entry.name}\n`;
                files.push(entryRelPath);

                const ext = path.extname(entry.name).toLowerCase();
                if (EXT_LANG_MAP[ext]) {
                    langCount[EXT_LANG_MAP[ext]] = (langCount[EXT_LANG_MAP[ext]] || 0) + 1;
                }
            }
        }

        return { tree, files, langCount };
    }

    /**
     * Phân tích URL để xác định platform và loại resource.
     */
    private parseUrl(url: string): {
        platform: 'github' | 'gitlab' | 'bitbucket';
        type: 'merge_request' | 'pull_request' | 'repository';
        project?: string;
        mrId?: string;
    } {
        const u = new URL(url);

        if (u.hostname === 'github.com' || u.hostname.includes('github')) {
            const match = u.pathname.match(/^\/([^/]+\/[^/]+)\/pull\/(\d+)/);
            if (match) {
                return { platform: 'github', type: 'pull_request', project: match[1], mrId: match[2] };
            }
            const repoMatch = u.pathname.match(/^\/([^/]+\/[^/]+)/);
            return { platform: 'github', type: 'repository', project: repoMatch?.[1] };
        }

        // GitLab (bao gồm self-managed)
        const mrMatch = u.pathname.match(/^\/(.+?)\/-\/merge_requests\/(\d+)/);
        if (mrMatch) {
            return { platform: 'gitlab', type: 'merge_request', project: mrMatch[1], mrId: mrMatch[2] };
        }

        const glRepoMatch = u.pathname.match(/^\/(.+?)(?:\.git)?$/);
        return { platform: 'gitlab', type: 'repository', project: glRepoMatch?.[1] };
    }

    private buildAnalysisPrompt(tree: string, configs: Record<string, string>, languages: string[]): string {
        let prompt = `## Cấu trúc dự án:\n\`\`\`\n${tree}\n\`\`\`\n\n`;
        prompt += `## Ngôn ngữ phát hiện: ${languages.join(', ')}\n\n`;
        prompt += `## Nội dung các file cấu hình:\n`;

        for (const [file, content] of Object.entries(configs)) {
            prompt += `\n### ${file}\n\`\`\`\n${content}\n\`\`\`\n`;
        }

        return prompt;
    }
}

const SYSTEM_PROMPT_SCANNER = `Bạn là một Senior Technical Lead đang phân tích source code.
Hãy phân tích cấu trúc dự án và các file cấu hình được cung cấp.

Trả về bằng tiếng Việt gồm:
1. **Tech Stack**: Ngôn ngữ, framework, library chính
2. **Kiến trúc**: Frontend/Backend/Fullstack, mô hình (MVC, MVVM, v.v.)
3. **Coding Style**: Linter, formatter, coding conventions phát hiện được
4. **Dependencies đáng chú ý**: Các thư viện quan trọng & version
5. **Đánh giá sơ bộ**: Điểm mạnh và rủi ro tiềm ẩn`;

const SYSTEM_PROMPT_PLANNER = `Bạn là một Senior Technical Lead đang lập kế hoạch review code.
Dựa trên phân tích tech stack được cung cấp, hãy tạo một kế hoạch review chi tiết.

Format: Markdown (.md) bằng tiếng Việt, bao gồm:
# Kế Hoạch Review Code

## 1. Tổng Quan Dự Án
(Mô tả ngắn gọn)

## 2. Tech Stack Phát Hiện
(Liệt kê)

## 3. Khu Vực Trọng Tâm
- Bảo mật
- Performance
- Design patterns
- Error handling
- v.v.

## 4. Chiến Lược Review
(Thứ tự review các folder/module)

## 5. Tiêu Chí Đánh Giá
(Checklist cụ thể)`;
