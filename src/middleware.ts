import { auth } from "@/auth"

const PAT_SESSION_COOKIE = "gitlab-pat-session"

export default auth((req) => {
    // Authentication disabled: Allow all requests
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
