"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Github, GitlabIcon as Gitlab, Server, Eye, EyeOff, Check, Trash2 } from "lucide-react"

interface GitAccounts {
    github?: {
        token: string
    }
    gitlab?: {
        token: string
    }
    gitlabSelfHosted?: {
        url: string
        token: string
    }
}

export function GitAccountsForm() {
    const [accounts, setAccounts] = useState<GitAccounts>({})
    const [showTokens, setShowTokens] = useState<Record<string, boolean>>({})

    // Form states
    const [githubToken, setGithubToken] = useState("")
    const [gitlabToken, setGitlabToken] = useState("")
    const [selfHostedUrl, setSelfHostedUrl] = useState("")
    const [selfHostedToken, setSelfHostedToken] = useState("")

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem("git-accounts")
            if (saved) {
                const parsed = JSON.parse(saved)
                setAccounts(parsed)
                setGithubToken(parsed.github?.token || "")
                setGitlabToken(parsed.gitlab?.token || "")
                setSelfHostedUrl(parsed.gitlabSelfHosted?.url || "")
                setSelfHostedToken(parsed.gitlabSelfHosted?.token || "")
            }
        } catch {
            // Ignore parse errors
        }
    }, [])

    function saveAccounts(newAccounts: GitAccounts) {
        localStorage.setItem("git-accounts", JSON.stringify(newAccounts))
        setAccounts(newAccounts)
    }

    function saveGitHub() {
        const newAccounts = { ...accounts, github: { token: githubToken } }
        saveAccounts(newAccounts)
        toast.success("GitHub token saved")
    }

    function saveGitLab() {
        const newAccounts = { ...accounts, gitlab: { token: gitlabToken } }
        saveAccounts(newAccounts)
        toast.success("GitLab token saved")
    }

    function saveSelfHosted() {
        if (!selfHostedUrl) {
            toast.error("Please enter the GitLab URL")
            return
        }
        const newAccounts = {
            ...accounts,
            gitlabSelfHosted: { url: selfHostedUrl, token: selfHostedToken }
        }
        saveAccounts(newAccounts)
        toast.success("Self-hosted GitLab saved")
    }

    function removeGitHub() {
        const newAccounts = { ...accounts }
        delete newAccounts.github
        saveAccounts(newAccounts)
        setGithubToken("")
        toast.success("GitHub token removed")
    }

    function removeGitLab() {
        const newAccounts = { ...accounts }
        delete newAccounts.gitlab
        saveAccounts(newAccounts)
        setGitlabToken("")
        toast.success("GitLab token removed")
    }

    function removeSelfHosted() {
        const newAccounts = { ...accounts }
        delete newAccounts.gitlabSelfHosted
        saveAccounts(newAccounts)
        setSelfHostedUrl("")
        setSelfHostedToken("")
        toast.success("Self-hosted GitLab removed")
    }

    function toggleShowToken(key: string) {
        setShowTokens(prev => ({ ...prev, [key]: !prev[key] }))
    }

    function maskToken(token: string): string {
        if (!token) return ""
        if (token.length <= 8) return "****"
        return token.slice(0, 4) + "****" + token.slice(-4)
    }

    return (
        <div className="space-y-4">
            {/* GitHub */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Github className="h-5 w-5" />
                            <CardTitle className="text-base">GitHub</CardTitle>
                        </div>
                        {accounts.github?.token && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                <Check className="h-3 w-3 mr-1" />
                                Connected
                            </Badge>
                        )}
                    </div>
                    <CardDescription>
                        Personal Access Token for fetching GitHub Pull Requests
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        <Label htmlFor="github-token">Personal Access Token</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="github-token"
                                    type={showTokens.github ? "text" : "password"}
                                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                    value={githubToken}
                                    onChange={(e) => setGithubToken(e.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                    onClick={() => toggleShowToken("github")}
                                >
                                    {showTokens.github ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            <Button onClick={saveGitHub} disabled={!githubToken}>
                                Save
                            </Button>
                            {accounts.github?.token && (
                                <Button variant="outline" size="icon" onClick={removeGitHub}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Requires <code className="bg-muted px-1 py-0.5 rounded">repo</code> scope.{" "}
                            <a
                                href="https://github.com/settings/tokens/new?scopes=repo"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline"
                            >
                                Create token
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* GitLab.com */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Gitlab className="h-5 w-5 text-orange-500" />
                            <CardTitle className="text-base">GitLab.com</CardTitle>
                        </div>
                        {accounts.gitlab?.token && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                <Check className="h-3 w-3 mr-1" />
                                Connected
                            </Badge>
                        )}
                    </div>
                    <CardDescription>
                        Personal Access Token for fetching GitLab Merge Requests
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        <Label htmlFor="gitlab-token">Personal Access Token</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="gitlab-token"
                                    type={showTokens.gitlab ? "text" : "password"}
                                    placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                                    value={gitlabToken}
                                    onChange={(e) => setGitlabToken(e.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                    onClick={() => toggleShowToken("gitlab")}
                                >
                                    {showTokens.gitlab ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            <Button onClick={saveGitLab} disabled={!gitlabToken}>
                                Save
                            </Button>
                            {accounts.gitlab?.token && (
                                <Button variant="outline" size="icon" onClick={removeGitLab}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Requires <code className="bg-muted px-1 py-0.5 rounded">read_api</code> scope.{" "}
                            <a
                                href="https://gitlab.com/-/user_settings/personal_access_tokens?name=AI+Code+Review&scopes=read_api"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline"
                            >
                                Create token
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Self-hosted GitLab */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Server className="h-5 w-5 text-purple-500" />
                            <CardTitle className="text-base">Self-hosted GitLab</CardTitle>
                        </div>
                        {accounts.gitlabSelfHosted?.url && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                <Check className="h-3 w-3 mr-1" />
                                Connected
                            </Badge>
                        )}
                    </div>
                    <CardDescription>
                        Connect to your company&apos;s self-hosted GitLab instance
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        <Label htmlFor="selfhosted-url">GitLab URL</Label>
                        <Input
                            id="selfhosted-url"
                            placeholder="https://gitlab.company.com"
                            value={selfHostedUrl}
                            onChange={(e) => setSelfHostedUrl(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="selfhosted-token">Personal Access Token</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="selfhosted-token"
                                    type={showTokens.selfhosted ? "text" : "password"}
                                    placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                                    value={selfHostedToken}
                                    onChange={(e) => setSelfHostedToken(e.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                    onClick={() => toggleShowToken("selfhosted")}
                                >
                                    {showTokens.selfhosted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            <Button onClick={saveSelfHosted} disabled={!selfHostedUrl}>
                                Save
                            </Button>
                            {accounts.gitlabSelfHosted?.url && (
                                <Button variant="outline" size="icon" onClick={removeSelfHosted}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Requires <code className="bg-muted px-1 py-0.5 rounded">read_api</code> scope
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
