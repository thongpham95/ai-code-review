import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

// Use the edge-safe config (no DB/Node.js-only imports) for middleware
const { auth } = NextAuth(authConfig)

const PAT_SESSION_COOKIE = "gitlab-pat-session"

export default auth((req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth?.user
    const isDashboard = nextUrl.pathname.startsWith("/dashboard")

    if (isDashboard && !isLoggedIn) {
        // Also allow GitLab PAT sessions (separate cookie-based auth flow)
        const patCookie = req.cookies.get(PAT_SESSION_COOKIE)
        if (!patCookie?.value) {
            return NextResponse.redirect(new URL("/login", nextUrl))
        }
    }
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
