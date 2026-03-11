import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import GitLab from "next-auth/providers/gitlab"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
        GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
        }),
        GitLab({
            clientId: process.env.AUTH_GITLAB_ID,
            clientSecret: process.env.AUTH_GITLAB_SECRET,
        }),
        GitLab({
            id: "gitlab-self-hosted",
            name: "GitLab Self-Hosted",
            clientId: process.env.AUTH_GITLAB_SELF_HOSTED_ID,
            clientSecret: process.env.AUTH_GITLAB_SELF_HOSTED_SECRET,
            issuer: process.env.AUTH_GITLAB_SELF_HOSTED_ISSUER,
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async signIn({ account, profile }) {
            // Restrict Google login to @tvtgroup.io domain
            if (account?.provider === "google") {
                return profile?.email?.endsWith("@tvtgroup.io") ?? false
            }
            return true
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string
            }
            return session
        },
        authorized() {
            return true
        },
    },
})
