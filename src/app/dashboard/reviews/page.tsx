"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileCode, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useLanguage } from "@/contexts/language-context"

interface ReviewItem {
    id: string
    title: string
    status: string
    createdAt: string
    source: string
    patternResults?: { severity: string }[]
}

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<ReviewItem[]>([])
    const [loading, setLoading] = useState(true)
    const { t } = useLanguage()

    useEffect(() => {
        async function fetchReviews() {
            try {
                const res = await fetch("/api/reviews")
                if (res.ok) {
                    const data = await res.json()
                    setReviews(data.reviews || [])
                }
            } catch (error) {
                console.error("Failed to fetch reviews:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchReviews()
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
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t.reviews.title}</h2>
                <Link href="/dashboard/reviews/new">
                    <Button size="sm" className="md:size-default">
                        <Plus className="mr-1 md:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">{t.reviews.newReview}</span>
                        <span className="sm:hidden">{t.common.new}</span>
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                    {t.common.loading}
                </div>
            ) : reviews.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileCode className="h-16 w-16 text-muted-foreground mb-4" />
                        <CardTitle className="mb-2">{t.reviews.noReviewsTitle}</CardTitle>
                        <CardDescription className="mb-6 text-center">
                            {t.reviews.noReviewsDesc}
                        </CardDescription>
                        <Link href="/dashboard/reviews/new">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> {t.reviews.createFirst}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {reviews.map((review) => (
                        <Link key={review.id} href={`/dashboard/reviews/${review.id}`}>
                            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full overflow-hidden">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between gap-2 min-w-0">
                                        <CardTitle className="text-base truncate flex-1 min-w-0" title={review.title}>
                                            {review.title}
                                        </CardTitle>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    </div>
                                    <CardDescription className="truncate">{timeAgo(review.createdAt)} · {review.source}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm font-medium ${review.status === "completed" ? "text-green-500" :
                                            review.status === "failed" ? "text-red-500" :
                                                "text-blue-500"
                                            }`}>
                                            {review.status}
                                        </span>
                                        {review.patternResults && review.patternResults.length > 0 && (
                                            <span className="text-xs text-yellow-500 font-medium">
                                                {t.reviews.issues(review.patternResults.length)}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
