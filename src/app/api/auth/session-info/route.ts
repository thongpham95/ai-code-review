import { auth } from "@/auth"
import { cookies } from "next/headers"

const PAT_SESSION_COOKIE = "gitlab-pat-session"

export async function GET() {
    // Check NextAuth session first
    const session = await auth()
    if (session?.user) {
        return Response.json({
            type: "oauth",
            user: {
                name: session.user.name,
                email: session.user.email,
                image: session.user.image,
            },
        })
    }

    // Check PAT session
    const cookieStore = await cookies()
    const patCookie = cookieStore.get(PAT_SESSION_COOKIE)
    if (patCookie?.value) {
        try {
            const sessionData = JSON.parse(patCookie.value)
            return Response.json({
                type: "gitlab-pat",
                user: {
                    name: sessionData.name || sessionData.username,
                    email: `${sessionData.username}@gitlab`,
                    image: sessionData.avatar,
                    gitlabUrl: sessionData.url,
                },
            })
        } catch {
            // Invalid cookie data
        }
    }

    return Response.json({ type: null, user: null })
}
