import { NextRequest, NextResponse } from "next/server";
import { PatternScanner } from "@/lib/pattern-scanner";
import { createReview, updateReview } from "@/lib/review-store";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, source, sourceUrl, code, files, contextDocs, contextDocuments } = body;

        // Create review record
        const review = createReview({
            title: title || sourceUrl || "Code Review",
            source: source || "paste",
            sourceUrl,
            code,
            files,
            contextDocs,
            contextDocuments,
        });

        // Run pattern scan immediately
        const scanner = new PatternScanner();
        const codeToScan = code
            ? [{ name: "pasted-code", content: code }]
            : files || [];

        const patternResults = scanner.scanMultipleFiles(codeToScan);

        // Update review with pattern results
        updateReview(review.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
            patternResults,
        });

        const summary = PatternScanner.getSummary(patternResults);

        return NextResponse.json({
            success: true,
            reviewId: review.id,
            patternScan: {
                matches: patternResults,
                summary,
            },
        });
    } catch (error) {
        console.error("Review start error:", error);
        const msg = error instanceof Error ? error.message : "Failed to start review";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
