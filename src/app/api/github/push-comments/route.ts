import { NextRequest, NextResponse } from "next/server";
import { GitHubService } from "@/lib/github-service";
import { createPushedComment, isCommentPushed, getReview } from "@/lib/review-store";

interface CommentPayload {
    index: number;
    fileName?: string;
    line?: number;
    description: string;
    severity?: string;
    currentCode?: string;
    suggestedFix?: string;
}

export async function POST(req: NextRequest) {
    try {
        const { reviewId, prUrl, token, comments } = await req.json() as {
            reviewId: string;
            prUrl: string;
            token: string;
            comments: CommentPayload[];
        };

        if (!reviewId || !prUrl || !token || !comments?.length) {
            return NextResponse.json(
                { error: "Missing required parameters: reviewId, prUrl, token, comments" },
                { status: 400 }
            );
        }

        // Verify review exists
        const review = getReview(reviewId);
        if (!review) {
            return NextResponse.json({ error: "Review not found" }, { status: 404 });
        }

        // Parse GitHub PR URL
        const parsed = GitHubService.parsePrUrl(prUrl);
        if (!parsed) {
            return NextResponse.json(
                { error: "Invalid GitHub PR URL. Expected format: https://github.com/owner/repo/pull/123" },
                { status: 400 }
            );
        }

        const { owner, repo, prNumber } = parsed;
        const service = new GitHubService("https://api.github.com", token);

        // Get PR details for commit SHA
        let headSha: string;
        try {
            const pr = await service.getPullRequest(owner, repo, prNumber);
            headSha = pr.head.sha;
        } catch (e) {
            console.error("Failed to fetch PR details:", e);
            const errorMessage = e instanceof Error ? e.message : "Unknown error";
            return NextResponse.json(
                { error: `Failed to fetch PR: ${errorMessage}. Check if the PR exists and the token has 'repo' scope.` },
                { status: 500 }
            );
        }

        const results: { success: boolean; comment: CommentPayload; error?: string; externalId?: string }[] = [];

        // Push each comment
        for (const comment of comments) {
            // Check if already pushed
            if (isCommentPushed(reviewId, comment.index, comment.fileName)) {
                results.push({
                    success: false,
                    comment,
                    error: "Already pushed"
                });
                continue;
            }

            // Build comment body
            let body = comment.description;

            if (comment.suggestedFix) {
                body += `\n\n\`\`\`suggestion\n${comment.suggestedFix}\n\`\`\``;
            }

            try {
                let externalId: string;

                // Try to post as a review comment on specific file/line
                try {
                    if (comment.fileName && comment.line) {
                        try {
                            const reviewComment = await service.createReviewComment(
                                owner,
                                repo,
                                prNumber,
                                body,
                                headSha,
                                comment.fileName,
                                comment.line
                            );
                            externalId = String(reviewComment.id);
                        } catch (lineError: any) {
                            // Fallback 1: Try posting to line 1 of the file if specific line fails
                            console.warn(`Failed to post to line ${comment.line}, retrying line 1:`, lineError.message);
                            const reviewComment = await service.createReviewComment(
                                owner,
                                repo,
                                prNumber,
                                `[Context: Line ${comment.line}]\n${body}`,
                                headSha,
                                comment.fileName,
                                1
                            );
                            externalId = String(reviewComment.id);
                        }
                    } else if (comment.fileName) {
                        // File-level comment (line 1 as fallback)
                        const reviewComment = await service.createReviewComment(
                            owner,
                            repo,
                            prNumber,
                            body,
                            headSha,
                            comment.fileName,
                            1
                        );
                        externalId = String(reviewComment.id);
                    } else {
                        throw new Error("No filename provided");
                    }
                } catch (fileError: any) {
                    // Fallback 2: Post as general issue comment if file comment fails (e.g. file not changed in PR)
                    console.warn(`Failed to post file comment, falling back to PR comment:`, fileError.message);
                    const context = comment.fileName ? `[File: ${comment.fileName}${comment.line ? `:${comment.line}` : ''}]\n` : '';
                    const issueComment = await service.addIssueComment(owner, repo, prNumber, `${context}${body}`);
                    externalId = String(issueComment.id);
                }

                // Record the pushed comment
                createPushedComment({
                    reviewId,
                    commentIndex: comment.index,
                    fileName: comment.fileName,
                    provider: "github",
                    externalId,
                });

                results.push({
                    success: true,
                    comment,
                    externalId,
                });
            } catch (error) {
                console.error("Failed to push comment:", error);
                results.push({
                    success: false,
                    comment,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: true,
            pushed: successCount,
            failed: failCount,
            results,
        });

    } catch (error: unknown) {
        console.error("GitHub Push Comments Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to push comments";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
