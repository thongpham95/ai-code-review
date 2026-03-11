"use client"

import { useEffect, useState } from "react"
import { Activity } from "lucide-react"

export function TokenUsageBadge() {
    const [dailyTokens, setDailyTokens] = useState<number>(0)

    useEffect(() => {
        async function fetchUsage() {
            try {
                const res = await fetch("/api/usage")
                if (res.ok) {
                    const data = await res.json()
                    setDailyTokens(data.total || 0)
                }
            } catch { /* ignore */ }
        }
        fetchUsage()
        // Refresh every 30 seconds
        const interval = setInterval(fetchUsage, 30000)
        return () => clearInterval(interval)
    }, [])

    if (dailyTokens === 0) return null

    function formatTokens(n: number): string {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
        if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
        return n.toString()
    }

    return (
        <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/50 cursor-default"
            title={`Today: ${dailyTokens.toLocaleString()} tokens used`}
        >
            <Activity className="h-3 w-3 text-green-500" />
            <span>{formatTokens(dailyTokens)}</span>
        </div>
    )
}
