"use client"

import { Separator } from "@/components/ui/separator"
import { AiConfigForm } from "@/components/settings/ai-config-form"
import { useLanguage } from "@/contexts/language-context"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle } from "lucide-react"

interface ProviderStatus {
    available: boolean
    label: string
}

export default function SettingsPage() {
    const { t } = useLanguage()
    const [providers, setProviders] = useState<Record<string, ProviderStatus>>({})

    useEffect(() => {
        async function fetchProviders() {
            try {
                const res = await fetch("/api/ai/providers")
                if (res.ok) {
                    const data = await res.json()
                    setProviders(data.providers || {})
                }
            } catch (error) {
                console.error("Failed to fetch providers:", error)
            }
        }
        fetchProviders()
    }, [])

    return (
        <div className="space-y-6 p-2 pt-2 md:p-10 md:pb-16">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">{t.settings.title}</h2>
                <p className="text-muted-foreground">
                    {t.settings.subtitle}
                </p>
            </div>
            <Separator className="my-6" />

            {/* Server API Key Status */}
            {Object.keys(providers).length > 0 && (
                <div className="rounded-lg border p-4 bg-muted/30">
                    <h4 className="text-sm font-medium mb-3">Server API Keys</h4>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(providers).map(([key, provider]) => (
                            <div key={key} className="flex items-center gap-2">
                                {provider.available ? (
                                    <Badge variant="outline" className="gap-1 bg-green-500/10 border-green-500/30 text-green-600">
                                        <CheckCircle2 className="h-3 w-3" />
                                        {provider.label}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="gap-1 bg-red-500/5 border-red-500/20 text-red-400">
                                        <XCircle className="h-3 w-3" />
                                        {provider.label}
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        {t.settings.aiConfigDesc}
                    </p>
                </div>
            )}

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                <aside className="-mx-4 lg:w-1/5">
                    {/* Sidebar for settings if needed */}
                </aside>
                <div className="flex-1 lg:max-w-2xl">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium">{t.settings.aiConfig}</h3>
                            <p className="text-sm text-muted-foreground">
                                {t.settings.aiConfigDesc}
                            </p>
                        </div>
                        <Separator />
                        <AiConfigForm />
                    </div>
                </div>
            </div>
        </div>
    )
}
