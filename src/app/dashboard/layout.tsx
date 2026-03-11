import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { UserNav } from "@/components/dashboard/user-nav"
import { ModeToggle } from "@/components/mode-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { TokenUsageBadge } from "@/components/dashboard/token-usage-badge"
import Link from "next/link"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col space-y-4 md:space-y-6">
            <header className="sticky top-0 z-40 border-b bg-background">
                <div className="container flex h-14 md:h-16 items-center justify-between py-2 md:py-4 px-4 md:px-8">
                    <div className="flex items-center gap-2 md:gap-10">
                        <MobileNav />
                        <Link className="flex items-center space-x-2" href="/">
                            <span className="font-bold text-sm md:text-base">AI Code Review</span>
                        </Link>
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-4">
                        <TokenUsageBadge />
                        <LanguageToggle />
                        <ModeToggle />
                        <UserNav />
                    </div>
                </div>
            </header>
            <div className="container grid flex-1 gap-4 md:gap-12 md:grid-cols-[200px_1fr] px-4 md:px-8">
                <aside className="hidden w-[200px] flex-col md:flex">
                    <SidebarNav />
                </aside>
                <main className="flex w-full flex-1 flex-col overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    )
}
