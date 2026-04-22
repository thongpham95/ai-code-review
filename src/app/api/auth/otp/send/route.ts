import { createOtpVerification, getLatestOtpForEmail } from "@/lib/review-store"
import { sendOtpEmail } from "@/lib/email-service"

const ALLOWED_DOMAIN = "@tvtgroup.io"
const OTP_TTL_MS = 5 * 60 * 1000       // 5 minutes
const RATE_LIMIT_MS = 60 * 1000        // 1 OTP per email per 60 seconds

interface SendOtpRequest {
    email: string
}

export async function POST(req: Request) {
    try {
        const { email }: SendOtpRequest = await req.json()

        if (!email || typeof email !== "string") {
            return Response.json({ error: "Email là bắt buộc" }, { status: 400 })
        }

        const normalizedEmail = email.trim().toLowerCase()

        // Enforce @tvtgroup.io domain
        if (!normalizedEmail.endsWith(ALLOWED_DOMAIN)) {
            return Response.json(
                { error: `Chỉ cho phép email ${ALLOWED_DOMAIN}` },
                { status: 403 }
            )
        }

        // Rate limit: check if a recent OTP was created within the last 60 seconds
        const existing = getLatestOtpForEmail(normalizedEmail)
        if (existing && !existing.used) {
            const secondsAgo = (Date.now() - new Date(existing.createdAt).getTime()) / 1000
            if (secondsAgo < RATE_LIMIT_MS / 1000) {
                const waitSeconds = Math.ceil(RATE_LIMIT_MS / 1000 - secondsAgo)
                return Response.json(
                    { error: `Vui lòng chờ ${waitSeconds} giây trước khi gửi lại mã` },
                    { status: 429 }
                )
            }
        }

        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = Date.now() + OTP_TTL_MS

        // Store in DB
        createOtpVerification(normalizedEmail, code, expiresAt)

        // Send email
        await sendOtpEmail(normalizedEmail, code)

        return Response.json({ success: true })
    } catch (error) {
        console.error("OTP send error:", error)
        const message = error instanceof Error ? error.message : "Lỗi gửi email"

        if (message.includes("not configured")) {
            return Response.json(
                { error: "Hệ thống email chưa được cấu hình. Vui lòng liên hệ admin." },
                { status: 503 }
            )
        }

        return Response.json({ error: `Không thể gửi OTP: ${message}` }, { status: 500 })
    }
}
