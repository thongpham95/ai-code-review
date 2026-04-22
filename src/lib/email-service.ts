import nodemailer from "nodemailer"

/**
 * Send an OTP verification email using SMTP (configured via env vars).
 * Supports Gmail App Passwords and any standard SMTP provider.
 */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT || 587)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const from = process.env.EMAIL_FROM || user

    if (!host || !user || !pass) {
        throw new Error(
            "Email service not configured. Please set SMTP_HOST, SMTP_USER, SMTP_PASS in environment variables."
        )
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: {
            // Accept self-signed certs in dev; production uses verified certs
            rejectUnauthorized: process.env.NODE_ENV === "production",
        },
    })

    await transporter.sendMail({
        from: from ? `"AI Code Review" <${from}>` : user,
        to,
        subject: "Mã xác thực đăng nhập - AI Code Review",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #1a1a2e; margin-bottom: 8px;">Mã xác thực đăng nhập</h2>
                <p style="color: #555; margin-bottom: 24px;">
                    Bạn đang đăng nhập vào <strong>AI Code Review</strong>. Nhập mã OTP bên dưới để hoàn tất:
                </p>
                <div style="background: #f4f4f8; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e; font-family: monospace;">
                        ${code}
                    </span>
                </div>
                <p style="color: #888; font-size: 13px;">
                    Mã có hiệu lực trong <strong>5 phút</strong>. Không chia sẻ mã này với bất kỳ ai.
                </p>
                <p style="color: #aaa; font-size: 12px; margin-top: 16px;">
                    Nếu bạn không thực hiện đăng nhập này, hãy bỏ qua email này.
                </p>
            </div>
        `,
        text: `Mã OTP đăng nhập AI Code Review: ${code}\nMã có hiệu lực trong 5 phút. Không chia sẻ mã này với ai.`,
    })
}
