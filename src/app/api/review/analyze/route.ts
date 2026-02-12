import { openai } from "@ai-sdk/openai"
import { google } from "@ai-sdk/google"
import { anthropic } from "@ai-sdk/anthropic"
import { streamText } from "ai"
import { updateReview } from "@/lib/review-store"

export async function POST(req: Request) {
    const { code, config, reviewId, contextDocuments, language = "en" } = await req.json()

    // Language-specific prompts - Vietnamese needs stronger instruction for local models
    const isVietnamese = language === "vi"

    // Build system prompt with context
    let systemPrompt = isVietnamese
        ? `Bạn là một chuyên gia review code cấp cao. Hãy review TẤT CẢ các file trong đoạn code sau.

QUAN TRỌNG:
- Viết TOÀN BỘ phản hồi bằng TIẾNG VIỆT. Không sử dụng tiếng Anh.
- Review TỪNG FILE một cách chi tiết
- Với mỗi file: nếu OK thì ghi "✅ OK", nếu cần chỉnh sửa thì đưa ra code snippet + vấn đề + đề xuất sửa

Định dạng phản hồi theo Markdown:

## Tóm tắt nhanh
(1-2 câu tóm tắt chất lượng code tổng thể, tối đa 100 ký tự)

## Điểm chất lượng code
(Đánh giá 1-10 với giải thích ngắn gọn)

## Review theo từng file

### 📄 \`tên-file-1.ts\`
**Trạng thái:** ✅ OK hoặc ⚠️ Cần chỉnh sửa

(Nếu cần chỉnh sửa, format như sau cho MỖI vấn đề:)

**Vấn đề:** Mô tả ngắn gọn vấn đề
**Dòng:** số dòng (nếu có)
**Code hiện tại:**
\`\`\`
đoạn code có vấn đề
\`\`\`
**Đề xuất sửa:**
\`\`\`
đoạn code đã sửa
\`\`\`

(Lặp lại cho tất cả các file)`
        : `You are an expert Senior code reviewer. Review ALL files in the following code changes.

IMPORTANT:
- Review EACH FILE individually and thoroughly
- For each file: if OK, mark "✅ OK"; if needs changes, provide code snippet + issue + suggested fix
- Cover bugs, security issues, performance improvements, and best practices

Format your response in Markdown:

## Quick Summary
(1-2 sentence summary of overall code quality, max 100 characters)

## Code Quality Score
(Rate 1-10 with brief justification)

## File-by-File Review

### 📄 \`filename-1.ts\`
**Status:** ✅ OK or ⚠️ Needs Changes

(If needs changes, format like this for EACH issue:)

**Issue:** Brief description of the problem
**Line:** line number (if applicable)
**Current code:**
\`\`\`
problematic code snippet
\`\`\`
**Suggested fix:**
\`\`\`
corrected code snippet
\`\`\`

(Repeat for ALL files in the review)`

    // Inject context documents if available
    if (contextDocuments && contextDocuments.length > 0) {
        systemPrompt += `\n\nThe following project documents provide business context for the review:\n`
        for (const doc of contextDocuments) {
            systemPrompt += `\n--- Document: ${doc.name} ---\n${doc.content}\n`
        }
        systemPrompt += `\nUse this context to provide more relevant and business-aware feedback.`
    }

    const userContent = `Code to review:\n\`\`\`\n${code}\n\`\`\``

    if (config?.useLocal) {
        // Use Ollama directly via fetch (OpenAI-compatible API)
        const ollamaUrl = config.localUrl || "http://localhost:11434"
        const model = config.localModel || "codellama"

        try {
            const response = await fetch(`${ollamaUrl}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userContent },
                    ],
                    stream: true,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                return Response.json(
                    { error: `Ollama error: ${errorText}` },
                    { status: 500 }
                )
            }

            // Transform Ollama stream to standard text stream
            const reader = response.body?.getReader()
            const encoder = new TextEncoder()
            const decoder = new TextDecoder()

            const stream = new ReadableStream({
                async start(controller) {
                    let fullContent = ""
                    try {
                        while (reader) {
                            const { done, value } = await reader.read()
                            if (done) break

                            const chunk = decoder.decode(value, { stream: true })
                            const lines = chunk.split("\n").filter(Boolean)

                            for (const line of lines) {
                                try {
                                    const json = JSON.parse(line)
                                    if (json.message?.content) {
                                        fullContent += json.message.content
                                        controller.enqueue(
                                            encoder.encode(json.message.content)
                                        )
                                    }
                                    if (json.done && reviewId) {
                                        // Update review with AI results when complete
                                        updateReview(reviewId, {
                                            aiAnalysis: fullContent,
                                            status: "completed",
                                        })
                                    }
                                } catch {
                                    // Skip non-JSON lines
                                }
                            }
                        }
                    } finally {
                        controller.close()
                    }
                },
            })

            return new Response(stream, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Transfer-Encoding": "chunked",
                },
            })
        } catch (error) {
            return Response.json(
                {
                    error: `Cannot connect to Ollama at ${ollamaUrl}. Is it running? Error: ${error instanceof Error ? error.message : "Unknown"}`,
                },
                { status: 500 }
            )
        }
    } else {
        // Cloud provider - select based on config
        let aiModel;
        const provider = config?.provider || "google"
        const selectedModel = config?.model

        switch (provider) {
            case "google":
                aiModel = google(selectedModel || "gemini-2.5-flash")
                break
            case "anthropic":
                aiModel = anthropic(selectedModel || "claude-haiku-4-5-20241022")
                break
            case "openai":
            default:
                aiModel = openai(selectedModel || "gpt-4o-mini")
                break
        }

        try {
            const result = await streamText({
                model: aiModel,
                system: systemPrompt,
                messages: [{ role: "user", content: userContent }],
            })

            return result.toTextStreamResponse()
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            // Check for common API key errors
            if (errorMessage.includes("API key") || errorMessage.includes("auth") || errorMessage.includes("401")) {
                return Response.json(
                    { error: `Missing or invalid API key for ${provider}. Please configure the correct API key in your .env.local file.` },
                    { status: 401 }
                )
            }
            return Response.json(
                { error: `AI analysis failed (${provider}): ${errorMessage}` },
                { status: 500 }
            )
        }
    }
}
