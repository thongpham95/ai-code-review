"use client"

import React, { useState } from 'react'
import { Bot, ChevronDown, ChevronRight, AlertCircle, AlertTriangle, Info, Lightbulb, CheckCircle2, Code, Copy, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AIFileComment, AIIssue } from '@/lib/parse-ai-review'
import ReactMarkdown from 'react-markdown'

interface InlineCommentProps {
    fileComment: AIFileComment
    expanded?: boolean
    className?: string
}

/**
 * GitHub/GitLab-like inline comment component for AI review feedback
 */
export function InlineComment({ fileComment, expanded = true, className }: InlineCommentProps) {
    const [isExpanded, setIsExpanded] = useState(expanded)
    const issueCount = fileComment.issues.length
    const hasIssues = issueCount > 0

    return (
        <div className={cn(
            "border rounded-lg overflow-hidden bg-gradient-to-r",
            fileComment.status === "ok"
                ? "from-green-500/5 to-transparent border-green-500/30"
                : hasIssues
                    ? "from-amber-500/5 to-transparent border-amber-500/30"
                    : "from-blue-500/5 to-transparent border-blue-500/30",
            className
        )}>
            {/* Comment Header - Like GitHub */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* AI Avatar */}
                <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                    </div>
                    {fileComment.status === "ok" && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                            <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                        </div>
                    )}
                </div>

                {/* Header Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">AI Review Bot</span>
                        <span className="text-xs text-muted-foreground">reviewed this file</span>
                    </div>
                </div>

                {/* Status Badge & Toggle */}
                <div className="flex items-center gap-2">
                    {fileComment.status === "ok" ? (
                        <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-600 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Looks good
                        </Badge>
                    ) : hasIssues ? (
                        <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-600 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {issueCount} {issueCount === 1 ? 'comment' : 'comments'}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-xs">
                            <Info className="h-3 w-3 mr-1" />
                            Reviewed
                        </Badge>
                    )}
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                </div>
            </div>

            {/* Comment Body */}
            {isExpanded && (
                <div className="border-t bg-background/50">
                    {fileComment.status === "ok" && !hasIssues ? (
                        <div className="px-4 py-4 flex items-center gap-3 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-sm">No issues found. Code looks good!</span>
                        </div>
                    ) : hasIssues ? (
                        <div className="divide-y">
                            {fileComment.issues.map((issue, index) => (
                                <IssueCard key={index} issue={issue} index={index + 1} />
                            ))}
                        </div>
                    ) : fileComment.rawContent ? (
                        <div className="px-4 py-3 prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{fileComment.rawContent}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="px-4 py-4 text-sm text-muted-foreground">
                            No specific feedback for this file.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

interface IssueCardProps {
    issue: AIIssue
    index: number
}

function IssueCard({ issue, index }: IssueCardProps) {
    const [showCode, setShowCode] = useState(true)
    const [copied, setCopied] = useState(false)

    const severityConfig = {
        error: {
            icon: AlertCircle,
            color: "text-red-500",
            bg: "bg-red-500/10",
            border: "border-red-500/30",
            label: "Error",
        },
        warning: {
            icon: AlertTriangle,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-500/30",
            label: "Warning",
        },
        suggestion: {
            icon: Lightbulb,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/30",
            label: "Suggestion",
        },
        info: {
            icon: Info,
            color: "text-slate-500",
            bg: "bg-slate-500/10",
            border: "border-slate-500/30",
            label: "Info",
        },
    }

    const config = severityConfig[issue.severity]
    const Icon = config.icon

    async function copyCode() {
        if (issue.suggestedFix) {
            await navigator.clipboard.writeText(issue.suggestedFix)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="px-4 py-3">
            {/* Issue Header */}
            <div className="flex items-start gap-3">
                <div className={cn("p-1.5 rounded-md", config.bg)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn("text-xs", config.border, config.color, config.bg)}>
                            {config.label}
                        </Badge>
                        {issue.line && (
                            <span className="text-xs text-muted-foreground font-mono">
                                Line {issue.line}
                            </span>
                        )}
                    </div>
                    <p className="text-sm font-medium leading-relaxed">
                        {issue.description}
                    </p>
                </div>
            </div>

            {/* Code Snippets */}
            {(issue.currentCode || issue.suggestedFix) && (
                <div className="mt-3 ml-9">
                    {issue.currentCode && (
                        <div className="mb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Code className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground font-medium">Current code:</span>
                            </div>
                            <pre className="text-xs bg-red-500/5 border border-red-500/20 rounded-md px-3 py-2 overflow-x-auto font-mono">
                                <code className="text-red-600 dark:text-red-400">{issue.currentCode}</code>
                            </pre>
                        </div>
                    )}
                    {issue.suggestedFix && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground font-medium">Suggested fix:</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={copyCode}
                                >
                                    {copied ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </Button>
                            </div>
                            <pre className="text-xs bg-green-500/5 border border-green-500/20 rounded-md px-3 py-2 overflow-x-auto font-mono">
                                <code className="text-green-600 dark:text-green-400">{issue.suggestedFix}</code>
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

/**
 * Compact summary badge for file tree
 */
interface FileStatusBadgeProps {
    status: AIFileComment["status"]
    issueCount: number
    className?: string
}

export function FileStatusBadge({ status, issueCount, className }: FileStatusBadgeProps) {
    if (status === "ok") {
        return (
            <span className={cn("text-green-500", className)} title="AI: Looks good">
                <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
        )
    }

    if (issueCount > 0) {
        return (
            <Badge variant="outline" className={cn("h-5 px-1.5 text-xs bg-amber-500/10 border-amber-500/30 text-amber-600", className)}>
                {issueCount}
            </Badge>
        )
    }

    return null
}
