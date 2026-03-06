import { NextRequest, NextResponse } from "next/server";
import { GitLabService } from "@/lib/gitlab-service";
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
        const { reviewId, mrUrl, token, customBaseUrl, comments } = await req.json() as {
            reviewId: string;
            mrUrl: string;
            token: string;
            customBaseUrl?: string;
            comments: CommentPayload[];
        };

        if (!reviewId || !mrUrl || !token || !comments?.length) {
            return NextResponse.json(
                { error: "Missing required parameters: reviewId, mrUrl, token, comments" },
                { status: 400 }
            );
        }

        // Verify review exists
        const review = getReview(reviewId);
        if (!review) {
            return NextResponse.json({ error: "Review not found" }, { status: 404 });
        }

        // Parse GitLab MR URL
        const parsed = GitLabService.parseMrUrl(mrUrl, customBaseUrl);
        if (!parsed) {
            return NextResponse.json(
                { error: "Invalid GitLab MR URL. Expected format: https://gitlab.com/group/project/-/merge_requests/123" },
                { status: 400 }
            );
        }

        const { host, projectPath, mrIid } = parsed;
        const service = new GitLabService(customBaseUrl || host, token);

        const results: { success: boolean; comment: CommentPayload; error?: string; externalId?: string }[] = [];

        // Get diff refs for line-specific comments
        let diffRefs: { baseSha: string; startSha: string; headSha: string } | null = null;
        try {
            diffRefs = await service.getMergeRequestDiffRefs(projectPath, mrIid);
        } catch (e) {
            console.warn("Could not get diff refs, line-specific comments may fail:", e);
        }

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
                let usedFallback = false;

                // Try to post as a discussion (preferred for code comments)
                // If we have line info and diff refs, try to make it line-specific
                if (comment.line && comment.fileName && diffRefs) {
                    try {
                        const discussion = await service.createMergeRequestDiscussion(
                            projectPath,
                            mrIid,
                            body,
                            {
                                baseSha: diffRefs.baseSha,
                                startSha: diffRefs.startSha,
                                headSha: diffRefs.headSha,
                                positionType: "text",
                                newPath: comment.fileName,
                                oldPath: comment.fileName,
                                newLine: comment.line,
                            }
                        );
                        externalId = discussion.id;
                    } catch (lineError) {
                        // Fallback: If line-specific comment fails (e.g., line not in diff),
                        // post as general note with file/line context
                        console.warn(`Line-specific comment failed, falling back to general note:`, lineError);
                        usedFallback = true;
                        const fallbackBody = `**📍 ${comment.fileName}:${comment.line}**\n\n${body}`;
                        const note = await service.addMergeRequestNote(projectPath, mrIid, fallbackBody);
                        externalId = String(note.id);
                    }
                } else {
                    // Post as a general MR note
                    const noteBody = comment.fileName
                        ? `**📍 ${comment.fileName}${comment.line ? `:${comment.line}` : ''}**\n\n${body}`
                        : body;
                    const note = await service.addMergeRequestNote(projectPath, mrIid, noteBody);
                    externalId = String(note.id);
                }

                // Record the pushed comment
                createPushedComment({
                    reviewId,
                    commentIndex: comment.index,
                    fileName: comment.fileName,
                    provider: "gitlab",
                    externalId,
                });

                results.push({
                    success: true,
                    comment,
                    externalId,
                    ...(usedFallback && { fallback: true }),
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
        console.error("GitLab Push Comments Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to push comments";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
