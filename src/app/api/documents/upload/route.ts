import { NextRequest, NextResponse } from "next/server";
import { parseDocument } from "@/lib/document-parser";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const text = await parseDocument(buffer, file.name);

        return NextResponse.json({
            success: true,
            filename: file.name,
            size: file.size,
            extractedText: text,
            charCount: text.length,
        });
    } catch (error) {
        console.error("Document upload error:", error);
        const msg = error instanceof Error ? error.message : "Failed to parse document";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
