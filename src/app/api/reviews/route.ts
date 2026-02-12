import { NextRequest, NextResponse } from "next/server";
import { listReviews, searchReviews, getStats } from "@/lib/review-store";

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
