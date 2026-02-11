import { Separator } from "@/components/ui/separator"
import { AiConfigForm } from "@/components/settings/ai-config-form"

export default function SettingsPage() {
    return (
        <div className="space-y-6 p-10 pb-16 md:block">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">
                    Manage your account settings and AI preferences.
                </p>
            </div>
            <Separator className="my-6" />
            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                <aside className="-mx-4 lg:w-1/5">
                    {/* Sidebar for settings if needed */}
                </aside>
                <div className="flex-1 lg:max-w-2xl">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium">AI Configuration</h3>
                            <p className="text-sm text-muted-foreground">
                                Configure which AI model and provider to use for code reviews.
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
