"use client"

import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { Languages } from "lucide-react"

export function LanguageToggle() {
    const { language, setLanguage } = useLanguage()

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setLanguage(language === "en" ? "vi" : "en")}
            title={language === "en" ? "Chuyển sang Tiếng Việt" : "Switch to English"}
            className="relative"
        >
            <Languages className="h-[1.2rem] w-[1.2rem]" />
            <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold leading-none bg-primary text-primary-foreground rounded-sm px-0.5">
                {language === "en" ? "EN" : "VI"}
            </span>
            <span className="sr-only">Toggle language</span>
        </Button>
    )
}
