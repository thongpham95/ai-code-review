import { NextRequest, NextResponse } from "next/server";
import { GitLabService } from "@/lib/gitlab-service";

export async function POST(req: NextRequest) {
    try {
        const { url, token, customBaseUrl } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
        }

        // Parse URL
        const parsed = GitLabService.parseMrUrl(url);
        if (!parsed) {
            return NextResponse.json({ error: "Invalid GitLab MR URL. Expected format: https://gitlab.com/group/project/-/merge_requests/123" }, { status: 400 });
        }

        const { host, projectPath, mrIid } = parsed;

        // Use custom base URL if provided, otherwise default to host from URL
        // If it's a self-hosted instance, the user might provide a customBaseUrl or we just use the host.
        // If the user provides a token, use it.

        const service = new GitLabService(customBaseUrl || host, token);

        const mrData = await service.getMergeRequestChanges(projectPath, mrIid);

        return NextResponse.json({
            success: true,
            mr: mrData
        });

    } catch (error: unknown) {
        console.error("GitLab Fetch Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch MR";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
