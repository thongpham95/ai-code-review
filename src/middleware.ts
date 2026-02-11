import { auth } from "@/auth"

const PAT_SESSION_COOKIE = "gitlab-pat-session"

export default auth((req) => {
    const isOAuthLoggedIn = !!req.auth
    const isPatLoggedIn = !!req.cookies.get(PAT_SESSION_COOKIE)?.value
    const isLoggedIn = isOAuthLoggedIn || isPatLoggedIn

    const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')
    if (isOnDashboard && !isLoggedIn) {
        return Response.redirect(new URL('/login', req.nextUrl))
    }
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
