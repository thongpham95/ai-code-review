"use client"

import { useState, useEffect, useRef } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, KeyRound, Loader2, ArrowLeft, ShieldCheck } from "lucide-react"

type Step = "email" | "otp"

const RESEND_COOLDOWN = 60 // seconds

export default function LoginPage() {
    const router = useRouter()
    const [step, setStep] = useState<Step>("email")
    const [email, setEmail] = useState("")
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [cooldown, setCooldown] = useState(0)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const codeInputRef = useRef<HTMLInputElement>(null)

    // Countdown timer for resend cooldown
    useEffect(() => {
        if (cooldown <= 0) {
            if (timerRef.current) clearInterval(timerRef.current)
            return
        }
        timerRef.current = setInterval(() => {
            setCooldown((c) => {
                if (c <= 1) {
                    clearInterval(timerRef.current!)
                    return 0
                }
                return c - 1
            })
        }, 1000)
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [cooldown])

    // Auto-focus OTP input when step changes
    useEffect(() => {
        if (step === "otp") {
            setTimeout(() => codeInputRef.current?.focus(), 100)
        }
    }, [step])

    async function handleSendOtp(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const res = await fetch("/api/auth/otp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Không thể gửi mã OTP")
                return
            }

            setStep("otp")
            setCooldown(RESEND_COOLDOWN)
        } catch {
            setError("Lỗi kết nối. Vui lòng thử lại.")
        } finally {
            setLoading(false)
        }
    }

    async function handleVerifyOtp(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const result = await signIn("otp", {
                email: email.trim().toLowerCase(),
                code: code.trim(),
                redirect: false,
            })

            if (result?.error) {
                setError("Mã OTP không đúng hoặc đã hết hạn. Vui lòng thử lại.")
                setCode("")
                return
            }

            router.push("/dashboard")
            router.refresh()
        } catch {
            setError("Lỗi xác thực. Vui lòng thử lại.")
        } finally {
            setLoading(false)
        }
    }

    async function handleResend() {
        if (cooldown > 0) return
        setError("")
        setCode("")
        setLoading(true)

        try {
            const res = await fetch("/api/auth/otp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Không thể gửi lại mã OTP")
                return
            }
            setCooldown(RESEND_COOLDOWN)
        } catch {
            setError("Lỗi kết nối. Vui lòng thử lại.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
            <div className="w-full max-w-md">
                {/* Logo / Brand */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <span className="text-xl font-bold text-foreground">AI Code Review</span>
                </div>

                <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
                    <CardHeader className="space-y-1 pb-4">
                        {step === "email" ? (
                            <>
                                <CardTitle className="text-2xl font-bold">Đăng nhập</CardTitle>
                                <CardDescription>
                                    Nhập email <span className="font-medium text-foreground">@tvtgroup.io</span> của bạn để nhận mã OTP
                                </CardDescription>
                            </>
                        ) : (
                            <>
                                <CardTitle className="text-2xl font-bold">Nhập mã OTP</CardTitle>
                                <CardDescription>
                                    Mã xác thực đã được gửi đến{" "}
                                    <span className="font-medium text-foreground">{email}</span>
                                </CardDescription>
                            </>
                        )}
                    </CardHeader>

                    <CardContent>
                        {step === "email" ? (
                            <form onSubmit={handleSendOtp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="ten@tvtgroup.io"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-9"
                                            required
                                            autoFocus
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                                        {error}
                                    </p>
                                )}

                                <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Đang gửi...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Gửi mã OTP
                                        </>
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Mã OTP (6 chữ số)</Label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="code"
                                            ref={codeInputRef}
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="123456"
                                            value={code}
                                            onChange={(e) => {
                                                // Only allow digits, max 6
                                                const val = e.target.value.replace(/\D/g, "").slice(0, 6)
                                                setCode(val)
                                            }}
                                            className="pl-9 text-center text-xl tracking-widest font-mono"
                                            maxLength={6}
                                            pattern="\d{6}"
                                            required
                                            autoComplete="one-time-code"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Mã có hiệu lực trong 5 phút
                                    </p>
                                </div>

                                {error && (
                                    <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                                        {error}
                                    </p>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading || code.length !== 6}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Đang xác thực...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-4 h-4 mr-2" />
                                            Xác nhận & Đăng nhập
                                        </>
                                    )}
                                </Button>

                                <div className="flex items-center justify-between pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep("email")
                                            setCode("")
                                            setError("")
                                        }}
                                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <ArrowLeft className="w-3 h-3" />
                                        Đổi email
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleResend}
                                        disabled={cooldown > 0 || loading}
                                        className="text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed transition-opacity"
                                    >
                                        {cooldown > 0
                                            ? `Gửi lại sau ${cooldown}s`
                                            : "Gửi lại mã"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    Chỉ dành cho nhân viên TVTGroup với email @tvtgroup.io
                </p>
            </div>
        </div>
    )
}
