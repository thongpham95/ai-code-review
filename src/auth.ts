/**
 * Full NextAuth config (Node.js runtime only).
 * Extends edge-safe authConfig with OTP Credentials provider (requires SQLite/DB).
 * API routes and server components import from here.
 * Middleware imports from auth.config.ts instead.
 */
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import { getLatestOtpForEmail, markOtpUsed, incrementOtpAttempts } from "@/lib/review-store"

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        ...authConfig.providers,
        // Email OTP 2FA — requires DB access, Node.js only
        Credentials({
            id: "otp",
            name: "Email OTP",
            credentials: {
                email: { label: "Email", type: "email" },
                code: { label: "OTP Code", type: "text" },
            },
            async authorize(credentials) {
                const email = (credentials?.email as string | undefined)?.trim().toLowerCase()
                const code = (credentials?.code as string | undefined)?.trim()

                if (!email || !code) return null

                // Enforce domain restriction
                if (!email.endsWith("@tvtgroup.io")) return null

                const otp = getLatestOtpForEmail(email)
                if (!otp) return null
                if (otp.used) return null
                if (otp.attempts >= 3) return null
                if (Date.now() > otp.expiresAt) return null

                if (otp.code !== code) {
                    incrementOtpAttempts(otp.id)
                    return null
                }

                markOtpUsed(otp.id)

                return {
                    id: email,
                    email,
                    name: email.split("@")[0],
                }
            },
        }),
    ],
})
