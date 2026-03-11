"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Eye, EyeOff, Check, Trash2, Loader2 } from "lucide-react"

// Jira icon SVG component
function JiraIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z" />
        </svg>
    )
}

export interface JiraAccount {
    host: string
    email: string
    apiToken: string
}

export function JiraSettingsForm() {
    const [account, setAccount] = useState<JiraAccount | null>(null)
    const [showToken, setShowToken] = useState(false)
    const [testing, setTesting] = useState(false)

    // Form states
    const [host, setHost] = useState("")
    const [email, setEmail] = useState("")
    const [apiToken, setApiToken] = useState("")

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem("jira-account")
            if (saved) {
                const parsed = JSON.parse(saved) as JiraAccount
                setAccount(parsed)
                setHost(parsed.host || "")
                setEmail(parsed.email || "")
                setApiToken(parsed.apiToken || "")
            }
        } catch {
            // Ignore parse errors
        }
    }, [])

    async function testAndSave() {
        if (!host || !email || !apiToken) {
            toast.error("Please fill all Jira fields")
            return
        }

        setTesting(true)
        try {
            // Test connection via our API
            const res = await fetch("/api/jira/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ host, email, apiToken }),
            })

            const data = await res.json()

            if (data.success) {
                const newAccount: JiraAccount = { host, email, apiToken }
                localStorage.setItem("jira-account", JSON.stringify(newAccount))
                setAccount(newAccount)
                toast.success(`Jira connected successfully! Welcome, ${data.displayName || email}`)
            } else {
                toast.error(data.error || "Failed to connect to Jira. Please check your credentials.")
            }
        } catch (error) {
            toast.error("Connection test failed. Check your Jira URL and credentials.")
            console.error("Jira test error:", error)
        } finally {
            setTesting(false)
        }
    }

    function removeJira() {
        localStorage.removeItem("jira-account")
        setAccount(null)
        setHost("")
        setEmail("")
        setApiToken("")
        toast.success("Jira account removed")
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <JiraIcon className="h-5 w-5 text-blue-500" />
                        <CardTitle className="text-base">Jira Cloud</CardTitle>
                    </div>
                    {account?.host && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                            <Check className="h-3 w-3 mr-1" />
                            Connected
                        </Badge>
                    )}
                </div>
                <CardDescription>
                    Connect your Jira Cloud account to analyze bug tickets with AI
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="space-y-2">
                    <Label htmlFor="jira-host">Jira Host URL</Label>
                    <Input
                        id="jira-host"
                        placeholder="https://yourcompany.atlassian.net"
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="jira-email">Email</Label>
                    <Input
                        id="jira-email"
                        type="email"
                        placeholder="your-email@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="jira-token">API Token</Label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                id="jira-token"
                                type={showToken ? "text" : "password"}
                                placeholder="Your Jira API Token"
                                value={apiToken}
                                onChange={(e) => setApiToken(e.target.value)}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                onClick={() => setShowToken(!showToken)}
                            >
                                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                        <Button onClick={testAndSave} disabled={!host || !email || !apiToken || testing}>
                            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            {testing ? "Testing..." : "Connect"}
                        </Button>
                        {account?.host && (
                            <Button variant="outline" size="icon" onClick={removeJira}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Generate an API token at{" "}
                        <a
                            href="https://id.atlassian.com/manage-profile/security/api-tokens"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                        >
                            Atlassian API Tokens
                        </a>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
