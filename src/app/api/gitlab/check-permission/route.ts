import { NextRequest, NextResponse } from "next/server";
import { GitLabService } from "@/lib/gitlab-service";

export async function POST(req: NextRequest) {
    try {
        const { mrUrl, token, customBaseUrl } = await req.json() as {
            mrUrl: string;
            token: string;
            customBaseUrl?: string;
        };

        if (!mrUrl || !token) {
            return NextResponse.json(
                { error: "Missing required parameters: mrUrl, token" },
                { status: 400 }
            );
        }

        // Parse GitLab MR URL
        const parsed = GitLabService.parseMrUrl(mrUrl, customBaseUrl);
        if (!parsed) {
            return NextResponse.json(
                { error: "Invalid GitLab MR URL" },
                { status: 400 }
            );
        }

        const { host, projectPath, mrIid } = parsed;
        const service = new GitLabService(customBaseUrl || host, token);

        try {
            const permissions = await service.getMergeRequestPermissions(projectPath, mrIid);
            return NextResponse.json({
                canMerge: permissions.canMerge,
            });
        } catch (e) {
            console.error("Failed to check MR permissions:", e);
            const errorMessage = e instanceof Error ? e.message : "Unknown error";
            return NextResponse.json(
                { error: `Failed to check permissions: ${errorMessage}`, canMerge: false },
                { status: 500 }
            );
        }

    } catch (error: unknown) {
        console.error("GitLab Check Permission Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to check permissions";
        return NextResponse.json({ error: errorMessage, canMerge: false }, { status: 500 });
    }
}
