"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
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
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { Loader2, CheckCircle2, XCircle, Wifi, Sparkles } from "lucide-react"

const aiFormSchema = z.object({
    provider: z.string().min(1, {
        message: "Please select an AI provider.",
    }),
    apiKey: z.string().optional(),
    model: z.string().optional(),
    useLocal: z.boolean(),
    localUrl: z.string().url().optional().or(z.literal("")),
    localModel: z.string().optional(),
})

type AiFormValues = z.infer<typeof aiFormSchema>

const defaultValues: Partial<AiFormValues> = {
    provider: "google",
    model: "gemini-2.5-flash",
    apiKey: "",
    useLocal: false,
    localUrl: "http://localhost:11434",
    localModel: "qwen2.5-coder:7b",
}

const PROVIDER_MODELS: Record<string, { value: string; label: string; price: string; badge?: string }[]> = {
    google: [
        { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", price: "$0.10 / $0.40 per 1M tokens", badge: "Cheapest" },
        { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", price: "$0.30 / $2.50 per 1M tokens", badge: "Recommended" },
        { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", price: "$1.25 / $10 per 1M tokens", badge: "Best Quality" },
    ],
    anthropic: [
        { value: "claude-haiku-4-5-20241022", label: "Claude Haiku 4.5", price: "$1.00 / $5.00 per 1M tokens", badge: "Fast" },
        { value: "claude-sonnet-4-5-20241022", label: "Claude Sonnet 4.5", price: "$3.00 / $15.00 per 1M tokens", badge: "Best Quality" },
    ],
    openai: [
        { value: "gpt-4o-mini", label: "GPT-4o Mini", price: "$0.15 / $0.60 per 1M tokens", badge: "Cheapest" },
        { value: "gpt-4o", label: "GPT-4o", price: "$2.50 / $10.00 per 1M tokens" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo", price: "$10.00 / $30.00 per 1M tokens" },
    ],
}

const PROVIDER_INFO: Record<string, { freeTier: string | null; envVar: string }> = {
    google: { freeTier: "Free: ~250 requests/day", envVar: "GOOGLE_GENERATIVE_AI_API_KEY" },
    anthropic: { freeTier: null, envVar: "ANTHROPIC_API_KEY" },
    openai: { freeTier: null, envVar: "OPENAI_API_KEY" },
}

export function AiConfigForm() {
    const [ollamaStatus, setOllamaStatus] = useState<"idle" | "checking" | "running" | "stopped">("idle")
    const [isStarting, setIsStarting] = useState(false)
    const [availableModels, setAvailableModels] = useState<string[]>([])

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
                // Reset form with saved values
                form.reset({
                    ...defaultValues,
                    ...config,
                })
                // If useLocal was true, check Ollama status
                if (config.useLocal) {
                    checkOllamaStatus()
                }
            }
        } catch {
            // Ignore parse errors, use defaults
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function onSubmit(data: AiFormValues) {
        toast("Configuration Saved", {
            description: (
                <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
                    <code className="text-white">{JSON.stringify(data, null, 2)}</code>
                </pre>
            ),
        })
        localStorage.setItem("ai-config", JSON.stringify(data))
    }

    const useLocal = useWatch({ control: form.control, name: "useLocal" })
    const selectedProvider = useWatch({ control: form.control, name: "provider" })

    async function checkOllamaStatus() {
        setOllamaStatus("checking")
        try {
            const res = await fetch("/api/ai/manage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "status" }),
            })
            const data = await res.json()
            if (data.running) {
                setOllamaStatus("running")
                setAvailableModels(data.models?.map((m: { name: string }) => m.name) || [])
                toast.success(`Ollama is running with ${data.models?.length || 0} models`)
            } else {
                setOllamaStatus("stopped")
                toast.info("Ollama is not running")
            }
        } catch {
            setOllamaStatus("stopped")
            toast.error("Cannot reach Ollama")
        }
    }

    async function startOllama() {
        setIsStarting(true)
        const model = form.getValues("localModel") || "codellama"
        try {
            const res = await fetch("/api/ai/manage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "start", model }),
            })
            const data = await res.json()
            if (data.success) {
                toast.success("Ollama started successfully!")
                setOllamaStatus("running")
                // Refresh status to get models
                await checkOllamaStatus()
            } else {
                toast.error(data.error || "Failed to start Ollama")
            }
        } catch {
            toast.error("Failed to start Ollama")
        } finally {
            setIsStarting(false)
        }
    }

    async function stopOllama() {
        try {
            const res = await fetch("/api/ai/manage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "stop" }),
            })
            const data = await res.json()
            toast.success(data.message || "Ollama stopped")
            setOllamaStatus("stopped")
            setAvailableModels([])
        } catch {
            toast.error("Failed to stop Ollama")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="useLocal"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Use Local AI (Ollama)</FormLabel>
                                <FormDescription>
                                    Enable to use a local Ollama instance for privacy.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                        field.onChange(checked)
                                        if (checked) {
                                            checkOllamaStatus()
                                        }
                                    }}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {!useLocal ? (
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="provider"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>AI Provider</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value)
                                            // Auto-select default model for new provider
                                            const models = PROVIDER_MODELS[value]
                                            if (models?.length) {
                                                const defaultModel = models.find(m => m.badge === "Recommended") || models[0]
                                                form.setValue("model", defaultModel.value)
                                            }
                                        }}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a provider" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="google">
                                                <span className="flex items-center gap-2">Google Gemini <span className="text-xs text-green-600 font-medium">Free Tier</span></span>
                                            </SelectItem>
                                            <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                                            <SelectItem value="openai">OpenAI</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {selectedProvider && PROVIDER_INFO[selectedProvider]?.freeTier ? (
                                            <span className="flex items-center gap-1 text-green-600">
                                                <Sparkles className="h-3 w-3" />
                                                {PROVIDER_INFO[selectedProvider].freeTier}
                                            </span>
                                        ) : (
                                            <>API key required. Set <code className="text-xs bg-muted px-1 py-0.5 rounded">{selectedProvider ? PROVIDER_INFO[selectedProvider]?.envVar : ""}</code> in .env.local</>
                                        )}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Model Selection */}
                        {selectedProvider && PROVIDER_MODELS[selectedProvider] && (
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
                                                {PROVIDER_MODELS[selectedProvider].map((m) => (
                                                    <SelectItem key={m.value} value={m.value}>
                                                        <span className="flex items-center gap-2">
                                                            {m.label}
                                                            {m.badge && (
                                                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${m.badge === "Recommended" ? "bg-blue-500/10 text-blue-600" :
                                                                    m.badge === "Cheapest" ? "bg-green-500/10 text-green-600" :
                                                                        m.badge === "Best Quality" ? "bg-purple-500/10 text-purple-600" :
                                                                            m.badge === "Fast" ? "bg-orange-500/10 text-orange-600" :
                                                                                "bg-muted text-muted-foreground"
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
                                            {PROVIDER_MODELS[selectedProvider].find(m => m.value === field.value)?.price || "Select a model"}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="apiKey"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>API Key (Browser-stored override)</FormLabel>
                                    <FormControl>
                                        <Input placeholder={selectedProvider === "google" ? "AIza..." : selectedProvider === "anthropic" ? "sk-ant-..." : "sk-..."} type="password" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Optional. Server uses env variable by default. Only set this to override.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Ollama Status & Controls */}
                        <div className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Wifi className="h-4 w-4" />
                                    <span className="font-medium text-sm">Ollama Status</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {ollamaStatus === "running" && (
                                        <span className="flex items-center gap-1 text-green-500 text-sm">
                                            <CheckCircle2 className="h-3 w-3" /> Running
                                        </span>
                                    )}
                                    {ollamaStatus === "stopped" && (
                                        <span className="flex items-center gap-1 text-red-500 text-sm">
                                            <XCircle className="h-3 w-3" /> Stopped
                                        </span>
                                    )}
                                    {ollamaStatus === "checking" && (
                                        <span className="flex items-center gap-1 text-blue-500 text-sm">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={checkOllamaStatus} disabled={ollamaStatus === "checking"}>
                                    Check Status
                                </Button>
                                {ollamaStatus !== "running" && (
                                    <Button type="button" size="sm" onClick={startOllama} disabled={isStarting}>
                                        {isStarting ? (
                                            <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Starting...</>
                                        ) : (
                                            "Auto-Start Ollama"
                                        )}
                                    </Button>
                                )}
                                {ollamaStatus === "running" && (
                                    <Button type="button" variant="destructive" size="sm" onClick={stopOllama}>
                                        Stop Ollama
                                    </Button>
                                )}
                            </div>

                            {availableModels.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                    Available: {availableModels.join(", ")}
                                </div>
                            )}
                        </div>

                        <FormField
                            control={form.control}
                            name="localUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ollama URL</FormLabel>
                                    <FormControl>
                                        <Input placeholder="http://localhost:11434" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        The URL of your running Ollama instance.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="localModel"
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
                                            <SelectItem value="qwen2.5-coder:7b">Qwen 2.5 Coder 7B</SelectItem>
                                            <SelectItem value="codellama:7b">CodeLlama 7B</SelectItem>
                                            <SelectItem value="llama3:8b">Llama 3 8B</SelectItem>
                                            <SelectItem value="mistral:7b">Mistral 7B</SelectItem>
                                            <SelectItem value="deepseek-coder:6.7b">DeepSeek Coder 6.7B</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        The model will be auto-pulled if not available locally.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
                <Button type="submit">Save Configuration</Button>
            </form>
        </Form>
    )
}
