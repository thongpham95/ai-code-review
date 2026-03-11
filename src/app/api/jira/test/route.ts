import { NextRequest, NextResponse } from "next/server";
import { JiraService } from "@/lib/jira-service";

export async function POST(req: NextRequest) {
    try {
        const { host, email, apiToken } = await req.json();

        if (!host || !email || !apiToken) {
            return NextResponse.json(
                { success: false, error: "Missing required fields: host, email, apiToken" },
                { status: 400 }
            );
        }

        const jiraService = new JiraService({ host, email, apiToken });
        const url = `${host.replace(/\/$/, "")}/rest/api/3/myself`;

        const response = await fetch(url, {
            headers: {
                Authorization: "Basic " + Buffer.from(`${email}:${apiToken}`).toString("base64"),
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: `Authentication failed: ${response.status} ${response.statusText}` },
                { status: 401 }
            );
        }

        const userData = await response.json();

        return NextResponse.json({
            success: true,
            displayName: userData.displayName || userData.emailAddress || email,
        });
    } catch (error) {
        console.error("Jira test connection error:", error);
        const msg = error instanceof Error ? error.message : "Connection failed";
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
