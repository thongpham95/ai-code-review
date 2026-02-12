import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import GitLab from "next-auth/providers/gitlab"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
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
        authorized() {
            return true
        },
    },
})
