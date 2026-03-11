"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Plus, FileCode, ArrowRight, LayoutGrid, List, Calendar, Search, Trash2, CheckSquare, Square, Sparkles } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useCallback, useRef } from "react"
import { useLanguage } from "@/contexts/language-context"
import { toast } from "sonner"

interface ReviewItem {
    id: string
    title: string
    status: string
    createdAt: string
    source: string
    quickSummary?: string
    userName?: string
    tokenUsage?: number
}

type ViewMode = "grid" | "list"
type SortOption = "date" | "issues"
type GroupOption = "none" | "date"

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<ReviewItem[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<ViewMode>("grid")
    const [sortBy, setSortBy] = useState<SortOption>("date")
    const [groupBy, setGroupBy] = useState<GroupOption>("none")
    const [searchQuery, setSearchQuery] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const { t } = useLanguage()
    const [userFilter, setUserFilter] = useState<string>("all")

    const fetchReviews = useCallback(async (query?: string) => {
        try {
            setIsSearching(true)
            const url = query ? `/api/reviews?q=${encodeURIComponent(query)}` : "/api/reviews"
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setReviews(data.reviews || [])
            }
        } catch (error) {
            console.error("Failed to fetch reviews:", error)
        } finally {
            setLoading(false)
            setIsSearching(false)
        }
    }, [])

    useEffect(() => {
        fetchReviews()
    }, [fetchReviews])

    function handleSearch(value: string) {
        setSearchQuery(value)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            fetchReviews(value.trim() || undefined)
        }, 300)
    }

    function timeAgo(dateStr: string) {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return t.common.justNow
        if (mins < 60) return t.common.mAgo(mins)
        const hours = Math.floor(mins / 60)
        if (hours < 24) return t.common.hAgo(hours)
        return t.common.dAgo(Math.floor(hours / 24))
    }

    function getDateGroup(dateStr: string): string {
        const now = new Date()
        const date = new Date(dateStr)
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) return t.reviews.groupToday
        if (diffDays === 1) return t.reviews.groupYesterday
        if (diffDays <= 7) return t.reviews.groupThisWeek
        return t.reviews.groupOlder
    }

    // Selection helpers
    function toggleSelect(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    function selectAll() {
        setSelectedIds(new Set(reviews.map(r => r.id)))
    }

    function deselectAll() {
        setSelectedIds(new Set())
    }

    async function handleBulkDelete() {
        if (selectedIds.size === 0) return
        const confirmed = window.confirm(t.reviews.confirmDelete(selectedIds.size))
        if (!confirmed) return

        setIsDeleting(true)
        try {
            const res = await fetch("/api/reviews", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            })
            if (res.ok) {
                const data = await res.json()
                toast.success(t.reviews.deleted(data.deleted))
                setSelectedIds(new Set())
                fetchReviews(searchQuery.trim() || undefined)
            } else {
                toast.error("Failed to delete reviews")
            }
        } catch {
            toast.error("Failed to delete reviews")
        } finally {
            setIsDeleting(false)
        }
    }

    // Get unique users for filter dropdown
    const uniqueUsers = [...new Set(reviews.map(r => r.userName).filter(Boolean))] as string[]

    // Apply user filter
    const filteredReviews = userFilter === "all"
        ? reviews
        : reviews.filter(r => r.userName === userFilter)

    const sortedReviews = [...filteredReviews].sort((a, b) => {
        if (sortBy === "date") {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        return 0
    })

    const groupedReviews: { group: string; items: ReviewItem[] }[] = []
    if (groupBy === "date") {
        const groups = new Map<string, ReviewItem[]>()
        for (const review of sortedReviews) {
            const group = getDateGroup(review.createdAt)
            if (!groups.has(group)) groups.set(group, [])
            groups.get(group)!.push(review)
        }
        for (const [group, items] of groups) {
            groupedReviews.push({ group, items })
        }
    } else {
        groupedReviews.push({ group: "", items: sortedReviews })
    }

    function truncateTitle(title: string, maxLen: number) {
        if (title.length <= maxLen) return title
        return title.substring(0, maxLen) + "…"
    }

    function ReviewGridCard({ review }: { review: ReviewItem }) {
        const isSelected = selectedIds.has(review.id)
        return (
            <div className="relative h-full">
                {/* Checkbox overlay */}
                <button
                    className="absolute top-2 left-2 z-10 p-0.5 rounded hover:bg-muted/80"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelect(review.id) }}
                >
                    {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground/50" />}
                </button>
                <Link href={`/dashboard/reviews/${review.id}`}>
                    <Card className={`hover:border-primary/50 transition-all cursor-pointer h-full overflow-hidden hover:shadow-md ${isSelected ? 'border-primary ring-1 ring-primary/30' : ''}`}>
                        <CardHeader className="pb-2 pl-8">
                            <div className="flex items-center justify-between gap-2 min-w-0">
                                <CardTitle className="text-sm truncate flex-1 min-w-0" title={review.title}>
                                    {truncateTitle(review.title, 40)}
                                </CardTitle>
                                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </div>
                            <CardDescription className="truncate text-xs">
                                {timeAgo(review.createdAt)} · {review.source}
                                {review.userName && ` · ${review.userName}`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Quick Summary */}
                            {review.quickSummary && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2 flex items-start gap-1">
                                    <Sparkles className="h-3 w-3 text-purple-400 shrink-0 mt-0.5" />
                                    {review.quickSummary}
                                </p>
                            )}
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${review.status === "completed" ? "bg-green-500/10 text-green-600" :
                                    review.status === "failed" ? "bg-red-500/10 text-red-600" :
                                        "bg-blue-500/10 text-blue-600"
                                    }`}>
                                    {review.status}
                                </span>
                                {review.tokenUsage ? (
                                    <span className="text-[10px] text-muted-foreground">{review.tokenUsage.toLocaleString()} tokens</span>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        )
    }

    function ReviewListItem({ review }: { review: ReviewItem }) {
        const isSelected = selectedIds.has(review.id)
        return (
            <div className="flex items-center gap-2">
                <button
                    className="p-0.5 rounded hover:bg-muted/80 shrink-0"
                    onClick={() => toggleSelect(review.id)}
                >
                    {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground/50" />}
                </button>
                <Link href={`/dashboard/reviews/${review.id}`} className="flex-1 min-w-0">
                    <div className={`rounded-lg border p-3 hover:bg-muted/50 hover:shadow-sm transition-all cursor-pointer ${isSelected ? 'border-primary ring-1 ring-primary/30' : ''}`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate" title={review.title}>
                                        {truncateTitle(review.title, 60)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {timeAgo(review.createdAt)} · {review.source}
                                        {review.userName && ` · ${review.userName}`}
                                        {review.tokenUsage ? ` · ${review.tokenUsage.toLocaleString()} tokens` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${review.status === "completed" ? "bg-green-500/10 text-green-600" :
                                    review.status === "failed" ? "bg-red-500/10 text-red-600" :
                                        "bg-blue-500/10 text-blue-600"
                                    }`}>
                                    {review.status}
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                        {/* Quick Summary */}
                        {review.quickSummary && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1.5 ml-7 flex items-start gap-1">
                                <Sparkles className="h-3 w-3 text-purple-400 shrink-0 mt-0.5" />
                                {review.quickSummary}
                            </p>
                        )}
                    </div>
                </Link>
            </div>
        )
    }


    return (
        <div className="flex-1 space-y-4 p-2 pt-2 md:p-6 md:pt-4">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t.reviews.title}</h2>
                <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="gap-1"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t.reviews.deleteSelected} ({selectedIds.size})
                        </Button>
                    )}
                    <Link href="/dashboard/reviews/new">
                        <Button size="sm" className="md:size-default">
                            <Plus className="mr-1 md:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">{t.reviews.newReview}</span>
                            <span className="sm:hidden">{t.common.new}</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Toolbar: Search + View Mode + Sort + Group + Select/Deselect */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder={t.reviews.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="h-8 pl-8 text-xs"
                    />
                </div>

                {/* Select All / Deselect All */}
                {reviews.length > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => selectedIds.size === reviews.length ? deselectAll() : selectAll()}
                    >
                        {selectedIds.size === reviews.length ? (
                            <><CheckSquare className="h-3 w-3" /> {t.reviews.deselectAll}</>
                        ) : (
                            <><Square className="h-3 w-3" /> {t.reviews.selectAll}</>
                        )}
                    </Button>
                )}

                {/* View Mode Toggle */}
                <div className="flex items-center rounded-lg border p-0.5">
                    <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setViewMode("grid")}
                    >
                        <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                        <span className="text-xs hidden sm:inline">{t.reviews.gridView}</span>
                    </Button>
                    <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setViewMode("list")}
                    >
                        <List className="h-3.5 w-3.5 mr-1" />
                        <span className="text-xs hidden sm:inline">{t.reviews.listView}</span>
                    </Button>
                </div>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-auto h-7 text-xs gap-1">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="date">{t.reviews.sortDate}</SelectItem>
                        <SelectItem value="issues">{t.reviews.sortIssues}</SelectItem>
                    </SelectContent>
                </Select>

                {/* Group */}
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupOption)}>
                    <SelectTrigger className="w-auto h-7 text-xs gap-1">
                        <Calendar className="h-3 w-3" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">{t.reviews.groupNone}</SelectItem>
                        <SelectItem value="date">{t.reviews.groupDate}</SelectItem>
                    </SelectContent>
                </Select>

                {/* User Filter */}
                {uniqueUsers.length > 0 && (
                    <Select value={userFilter} onValueChange={setUserFilter}>
                        <SelectTrigger className="w-auto h-7 text-xs gap-1">
                            <SelectValue placeholder="All users" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {uniqueUsers.map(user => (
                                <SelectItem key={user} value={user}>{user}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                    {t.common.loading}
                </div>
            ) : reviews.length === 0 && !searchQuery ? (
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
            ) : reviews.length === 0 && searchQuery ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Search className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <CardTitle className="mb-2 text-base">{t.reviews.searchNoResults}</CardTitle>
                        <CardDescription className="text-center">
                            &quot;{searchQuery}&quot;
                        </CardDescription>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {groupedReviews.map(({ group, items }) => (
                        <div key={group || "all"}>
                            {group && (
                                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {group}
                                    <span className="text-xs font-normal">({items.length})</span>
                                </h3>
                            )}
                            {viewMode === "grid" ? (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {items.map((review) => (
                                        <ReviewGridCard key={review.id} review={review} />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {items.map((review) => (
                                        <ReviewListItem key={review.id} review={review} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
