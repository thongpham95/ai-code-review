export interface GitHubPR {
    id: number;
    number: number;
    title: string;
    body: string;
    html_url: string;
    head: {
        sha: string;
        ref: string;
    };
    base: {
        sha: string;
        ref: string;
    };
}

export interface GitHubFile {
    sha: string;
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
}

export interface GitHubReviewComment {
    id: number;
    body: string;
    path: string;
    line?: number;
    created_at: string;
    user: {
        login: string;
        id: number;
    };
}

export interface GitHubReview {
    id: number;
    body: string;
    state: string;
    html_url: string;
}

export class GitHubService {
    private baseUrl: string;
    private token?: string;

    /**
     * Parse GitHub PR URL
     * Formats:
     * - https://github.com/owner/repo/pull/123
     * - https://github.com/owner/repo/pull/123/files
     */
    static parsePrUrl(url: string): { host: string; owner: string; repo: string; prNumber: number } | null {
        try {
            const u = new URL(url);

            // Must be GitHub
            if (!u.hostname.includes("github.com")) return null;

            // Pattern: /owner/repo/pull/123
            const match = u.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
            if (!match) return null;

            return {
                host: u.origin,
                owner: match[1],
                repo: match[2],
                prNumber: parseInt(match[3], 10),
            };
        } catch {
            return null;
        }
    }

    constructor(baseUrl: string = "https://api.github.com", token?: string) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.token = token;
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        };
        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }
        return headers;
    }

    /**
     * Get PR details
     */
    async getPullRequest(owner: string, repo: string, prNumber: number): Promise<GitHubPR> {
        const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`;

        const response = await fetch(url, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to fetch GitHub PR: ${response.statusText} - ${error}`);
        }

        return response.json();
    }

    /**
     * Get PR files (changes)
     */
    async getPullRequestFiles(owner: string, repo: string, prNumber: number): Promise<GitHubFile[]> {
        const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/files`;

        const response = await fetch(url, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to fetch PR files: ${response.statusText} - ${error}`);
        }

        return response.json();
    }

    /**
     * Create a review comment on a specific line of a file
     */
    async createReviewComment(
        owner: string,
        repo: string,
        prNumber: number,
        body: string,
        commitId: string,
        path: string,
        line?: number,
        side: "LEFT" | "RIGHT" = "RIGHT"
    ): Promise<GitHubReviewComment> {
        const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/comments`;

        const payload: Record<string, unknown> = {
            body,
            commit_id: commitId,
            path,
        };

        if (line) {
            payload.line = line;
            payload.side = side;
        }

        const response = await fetch(url, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`GitHub API Error (createReviewComment): ${response.status} ${response.statusText}`, error);
            throw new Error(`Failed to create review comment: ${response.statusText} - ${error}`);
        }

        return response.json();
    }

    /**
     * Create a PR review with multiple comments
     */
    async createReview(
        owner: string,
        repo: string,
        prNumber: number,
        body: string,
        event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT" = "COMMENT",
        comments?: Array<{
            path: string;
            line?: number;
            body: string;
        }>
    ): Promise<GitHubReview> {
        const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;

        const payload: Record<string, unknown> = {
            body,
            event,
        };

        if (comments && comments.length > 0) {
            payload.comments = comments.map(c => ({
                path: c.path,
                line: c.line,
                body: c.body,
            }));
        }

        const response = await fetch(url, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create review: ${response.statusText} - ${error}`);
        }

        return response.json();
    }

    /**
     * Add a simple issue comment to a PR (not line-specific)
     */
    async addIssueComment(
        owner: string,
        repo: string,
        prNumber: number,
        body: string
    ): Promise<{ id: number; body: string; html_url: string }> {
        const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${prNumber}/comments`;

        const response = await fetch(url, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify({ body }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to add comment: ${response.statusText} - ${error}`);
        }

        return response.json();
    }
}
