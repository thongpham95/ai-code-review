"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Github, Gitlab, Server, Loader2, CheckCircle2 } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { signIn } from "next-auth/react"

const STORAGE_KEY = "gitlab-self-hosted-config"

interface GitLabSelfHostedConfig {
    url: string
    token: string
}

function getSavedConfig(): GitLabSelfHostedConfig | null {
    if (typeof window === "undefined") return null
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        return saved ? JSON.parse(saved) : null
    } catch {
        return null
    }
}

function saveConfig(config: GitLabSelfHostedConfig) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export default function LoginPage() {
    const [selfHostedUrl, setSelfHostedUrl] = useState("")
    const [selfHostedToken, setSelfHostedToken] = useState("")
    const [isTestingConnection, setIsTestingConnection] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle")

    useEffect(() => {
        const saved = getSavedConfig()
        if (saved) {
            setSelfHostedUrl(saved.url)
            setSelfHostedToken(saved.token)
        }
    }, [])

    async function testConnection() {
        if (!selfHostedUrl) {
            toast.error("Please enter a GitLab URL")
            return
        }

        setIsTestingConnection(true)
        setConnectionStatus("idle")

        try {
            const baseUrl = selfHostedUrl.replace(/\/$/, "")
            const headers: HeadersInit = {}
            if (selfHostedToken) {
                headers["PRIVATE-TOKEN"] = selfHostedToken
            }
            const res = await fetch(`${baseUrl}/api/v4/version`, { headers, signal: AbortSignal.timeout(5000) })

            if (res.ok) {
                const data = await res.json()
                setConnectionStatus("success")
                toast.success(`Connected! GitLab ${data.version}`)
                // Save config for next time
                saveConfig({ url: selfHostedUrl, token: selfHostedToken })
            } else {
                setConnectionStatus("error")
                toast.error(`Connection failed: ${res.statusText}`)
            }
        } catch {
            setConnectionStatus("error")
            toast.error("Cannot reach that URL. Check the address and try again.")
        } finally {
            setIsTestingConnection(false)
        }
    }

    async function handleSelfHostedLogin() {
        if (!selfHostedUrl) {
            toast.error("Please enter a GitLab URL first")
            return
        }

        setIsConnecting(true)

        try {
            // Call API to validate PAT and create session cookie
            const res = await fetch("/api/auth/pat-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: selfHostedUrl, token: selfHostedToken }),
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || "Login failed")
                setIsConnecting(false)
                return
            }

            // Save config for next time
            saveConfig({ url: selfHostedUrl, token: selfHostedToken })

            // Store token in sessionStorage for API calls (MR fetching)
            if (selfHostedToken) {
                sessionStorage.setItem("gitlab-pat", selfHostedToken)
            }
            sessionStorage.setItem("gitlab-url", selfHostedUrl)

            toast.success(`Welcome, ${data.user.name || data.user.username}!`)
            window.location.href = "/dashboard"
        } catch (error) {
            toast.error("Connection failed. Please check the URL and try again.")
            setIsConnecting(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
            <Card className="w-full max-w-md border-neutral-800 bg-neutral-900 text-neutral-50 shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">AI Code Review</CardTitle>
                    <CardDescription className="text-neutral-400">
                        Sign in to start your automated code review
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    {/* OAuth Providers */}
                    <Button
                        className="w-full bg-neutral-800 text-neutral-50 hover:bg-neutral-700"
                        variant="outline"
                        onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
                    >
                        <Github className="mr-2 h-4 w-4" />
                        Sign in with GitHub
                    </Button>
                    <Button
                        className="w-full bg-orange-600 text-white hover:bg-orange-700"
                        variant="outline"
                        onClick={() => signIn("gitlab", { callbackUrl: "/dashboard" })}
                    >
                        <Gitlab className="mr-2 h-4 w-4" />
                        Sign in with GitLab.com
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <Separator className="w-full border-neutral-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-neutral-900 px-2 text-neutral-400">Or connect self-hosted</span>
                        </div>
                    </div>

                    {/* GitLab Self-Hosted */}
                    <div className="space-y-3 rounded-lg border border-neutral-700 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                            <Server className="h-4 w-4" />
                            GitLab Self-Hosted
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gitlab-url" className="text-neutral-400 text-xs">Instance URL</Label>
                            <Input
                                id="gitlab-url"
                                placeholder="https://gitlab.mycompany.com"
                                value={selfHostedUrl}
                                onChange={(e) => setSelfHostedUrl(e.target.value)}
                                className="bg-neutral-800 border-neutral-700 text-neutral-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gitlab-token" className="text-neutral-400 text-xs">Personal Access Token (Optional)</Label>
                            <Input
                                id="gitlab-token"
                                type="password"
                                placeholder="glpat-..."
                                value={selfHostedToken}
                                onChange={(e) => setSelfHostedToken(e.target.value)}
                                className="bg-neutral-800 border-neutral-700 text-neutral-100"
                            />
                            <p className="text-[10px] text-neutral-500">Token is stored locally and never sent to our servers.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={testConnection}
                                disabled={isTestingConnection}
                                className="flex-1 border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                            >
                                {isTestingConnection ? (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                ) : connectionStatus === "success" ? (
                                    <CheckCircle2 className="mr-2 h-3 w-3 text-green-400" />
                                ) : null}
                                Test Connection
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSelfHostedLogin}
                                disabled={isConnecting}
                                className="flex-1 bg-orange-600 hover:bg-orange-700"
                            >
                                {isConnecting ? (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                ) : (
                                    <Gitlab className="mr-2 h-3 w-3" />
                                )}
                                {isConnecting ? "Connecting..." : "Connect"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
