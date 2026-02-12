"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useEffect } from "react"
import { Sparkles } from "lucide-react"

const aiFormSchema = z.object({
    model: z.string().min(1, {
        message: "Please select a model.",
    }),
    language: z.string().optional(),
})

type AiFormValues = z.infer<typeof aiFormSchema>

const defaultValues: Partial<AiFormValues> = {
    model: "gemini-2.5-flash",
    language: "en",
}

const GEMINI_MODELS = [
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", price: "$0.10 / $0.40 per 1M tokens", badge: "Cheapest" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", price: "$0.30 / $2.50 per 1M tokens", badge: "Recommended" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", price: "$1.25 / $10 per 1M tokens", badge: "Best Quality" },
]

export function AiConfigForm() {
    const form = useForm<AiFormValues>({
        resolver: zodResolver(aiFormSchema),
        defaultValues,
        mode: "onChange",
    })

    // Load saved config from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem("ai-config")
            if (saved) {
                const config = JSON.parse(saved)
                if (config.model) {
                    form.setValue("model", config.model)
                }
                if (config.language) {
                    form.setValue("language", config.language)
                }
            }
        } catch {
            // Ignore parse errors, use defaults
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function onSubmit(data: AiFormValues) {
        toast.success("Configuration saved!")
        localStorage.setItem("ai-config", JSON.stringify(data))
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Provider: Google Gemini (fixed) */}
                <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-sm">Google Gemini</span>
                        <span className="text-xs text-green-600 font-medium bg-green-500/10 px-1.5 py-0.5 rounded-full">Free Tier</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Free: ~250 requests/day. Set <code className="bg-muted px-1 py-0.5 rounded">GOOGLE_GENERATIVE_AI_API_KEY</code> in .env.local
                    </p>
                </div>

                {/* Default Language Selection */}
                <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Default AI Language</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a language" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="en">
                                        <span className="flex items-center gap-2">
                                            <span className="text-base">🇺🇸</span> English
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="vi">
                                        <span className="flex items-center gap-2">
                                            <span className="text-base">🇻🇳</span> Tiếng Việt
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                The default language for AI code review feedback.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Model Selection */}
                <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Model</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a model" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {GEMINI_MODELS.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>
                                            <span className="flex items-center gap-2">
                                                {m.label}
                                                {m.badge && (
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${m.badge === "Recommended" ? "bg-blue-500/10 text-blue-600" :
                                                        m.badge === "Cheapest" ? "bg-green-500/10 text-green-600" :
                                                            "bg-purple-500/10 text-purple-600"
                                                        }`}>
                                                        {m.badge}
                                                    </span>
                                                )}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                {GEMINI_MODELS.find(m => m.value === field.value)?.price || "Select a model"}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit">Save Configuration</Button>
            </form>
        </Form>
    )
}
