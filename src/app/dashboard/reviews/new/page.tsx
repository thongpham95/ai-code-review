"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import {
    Link2, Code, Upload, FileText, X,
    Loader2, AlertTriangle, CheckCircle2,
    Languages, Target
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

interface UploadedDoc {
    name: string
    text: string
    size: number
}

export default function NewReviewPage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<"url" | "paste">("url")
    const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([])
    const [reviewLang, setReviewLang] = useState<"en" | "vi">("en")
    const [hasGitAccounts, setHasGitAccounts] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        try {
            const saved = localStorage.getItem("git-accounts")
            if (saved) {
                const accounts = JSON.parse(saved)
                const hasGithub = !!accounts.github?.token
                const hasGitlab = !!accounts.gitlab?.token || !!accounts.gitlabSelfHosted?.token || !!sessionStorage.getItem("gitlab-pat")

                if (hasGithub || hasGitlab) {
                    setHasGitAccounts(true)
                    return
                }
            }
            const sessionToken = sessionStorage.getItem("gitlab-pat")
            if (sessionToken) {
                setHasGitAccounts(true)
                return
            }
            setHasGitAccounts(false)
            setActiveTab("paste")
        } catch {
            setHasGitAccounts(false)
            setActiveTab("paste")
        }
    }, [])

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (!files) return

        for (const file of Array.from(files)) {
            const formData = new FormData()
            formData.append("file", file)

            try {
                const res = await fetch("/api/documents/upload", {
                    method: "POST",
                    body: formData,
                })
                const data = await res.json()
                if (res.ok) {
                    setUploadedDocs(prev => [...prev, {
                        name: data.filename,
                        text: data.extractedText,
                        size: data.size,
                    }])
                    toast.success(`Uploaded: ${data.filename} (${data.charCount} chars extracted)`)
                } else {
                    toast.error(`Failed to parse ${file.name}: ${data.error}`)
                }
            } catch {
                toast.error(`Upload failed for ${file.name}`)
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    function removeDoc(index: number) {
        setUploadedDocs(prev => prev.filter((_, i) => i !== index))
    }

    function generateCodeTitle(code: string): string {
        const lines = code.trim().split('\n')
        const firstLine = lines[0].trim()
        const functionMatch = firstLine.match(/(?:function|def|const|class|export)\s+(\w+)/)
        if (functionMatch) return `Code Review: ${functionMatch[1]}`
        if (firstLine.length > 0 && firstLine.length <= 50) return `Code Review: ${firstLine}`
        return `Code Review - ${new Date().toLocaleString()}`
    }

    function parseUrls(raw: string): string[] {
        return raw
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')))
    }

    async function fetchSingleUrl(url: string): Promise<{ title: string; files: { name: string; content: string }[] } | null> {
        const isGitHub = url.includes("github.com") && url.includes("/pull/")
        const isGitLab = url.includes("/-/merge_requests/") || url.includes("gitlab")

        if (isGitHub) {
            let githubToken = ""
            try {
                const saved = localStorage.getItem("git-accounts")
                if (saved) {
                    const accounts = JSON.parse(saved)
                    githubToken = accounts.github?.token || ""
                }
            } catch { /* ignore */ }

            const prRes = await fetch("/api/github/fetch-pr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, token: githubToken }),
            })

            if (prRes.ok) {
                const prData = await prRes.json()
                const files: { name: string; content: string }[] = []
                if (prData.pr?.changes) {
                    for (const change of prData.pr.changes) {
                        if (change.diff) {
                            files.push({ name: change.new_path || change.old_path, content: change.diff })
                        }
                    }
                }
                return { title: prData.pr?.title || url, files }
            } else {
                const errData = await prRes.json().catch(() => ({ error: "Unknown error" }))
                toast.error(`Failed to fetch PR: ${errData.error || `HTTP ${prRes.status}`}`)
                return null
            }
        } else if (isGitLab) {
            let gitlabToken = ""
            let baseUrl = ""
            try {
                const saved = localStorage.getItem("git-accounts")
                if (saved) {
                    const accounts = JSON.parse(saved)
                    if (accounts.gitlabSelfHosted?.url && url.includes(accounts.gitlabSelfHosted.url.replace(/^https?:\/\//, ""))) {
                        gitlabToken = accounts.gitlabSelfHosted?.token || ""
                        baseUrl = accounts.gitlabSelfHosted?.url || ""
                    } else {
                        gitlabToken = accounts.gitlab?.token || ""
                    }
                }
            } catch { /* ignore */ }

            if (!gitlabToken) {
                gitlabToken = sessionStorage.getItem("gitlab-pat") || ""
                baseUrl = sessionStorage.getItem("gitlab-url") || ""
                if (!gitlabToken || !baseUrl) {
                    try {
                        const saved = localStorage.getItem("gitlab-self-hosted-config")
                        if (saved) {
                            const config = JSON.parse(saved)
                            if (!gitlabToken && config.token) gitlabToken = config.token
                            if (!baseUrl && config.url) baseUrl = config.url
                        }
                    } catch { /* ignore */ }
                }
            }

            const mrRes = await fetch("/api/gitlab/fetch-mr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, token: gitlabToken, customBaseUrl: baseUrl }),
            })

            if (mrRes.ok) {
                const mrData = await mrRes.json()
                const files: { name: string; content: string }[] = []
                if (mrData.mr?.changes) {
                    for (const change of mrData.mr.changes) {
                        if (change.diff) {
                            files.push({ name: change.new_path || change.old_path, content: change.diff })
                        }
                    }
                }
                return { title: mrData.mr?.title || url, files }
            } else {
                const errData = await mrRes.json().catch(() => ({ error: "Unknown error" }))
                toast.error(`Failed to fetch MR: ${errData.error || `HTTP ${mrRes.status}`}`)
                return null
            }
        } else {
            toast.error(`Invalid URL: ${url}`)
            return null
        }
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const urlsRaw = formData.get("urls") as string
        const code = formData.get("code") as string
        const customRules = formData.get("customRules") as string

        try {
            const files: { name: string; content: string }[] = []
            let reviewTitle = ""

            if (activeTab === "paste" && code.trim()) {
                files.push({ name: "pasted-code", content: code })
                reviewTitle = generateCodeTitle(code)
            }

            if (activeTab === "url" && urlsRaw.trim()) {
                const urls = parseUrls(urlsRaw)
                if (urls.length === 0) {
                    toast.error("No valid URLs found. Please enter URLs starting with http:// or https://")
                    setIsLoading(false)
                    return
                }

                const results = await Promise.allSettled(urls.map(u => fetchSingleUrl(u)))
                const titles: string[] = []

                for (const result of results) {
                    if (result.status === "fulfilled" && result.value) {
                        titles.push(result.value.title)
                        files.push(...result.value.files)
                    }
                }

                if (files.length === 0) {
                    toast.error("All URL fetches returned no file diffs.")
                    setIsLoading(false)
                    return
                }

                reviewTitle = titles.length === 1 ? titles[0] : `Review: ${titles.length} MR/PRs`
                toast.success(`Fetched ${files.length} files from ${titles.length} URL(s)`)
            }

            const contextDocs = uploadedDocs.map(d => ({ name: d.name, text: d.text }))

            const reviewRes = await fetch("/api/reviews/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: reviewTitle || "Code Review",
                    source: activeTab === "url" ? "custom-url" : "paste",
                    sourceUrl: activeTab === "url" ? urlsRaw.trim().split('\n')[0] : undefined,
                    code: activeTab === "paste" ? code : undefined,
                    files,
                    contextDocs,
                    aiModel: "gemini-2.5-flash",
                    customRules: customRules?.trim() || undefined,
                }),
            })

            const reviewData = await reviewRes.json()
            if (!reviewRes.ok) throw new Error(reviewData.error || "Review failed")

            // 1-Click: Auto-redirect to detail page to trigger AI review
            router.push(`/dashboard/reviews/${reviewData.reviewId}?autoReview=true&lang=${reviewLang}`)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex-1 space-y-4 p-2 pt-2 md:p-6 md:pt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-3xl font-bold tracking-tight">{t.createReview.title}</h2>
            </div>

            <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-4">
                    {/* AI Language Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Languages className="h-5 w-5" />
                                {t.createReview.aiLang}
                            </CardTitle>
                            <CardDescription>{t.createReview.aiLangDesc}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setReviewLang("en")}
                                    className={`relative flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${reviewLang === "en"
                                        ? "border-primary bg-primary/5 shadow-sm"
                                        : "border-border hover:border-muted-foreground/30"
                                        }`}
                                >
                                    <span className="text-2xl">🇺🇸</span>
                                    <div>
                                        <span className="font-semibold text-sm">{t.createReview.langEn}</span>
                                        <p className="text-xs text-muted-foreground">AI will respond in English</p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReviewLang("vi")}
                                    className={`relative flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${reviewLang === "vi"
                                        ? "border-primary bg-primary/5 shadow-sm"
                                        : "border-border hover:border-muted-foreground/30"
                                        }`}
                                >
                                    <span className="text-2xl">🇻🇳</span>
                                    <div>
                                        <span className="font-semibold text-sm">{t.createReview.langVi}</span>
                                        <p className="text-xs text-muted-foreground">AI sẽ trả lời bằng Tiếng Việt</p>
                                    </div>
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Review Source */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t.createReview.reviewSource}</CardTitle>
                            <CardDescription>{t.createReview.reviewSourceDesc}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2 mb-4">
                                <Button
                                    variant={activeTab === "url" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveTab("url")}
                                    type="button"
                                >
                                    <Link2 className="mr-2 h-4 w-4" /> {t.createReview.connectUrl}
                                </Button>
                                <Button
                                    variant={activeTab === "paste" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveTab("paste")}
                                    type="button"
                                >
                                    <Code className="mr-2 h-4 w-4" /> {t.createReview.pasteCode}
                                </Button>
                            </div>

                            <form onSubmit={onSubmit} className="space-y-4">
                                {activeTab === "url" && (
                                    <div className="space-y-3">
                                        {!hasGitAccounts && (
                                            <div className="rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-600 border border-yellow-500/20 flex gap-2">
                                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-semibold">No Git Accounts Configured</p>
                                                    <p className="text-xs opacity-90 mt-1">
                                                        Connect GitHub or GitLab in <a href="/dashboard/settings" className="underline underline-offset-2 hover:text-yellow-700">Settings</a>.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <Label htmlFor="urls">{t.createReview.repoUrl}</Label>
                                            <Textarea
                                                id="urls"
                                                placeholder={t.createReview.urlPlaceholder}
                                                name="urls"
                                                disabled={!hasGitAccounts}
                                                className="h-28 font-mono text-sm"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {t.createReview.urlHint}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "paste" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="code">{t.createReview.codeLabel}</Label>
                                        <Textarea
                                            id="code"
                                            name="code"
                                            placeholder={t.createReview.codePlaceholder}
                                            className="h-48 font-mono text-sm"
                                        />
                                    </div>
                                )}

                                {/* Custom Review Rules */}
                                <div className="space-y-2 pt-2 border-t">
                                    <Label htmlFor="customRules" className="flex items-center gap-2">
                                        <Target className="h-4 w-4 text-orange-500" />
                                        {t.createReview.customRules}
                                    </Label>
                                    <Textarea
                                        id="customRules"
                                        name="customRules"
                                        placeholder={t.createReview.customRulesPlaceholder}
                                        className="h-20 text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t.createReview.customRulesDesc}
                                    </p>
                                </div>

                                <Button type="submit" disabled={isLoading} className="w-full">
                                    {isLoading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.createReview.scanning}</>
                                    ) : (
                                        <><CheckCircle2 className="mr-2 h-4 w-4" /> {t.createReview.startReview}</>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar: Context Documents */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                <Upload className="inline mr-2 h-4 w-4" />
                                {t.createReview.contextDocs}
                            </CardTitle>
                            <CardDescription>
                                {t.createReview.contextDocsDesc}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div
                                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    {t.createReview.clickUpload}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t.createReview.supportedFormats}
                                </p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.drawio,.xml"
                                onChange={handleFileUpload}
                            />

                            {uploadedDocs.length > 0 && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        {uploadedDocs.map((doc, i) => (
                                            <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                                <div className="flex items-center gap-2 truncate">
                                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <span className="truncate">{doc.name}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeDoc(i)}
                                                    className="h-6 w-6 p-0 shrink-0"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <Separator />
                            <div className="space-y-2">
                                <Label className="text-xs">{t.createReview.addUrl}</Label>
                                <Input
                                    placeholder="https://www.figma.com/file/..."
                                    className="text-xs"
                                    onBlur={(e) => {
                                        const val = e.target.value.trim()
                                        if (val) {
                                            setUploadedDocs(prev => [...prev, {
                                                name: val.length > 40 ? val.substring(0, 40) + "..." : val,
                                                text: `Reference URL: ${val}`,
                                                size: 0,
                                            }])
                                            e.target.value = ""
                                            toast.success("Reference URL added")
                                        }
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
