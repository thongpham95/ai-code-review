"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { Menu, LayoutDashboard, FileCode, Settings, Bug, Smartphone } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export function MobileNav() {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const { t } = useLanguage()

    const navItems = [
        { href: "/dashboard", title: t.nav.overview, icon: LayoutDashboard },
        { href: "/dashboard/reviews", title: t.nav.reviews, icon: FileCode },
        { href: "/dashboard/jira-analyzer", title: t.nav.jiraAnalyzer, icon: Bug },
        { href: "/dashboard/mobile-api-checker", title: t.nav.mobileApi, icon: Smartphone },
        { href: "/dashboard/settings", title: t.nav.settings, icon: Settings },
    ]

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[280px]">
                <nav className="flex flex-col space-y-1 mt-6">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                    isActive
                                        ? "bg-muted font-medium"
                                        : "hover:bg-muted/50"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.title}
                            </Link>
                        )
                    })}
                </nav>
            </SheetContent>
        </Sheet>
    )
}
