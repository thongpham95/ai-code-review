"use client"

import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Languages, Check } from "lucide-react"

export function LanguageToggle() {
    const { language, setLanguage } = useLanguage()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                    <Languages className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
                    <span className="absolute -bottom-1 -right-1 text-[10px] font-bold leading-none bg-background text-foreground border rounded-[3px] px-0.5 shadow-sm">
                        {language === "en" ? "EN" : "VI"}
                    </span>
                    <span className="sr-only">Toggle language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage("en")} className="gap-2 cursor-pointer">
                    <span className="text-base">🇺🇸</span>
                    <span className={`flex-1 ${language === "en" ? "font-bold" : ""}`}>English</span>
                    {language === "en" && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("vi")} className="gap-2 cursor-pointer">
                    <span className="text-base">🇻🇳</span>
                    <span className={`flex-1 ${language === "vi" ? "font-bold" : ""}`}>Tiếng Việt</span>
                    {language === "vi" && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
