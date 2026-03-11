import { NextRequest, NextResponse } from "next/server";
import { JiraService, type JiraConfig } from "@/lib/jira-service";

/**
 * POST /api/jira/ticket
 * Fetch ticket metadata (summary, status, priority, assignee, etc.)
 */
export async function POST(req: NextRequest) {
    try {
        const { ticketKey, jiraConfig } = await req.json() as {
            ticketKey: string;
            jiraConfig: JiraConfig;
        };

        if (!ticketKey || !jiraConfig?.host || !jiraConfig?.email || !jiraConfig?.apiToken) {
            return NextResponse.json(
                { error: "Missing required fields: ticketKey and Jira credentials" },
                { status: 400 }
            );
        }

        const jira = new JiraService(jiraConfig);
        const issue = await jira.getIssue(ticketKey);

        const fields = issue.fields;
        const host = jiraConfig.host.replace(/\/$/, "");

        return NextResponse.json({
            key: issue.key,
            summary: fields.summary || "No summary",
            status: fields.status?.name || "Unknown",
            priority: fields.priority?.name || "None",
            assignee: fields.assignee?.displayName || "Unassigned",
            reporter: fields.reporter?.displayName || "Unknown",
            issueType: fields.issuetype?.name || "Bug",
            created: fields.created,
            updated: fields.updated,
            labels: fields.labels || [],
            jiraUrl: `${host}/browse/${issue.key}`,
        });
    } catch (error) {
        console.error("Jira ticket fetch error:", error);
        const msg = error instanceof Error ? error.message : "Failed to fetch ticket";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
