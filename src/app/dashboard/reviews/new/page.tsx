"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { toast } from "sonner"
import {
    Link2, Code, Upload, FileText, X,
    Loader2, AlertTriangle, CheckCircle2, Info, ShieldAlert
} from "lucide-react"

interface PatternMatch {
    rule: string
    severity: "error" | "warning" | "info"
    line: number
    message: string
    snippet: string
}

interface UploadedDoc {
    name: string
    text: string
    size: number
}

export default function NewReviewPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<"url" | "paste">("url")
    const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([])
    const [patternResults, setPatternResults] = useState<PatternMatch[] | null>(null)
    const [reviewId, setReviewId] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

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
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    function removeDoc(index: number) {
        setUploadedDocs(prev => prev.filter((_, i) => i !== index))
    }

    // Helper to generate title from pasted code
    function generateCodeTitle(code: string): string {
        const lines = code.trim().split('\n')
        const firstLine = lines[0].trim()

        // Try to extract meaningful info from first line
        const functionMatch = firstLine.match(/(?:function|def|const|class|export)\s+(\w+)/)
        if (functionMatch) {
            return `Code Review: ${functionMatch[1]}`
        }

        // Use first line if short enough
        if (firstLine.length > 0 && firstLine.length <= 50) {
            return `Code Review: ${firstLine}`
        }

        // Default with timestamp
        return `Code Review - ${new Date().toLocaleString()}`
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        setPatternResults(null)

        const formData = new FormData(event.currentTarget)
        const url = formData.get("url") as string
        const code = formData.get("code") as string

        try {
            // Prepare files for scanning
            const files: { name: string; content: string }[] = []
            let reviewTitle = ""

            if (activeTab === "paste" && code.trim()) {
                files.push({ name: "pasted-code", content: code })
                reviewTitle = generateCodeTitle(code)
            }

            if (activeTab === "url" && url.trim()) {
                // Try to fetch MR diff
                const token = sessionStorage.getItem("gitlab-pat") || ""
                const baseUrl = sessionStorage.getItem("gitlab-url") || ""

                const mrRes = await fetch("/api/gitlab/fetch-mr", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url, token, customBaseUrl: baseUrl }),
                })

                if (mrRes.ok) {
                    const mrData = await mrRes.json()
                    // Use MR title for review title
                    if (mrData.mr?.title) {
                        reviewTitle = mrData.mr.title
                    }
                    // Extract diffs as files
                    if (mrData.mr?.changes) {
                        for (const change of mrData.mr.changes) {
                            if (change.diff) {
                                files.push({ name: change.new_path || change.old_path, content: change.diff })
                            }
                        }
                    }
                    toast.success(`Fetched MR: ${mrData.mr.title} (${files.length} files)`)
                } else {
                    // If MR fetch fails, treat URL as just a reference
                    toast.info("Could not fetch MR diff. Running pattern scan on context only.")
                    reviewTitle = url
                }
            }

            // Start review with pattern scan
            const contextDocs = uploadedDocs.map(d => ({ name: d.name, text: d.text }))

            const reviewRes = await fetch("/api/reviews/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: reviewTitle || "Code Review",
                    source: activeTab === "url" ? "custom-url" : "paste",
                    sourceUrl: url || undefined,
                    code: activeTab === "paste" ? code : undefined,
                    files,
                    contextDocs,
                }),
            })

            const reviewData = await reviewRes.json()

            if (!reviewRes.ok) {
                throw new Error(reviewData.error || "Review failed")
            }

            setReviewId(reviewData.reviewId)
            setPatternResults(reviewData.patternScan.matches)

            const summary = reviewData.patternScan.summary
            if (summary.total === 0) {
                toast.success("Pattern scan complete. No issues found! 🎉")
            } else {
                toast.warning(`Pattern scan found ${summary.total} issues (${summary.errors} errors, ${summary.warnings} warnings)`)
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    const severityIcon = (severity: string) => {
        switch (severity) {
            case "error": return <ShieldAlert className="h-4 w-4 text-red-500" />
            case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />
            default: return <Info className="h-4 w-4 text-blue-500" />
        }
    }

    return (
        <div className="flex-1 space-y-4 p-2 pt-2 md:p-6 md:pt-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-3xl font-bold tracking-tight">Create New Review</h2>
            </div>

            <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Review Source</CardTitle>
                            <CardDescription>
                                Provide code via URL or paste directly.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Tab Buttons */}
                            <div className="flex gap-2 mb-4">
                                <Button
                                    variant={activeTab === "url" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveTab("url")}
                                    type="button"
                                >
                                    <Link2 className="mr-2 h-4 w-4" /> Connect URL
                                </Button>
                                <Button
                                    variant={activeTab === "paste" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveTab("paste")}
                                    type="button"
                                >
                                    <Code className="mr-2 h-4 w-4" /> Paste Code
                                </Button>
                            </div>

                            <form onSubmit={onSubmit} className="space-y-4">
                                {activeTab === "url" && (
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="url">Repository / MR URL</Label>
                                            <Input
                                                id="url"
                                                placeholder="https://gitlab.example.com/group/project/-/merge_requests/123"
                                                name="url"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Supports GitLab MR URLs. The diff will be fetched automatically.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "paste" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="code">Code to Review</Label>
                                        <Textarea
                                            id="code"
                                            name="code"
                                            placeholder="// Paste your code here..."
                                            className="h-48 font-mono text-sm"
                                        />
                                    </div>
                                )}

                                <Button type="submit" disabled={isLoading} className="w-full">
                                    {isLoading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...</>
                                    ) : (
                                        <><CheckCircle2 className="mr-2 h-4 w-4" /> Start Review</>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Pattern Scan Results */}
                    {patternResults !== null && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">
                                        Pattern Scan Results
                                    </CardTitle>
                                    {reviewId && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/dashboard/reviews/${reviewId}`)}
                                        >
                                            View Full Report
                                        </Button>
                                    )}
                                </div>
                                <CardDescription>
                                    {patternResults.length === 0
                                        ? "No issues detected by pattern scanner."
                                        : `Found ${patternResults.length} potential issues.`
                                    }
                                </CardDescription>
                            </CardHeader>
                            {patternResults.length > 0 && (
                                <CardContent>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {patternResults.map((match, i) => (
                                            <div
                                                key={i}
                                                className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${match.severity === "error" ? "border-red-500/30 bg-red-500/5" :
                                                        match.severity === "warning" ? "border-yellow-500/30 bg-yellow-500/5" :
                                                            "border-blue-500/30 bg-blue-500/5"
                                                    }`}
                                            >
                                                {severityIcon(match.severity)}
                                                <div className="flex-1 space-y-1">
                                                    <p className="font-medium">{match.message}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Line {match.line} · Rule: {match.rule}
                                                    </p>
                                                    <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
                                                        {match.snippet}
                                                    </code>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    )}
                </div>

                {/* Sidebar: Context Documents */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                <Upload className="inline mr-2 h-4 w-4" />
                                Context Documents
                            </CardTitle>
                            <CardDescription>
                                Upload project docs to help AI understand business logic.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div
                                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Click to upload
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    PDF, Word, Excel, Text, Draw.io
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
                                <Label className="text-xs">Or add a Figma / URL reference</Label>
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
