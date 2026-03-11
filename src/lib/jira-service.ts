/**
 * Jira REST API Service
 * Supports Jira Cloud via user-configured credentials (email + API token + host).
 */

export interface JiraIssue {
    key: string;
    fields: {
        summary: string;
        description: string | null;
        status: { name: string };
        priority: { name: string } | null;
        assignee: { displayName: string; emailAddress: string } | null;
        reporter: { displayName: string; emailAddress: string } | null;
        issuetype: { name: string };
        created: string;
        updated: string;
        labels: string[];
        components: { name: string }[];
        comment?: {
            comments: JiraComment[];
        };
        attachment?: JiraAttachment[];
        issuelinks?: JiraIssueLink[];
    };
}

export interface JiraComment {
    id: string;
    body: string;
    author: { displayName: string };
    created: string;
}

export interface JiraAttachment {
    id: string;
    filename: string;
    mimeType: string;
    content: string; // URL to download
}

export interface JiraIssueLink {
    type: { name: string; inward: string; outward: string };
    inwardIssue?: { key: string; fields: { summary: string; status: { name: string } } };
    outwardIssue?: { key: string; fields: { summary: string; status: { name: string } } };
}

export interface JiraConfig {
    host: string;   // e.g. "https://yourcompany.atlassian.net"
    email: string;
    apiToken: string;
}

export interface JiraSearchResult {
    issues: JiraIssue[];
    total: number;
}

export class JiraService {
    private host: string;
    private authHeader: string;

    constructor(config: JiraConfig) {
        this.host = config.host.replace(/\/$/, "");
        // Jira Cloud uses Basic auth: email:apiToken (base64)
        this.authHeader = "Basic " + Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
    }

    private getHeaders(): HeadersInit {
        return {
            "Authorization": this.authHeader,
            "Content-Type": "application/json",
            "Accept": "application/json",
        };
    }

    /**
     * Fetch a single Jira issue with all relevant fields
     */
    async getIssue(issueKey: string): Promise<JiraIssue> {
        const fields = "summary,description,status,priority,assignee,reporter,issuetype,created,updated,labels,components,comment,attachment,issuelinks";
        const url = `${this.host}/rest/api/3/issue/${issueKey}?fields=${fields}`;

        const response = await fetch(url, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch Jira issue ${issueKey}: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return response.json();
    }

    /**
     * Search issues using JQL
     */
    async searchIssues(jql: string, maxResults: number = 50): Promise<JiraSearchResult> {
        const url = `${this.host}/rest/api/3/search`;

        const response = await fetch(url, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify({
                jql,
                maxResults,
                fields: ["summary", "status", "priority", "assignee", "issuetype"],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Jira search failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return response.json();
    }

    /**
     * Test connection to Jira
     */
    async testConnection(): Promise<boolean> {
        const url = `${this.host}/rest/api/3/myself`;

        const response = await fetch(url, {
            headers: this.getHeaders(),
        });

        return response.ok;
    }

    /**
     * Convert Atlassian Document Format (ADF) to plain text
     * Jira Cloud API v3 returns description in ADF format
     */
    static adfToText(adf: unknown): string {
        if (!adf || typeof adf === "string") return (adf as string) || "";

        const doc = adf as { type: string; content?: unknown[] };
        if (doc.type !== "doc" || !doc.content) return JSON.stringify(adf);

        return JiraService.extractTextFromAdfNodes(doc.content);
    }

    private static extractTextFromAdfNodes(nodes: unknown[]): string {
        let text = "";

        for (const node of nodes) {
            const n = node as { type: string; text?: string; content?: unknown[]; attrs?: Record<string, unknown> };

            switch (n.type) {
                case "text":
                    text += n.text || "";
                    break;
                case "paragraph":
                    text += JiraService.extractTextFromAdfNodes(n.content || []) + "\n";
                    break;
                case "heading":
                    text += JiraService.extractTextFromAdfNodes(n.content || []) + "\n";
                    break;
                case "bulletList":
                case "orderedList":
                    text += JiraService.extractTextFromAdfNodes(n.content || []);
                    break;
                case "listItem":
                    text += "- " + JiraService.extractTextFromAdfNodes(n.content || []);
                    break;
                case "codeBlock":
                    text += "```\n" + JiraService.extractTextFromAdfNodes(n.content || []) + "```\n";
                    break;
                case "blockquote":
                    text += "> " + JiraService.extractTextFromAdfNodes(n.content || []);
                    break;
                case "hardBreak":
                    text += "\n";
                    break;
                case "table":
                    text += JiraService.extractTextFromAdfNodes(n.content || []) + "\n";
                    break;
                case "tableRow":
                    text += JiraService.extractTextFromAdfNodes(n.content || []) + "\n";
                    break;
                case "tableHeader":
                case "tableCell":
                    text += JiraService.extractTextFromAdfNodes(n.content || []) + " | ";
                    break;
                default:
                    if (n.content) {
                        text += JiraService.extractTextFromAdfNodes(n.content);
                    }
            }
        }

        return text;
    }
}
