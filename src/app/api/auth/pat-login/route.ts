import { cookies } from "next/headers"

const PAT_SESSION_COOKIE = "gitlab-pat-session"
const PAT_SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

interface PatLoginRequest {
    url: string
    token: string
}

export async function POST(req: Request) {
    try {
        const { url, token }: PatLoginRequest = await req.json()

        if (!url) {
            return Response.json({ error: "GitLab URL is required" }, { status: 400 })
        }

        const baseUrl = url.replace(/\/$/, "")

        // Validate PAT by calling GitLab API
        const headers: HeadersInit = {}
        if (token) {
            headers["PRIVATE-TOKEN"] = token
        }

        const response = await fetch(`${baseUrl}/api/v4/user`, {
            headers,
            signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
            if (response.status === 401) {
                return Response.json({ error: "Invalid token or unauthorized" }, { status: 401 })
            }
            return Response.json({ error: `GitLab error: ${response.statusText}` }, { status: response.status })
        }

        const user = await response.json()

        // Create session data
        const sessionData = {
            type: "gitlab-pat",
            url: baseUrl,
            userId: user.id,
            username: user.username,
            name: user.name,
            avatar: user.avatar_url,
            createdAt: Date.now(),
        }

        // Set HTTP-only cookie with session data
        const cookieStore = await cookies()
        cookieStore.set(PAT_SESSION_COOKIE, JSON.stringify(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: PAT_SESSION_MAX_AGE,
            path: "/",
        })

        return Response.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                avatar: user.avatar_url,
            },
        })
    } catch (error) {
        console.error("PAT login error:", error)
        return Response.json(
            { error: error instanceof Error ? error.message : "Login failed" },
            { status: 500 }
        )
    }
}

// Logout endpoint
export async function DELETE() {
    const cookieStore = await cookies()
    cookieStore.delete(PAT_SESSION_COOKIE)
    return Response.json({ success: true })
}
