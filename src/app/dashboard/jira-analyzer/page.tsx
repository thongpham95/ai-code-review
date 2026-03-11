"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2, Bug, Send, AlertCircle, CheckCircle2, Sparkles, GitBranch, ExternalLink, User } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { useLanguage } from "@/contexts/language-context"

interface JiraAccount {
    host: string
    email: string
    apiToken: string
}

interface GitAccounts {
    github?: { token: string }
    gitlab?: { token: string }
    gitlabSelfHosted?: { url: string; token: string }
}

interface TicketInfo {
    key: string
    summary: string
    status: string
    priority: string
    assignee: string
    issueType: string
    jiraUrl: string
}

export default function JiraAnalyzerPage() {
    const { language } = useLanguage()
    const isVi = language === "vi"

    // Form
    const [ticketKey, setTicketKey] = useState("")
    const [repoPath, setRepoPath] = useState("")
    const [provider, setProvider] = useState<"github" | "gitlab" | "gitlab-selfhosted">("gitlab")

    // State
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState("")
    const [error, setError] = useState("")
    const [jiraConnected, setJiraConnected] = useState(false)
    const [gitConnected, setGitConnected] = useState(false)
    const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null)

    const reportRef = useRef<HTMLDivElement>(null)
    const formRef = useRef<HTMLDivElement>(null)

    // Load saved configs on mount
    useEffect(() => {
        try {
            const jiraSaved = localStorage.getItem("jira-account")
            if (jiraSaved) {
                const parsed = JSON.parse(jiraSaved) as JiraAccount
                setJiraConnected(!!parsed.host && !!parsed.email && !!parsed.apiToken)
            }

            const gitSaved = localStorage.getItem("git-accounts")
            if (gitSaved) {
                const parsed = JSON.parse(gitSaved) as GitAccounts
                const hasGit = !!(parsed.github?.token || parsed.gitlab?.token || parsed.gitlabSelfHosted?.url)
                setGitConnected(hasGit)

                // Auto-select provider
                if (parsed.gitlabSelfHosted?.url) setProvider("gitlab-selfhosted")
                else if (parsed.gitlab?.token) setProvider("gitlab")
                else if (parsed.github?.token) setProvider("github")
            }
        } catch {
            // Ignore
        }
    }, [])

    // Auto-scroll to bottom of report
    useEffect(() => {
        if (reportRef.current) {
            reportRef.current.scrollTop = reportRef.current.scrollHeight
        }
    }, [report])

    async function handleAnalyze() {
        if (!ticketKey.trim()) {
            toast.error(isVi ? "Vui lòng nhập Jira Ticket Key" : "Please enter a Jira Ticket Key")
            return
        }

        if (!jiraConnected) {
            toast.error(isVi ? "Vui lòng kết nối Jira trong Settings trước" : "Please connect Jira in Settings first")
            return
        }

        setLoading(true)
        setReport("")
        setError("")

        try {
            // Get Jira config from localStorage
            const jiraAccount = JSON.parse(localStorage.getItem("jira-account") || "{}") as JiraAccount
            const gitAccounts = JSON.parse(localStorage.getItem("git-accounts") || "{}") as GitAccounts

            // Fetch ticket info first
            const ticketKeyUpper = ticketKey.trim().toUpperCase()
            const jiraHost = jiraAccount.host.replace(/\/$/, "")

            // Set basic info immediately
            setTicketInfo({
                key: ticketKeyUpper,
                summary: isVi ? "Đang tải..." : "Loading...",
                status: "...",
                priority: "...",
                assignee: "...",
                issueType: "Bug",
                jiraUrl: `${jiraHost}/browse/${ticketKeyUpper}`,
            })

            // Fetch full ticket info in parallel
            fetch("/api/jira/ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticketKey: ticketKeyUpper,
                    jiraConfig: {
                        host: jiraAccount.host,
                        email: jiraAccount.email,
                        apiToken: jiraAccount.apiToken,
                    },
                }),
            })
                .then((res) => res.json())
                .then((data) => {
                    if (!data.error) {
                        setTicketInfo({
                            key: data.key,
                            summary: data.summary,
                            status: data.status,
                            priority: data.priority,
                            assignee: data.assignee,
                            issueType: data.issueType,
                            jiraUrl: data.jiraUrl,
                        })
                    }
                })
                .catch(() => {
                    // Keep basic info on error
                })

            // Determine git config
            let gitConfig = undefined
            if (repoPath.trim()) {
                if (provider === "github" && gitAccounts.github?.token) {
                    gitConfig = {
                        provider: "github" as const,
                        token: gitAccounts.github.token,
                        repoUrl: repoPath.trim(),
                    }
                } else if (provider === "gitlab" && gitAccounts.gitlab?.token) {
                    gitConfig = {
                        provider: "gitlab" as const,
                        token: gitAccounts.gitlab.token,
                        repoUrl: repoPath.trim(),
                        baseUrl: "https://gitlab.com",
                    }
                } else if (provider === "gitlab-selfhosted" && gitAccounts.gitlabSelfHosted?.token) {
                    gitConfig = {
                        provider: "gitlab-selfhosted" as const,
                        token: gitAccounts.gitlabSelfHosted.token,
                        repoUrl: repoPath.trim(),
                        baseUrl: gitAccounts.gitlabSelfHosted.url,
                    }
                }
            }

            const res = await fetch("/api/jira/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticketKey: ticketKey.trim().toUpperCase(),
                    jiraConfig: {
                        host: jiraAccount.host,
                        email: jiraAccount.email,
                        apiToken: jiraAccount.apiToken,
                    },
                    gitConfig,
                    language,
                }),
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || `HTTP ${res.status}`)
            }

            // Stream the response
            const reader = res.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) throw new Error("No response body")

            let accumulatedText = ""
            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                accumulatedText += decoder.decode(value, { stream: true })
                setReport(accumulatedText)
            }

            toast.success(isVi ? "Phân tích hoàn tất!" : "Analysis complete!")
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error"
            setError(msg)
            toast.error(isVi ? `Lỗi: ${msg}` : `Error: ${msg}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 p-2 pt-2 md:p-10 md:pb-16">
            {/* Header */}
            <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                    <Bug className="h-6 w-6 text-red-500" />
                    <h2 className="text-2xl font-bold tracking-tight">
                        {isVi ? "Jira Bug Analyzer" : "Jira Bug Analyzer"}
                    </h2>
                </div>
                <p className="text-muted-foreground">
                    {isVi
                        ? "Phân tích bug từ Jira bằng AI — tìm root cause và đề xuất solution cụ thể"
                        : "AI-powered bug analysis from Jira — find root cause and propose specific solutions"}
                </p>
            </div>

            <Separator />

            {/* Connection Status */}
            <div className="flex flex-wrap gap-3">
                <Badge
                    variant="outline"
                    className={jiraConnected
                        ? "bg-green-500/10 text-green-600 border-green-500/30"
                        : "bg-red-500/10 text-red-600 border-red-500/30"}
                >
                    {jiraConnected ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                    Jira: {jiraConnected ? (isVi ? "Đã kết nối" : "Connected") : (isVi ? "Chưa kết nối" : "Not connected")}
                </Badge>
                <Badge
                    variant="outline"
                    className={gitConnected
                        ? "bg-green-500/10 text-green-600 border-green-500/30"
                        : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"}
                >
                    <GitBranch className="h-3 w-3 mr-1" />
                    Git: {gitConnected ? (isVi ? "Đã kết nối" : "Connected") : (isVi ? "Tùy chọn" : "Optional")}
                </Badge>
            </div>

            {/* Sticky Ticket Banner - shows when ticket is loaded */}
            {ticketInfo && (report || loading) && (
                <div
                    ref={formRef}
                    className="sticky top-0 z-10 -mx-2 md:-mx-10 px-2 md:px-10 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b"
                >
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <a
                            href={ticketInfo.jiraUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 font-semibold text-primary hover:underline"
                        >
                            <Bug className="h-4 w-4 text-red-500" />
                            {ticketInfo.key}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                        <span className="hidden md:inline text-muted-foreground">|</span>
                        <span className="text-sm text-foreground line-clamp-1 flex-1 min-w-0">
                            {ticketInfo.summary}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                                {ticketInfo.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {ticketInfo.priority}
                            </Badge>
                            <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                {ticketInfo.assignee}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-6">
                {/* Input Form */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-yellow-500" />
                            {isVi ? "Thông tin Bug" : "Bug Information"}
                        </CardTitle>
                        <CardDescription>
                            {isVi
                                ? "Nhập Jira Ticket Key để bắt đầu phân tích"
                                : "Enter Jira Ticket Key to start analysis"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                        {/* Row 1: Ticket Key + Repository */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ticket-key">Jira Ticket Key</Label>
                                <Input
                                    id="ticket-key"
                                    placeholder="e.g. BUG-123"
                                    value={ticketKey}
                                    onChange={(e) => setTicketKey(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="repo-path">
                                    {isVi ? "Repository (Tùy chọn)" : "Repository (Optional)"}
                                </Label>
                                <Input
                                    id="repo-path"
                                    placeholder={provider === "github" ? "owner/repo" : "group/project"}
                                    value={repoPath}
                                    onChange={(e) => setRepoPath(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Row 2: Git Provider (if connected) */}
                        {gitConnected && (
                            <div className="space-y-2">
                                <Label>Git Provider</Label>
                                <div className="flex flex-wrap gap-2">
                                    {["github", "gitlab", "gitlab-selfhosted"].map((p) => (
                                        <Button
                                            key={p}
                                            variant={provider === p ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setProvider(p as typeof provider)}
                                            disabled={loading}
                                        >
                                            {p === "github" ? "GitHub" : p === "gitlab" ? "GitLab" : "Self-hosted"}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Row 3: Submit */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                            <Button
                                className="w-full sm:w-auto"
                                onClick={handleAnalyze}
                                disabled={loading || !ticketKey.trim() || !jiraConnected}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {isVi ? "Đang xử lý..." : "Analyzing..."}
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        {isVi ? "Bắt đầu phân tích" : "Start Analysis"}
                                    </>
                                )}
                            </Button>

                            {!jiraConnected && (
                                <p className="text-xs text-red-500 font-medium">
                                    {isVi
                                        ? "⚠️ Hãy kết nối Jira trong Settings trước."
                                        : "⚠️ Please connect Jira in Settings first."}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Report Output */}
                <Card className="min-h-[500px]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                            {isVi ? "📋 Báo cáo phân tích" : "📋 Analysis Report"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4 inline mr-2" />
                                {error}
                            </div>
                        )}

                        {!report && !loading && !error && (
                            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                                <Bug className="h-12 w-12 mb-4 opacity-20" />
                                <p className="text-center">
                                    {isVi
                                        ? "Nhập Jira Ticket Key và nhấn \"Bắt đầu phân tích\" để AI tìm root cause"
                                        : "Enter a Jira Ticket Key and click \"Start Analysis\" for AI root cause analysis"}
                                </p>
                            </div>
                        )}

                        {loading && !report && (
                            <div className="flex flex-col items-center justify-center h-[400px]">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                                <p className="text-muted-foreground animate-pulse">
                                    {isVi ? "AI đang phân tích bug..." : "AI is analyzing the bug..."}
                                </p>
                            </div>
                        )}

                        {report && (
                            <div
                                ref={reportRef}
                                className="prose prose-base dark:prose-invert max-w-none max-h-[75vh] overflow-y-auto prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0 prose-p:leading-relaxed"
                            >
                                <ReactMarkdown
                                    components={{
                                        code({ node, inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || "")
                                            const language = match ? match[1] : ""
                                            const codeString = String(children).replace(/\n$/, "")
                                            const isSingleLine = !codeString.includes("\n")

                                            // Inline code (backticks)
                                            if (inline) {
                                                return (
                                                    <code className="bg-muted text-primary px-1.5 py-0.5 rounded text-[13px] font-mono border" {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            }

                                            // Single-line code block → render as highlighted text
                                            if (isSingleLine) {
                                                return (
                                                    <code className="block my-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50 rounded-md text-[13px] font-mono font-medium w-fit" {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            }

                                            // Multi-line code block → full code block
                                            return (
                                                <div className="max-w-[75%] rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-950 dark:bg-zinc-900 my-4 overflow-hidden shadow-sm">
                                                    {language && (
                                                        <div className="flex items-center px-4 py-1.5 bg-zinc-900 dark:bg-zinc-950 border-b border-zinc-800 text-xs text-zinc-400 font-mono select-none">
                                                            {language}
                                                        </div>
                                                    )}
                                                    <div className="p-4 overflow-x-auto text-[13px] leading-relaxed text-zinc-50">
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    </div>
                                                </div>
                                            )
                                        }
                                    }}
                                >
                                    {report}
                                </ReactMarkdown>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
