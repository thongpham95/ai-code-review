"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, CheckCircle2, AlertCircle, GitBranch, ExternalLink, Key } from 'lucide-react'
import { toast } from 'sonner'
import type { AIIssue, AIFileComment } from '@/lib/parse-ai-review'

interface PushCommentsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    reviewId: string
    sourceUrl?: string
    fileComments: AIFileComment[]
}

interface SelectableComment {
    index: number
    fileName: string
    issue: AIIssue
    selected: boolean
    pushed: boolean
}

type Provider = 'gitlab' | 'github'

export function PushCommentsDialog({
    open,
    onOpenChange,
    reviewId,
    sourceUrl,
    fileComments,
}: PushCommentsDialogProps) {
    const [provider, setProvider] = useState<Provider | null>(null)
    const [targetUrl, setTargetUrl] = useState(sourceUrl || '')
    const [token, setToken] = useState('')
    const [customBaseUrl, setCustomBaseUrl] = useState('')
    const [comments, setComments] = useState<SelectableComment[]>([])
    const [pushing, setPushing] = useState(false)
    const [pushed, setPushed] = useState<Set<string>>(new Set())

    // Detect provider from URL
    useEffect(() => {
        if (targetUrl.includes('gitlab.com') || targetUrl.includes('/-/merge_requests/')) {
            setProvider('gitlab')
        } else if (targetUrl.includes('github.com') || targetUrl.includes('/pull/')) {
            setProvider('github')
        }
    }, [targetUrl])

    // Build selectable comments list
    useEffect(() => {
        const selectableComments: SelectableComment[] = []
        let globalIndex = 0

        for (const fc of fileComments) {
            for (const issue of fc.issues) {
                selectableComments.push({
                    index: globalIndex++,
                    fileName: fc.fileName,
                    issue,
                    selected: true,
                    pushed: false,
                })
            }
        }

        setComments(selectableComments)
    }, [fileComments])

    // Load token and URL from localStorage
    useEffect(() => {
        if (provider) {
            let foundToken = ''
            let foundBaseUrl = ''

            try {
                const saved = localStorage.getItem('git-accounts')
                if (saved) {
                    const accounts = JSON.parse(saved)
                    if (provider === 'gitlab') {
                        if (accounts.gitlabSelfHosted?.url && targetUrl.includes(accounts.gitlabSelfHosted.url.replace(/^https?:\/\//, ''))) {
                            foundToken = accounts.gitlabSelfHosted?.token || ''
                            foundBaseUrl = accounts.gitlabSelfHosted?.url || ''
                        } else {
                            foundToken = accounts.gitlab?.token || ''
                        }
                    } else if (provider === 'github') {
                        foundToken = accounts.github?.token || ''
                    }
                }
            } catch { /* ignore */ }

            // fallback to older storage if needed
            if (!foundToken && provider === 'gitlab') {
                foundToken = sessionStorage.getItem('gitlab-pat') || ''
                foundBaseUrl = sessionStorage.getItem('gitlab-url') || ''

                if (!foundToken || !foundBaseUrl) {
                    try {
                        const saved = localStorage.getItem('gitlab-self-hosted-config')
                        if (saved) {
                            const config = JSON.parse(saved)
                            if (!foundToken && config.token) foundToken = config.token
                            if (!foundBaseUrl && config.url) foundBaseUrl = config.url
                        }
                    } catch { /* ignore */ }
                }
            }

            // last try for common specific token format
            if (!foundToken) {
                foundToken = localStorage.getItem(`${provider}-token`) || ''
            }

            if (foundToken) {
                setToken(foundToken)
            }
            if (foundBaseUrl) {
                setCustomBaseUrl(foundBaseUrl)
            }
        }
    }, [provider, targetUrl])

    function toggleComment(index: number) {
        setComments(prev =>
            prev.map(c =>
                c.index === index ? { ...c, selected: !c.selected } : c
            )
        )
    }

    function selectAll() {
        setComments(prev => prev.map(c => ({ ...c, selected: !c.pushed })))
    }

    function selectNone() {
        setComments(prev => prev.map(c => ({ ...c, selected: false })))
    }

    async function handlePush() {
        if (!provider || !targetUrl || !token) {
            toast.error('Please fill in all required fields')
            return
        }

        const selectedComments = comments.filter(c => c.selected && !c.pushed)
        if (selectedComments.length === 0) {
            toast.error('No comments selected')
            return
        }

        // Save token for convenience
        localStorage.setItem(`${provider}-token`, token)

        setPushing(true)

        try {
            const endpoint = provider === 'gitlab'
                ? '/api/gitlab/push-comments'
                : '/api/github/push-comments'

            const urlKey = provider === 'gitlab' ? 'mrUrl' : 'prUrl'

            const bodyContent: any = {
                reviewId,
                [urlKey]: targetUrl,
                token,
                comments: selectedComments.map(c => ({
                    index: c.index,
                    fileName: c.fileName,
                    line: c.issue.line,
                    description: c.issue.description,
                    severity: c.issue.severity,
                    currentCode: c.issue.currentCode,
                    suggestedFix: c.issue.suggestedFix,
                })),
            }

            if (provider === 'gitlab' && customBaseUrl) {
                bodyContent.customBaseUrl = customBaseUrl
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyContent),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to push comments')
            }

            // Mark pushed comments
            const newPushed = new Set(pushed)
            for (const result of data.results) {
                if (result.success) {
                    newPushed.add(`${result.comment.index}`)
                    setComments(prev =>
                        prev.map(c =>
                            c.index === result.comment.index
                                ? { ...c, pushed: true, selected: false }
                                : c
                        )
                    )
                }
            }
            setPushed(newPushed)

            if (data.pushed > 0) {
                toast.success(`Pushed ${data.pushed} comment${data.pushed > 1 ? 's' : ''} to ${provider === 'gitlab' ? 'GitLab' : 'GitHub'}`)
            }
            if (data.failed > 0) {
                toast.warning(`Failed to push ${data.failed} comment${data.failed > 1 ? 's' : ''}`)
            }
        } catch (error) {
            console.error('Push error:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to push comments')
        } finally {
            setPushing(false)
        }
    }

    const selectedCount = comments.filter(c => c.selected && !c.pushed).length
    const pushedCount = comments.filter(c => c.pushed).length
    const totalCount = comments.length

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5" />
                        Push Comments to {provider === 'gitlab' ? 'GitLab' : provider === 'github' ? 'GitHub' : 'Git Provider'}
                    </DialogTitle>
                    <DialogDescription>
                        Push AI review comments directly to your merge/pull request
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                    {/* Target URL */}
                    <div className="space-y-2">
                        <Label htmlFor="targetUrl" className="flex items-center gap-1.5">
                            <ExternalLink className="h-3.5 w-3.5" />
                            {provider === 'gitlab' ? 'GitLab MR URL' : provider === 'github' ? 'GitHub PR URL' : 'MR/PR URL'}
                        </Label>
                        <Input
                            id="targetUrl"
                            placeholder="https://gitlab.com/group/project/-/merge_requests/123 or https://github.com/owner/repo/pull/123"
                            value={targetUrl}
                            onChange={(e) => setTargetUrl(e.target.value)}
                        />
                        {provider && (
                            <Badge variant="outline" className="w-fit">
                                Detected: {provider === 'gitlab' ? 'GitLab' : 'GitHub'}
                            </Badge>
                        )}
                    </div>

                    {/* Access Token */}
                    <div className="space-y-2">
                        <Label htmlFor="token" className="flex items-center gap-1.5">
                            <Key className="h-3.5 w-3.5" />
                            Personal Access Token
                        </Label>
                        <Input
                            id="token"
                            type="password"
                            placeholder={provider === 'gitlab' ? 'glpat-xxxxxxxxxxxxxxxxxxxx' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            {provider === 'gitlab'
                                ? 'Requires api scope for GitLab PAT'
                                : 'Requires repo scope for GitHub PAT'}
                        </p>
                    </div>

                    {/* Custom Base URL (GitLab Self-hosted) */}
                    {provider === 'gitlab' && (
                        <div className="space-y-2">
                            <Label htmlFor="customBaseUrl" className="flex items-center gap-1.5">
                                <ExternalLink className="h-3.5 w-3.5" />
                                GitLab Instance URL (Optional)
                            </Label>
                            <Input
                                id="customBaseUrl"
                                type="url"
                                placeholder="https://gitlab.company.com (Leave blank for gitlab.com)"
                                value={customBaseUrl}
                                onChange={(e) => setCustomBaseUrl(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Only needed for self-hosted GitLab instances
                            </p>
                        </div>
                    )}

                    {/* Comments Selection */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                                Comments to Push ({selectedCount} selected)
                            </Label>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={selectAll}
                                >
                                    Select All
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={selectNone}
                                >
                                    None
                                </Button>
                            </div>
                        </div>

                        <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                            {comments.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No AI comments available to push
                                </div>
                            ) : (
                                comments.map((comment) => (
                                    <label
                                        key={comment.index}
                                        className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${comment.pushed ? 'opacity-50' : ''
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={comment.selected}
                                            disabled={comment.pushed}
                                            onChange={() => toggleComment(comment.index)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-mono text-muted-foreground truncate">
                                                    {comment.fileName}
                                                </span>
                                                {comment.issue.line && (
                                                    <span className="text-xs text-muted-foreground">
                                                        L{comment.issue.line}
                                                    </span>
                                                )}
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] ${comment.issue.severity === 'error'
                                                        ? 'bg-red-500/10 text-red-600 border-red-500/30'
                                                        : comment.issue.severity === 'warning'
                                                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                                            : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                                        }`}
                                                >
                                                    {comment.issue.severity}
                                                </Badge>
                                                {comment.pushed && (
                                                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
                                                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                                        Pushed
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm line-clamp-2">{comment.issue.description}</p>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>

                        {pushedCount > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {pushedCount} of {totalCount} comments already pushed
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePush}
                        disabled={pushing || selectedCount === 0 || !targetUrl || !token}
                    >
                        {pushing ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Pushing...
                            </>
                        ) : (
                            <>
                                Push {selectedCount} Comment{selectedCount !== 1 ? 's' : ''}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
