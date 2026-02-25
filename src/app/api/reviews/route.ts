import { NextRequest, NextResponse } from "next/server";
import { listReviews, searchReviews, getStats, deleteReviews } from "@/lib/review-store";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q");

        const reviews = query ? searchReviews(query) : listReviews();
        const stats = getStats();
        return NextResponse.json({ reviews, stats });
    } catch (error) {
        console.error("Reviews API error:", error);
        return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { ids } = await request.json();
        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "Missing 'ids' array" }, { status: 400 });
        }
        const deleted = deleteReviews(ids);
        return NextResponse.json({ success: true, deleted });
    } catch (error) {
        console.error("Delete reviews error:", error);
        return NextResponse.json({ error: "Failed to delete reviews" }, { status: 500 });
    }
}
