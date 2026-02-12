"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, GitFork, AlertTriangle, Plus, FileCode, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useLanguage } from "@/contexts/language-context"

interface ReviewItem {
    id: string
    title: string
    status: string
    createdAt: string
    source: string
    sourceUrl?: string
    patternResults?: { severity: string }[]
}

interface Stats {
    totalReviews: number
    totalIssues: number
    completedToday: number
}

export default function DashboardPage() {
    const [reviews, setReviews] = useState<ReviewItem[]>([])
    const [stats, setStats] = useState<Stats>({ totalReviews: 0, totalIssues: 0, completedToday: 0 })
    const [loading, setLoading] = useState(true)
    const { t } = useLanguage()

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("/api/reviews")
                if (res.ok) {
                    const data = await res.json()
                    setReviews(data.reviews || [])
                    setStats(data.stats || { totalReviews: 0, totalIssues: 0, completedToday: 0 })
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    function timeAgo(dateStr: string) {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return t.common.justNow
        if (mins < 60) return t.common.mAgo(mins)
        const hours = Math.floor(mins / 60)
        if (hours < 24) return t.common.hAgo(hours)
        return t.common.dAgo(Math.floor(hours / 24))
    }

    return (
        <div className="flex-1 space-y-4 p-2 pt-2 md:p-6 md:pt-4">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t.dashboard.title}</h2>
                <Link href="/dashboard/reviews/new">
                    <Button size="sm" className="md:size-default">
                        <Plus className="mr-1 md:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">{t.dashboard.newReview}</span>
                        <span className="sm:hidden">{t.common.new}</span>
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t.dashboard.totalReviews}</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalReviews}</div>
                        <p className="text-xs text-muted-foreground">
                            {t.dashboard.completedToday(stats.completedToday)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t.dashboard.issuesFound}</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalIssues}</div>
                        <p className="text-xs text-muted-foreground">
                            {t.dashboard.byPatternScanner}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t.dashboard.activeRepos}</CardTitle>
                        <GitFork className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set(reviews.map(r => r.sourceUrl).filter(Boolean)).size}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t.dashboard.uniqueSources}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Reviews */}
            <Card>
                <CardHeader>
                    <CardTitle>{t.dashboard.recentReviews}</CardTitle>
                    <CardDescription>
                        {reviews.length === 0
                            ? t.dashboard.noReviewsYet
                            : t.dashboard.showingRecent(reviews.length)
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                            {t.common.loading}
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-4">{t.dashboard.noReviews}</p>
                            <Link href="/dashboard/reviews/new">
                                <Button variant="outline">
                                    <Plus className="mr-2 h-4 w-4" /> {t.dashboard.createFirst}
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reviews.slice(0, 10).map((review) => (
                                <Link
                                    key={review.id}
                                    href={`/dashboard/reviews/${review.id}`}
                                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{review.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {review.source} · {timeAgo(review.createdAt)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {review.patternResults && review.patternResults.length > 0 && (
                                            <span className="text-xs font-medium text-yellow-500">
                                                {t.dashboard.issues(review.patternResults.length)}
                                            </span>
                                        )}
                                        <span className={`text-xs font-medium ${review.status === "completed" ? "text-green-500" :
                                            review.status === "failed" ? "text-red-500" :
                                                "text-blue-500"
                                            }`}>
                                            {review.status}
                                        </span>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
