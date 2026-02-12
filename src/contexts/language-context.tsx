"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { dictionaries, type Language, type Dictionary } from "@/lib/dictionaries"

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: Dictionary
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>("en")

    useEffect(() => {
        const saved = localStorage.getItem("app-language") as Language | null
        if (saved && (saved === "en" || saved === "vi")) {
            setLanguageState(saved)
        }
    }, [])

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang)
        localStorage.setItem("app-language", lang)
    }, [])

    const t = dictionaries[language]

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error("useLanguage must be used within LanguageProvider")
    }
    return context
}
