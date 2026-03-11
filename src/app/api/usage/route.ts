import { NextResponse } from "next/server";
import { getDailyTokenUsage } from "@/lib/review-store";

export async function GET() {
    try {
        const usage = getDailyTokenUsage();
        return NextResponse.json(usage);
    } catch (error) {
        console.error("Token usage API error:", error);
        return NextResponse.json({ error: "Failed to fetch token usage" }, { status: 500 });
    }
}
