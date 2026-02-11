export interface GitLabMR {
    id: number;
    iid: number;
    project_id: number;
    title: string;
    description: string;
    web_url: string;
    changes: GitLabChange[];
}

export interface GitLabChange {
    old_path: string;
    new_path: string;
    a_mode: string;
    b_mode: string;
    new_file: boolean;
    renamed_file: boolean;
    deleted_file: boolean;
    diff: string;
}

export class GitLabService {
    private baseUrl: string;
    private token?: string;

    static parseMrUrl(url: string): { host: string, projectPath: string, mrIid: number } | null {
        try {
            const u = new URL(url);
            const pathParts = u.pathname.split("/-/merge_requests/");

            if (pathParts.length !== 2) return null;

            const projectPath = pathParts[0].substring(1); // Remove leading slash
            const mrIid = parseInt(pathParts[1], 10);

            if (isNaN(mrIid)) return null;

            return {
                host: u.origin,
                projectPath,
                mrIid
            };
        } catch {
            return null;
        }
    }

    constructor(baseUrl: string = "https://gitlab.com", token?: string) {
        this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
        this.token = token;
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };
        if (this.token) {
            headers["PRIVATE-TOKEN"] = this.token;
        }
        return headers;
    }

    async getMergeRequestChanges(projectPath: string, mrIid: number): Promise<GitLabMR> {
        // First get MR details to get project ID if needed, but we can often use URL-encoded path
        const encodedPath = encodeURIComponent(projectPath);
        const url = `${this.baseUrl}/api/v4/projects/${encodedPath}/merge_requests/${mrIid}/changes`;

        console.log(`Fetching MR from: ${url}`);

        const response = await fetch(url, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch GitLab MR: ${response.statusText}`);
        }

        return response.json();
    }
}
