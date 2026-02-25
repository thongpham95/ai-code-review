import { NextRequest, NextResponse } from "next/server";
import { createReview } from "@/lib/review-store";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, source, sourceUrl, code, files, contextDocs, contextDocuments, aiModel, customRules } = body;

        // Create review record (no pattern scanning — AI only)
        const review = createReview({
            title: title || sourceUrl || "Code Review",
            source: source || "paste",
            sourceUrl,
            code,
            files,
            contextDocs,
            contextDocuments,
            aiModel,
            customRules,
        });

        return NextResponse.json({
            success: true,
            reviewId: review.id,
        });
    } catch (error) {
        console.error("Review start error:", error);
        const msg = error instanceof Error ? error.message : "Failed to start review";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
