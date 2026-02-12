"use client"

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, AlertTriangle, AlertCircle, Info, Loader2, Bot, Play, FileCode, FileText, CheckCircle2, Languages, Sparkles, Download } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useReactToPrint } from 'react-to-print';
import { useLanguage } from '@/contexts/language-context';

interface PatternResult {
    line: number
    message: string
    severity: "error" | "warning" | "info"
    rule: string
    snippet: string
    file?: string
}

interface ReviewFile {
    name: string
    content: string
    diff?: string
}

interface ReviewData {
    id: string
    title: string
    status: string
    source: string
    sourceUrl?: string
    code?: string
    files?: ReviewFile[]
    createdAt: string
    patternResults?: PatternResult[]
    aiAnalysis?: string
    contextDocuments?: { name: string; content: string }[]
}

export default function ReviewDetailsPage() {
    const params = useParams();
    const id = params?.id as string;
    const [review, setReview] = useState<ReviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState("");
    const [activeTab, setActiveTab] = useState("code");
    const [reviewLang, setReviewLang] = useState<"en" | "vi">("en");
    const [quickSummary, setQuickSummary] = useState<string | null>(null);
    const aiResultRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: review?.title ? `AI-Review-${review.title}` : 'AI-Code-Review-Report',
    });

    useEffect(() => {
        async function fetchReview() {
            try {
                const res = await fetch(`/api/reviews/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setReview(data.review);
                    if (data.review.aiAnalysis) {
                        setAiResult(data.review.aiAnalysis);
                    }
                } else {
                    toast.error("Review not found");
                }
            } catch {
                toast.error("Failed to load review");
            } finally {
                setLoading(false);
            }
        }
        if (id) fetchReview();
    }, [id]);

    // Helper to get code for analysis - uses 'code' field or combines 'files'
    function getCodeForAnalysis(): string | null {
        if (review?.code) return review.code;
        if (review?.files?.length) {
            return review.files
                .map(f => `// ===== File: ${f.name} =====\n${f.content}`)
                .join('\n\n');
        }
        return null;
    }

    // Extract quick summary from AI response (supports both English and Vietnamese headers)
    function extractQuickSummary(text: string): string | null {
        // Look for explicit quick summary section (EN or VI)
        const summaryMatch = text.match(/##\s*(?:Quick Summary|Tóm tắt nhanh)[:\s]*\n([^\n]+)/i);
        if (summaryMatch) {
            return summaryMatch[1].trim().slice(0, 150);
        }
        // Fallback: get first meaningful line after any heading
        const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        if (lines.length > 0) {
            return lines[0].trim().slice(0, 150);
        }
        return null;
    }

    async function runAiAnalysis() {
        const codeToAnalyze = getCodeForAnalysis();
        if (!codeToAnalyze) {
            toast.error("No code available for AI analysis");
            return;
        }

        // Get AI config from localStorage
        let config: Record<string, unknown> = { useLocal: false, provider: "google", model: "gemini-2.5-flash" };
        try {
            const saved = localStorage.getItem("ai-config");
            if (saved) config = JSON.parse(saved);
        } catch { /* use defaults */ }

        setAiLoading(true);
        setAiResult("");
        setQuickSummary(null);
        setActiveTab("ai"); // Switch to AI tab when starting

        try {
            const res = await fetch("/api/review/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: codeToAnalyze,
                    config,
                    reviewId: review?.id,
                    contextDocuments: review?.contextDocuments || [],
                    language: reviewLang, // Pass language preference
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                toast.error(error.error || "AI analysis failed");
                setAiLoading(false);
                return;
            }

            // Stream the response
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                accumulated += chunk;
                setAiResult(accumulated);

                // Extract quick summary once we have enough content
                if (!quickSummary && accumulated.length > 100) {
                    const summary = extractQuickSummary(accumulated);
                    if (summary) setQuickSummary(summary);
                }

                // Auto-scroll
                if (aiResultRef.current) {
                    aiResultRef.current.scrollTop = aiResultRef.current.scrollHeight;
                }
            }

            // Final summary extraction
            const finalSummary = extractQuickSummary(accumulated);
            if (finalSummary) setQuickSummary(finalSummary);

            toast.success("AI analysis completed!");
        } catch (error) {
            toast.error(`AI analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setAiLoading(false);
        }
    }

    function getSeverityIcon(severity: string) {
        switch (severity) {
            case "error": return <AlertCircle className="h-4 w-4 text-red-500" />;
            case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    }

    function getSeverityBadge(severity: string) {
        switch (severity) {
            case "error": return <Badge variant="destructive" className="text-xs">Error</Badge>;
            case "warning": return <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">Warning</Badge>;
            default: return <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">Info</Badge>;
        }
    }

    // Count issues by severity
    const issueCount = review?.patternResults?.length || 0;
    const errorCount = review?.patternResults?.filter(i => i.severity === "error").length || 0;
    const warningCount = review?.patternResults?.filter(i => i.severity === "warning").length || 0;
    const infoCount = review?.patternResults?.filter(i => i.severity === "info").length || 0;

    // Get status badge
    function getStatusBadge(status: string) {
        switch (status) {
            case "completed":
                return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
            case "failed":
                return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
            default:
                return <Badge variant="outline"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
        }
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!review) {
        return (
            <div className="flex-1 p-8 pt-6">
                <div className="text-center py-16">
                    <h2 className="text-2xl font-bold mb-2">Review not found</h2>
                    <Link href="/dashboard/reviews">
                        <Button variant="outline">Back to Reviews</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col p-2 md:p-4 lg:p-6 space-y-3 md:space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <Link href="/dashboard/reviews">
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 md:h-9 md:w-9">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base md:text-lg lg:text-xl font-bold tracking-tight truncate">{review.title}</h2>
                            <span className="hidden sm:inline">{getStatusBadge(review.status)}</span>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                            {review.source} · {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    <Select value={reviewLang} onValueChange={(v) => setReviewLang(v as "en" | "vi")}>
                        <SelectTrigger className="w-[70px] md:w-[100px] h-8 md:h-9 text-xs md:text-sm">
                            <Languages className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">EN</SelectItem>
                            <SelectItem value="vi">VI</SelectItem>
                        </SelectContent>
                    </Select>
                    {aiResult && !aiLoading && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 md:gap-2 h-8 md:h-9 px-2 md:px-4"
                            onClick={() => handlePrint()}
                        >
                            <Download className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="hidden sm:inline">{t.reviewDetail.exportPdf}</span>
                        </Button>
                    )}
                    <Button
                        onClick={runAiAnalysis}
                        disabled={aiLoading}
                        size="sm"
                        className="gap-1 md:gap-2 h-8 md:h-9 px-2 md:px-4"
                    >
                        {aiLoading ? (
                            <><Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" /> <span className="hidden sm:inline">{t.reviewDetail.aiAnalyzing}</span><span className="sm:hidden">...</span></>
                        ) : (
                            <><Play className="h-3 w-3 md:h-4 md:w-4" /> <span className="hidden sm:inline">{t.reviewDetail.runAiReview}</span><span className="sm:hidden">Review</span></>
                        )}
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
                    <TabsTrigger value="code" className="gap-2">
                        <FileCode className="h-4 w-4" />
                        <span className="hidden sm:inline">Code & Files</span>
                        <span className="sm:hidden">Code</span>
                    </TabsTrigger>
                    <TabsTrigger value="issues" className="gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="hidden sm:inline">Issues</span>
                        {issueCount > 0 && (
                            <Badge variant={errorCount > 0 ? "destructive" : "secondary"} className="ml-1 h-5 px-1.5 text-xs">
                                {issueCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="gap-2">
                        <Bot className="h-4 w-4" />
                        <span className="hidden sm:inline">AI Review</span>
                        <span className="sm:hidden">AI</span>
                        {aiResult && !aiLoading && (
                            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-xs bg-purple-500/10 border-purple-500/30 text-purple-600">
                                ✓
                            </Badge>
                        )}
                        {aiLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                    </TabsTrigger>
                </TabsList>

                {/* Code & Files Tab */}
                <TabsContent value="code" className="flex-1 mt-4">
                    <Card className="h-full">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold flex items-center gap-2">
                                <FileCode className="h-4 w-4 text-blue-500" />
                                {review.code ? "Source Code" : `Changed Files (${review.files?.length || 0})`}
                            </h3>
                            {review.contextDocuments && review.contextDocuments.length > 0 && (
                                <Badge variant="outline" className="gap-1">
                                    <FileText className="h-3 w-3" />
                                    {review.contextDocuments.length} context docs
                                </Badge>
                            )}
                        </div>
                        <div className="p-4 max-h-[calc(100vh-320px)] overflow-y-auto">
                            {review.code ? (
                                <pre className="text-sm bg-muted/50 rounded-lg p-4 overflow-x-auto">
                                    <code>{review.code}</code>
                                </pre>
                            ) : review.files && review.files.length > 0 ? (
                                <div className="space-y-4">
                                    {review.files.map((file, i) => (
                                        <div key={i} className="border rounded-lg overflow-hidden">
                                            <div className="bg-muted/50 px-4 py-2 text-sm font-mono font-medium border-b flex items-center gap-2">
                                                <FileCode className="h-4 w-4 text-muted-foreground" />
                                                {file.name}
                                            </div>
                                            <pre className="text-xs p-4 overflow-x-auto bg-background">
                                                <code>{file.content}</code>
                                            </pre>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <FileCode className="h-12 w-12 mb-3 opacity-50" />
                                    <p className="text-sm">No code or files available</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </TabsContent>

                {/* Issues Tab */}
                <TabsContent value="issues" className="flex-1 mt-4">
                    <Card className="h-full">
                        <div className="p-4 border-b">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                    Pattern Scan Results
                                </h3>
                                <div className="flex gap-2">
                                    {errorCount > 0 && (
                                        <Badge variant="destructive" className="gap-1">
                                            <AlertCircle className="h-3 w-3" /> {errorCount} errors
                                        </Badge>
                                    )}
                                    {warningCount > 0 && (
                                        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
                                            <AlertTriangle className="h-3 w-3" /> {warningCount} warnings
                                        </Badge>
                                    )}
                                    {infoCount > 0 && (
                                        <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
                                            <Info className="h-3 w-3" /> {infoCount} info
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 max-h-[calc(100vh-320px)] overflow-y-auto">
                            {review.patternResults && review.patternResults.length > 0 ? (
                                <div className="space-y-3">
                                    {review.patternResults.map((issue, i) => (
                                        <div
                                            key={i}
                                            className={`rounded-lg border p-4 ${issue.severity === "error" ? "border-red-500/30 bg-red-500/5" :
                                                issue.severity === "warning" ? "border-yellow-500/30 bg-yellow-500/5" :
                                                    "border-blue-500/30 bg-blue-500/5"
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {getSeverityIcon(issue.severity)}
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="font-medium text-sm">{issue.message}</p>
                                                        {getSeverityBadge(issue.severity)}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                        <span className="bg-muted px-2 py-0.5 rounded">Line {issue.line}</span>
                                                        <span className="bg-muted px-2 py-0.5 rounded font-mono">{issue.rule}</span>
                                                        {issue.file && <span className="bg-muted px-2 py-0.5 rounded">{issue.file}</span>}
                                                    </div>
                                                    {issue.snippet && (
                                                        <pre className="text-xs bg-muted/80 rounded-md px-3 py-2 overflow-x-auto font-mono">
                                                            {issue.snippet}
                                                        </pre>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <CheckCircle2 className="h-12 w-12 mb-3 text-green-500 opacity-70" />
                                    <p className="text-sm font-medium text-green-600">No issues found!</p>
                                    <p className="text-xs mt-1">Pattern scan completed successfully</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </TabsContent>

                {/* AI Review Tab */}
                <TabsContent value="ai" className="flex-1 mt-4">
                    <Card className="h-full">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Bot className="h-4 w-4 text-purple-500" />
                                AI Code Review
                                {aiLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                            </h3>
                            {aiResult && !aiLoading && (
                                <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                                </Badge>
                            )}
                        </div>
                        {/* Quick Summary Banner */}
                        {quickSummary && (
                            <div className="px-4 py-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b flex items-start gap-3">
                                <Sparkles className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                        {reviewLang === "vi" ? "Tóm tắt nhanh" : "Quick Summary"}
                                    </p>
                                    <p className="text-sm font-medium text-foreground">{quickSummary}</p>
                                </div>
                            </div>
                        )}
                        <div
                            ref={aiResultRef}
                            className="p-4 max-h-[calc(100vh-320px)] overflow-y-auto"
                        >
                            {aiResult ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border">
                                    <ReactMarkdown>{aiResult}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <Bot className="h-16 w-16 mb-4 opacity-30" />
                                    <p className="text-base font-medium mb-1">AI Review Not Started</p>
                                    <p className="text-sm text-center max-w-md">
                                        Click the &quot;Run AI Review&quot; button to analyze this code with AI.
                                        <br />
                                        <span className="text-xs">Uses Ollama (local) or Cloud AI based on your settings.</span>
                                    </p>
                                    <Button
                                        onClick={runAiAnalysis}
                                        disabled={aiLoading}
                                        className="mt-6 gap-2"
                                        size="lg"
                                    >
                                        <Play className="h-4 w-4" /> Start AI Review
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Hidden Printable Report */}
            <div className="hidden">
                <div ref={printRef} className="p-8 bg-white text-black print:block">
                    <div className="mb-6 pb-4 border-b-2 border-gray-300">
                        <h1 className="text-2xl font-bold text-gray-900">{review.title}</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {review.source} · {new Date(review.createdAt).toLocaleDateString()} · {t.reviewDetail[review.status as 'completed' | 'failed' | 'pending'] || review.status}
                        </p>
                    </div>

                    {/* Pattern Scan Summary */}
                    {review.patternResults && review.patternResults.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-3 pb-1 border-b">
                                {t.reviewDetail.patternScan}
                            </h2>
                            <div className="space-y-2">
                                {review.patternResults.map((issue, i) => (
                                    <div key={i} className="text-sm border-l-4 pl-3 py-1" style={{
                                        borderColor: issue.severity === 'error' ? '#ef4444' :
                                            issue.severity === 'warning' ? '#eab308' : '#3b82f6'
                                    }}>
                                        <p className="font-medium">{issue.message}</p>
                                        <p className="text-xs text-gray-500">
                                            Line {issue.line} · {issue.rule}
                                            {issue.file && ` · ${issue.file}`}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Review */}
                    {aiResult && (
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-3 pb-1 border-b">
                                {t.reviewDetail.aiReview}
                            </h2>
                            <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-50 prose-pre:border">
                                <ReactMarkdown>{aiResult}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-4 border-t text-xs text-gray-400 text-center">
                        Generated by AI Code Review · {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>
    );
}
