import crypto from "crypto";

/**
 * Calculate GitLab line_code for diff position
 * Format: SHA1(old_path + new_path)[0..39] + "_" + old_line + "_" + new_line
 */
function calculateLineCode(oldPath: string, newPath: string, oldLine?: number, newLine?: number): string {
    const pathHash = crypto.createHash("sha1").update(oldPath + newPath).digest("hex").substring(0, 40);
    const oldLineStr = oldLine ?? "";
    const newLineStr = newLine ?? "";
    return `${pathHash}_${oldLineStr}_${newLineStr}`;
}

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

    static parseMrUrl(url: string, customBaseUrl?: string): { host: string, projectPath: string, mrIid: number } | null {
        try {
            const u = new URL(url);
            const pathParts = u.pathname.split("/-/merge_requests/");

            if (pathParts.length !== 2) return null;

            let projectPath = pathParts[0].substring(1); // Remove leading slash

            if (customBaseUrl) {
                try {
                    const cb = new URL(customBaseUrl);
                    const basePath = cb.pathname.replace(/\/$/, ""); // e.g., /gitlab
                    if (basePath && basePath !== "/" && u.pathname.startsWith(basePath)) {
                        projectPath = pathParts[0].substring(basePath.length);
                        // Clean up leading slash again if it exists
                        if (projectPath.startsWith('/')) {
                            projectPath = projectPath.substring(1);
                        }
                    }
                } catch {
                    // Ignore invalid customBaseUrl
                }
            }

            const mrIid = parseInt(pathParts[1], 10);

            if (isNaN(mrIid)) return null;

            let host = u.origin;
            if (customBaseUrl) {
                try {
                    const cb = new URL(customBaseUrl);
                    host = `${cb.origin}${cb.pathname.replace(/\/$/, "")}`;
                } catch {
                    // Ignore
                }
            }

            return {
                host,
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

    /**
     * Add a general note/comment to an MR
     */
    async addMergeRequestNote(projectPath: string, mrIid: number, body: string): Promise<GitLabNote> {
        const encodedPath = encodeURIComponent(projectPath);
        const url = `${this.baseUrl}/api/v4/projects/${encodedPath}/merge_requests/${mrIid}/notes`;

        const response = await fetch(url, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify({ body }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to add MR note: ${response.statusText} - ${error}`);
        }

        return response.json();
    }

    /**
     * Create a new discussion thread on an MR (can be line-specific)
     */
    async createMergeRequestDiscussion(
        projectPath: string,
        mrIid: number,
        body: string,
        position?: {
            baseSha: string;
            startSha: string;
            headSha: string;
            positionType: "text" | "image";
            newPath?: string;
            oldPath?: string;
            newLine?: number;
            oldLine?: number;
        }
    ): Promise<GitLabDiscussion> {
        const encodedPath = encodeURIComponent(projectPath);
        const url = `${this.baseUrl}/api/v4/projects/${encodedPath}/merge_requests/${mrIid}/discussions`;

        const payload: Record<string, unknown> = { body };

        if (position) {
            const oldPath = position.oldPath || position.newPath || "";
            const newPath = position.newPath || position.oldPath || "";

            payload.position = {
                base_sha: position.baseSha,
                start_sha: position.startSha,
                head_sha: position.headSha,
                position_type: position.positionType,
                new_path: newPath,
                old_path: oldPath,
                new_line: position.newLine,
                old_line: position.oldLine,
                line_code: calculateLineCode(oldPath, newPath, position.oldLine, position.newLine),
            };
        }

        const response = await fetch(url, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create discussion: ${response.statusText} - ${error}`);
        }

        return response.json();
    }

    /**
     * Get MR diff refs (needed for line-specific comments)
     */
    async getMergeRequestDiffRefs(projectPath: string, mrIid: number): Promise<GitLabDiffRefs> {
        const encodedPath = encodeURIComponent(projectPath);
        const url = `${this.baseUrl}/api/v4/projects/${encodedPath}/merge_requests/${mrIid}`;

        const response = await fetch(url, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch MR: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            baseSha: data.diff_refs?.base_sha,
            startSha: data.diff_refs?.start_sha,
            headSha: data.diff_refs?.head_sha,
        };
    }

    /**
     * Check if the authenticated user has merge permission for an MR
     */
    async getMergeRequestPermissions(projectPath: string, mrIid: number): Promise<GitLabMRPermissions> {
        const encodedPath = encodeURIComponent(projectPath);
        const url = `${this.baseUrl}/api/v4/projects/${encodedPath}/merge_requests/${mrIid}`;

        const response = await fetch(url, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch MR: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            canMerge: data.user?.can_merge ?? false,
        };
    }
}

export interface GitLabNote {
    id: number;
    body: string;
    author: {
        id: number;
        username: string;
        name: string;
    };
    created_at: string;
}

export interface GitLabDiscussion {
    id: string;
    notes: GitLabNote[];
}

export interface GitLabDiffRefs {
    baseSha: string;
    startSha: string;
    headSha: string;
}

export interface GitLabMRPermissions {
    canMerge: boolean;
}
