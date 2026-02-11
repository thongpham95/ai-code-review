import { NextResponse } from "next/server";
import { listReviews, getStats } from "@/lib/review-store";

export async function GET() {
    try {
        const reviews = listReviews();
        const stats = getStats();
        return NextResponse.json({ reviews, stats });
    } catch (error) {
        console.error("Reviews API error:", error);
        return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
    }
}
