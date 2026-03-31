"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2, Smartphone, Send, AlertCircle, CheckCircle2, Sparkles, GitBranch, Clock, Trash2, ChevronDown, ChevronUp, ClipboardCheck } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
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

interface PastReport {
    id: string
    versionId: string
    jiraUrl?: string
    createdAt: string
    status: "pending" | "completed" | "error"
    reportMarkdown?: string
    summary?: { breaking: number; nonBreaking: number; noImpact: number }
}

function MarkdownRenderer({ content }: { content: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                table({ children, ...props }: any) {
                    return (
                        <div className="my-4 overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm" {...props}>
                                {children}
                            </table>
                        </div>
                    )
                },
                thead({ children, ...props }: any) {
                    return <thead className="bg-muted/50 border-b" {...props}>{children}</thead>
                },
                th({ children, ...props }: any) {
                    return <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wider" {...props}>{children}</th>
                },
                td({ children, ...props }: any) {
                    return <td className="px-3 py-2 border-t" {...props}>{children}</td>
                },
                code({ className, children, ...props }: any) {
                    const codeString = String(children).replace(/\n$/, "")
                    const isSingleLine = !codeString.includes("\n")

                    if (isSingleLine) {
                        return (
                            <code className="bg-muted text-primary px-1.5 py-0.5 rounded text-[13px] font-mono border" {...props}>
                                {children}
                            </code>
                        )
                    }

                    return (
                        <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-950 dark:bg-zinc-900 my-4 overflow-hidden shadow-sm">
                            <div className="p-4 overflow-x-auto text-[13px] leading-relaxed text-zinc-50">
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            </div>
                        </div>
                    )
                },
                del({ children }: any) {
                    return <del className="text-red-500 line-through font-medium">{children}</del>
                },
                strong({ children }: any) {
                    return <strong className="font-bold text-foreground">{children}</strong>
                },
            }}
        >
            {content}
        </ReactMarkdown>
    )
}

export default function MobileApiCheckerPage() {
    const { language } = useLanguage()
    const isVi = language === "vi"

    // Form
    const [jiraUrl, setJiraUrl] = useState("")
    const [gitlabProjectId, setGitlabProjectId] = useState("")
    const [gitlabBranch, setGitlabBranch] = useState("tvt_qc")

    // State
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState("")
    const [error, setError] = useState("")
    const [jiraConnected, setJiraConnected] = useState(false)
    const [gitlabConnected, setGitlabConnected] = useState(false)
    const [step, setStep] = useState<string>("")

    // History
    const [pastReports, setPastReports] = useState<PastReport[]>([])
    const [showHistory, setShowHistory] = useState(false)
    const [viewingReport, setViewingReport] = useState<PastReport | null>(null)

    const reportRef = useRef<HTMLDivElement>(null)

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
                setGitlabConnected(!!(parsed.gitlabSelfHosted?.url && parsed.gitlabSelfHosted?.token))
            }

            // Load saved GitLab project ID
            const savedProjectId = localStorage.getItem("mobile-api-gitlab-project-id")
            if (savedProjectId) setGitlabProjectId(savedProjectId)
            const savedBranch = localStorage.getItem("mobile-api-gitlab-branch")
            if (savedBranch) setGitlabBranch(savedBranch)
        } catch {
            // Ignore
        }

        loadPastReports()
    }, [])

    // Auto-scroll to bottom of report
    useEffect(() => {
        if (reportRef.current) {
            reportRef.current.scrollTop = reportRef.current.scrollHeight
        }
    }, [report])

    async function loadPastReports() {
        try {
            const res = await fetch("/api/mobile-api-checker/reports")
            if (res.ok) {
                const data = await res.json()
                setPastReports(data)
            }
        } catch {
            // Ignore
        }
    }

    async function handleAnalyze() {
        if (!jiraUrl.trim()) {
            toast.error(isVi ? "Vui long nhap Jira Release URL" : "Please enter a Jira Release URL")
            return
        }

        if (!jiraConnected) {
            toast.error(isVi ? "Vui long ket noi Jira trong Settings truoc" : "Please connect Jira in Settings first")
            return
        }

        // Save GitLab config for next time
        if (gitlabProjectId) localStorage.setItem("mobile-api-gitlab-project-id", gitlabProjectId)
        if (gitlabBranch) localStorage.setItem("mobile-api-gitlab-branch", gitlabBranch)

        setLoading(true)
        setReport("")
        setError("")
        setViewingReport(null)
        setStep(isVi ? "Dang ket noi Jira..." : "Connecting to Jira...")

        try {
            const jiraAccount = JSON.parse(localStorage.getItem("jira-account") || "{}") as JiraAccount
            const gitAccounts = JSON.parse(localStorage.getItem("git-accounts") || "{}") as GitAccounts

            // Build GitLab config if available
            let gitlabConfig = undefined
            if (gitlabConnected && gitlabProjectId && gitAccounts.gitlabSelfHosted) {
                gitlabConfig = {
                    baseUrl: gitAccounts.gitlabSelfHosted.url,
                    token: gitAccounts.gitlabSelfHosted.token,
                    projectId: gitlabProjectId,
                    branch: gitlabBranch || "tvt_qc",
                }
                setStep(isVi ? "Dang lay du lieu tu Jira va GitLab..." : "Fetching data from Jira & GitLab...")
            }

            const res = await fetch("/api/mobile-api-checker/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jiraUrl: jiraUrl.trim(),
                    jiraConfig: {
                        host: jiraAccount.host,
                        email: jiraAccount.email,
                        apiToken: jiraAccount.apiToken,
                    },
                    gitlabConfig,
                    language,
                }),
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || `HTTP ${res.status}`)
            }

            setStep(isVi ? "AI dang phan tich..." : "AI is analyzing...")

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

            setStep("")
            toast.success(isVi ? "Phan tich hoan tat!" : "Analysis complete!")
            loadPastReports()
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error"
            setError(msg)
            setStep("")
            toast.error(isVi ? `Loi: ${msg}` : `Error: ${msg}`)
        } finally {
            setLoading(false)
        }
    }

    async function handleDeleteReport(id: string) {
        try {
            await fetch("/api/mobile-api-checker/reports", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            })
            setPastReports(prev => prev.filter(r => r.id !== id))
            if (viewingReport?.id === id) {
                setViewingReport(null)
                setReport("")
            }
            toast.success(isVi ? "Da xoa bao cao" : "Report deleted")
        } catch {
            toast.error(isVi ? "Khong the xoa" : "Failed to delete")
        }
    }

    function handleViewReport(r: PastReport) {
        setViewingReport(r)
        setReport(r.reportMarkdown || "")
        setError("")
    }

    function formatDate(iso: string) {
        return new Date(iso).toLocaleDateString(isVi ? "vi-VN" : "en-US", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        })
    }

    const fullReport = viewingReport ? (viewingReport.reportMarkdown || "") : report

    // Split report into 2 parts: results (API changes) and verification details
    const verificationSeparators = ["# Chi tiết kiểm tra", "# Verification Details", "# Chi tiet kiem tra"]
    let resultsSection = fullReport
    let verificationSection = ""
    for (const sep of verificationSeparators) {
        const idx = fullReport.indexOf(sep)
        if (idx !== -1) {
            resultsSection = fullReport.substring(0, idx).trim()
            verificationSection = fullReport.substring(idx).trim()
            break
        }
    }

    const displayedReport = resultsSection

    return (
        <div className="space-y-6 p-2 pt-2 md:p-10 md:pb-16">
            {/* Header */}
            <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                    <Smartphone className="h-6 w-6 text-blue-500" />
                    <h2 className="text-2xl font-bold tracking-tight">
                        Mobile API Impact Checker
                    </h2>
                </div>
                <p className="text-muted-foreground">
                    {isVi
                        ? "Phat hien thay doi API (Input/Output) trong moi ban release, de kip thoi bao cho Mobile team"
                        : "Detect API contract changes (Input/Output) per release to notify the Mobile team"}
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
                    Jira: {jiraConnected ? (isVi ? "Da ket noi" : "Connected") : (isVi ? "Chua ket noi" : "Not connected")}
                </Badge>
                <Badge
                    variant="outline"
                    className={gitlabConnected
                        ? "bg-green-500/10 text-green-600 border-green-500/30"
                        : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"}
                >
                    <GitBranch className="h-3 w-3 mr-1" />
                    GitLab: {gitlabConnected ? (isVi ? "Da ket noi" : "Connected") : (isVi ? "Tuy chon" : "Optional")}
                </Badge>
            </div>

            {/* Step indicator during analysis */}
            {step && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {step}
                </div>
            )}

            <div className="flex flex-col gap-6">
                {/* Input Form */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-yellow-500" />
                            {isVi ? "Thong tin Release" : "Release Information"}
                        </CardTitle>
                        <CardDescription>
                            {isVi
                                ? "Nhap URL Jira Release de bat dau phan tich API thay doi"
                                : "Enter Jira Release URL to start analyzing API changes"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                        {/* Row 1: Jira Release URL */}
                        <div className="space-y-2">
                            <Label htmlFor="jira-url">Jira Release URL</Label>
                            <Input
                                id="jira-url"
                                placeholder="https://tvtgroup.atlassian.net/projects/TVT/versions/12214/..."
                                value={jiraUrl}
                                onChange={(e) => setJiraUrl(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                                disabled={loading}
                            />
                        </div>

                        {/* Row 2: GitLab config (optional) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="gitlab-project-id">
                                    GitLab Project ID {isVi ? "(Tuy chon)" : "(Optional)"}
                                </Label>
                                <Input
                                    id="gitlab-project-id"
                                    placeholder="e.g. 42"
                                    value={gitlabProjectId}
                                    onChange={(e) => setGitlabProjectId(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gitlab-branch">Branch</Label>
                                <Input
                                    id="gitlab-branch"
                                    placeholder="tvt_qc"
                                    value={gitlabBranch}
                                    onChange={(e) => setGitlabBranch(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Row 3: Submit */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                            <Button
                                className="w-full sm:w-auto"
                                onClick={handleAnalyze}
                                disabled={loading || !jiraUrl.trim() || !jiraConnected}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {isVi ? "Dang xu ly..." : "Analyzing..."}
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        {isVi ? "Phan tich Release" : "Analyze Release"}
                                    </>
                                )}
                            </Button>

                            {!jiraConnected && (
                                <p className="text-xs text-red-500 font-medium">
                                    {isVi
                                        ? "Hay ket noi Jira trong Settings truoc."
                                        : "Please connect Jira in Settings first."}
                                </p>
                            )}

                            {!gitlabConnected && (
                                <p className="text-xs text-yellow-600">
                                    {isVi
                                        ? "GitLab chua ket noi — se phan tich chi dua tren Jira tickets."
                                        : "GitLab not connected — will analyze based on Jira tickets only."}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Card 1: API Impact Results */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Smartphone className="h-4 w-4 text-blue-500" />
                                {isVi ? "API bi anh huong" : "Affected APIs"}
                                {viewingReport && (
                                    <span className="text-xs font-normal text-muted-foreground">
                                        (v{viewingReport.versionId} — {formatDate(viewingReport.createdAt)})
                                    </span>
                                )}
                            </CardTitle>
                            {viewingReport && (
                                <Button variant="ghost" size="sm" onClick={() => { setViewingReport(null); setReport("") }}>
                                    {isVi ? "Dong" : "Close"}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4 inline mr-2" />
                                {error}
                            </div>
                        )}

                        {!fullReport && !loading && !error && (
                            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                                <Smartphone className="h-12 w-12 mb-4 opacity-20" />
                                <p className="text-center">
                                    {isVi
                                        ? "Nhap Jira Release URL va nhan \"Phan tich Release\" de bat dau"
                                        : "Enter a Jira Release URL and click \"Analyze Release\" to start"}
                                </p>
                            </div>
                        )}

                        {loading && !fullReport && (
                            <div className="flex flex-col items-center justify-center h-[300px]">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                                <p className="text-muted-foreground animate-pulse">
                                    {isVi ? "AI dang phan tich thay doi API..." : "AI is analyzing API changes..."}
                                </p>
                            </div>
                        )}

                        {displayedReport && (
                            <div
                                ref={reportRef}
                                className="prose prose-base dark:prose-invert max-w-none max-h-[60vh] overflow-y-auto prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0 prose-p:leading-relaxed"
                            >
                                <MarkdownRenderer content={displayedReport} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Card 2: Verification Details (separate) */}
                {verificationSection && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4 text-green-600" />
                                {isVi ? "Chi tiet kiem tra" : "Verification Details"}
                            </CardTitle>
                            <CardDescription>
                                {isVi
                                    ? "Tong hop quy trinh, du lieu da kiem tra va doi chieu voi danh sach API Mobile"
                                    : "Summary of verification process, data checked, and cross-reference with Mobile API list"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="prose prose-sm dark:prose-invert max-w-none max-h-[60vh] overflow-y-auto prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0 prose-p:leading-relaxed prose-table:text-sm">
                                <MarkdownRenderer content={verificationSection} />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Past Reports */}
                <Card>
                    <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {isVi ? "Lich su bao cao" : "Report History"}
                                {pastReports.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">{pastReports.length}</Badge>
                                )}
                            </CardTitle>
                            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                    </CardHeader>
                    {showHistory && (
                        <CardContent>
                            {pastReports.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    {isVi ? "Chua co bao cao nao" : "No reports yet"}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {pastReports.map((r) => (
                                        <div
                                            key={r.id}
                                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                        >
                                            <button
                                                className="flex-1 flex items-center gap-3 text-left"
                                                onClick={() => handleViewReport(r)}
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">
                                                        Release v{r.versionId}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatDate(r.createdAt)}
                                                    </div>
                                                </div>
                                                {r.summary && (
                                                    <div className="flex gap-1.5 ml-auto mr-4">
                                                        {r.summary.breaking > 0 && (
                                                            <Badge variant="destructive" className="text-xs">
                                                                {r.summary.breaking} breaking
                                                            </Badge>
                                                        )}
                                                        {r.summary.nonBreaking > 0 && (
                                                            <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-600">
                                                                {r.summary.nonBreaking} non-breaking
                                                            </Badge>
                                                        )}
                                                        {r.summary.breaking === 0 && r.summary.nonBreaking === 0 && (
                                                            <Badge variant="outline" className="text-xs border-green-500/50 text-green-600">
                                                                No impact
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                                <Badge variant="outline" className="text-xs">
                                                    {r.status}
                                                </Badge>
                                            </button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteReport(r.id)
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
    )
}
