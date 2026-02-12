"use client"

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, AlertTriangle, AlertCircle, Info, Loader2, Bot, Play, FileCode, FileText, CheckCircle2, Languages, Sparkles, Download, PanelLeftClose, PanelLeft, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useReactToPrint } from 'react-to-print';
import { useLanguage } from '@/contexts/language-context';
import { InlineComment } from '@/components/review/inline-comment';
import { parseAIReview, getFileComment, type ParsedAIReview, type AIFileComment } from '@/lib/parse-ai-review';

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
    const [reviewLang, setReviewLang] = useState<"en" | "vi">("en");
    const [quickSummary, setQuickSummary] = useState<string | null>(null);
    const [qualityScore, setQualityScore] = useState<number | null>(null);
    const aiResultRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();

    const [showSidebar, setShowSidebar] = useState(true);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    const [copiedFile, setCopiedFile] = useState<string | null>(null);
    const [parsedAIReview, setParsedAIReview] = useState<ParsedAIReview | null>(null);
    const [showFullAnalysis, setShowFullAnalysis] = useState(false);

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
                        const parsed = parseAIReview(data.review.aiAnalysis);
                        setParsedAIReview(parsed);
                        if (parsed.qualityScore) setQualityScore(parsed.qualityScore);
                        if (parsed.quickSummary) setQuickSummary(parsed.quickSummary);
                    }
                    // Expand all files by default
                    if (data.review.files) {
                        setExpandedFiles(new Set(data.review.files.map((f: ReviewFile) => f.name)));
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

    function getCodeForAnalysis(): string | null {
        if (review?.code?.trim()) return review.code;
        if (review?.files && review.files.length > 0) {
            return review.files
                .filter(f => f.content?.trim())
                .map(f => `// ===== File: ${f.name} =====\n${f.content}`)
                .join('\n\n') || null;
        }
        return null;
    }

    function extractQuickSummary(text: string): string | null {
        const match = text.match(/##\s*(?:Quick Summary|Tóm tắt nhanh)[:\s]*\n([^\n]+)/i);
        return match ? match[1].trim().slice(0, 150) : null;
    }

    function extractQualityScore(text: string): number | null {
        const match = text.match(/(\d+)\s*\/\s*10/);
        return match ? parseInt(match[1], 10) : null;
    }

    async function runAiAnalysis() {
        const codeToAnalyze = getCodeForAnalysis();
        if (!codeToAnalyze) {
            toast.error("No code available for AI analysis");
            return;
        }

        const config: Record<string, string> = { model: "gemini-2.5-flash" };
        try {
            const saved = localStorage.getItem("ai-config");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.model) config.model = parsed.model;
            }
        } catch { /* use defaults */ }

        setAiLoading(true);
        setAiResult("");
        setQuickSummary(null);
        setQualityScore(null);
        setParsedAIReview(null);

        try {
            const res = await fetch("/api/review/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: codeToAnalyze,
                    config,
                    reviewId: review?.id,
                    contextDocuments: review?.contextDocuments || [],
                    language: reviewLang,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                toast.error(error.error || "AI analysis failed");
                setAiLoading(false);
                return;
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;
                accumulated += decoder.decode(value, { stream: true });
                setAiResult(accumulated);

                if (!quickSummary && accumulated.length > 100) {
                    const summary = extractQuickSummary(accumulated);
                    if (summary) setQuickSummary(summary);
                }
                if (!qualityScore) {
                    const score = extractQualityScore(accumulated);
                    if (score) setQualityScore(score);
                }
            }

            const finalSummary = extractQuickSummary(accumulated);
            if (finalSummary) setQuickSummary(finalSummary);
            const finalScore = extractQualityScore(accumulated);
            if (finalScore) setQualityScore(finalScore);

            const parsed = parseAIReview(accumulated);
            setParsedAIReview(parsed);

            toast.success("AI analysis completed!");
        } catch (error) {
            toast.error(`AI analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setAiLoading(false);
        }
    }

    const issueCount = review?.patternResults?.length || 0;
    const errorCount = review?.patternResults?.filter(i => i.severity === "error").length || 0;
    const warningCount = review?.patternResults?.filter(i => i.severity === "warning").length || 0;

    function toggleFile(fileName: string) {
        setExpandedFiles(prev => {
            const next = new Set(prev);
            if (next.has(fileName)) next.delete(fileName);
            else next.add(fileName);
            return next;
        });
    }

    function expandAll() {
        if (review?.files) {
            setExpandedFiles(new Set(review.files.map(f => f.name)));
        }
    }

    function collapseAll() {
        setExpandedFiles(new Set());
    }

    async function copyToClipboard(content: string, fileName: string) {
        await navigator.clipboard.writeText(content);
        setCopiedFile(fileName);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopiedFile(null), 2000);
    }

    function getFileIssues(fileName: string): PatternResult[] {
        if (!review?.patternResults) return [];
        return review.patternResults.filter(issue =>
            issue.file === fileName ||
            fileName.endsWith(issue.file || '') ||
            (issue.file && fileName.includes(issue.file))
        );
    }

    function getFileAIComment(fileName: string): AIFileComment | null {
        if (!parsedAIReview) return null;
        return getFileComment(parsedAIReview, fileName);
    }

    function getScoreColor(score: number): string {
        if (score >= 8) return "text-green-500";
        if (score >= 6) return "text-yellow-500";
        return "text-red-500";
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!review) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <h2 className="text-xl font-bold">Review not found</h2>
                <Link href="/dashboard/reviews">
                    <Button variant="outline" size="sm">Back to Reviews</Button>
                </Link>
            </div>
        );
    }

    const fileCount = review.files?.length || (review.code ? 1 : 0);
    const totalAdditions = review.files?.reduce((sum, f) => sum + (f.content?.split('\n').length || 0), 0) || 0;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Compact Header */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background shrink-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Link href="/dashboard/reviews">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-semibold truncate">{review.title}</h1>
                            {review.status === "completed" && (
                                <Badge variant="outline" className="h-5 text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
                                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Done
                                </Badge>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            {review.source} · {new Date(review.createdAt).toLocaleDateString()}
                            {fileCount > 0 && ` · ${fileCount} file${fileCount > 1 ? 's' : ''}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <Select value={reviewLang} onValueChange={(v) => setReviewLang(v as "en" | "vi")}>
                        <SelectTrigger className="w-16 h-7 text-[11px]">
                            <Languages className="h-3 w-3 mr-1" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">EN</SelectItem>
                            <SelectItem value="vi">VI</SelectItem>
                        </SelectContent>
                    </Select>
                    {aiResult && !aiLoading && (
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => handlePrint()}>
                            <Download className="h-3 w-3" />
                        </Button>
                    )}
                    <Button onClick={runAiAnalysis} disabled={aiLoading} size="sm" className="h-7 px-2.5 text-[11px] gap-1">
                        {aiLoading ? (
                            <><Loader2 className="h-3 w-3 animate-spin" />Analyzing...</>
                        ) : (
                            <><Play className="h-3 w-3" />AI Review</>
                        )}
                    </Button>
                </div>
            </div>

            {/* Summary Bar */}
            {(quickSummary || qualityScore || issueCount > 0 || aiLoading) && (
                <div className="px-3 py-1.5 border-b bg-muted/30 flex items-center gap-4 text-[11px] shrink-0 overflow-x-auto">
                    {aiLoading && (
                        <div className="flex items-center gap-1.5 text-purple-600">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>AI analyzing...</span>
                        </div>
                    )}
                    {qualityScore && (
                        <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Score:</span>
                            <span className={`font-bold ${getScoreColor(qualityScore)}`}>{qualityScore}/10</span>
                        </div>
                    )}
                    {issueCount > 0 && (
                        <div className="flex items-center gap-2">
                            {errorCount > 0 && (
                                <span className="flex items-center gap-1 text-red-500">
                                    <AlertCircle className="h-3 w-3" />{errorCount}
                                </span>
                            )}
                            {warningCount > 0 && (
                                <span className="flex items-center gap-1 text-yellow-500">
                                    <AlertTriangle className="h-3 w-3" />{warningCount}
                                </span>
                            )}
                        </div>
                    )}
                    {quickSummary && (
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Sparkles className="h-3 w-3 text-purple-500 shrink-0" />
                            <span className="truncate text-muted-foreground">{quickSummary}</span>
                        </div>
                    )}
                    {parsedAIReview && parsedAIReview.fileComments.length > 0 && (
                        <Badge variant="outline" className="h-5 text-[10px] shrink-0">
                            <Bot className="h-2.5 w-2.5 mr-1" />
                            {parsedAIReview.fileComments.length} files reviewed
                        </Badge>
                    )}
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* File List Sidebar */}
                {showSidebar && review.files && review.files.length > 1 && (
                    <div className="w-56 border-r bg-muted/20 flex flex-col shrink-0 hidden md:flex">
                        <div className="px-2 py-1.5 border-b flex items-center justify-between">
                            <span className="text-[11px] font-medium text-muted-foreground">Files ({review.files.length})</span>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]" onClick={expandAll}>All</Button>
                                <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]" onClick={collapseAll}>None</Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {review.files.map((file) => {
                                const fileComment = getFileAIComment(file.name);
                                const issues = getFileIssues(file.name);
                                const isExpanded = expandedFiles.has(file.name);
                                return (
                                    <button
                                        key={file.name}
                                        onClick={() => {
                                            if (!isExpanded) toggleFile(file.name);
                                            document.getElementById(`file-${file.name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                        className={`w-full px-2 py-1 text-left hover:bg-muted/50 flex items-center gap-1.5 text-[11px] ${isExpanded ? 'bg-muted/30' : ''}`}
                                    >
                                        <FileCode className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <span className="truncate flex-1 font-mono">{file.name.split('/').pop()}</span>
                                        {fileComment?.status === "ok" && (
                                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                        )}
                                        {fileComment?.issues && fileComment.issues.length > 0 && (
                                            <Badge variant="outline" className="h-4 px-1 text-[9px]">{fileComment.issues.length}</Badge>
                                        )}
                                        {issues.length > 0 && (
                                            <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Files & Code View */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Toolbar */}
                    <div className="px-2 py-1 border-b bg-muted/20 flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                            {review.files && review.files.length > 1 && (
                                <Button variant="ghost" size="sm" className="h-6 px-1.5 hidden md:flex" onClick={() => setShowSidebar(!showSidebar)}>
                                    {showSidebar ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
                                </Button>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                                {fileCount} file{fileCount !== 1 ? 's' : ''} · {totalAdditions} lines
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {review.contextDocuments && review.contextDocuments.length > 0 && (
                                <Badge variant="outline" className="h-5 text-[10px]">
                                    <FileText className="h-2.5 w-2.5 mr-1" />{review.contextDocuments.length} docs
                                </Badge>
                            )}
                            {aiResult && (
                                <Button
                                    variant={showFullAnalysis ? "secondary" : "outline"}
                                    size="sm"
                                    className="h-6 px-2 text-[10px] gap-1"
                                    onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                                >
                                    <Bot className="h-3 w-3" />
                                    {showFullAnalysis ? "Hide" : "Full"} Analysis
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div ref={aiResultRef} className="flex-1 overflow-y-auto overflow-x-hidden">
                        {/* Full AI Analysis Panel (collapsible) */}
                        {showFullAnalysis && aiResult && (
                            <div className="border-b bg-gradient-to-b from-purple-500/5 to-transparent">
                                <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Bot className="h-4 w-4 text-purple-500" />
                                        <span className="text-xs font-medium">Full AI Analysis</span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setShowFullAnalysis(false)}>
                                        Hide
                                    </Button>
                                </div>
                                <div className="p-3 prose prose-sm dark:prose-invert max-w-none text-sm prose-headings:text-sm prose-headings:font-semibold prose-p:text-sm prose-p:leading-relaxed prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:text-xs prose-pre:bg-muted prose-pre:border prose-pre:overflow-x-auto">
                                    <ReactMarkdown>{aiResult}</ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {/* Files List - GitHub/GitLab Style */}
                        <div className="divide-y">
                            {review.code ? (
                                // Single pasted code
                                <FileBlock
                                    fileName="pasted-code"
                                    content={review.code}
                                    isExpanded={true}
                                    onToggle={() => {}}
                                    aiComment={parsedAIReview?.fileComments?.[0] || null}
                                    issues={review.patternResults || []}
                                    onCopy={copyToClipboard}
                                    isCopied={copiedFile === "pasted-code"}
                                />
                            ) : review.files && review.files.length > 0 ? (
                                review.files.map((file) => (
                                    <FileBlock
                                        key={file.name}
                                        fileName={file.name}
                                        content={file.content}
                                        isExpanded={expandedFiles.has(file.name)}
                                        onToggle={() => toggleFile(file.name)}
                                        aiComment={getFileAIComment(file.name)}
                                        issues={getFileIssues(file.name)}
                                        onCopy={copyToClipboard}
                                        isCopied={copiedFile === file.name}
                                    />
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <FileCode className="h-10 w-10 mb-2 opacity-30" />
                                    <p className="text-sm">No code or files available</p>
                                </div>
                            )}
                        </div>

                        {/* Empty state for AI */}
                        {!aiResult && !aiLoading && (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-t">
                                <Bot className="h-10 w-10 mb-2 opacity-30" />
                                <p className="text-sm font-medium">No AI Review Yet</p>
                                <p className="text-xs text-center max-w-sm mt-1">
                                    Click &quot;AI Review&quot; to analyze this code with Google Gemini
                                </p>
                                <Button onClick={runAiAnalysis} size="sm" className="mt-4 gap-1.5">
                                    <Play className="h-3.5 w-3.5" /> Start AI Review
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hidden Printable Report */}
            <div className="hidden">
                <div ref={printRef} className="p-6 bg-white text-black print:block">
                    <div className="mb-4 pb-3 border-b-2 border-gray-300">
                        <h1 className="text-xl font-bold text-gray-900">{review.title}</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {review.source} · {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    {review.patternResults && review.patternResults.length > 0 && (
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-gray-800 mb-2 pb-1 border-b">{t.reviewDetail.patternScan}</h2>
                            <div className="space-y-1">
                                {review.patternResults.map((issue, i) => (
                                    <div key={i} className="text-sm border-l-4 pl-2 py-0.5" style={{
                                        borderColor: issue.severity === 'error' ? '#ef4444' : issue.severity === 'warning' ? '#eab308' : '#3b82f6'
                                    }}>
                                        <p className="font-medium">{issue.message}</p>
                                        <p className="text-xs text-gray-500">Line {issue.line} · {issue.rule}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {aiResult && (
                        <div className="mb-4">
                            <h2 className="text-base font-semibold text-gray-800 mb-2 pb-1 border-b">{t.reviewDetail.aiReview}</h2>
                            <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{aiResult}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                    <div className="mt-6 pt-3 border-t text-xs text-gray-400 text-center">
                        Generated by AI Code Review · {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>
    );
}

// FileBlock Component - GitHub/GitLab style file display
interface FileBlockProps {
    fileName: string
    content: string
    isExpanded: boolean
    onToggle: () => void
    aiComment: AIFileComment | null
    issues: PatternResult[]
    onCopy: (content: string, fileName: string) => void
    isCopied: boolean
}

function FileBlock({ fileName, content, isExpanded, onToggle, aiComment, issues, onCopy, isCopied }: FileBlockProps) {
    const lines = content.split('\n');
    const lineCount = lines.length;
    const hasAIFeedback = aiComment && (aiComment.status !== "unknown" || aiComment.issues.length > 0);
    const hasIssues = issues.length > 0;

    return (
        <div id={`file-${fileName}`} className="bg-background">
            {/* File Header */}
            <div
                className="px-2 py-1.5 bg-muted/40 border-b flex items-center gap-2 cursor-pointer hover:bg-muted/60 transition-colors sticky top-0 z-10"
                onClick={onToggle}
            >
                <button className="p-0.5 hover:bg-muted rounded">
                    {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                </button>
                <FileCode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-mono font-medium truncate flex-1">{fileName}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                    {aiComment?.status === "ok" && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px] bg-green-500/10 text-green-600 border-green-500/30">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />OK
                        </Badge>
                    )}
                    {aiComment?.issues && aiComment.issues.length > 0 && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                            <Bot className="h-2.5 w-2.5 mr-0.5" />{aiComment.issues.length}
                        </Badge>
                    )}
                    {hasIssues && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px] bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{issues.length}
                        </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">{lineCount} lines</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => { e.stopPropagation(); onCopy(content, fileName); }}
                    >
                        {isCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                </div>
            </div>

            {/* File Content */}
            {isExpanded && (
                <div className="border-b">
                    {/* Code with line numbers */}
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full text-xs font-mono">
                            <tbody>
                                {lines.map((line, i) => (
                                    <tr key={i} className="hover:bg-muted/30">
                                        <td className="px-2 py-0 text-right text-[10px] text-muted-foreground select-none w-10 border-r border-border/50 bg-muted/20 sticky left-0">
                                            {i + 1}
                                        </td>
                                        <td className="px-2 py-0 whitespace-pre overflow-visible">
                                            {line || ' '}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* AI Comment (GitHub/GitLab style) */}
                    {hasAIFeedback && (
                        <div className="p-2 bg-muted/10">
                            <InlineComment fileComment={aiComment!} expanded={true} />
                        </div>
                    )}

                    {/* Pattern Scan Issues */}
                    {hasIssues && (
                        <div className="px-2 py-1.5 bg-yellow-500/5 border-t border-yellow-500/20">
                            <div className="flex items-center gap-1.5 mb-1">
                                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                <span className="text-[10px] font-medium text-yellow-600">Pattern Scan ({issues.length})</span>
                            </div>
                            <div className="space-y-1">
                                {issues.map((issue, i) => (
                                    <div key={i} className={`text-[11px] rounded px-1.5 py-1 flex items-start gap-1.5 ${
                                        issue.severity === "error" ? "bg-red-500/10 text-red-600" :
                                        issue.severity === "warning" ? "bg-yellow-500/10 text-yellow-600" :
                                        "bg-blue-500/10 text-blue-600"
                                    }`}>
                                        {issue.severity === "error" ? <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" /> :
                                         issue.severity === "warning" ? <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /> :
                                         <Info className="h-3 w-3 shrink-0 mt-0.5" />}
                                        <div>
                                            <span className="font-medium">L{issue.line}:</span> {issue.message}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
