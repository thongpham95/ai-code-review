import { NextResponse } from "next/server"

/**
 * GET /api/ai/providers
 * Returns which AI providers have server-side API keys configured.
 * This allows the frontend to know which providers are ready to use
 * without the user needing to provide their own key.
 */
export async function GET() {
    const providers = {
        google: {
            available: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
            label: "Google Gemini",
        },
        anthropic: {
            available: !!process.env.ANTHROPIC_API_KEY,
            label: "Anthropic Claude",
        },
        openai: {
            available: !!process.env.OPENAI_API_KEY,
            label: "OpenAI",
        },
    }

    return NextResponse.json({ providers })
}
