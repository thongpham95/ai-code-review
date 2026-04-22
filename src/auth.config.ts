/**
 * Edge-safe NextAuth config — no Node.js-only imports.
 * Used by middleware (Edge Runtime) and extended by auth.ts (Node.js).
 */
import type { NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"
import GitLab from "next-auth/providers/gitlab"
import Google from "next-auth/providers/google"

export const authConfig = {
    trustHost: true,
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt" as const,
    },
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
        // Note: Credentials (OTP) provider is added in auth.ts (Node.js only)
        // because it requires DB access (review-store / better-sqlite3).
    ],
    callbacks: {
        authorized() {
            // Route protection is handled manually in middleware
            return true
        },
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
    },
} satisfies NextAuthConfig
