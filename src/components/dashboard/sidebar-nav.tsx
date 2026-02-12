"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { LayoutDashboard, FileCode, Settings } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export function SidebarNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
    const pathname = usePathname()
    const { t } = useLanguage()

    const sidebarItems = [
        { href: "/dashboard", title: t.nav.overview, icon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
        { href: "/dashboard/reviews", title: t.nav.reviews, icon: <FileCode className="mr-2 h-4 w-4" /> },
        { href: "/dashboard/settings", title: t.nav.settings, icon: <Settings className="mr-2 h-4 w-4" /> },
    ]

    return (
        <nav className={cn("flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1", className)} {...props}>
            {sidebarItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        buttonVariants({ variant: "ghost" }),
                        pathname === item.href
                            ? "bg-muted hover:bg-muted"
                            : "hover:bg-transparent hover:underline",
                        "justify-start"
                    )}
                >
                    {item.icon}
                    {item.title}
                </Link>
            ))}
        </nav>
    )
}
