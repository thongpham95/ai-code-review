import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/lib/github-service";

export async function POST(req: NextRequest) {
    try {
        const { url, token } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
        }

        // Parse URL
        const parsed = GitHubService.parsePrUrl(url);
        if (!parsed) {
            return NextResponse.json(
                { error: "Invalid GitHub PR URL. Expected format: https://github.com/owner/repo/pull/123" },
                { status: 400 }
            );
        }

        const { owner, repo, prNumber } = parsed;

        const service = new GitHubService("https://api.github.com", token);

        // Fetch PR details
        const pr = await service.getPullRequest(owner, repo, prNumber);

        // Fetch PR files
        const files = await service.getPullRequestFiles(owner, repo, prNumber);

        return NextResponse.json({
            success: true,
            pr: {
                id: pr.id,
                number: pr.number,
                title: pr.title,
                body: pr.body,
                html_url: pr.html_url,
                head_sha: pr.head.sha,
                base_sha: pr.base.sha,
                changes: files.map(f => ({
                    old_path: f.filename,
                    new_path: f.filename,
                    diff: f.patch || "",
                    status: f.status,
                    additions: f.additions,
                    deletions: f.deletions,
                })),
            },
        });

    } catch (error: unknown) {
        console.error("GitHub Fetch Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch PR";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
