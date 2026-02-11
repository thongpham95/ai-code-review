import * as vscode from 'vscode';
import axios from 'axios';

export interface GitLabUser {
    id: number;
    name: string;
    username: string;
    avatar_url: string;
    web_url: string;
}

export interface SCMSession {
    provider: 'github' | 'gitlab' | 'bitbucket';
    token: string;
    userName: string;
    avatarUrl?: string;
}

const GITLAB_TOKEN_KEY = 'aiCodeReview.gitlabToken';
const BITBUCKET_TOKEN_KEY = 'aiCodeReview.bitbucketToken';

export class AuthService {
    private context: vscode.ExtensionContext;
    private currentSession: SCMSession | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Đăng nhập GitHub qua VS Code built-in Authentication API.
     */
    async loginGitHub(): Promise<vscode.AuthenticationSession> {
        const session = await vscode.authentication.getSession(
            'github',
            ['user:email', 'repo', 'read:org'],
            { createIfNone: true }
        );

        this.currentSession = {
            provider: 'github',
            token: session.accessToken,
            userName: session.account.label
        };

        return session;
    }

    /**
     * Đăng nhập GitLab bằng Personal Access Token.
     * Token được lưu an toàn qua SecretStorage.
     */
    async loginGitLab(): Promise<GitLabUser> {
        // Kiểm tra token đã lưu trước
        let token = await this.context.secrets.get(GITLAB_TOKEN_KEY);

        if (!token) {
            // Bước 1: Chọn Host (SaaS hoặc Self-Managed)
            const hostType = await vscode.window.showQuickPick(
                [
                    { label: 'GitLab.com (SaaS)', description: 'Sử dụng https://gitlab.com mặc định', detail: 'saas' },
                    { label: 'Self-Managed GitLab', description: 'Nhập URL server riêng của bạn', detail: 'self-managed' }
                ],
                { placeHolder: 'Chọn loại GitLab Server bạn đang sử dụng' }
            );

            if (!hostType) { return { id: 0, name: '', username: '', avatar_url: '', web_url: '' } as GitLabUser; } // Cancelled

            let gitlabHost = 'https://gitlab.com';

            if (hostType.detail === 'self-managed') {
                const inputUrl = await vscode.window.showInputBox({
                    prompt: 'Nhập URL GitLab Server (VD: https://gitlab.company.com)',
                    placeHolder: 'https://gitlab.company.com',
                    value: vscode.workspace.getConfiguration('aiCodeReview').get<string>('gitlabHost') || '',
                    ignoreFocusOut: true
                });
                if (!inputUrl) { return { id: 0, name: '', username: '', avatar_url: '', web_url: '' } as GitLabUser; }

                // Chuẩn hóa URL (bỏ slash cuối nếu có)
                gitlabHost = inputUrl.replace(/\/$/, '');

                // Lưu vào settings để lần sau dùng lại
                await vscode.workspace.getConfiguration('aiCodeReview').update('gitlabHost', gitlabHost, vscode.ConfigurationTarget.Global);
            } else {
                // Nếu chọn SaaS, đảm bảo config quay về default
                await vscode.workspace.getConfiguration('aiCodeReview').update('gitlabHost', 'https://gitlab.com', vscode.ConfigurationTarget.Global);
            }

            // Bước 2: Nhập Token
            token = await vscode.window.showInputBox({
                prompt: `Nhập GitLab Personal Access Token cho ${gitlabHost}`,
                password: true,
                placeHolder: 'glpat-xxxxxxxxxxxxxxxxxxxx',
                ignoreFocusOut: true
            });

            if (!token) {
                throw new Error('Bạn cần nhập token để đăng nhập GitLab.');
            }

            await this.context.secrets.store(GITLAB_TOKEN_KEY, token);
        }

        // Kiểm tra token hợp lệ
        const user = await this.verifyGitLabToken(token);

        this.currentSession = {
            provider: 'gitlab',
            token,
            userName: user.name || user.username,
            avatarUrl: user.avatar_url
        };

        return user;
    }

    /**
     * Đăng nhập Bitbucket bằng App Password.
     */
    async loginBitbucket(): Promise<SCMSession> {
        let token = await this.context.secrets.get(BITBUCKET_TOKEN_KEY);

        if (!token) {
            const username = await vscode.window.showInputBox({
                prompt: 'Nhập Bitbucket username',
                placeHolder: 'your-username'
            });
            const appPassword = await vscode.window.showInputBox({
                prompt: 'Nhập Bitbucket App Password',
                password: true,
                placeHolder: 'xxxx-xxxx-xxxx-xxxx'
            });

            if (!username || !appPassword) {
                throw new Error('Cần username và App Password.');
            }

            token = Buffer.from(`${username}:${appPassword}`).toString('base64');
            await this.context.secrets.store(BITBUCKET_TOKEN_KEY, token);
        }

        // Verify
        const response = await axios.get('https://api.bitbucket.org/2.0/user', {
            headers: { Authorization: `Basic ${token}` }
        });

        this.currentSession = {
            provider: 'bitbucket',
            token,
            userName: response.data.display_name,
            avatarUrl: response.data.links?.avatar?.href
        };

        return this.currentSession;
    }

    /**
     * Xác thực token GitLab bằng cách gọi API /user.
     */
    private async verifyGitLabToken(token: string): Promise<GitLabUser> {
        const gitlabHost = vscode.workspace.getConfiguration('aiCodeReview')
            .get<string>('gitlabHost') || 'https://gitlab.com';

        try {
            const response = await axios.get<GitLabUser>(`${gitlabHost}/api/v4/user`, {
                headers: { 'PRIVATE-TOKEN': token }
            });
            return response.data;
        } catch (err: any) {
            // Xóa token lỗi
            await this.context.secrets.delete(GITLAB_TOKEN_KEY);
            if (err.response?.status === 401) {
                throw new Error('Token GitLab không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
            }
            throw new Error(`Không thể kết nối GitLab (${gitlabHost}): ${err.message}`);
        }
    }

    /**
     * Lấy session hiện tại (nếu đã đăng nhập).
     */
    getCurrentSession(): SCMSession | null {
        return this.currentSession;
    }

    /**
     * Lấy tên người dùng cho comment (quan trọng: phải là tên thật).
     */
    getReviewerName(): string {
        return this.currentSession?.userName || 'Code Reviewer';
    }

    /**
     * Lấy token để gọi API.
     */
    getToken(): string | null {
        return this.currentSession?.token || null;
    }

    /**
     * Đăng xuất - xóa session và token đã lưu.
     */
    async logout(): Promise<void> {
        if (this.currentSession?.provider === 'gitlab') {
            await this.context.secrets.delete(GITLAB_TOKEN_KEY);
        } else if (this.currentSession?.provider === 'bitbucket') {
            await this.context.secrets.delete(BITBUCKET_TOKEN_KEY);
        }
        this.currentSession = null;
    }
}
