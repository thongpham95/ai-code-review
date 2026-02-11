import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
    try {
        const { action, model } = await req.json();

        if (action === "status") {
            // Check if Ollama is running
            try {
                const response = await fetch("http://localhost:11434/api/tags", {
                    signal: AbortSignal.timeout(3000),
                });
                if (response.ok) {
                    const data = await response.json();
                    return NextResponse.json({
                        running: true,
                        models: data.models || [],
                    });
                }
            } catch {
                return NextResponse.json({ running: false, models: [] });
            }
        }

        if (action === "start") {
            const selectedModel = model || "codellama";
            const scriptPath = path.join(process.cwd(), "scripts", "start-ollama.sh");

            try {
                const { stdout, stderr } = await execAsync(
                    `bash "${scriptPath}" "${selectedModel}"`,
                    { timeout: 60000 }
                );
                return NextResponse.json({
                    success: true,
                    output: stdout,
                    errors: stderr || undefined,
                });
            } catch (error) {
                const msg = error instanceof Error ? error.message : "Script execution failed";
                return NextResponse.json({
                    success: false,
                    error: msg,
                }, { status: 500 });
            }
        }

        if (action === "stop") {
            try {
                await execAsync("pkill -f 'ollama serve'");
                return NextResponse.json({ success: true, message: "Ollama stopped." });
            } catch {
                return NextResponse.json({ success: true, message: "Ollama was not running." });
            }
        }

        return NextResponse.json({ error: "Invalid action. Use: status, start, stop" }, { status: 400 });
    } catch (error) {
        console.error("AI manage error:", error);
        const msg = error instanceof Error ? error.message : "Failed to manage AI";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
