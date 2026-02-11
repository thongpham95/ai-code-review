"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileCode, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

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
        if (mins < 1) return "just now"
        if (mins < 60) return `${mins}m ago`
        const hours = Math.floor(mins / 60)
        if (hours < 24) return `${hours}h ago`
        return `${Math.floor(hours / 24)}d ago`
    }

    return (
        <div className="flex-1 space-y-4 p-2 pt-2 md:p-6 md:pt-4">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Reviews</h2>
                <Link href="/dashboard/reviews/new">
                    <Button size="sm" className="md:size-default">
                        <Plus className="mr-1 md:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">New Review</span>
                        <span className="sm:hidden">New</span>
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                    Loading reviews...
                </div>
            ) : reviews.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileCode className="h-16 w-16 text-muted-foreground mb-4" />
                        <CardTitle className="mb-2">No reviews yet</CardTitle>
                        <CardDescription className="mb-6 text-center">
                            Start by creating a new code review. You can paste code or provide a GitLab MR URL.
                        </CardDescription>
                        <Link href="/dashboard/reviews/new">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Create First Review
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
                                                {review.patternResults.length} issues
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
