"use client"

import { Separator } from "@/components/ui/separator"

import { GitAccountsForm } from "@/components/settings/git-accounts-form"
import { JiraSettingsForm } from "@/components/settings/jira-settings-form"
import { useLanguage } from "@/contexts/language-context"

export default function SettingsPage() {
    const { t } = useLanguage()

    return (
        <div className="space-y-6 p-2 pt-2 md:p-10 md:pb-16">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">{t.settings.title}</h2>
                <p className="text-muted-foreground">
                    {t.settings.subtitle}
                </p>
            </div>
            <Separator className="my-6" />
            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                <aside className="-mx-4 lg:w-1/5">
                    {/* Sidebar for settings if needed */}
                </aside>
                <div className="flex-1 lg:max-w-2xl space-y-10">
                    {/* Git Accounts Section */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium">Git Accounts</h3>
                            <p className="text-sm text-muted-foreground">
                                Connect your GitHub and GitLab accounts to fetch Pull Requests and Merge Requests
                            </p>
                        </div>
                        <Separator />
                        <GitAccountsForm />
                    </div>

                    {/* Jira Integration Section */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium">Jira Integration</h3>
                            <p className="text-sm text-muted-foreground">
                                Connect your Jira Cloud account to analyze bug tickets with AI
                            </p>
                        </div>
                        <Separator />
                        <JiraSettingsForm />
                    </div>
                </div>
            </div>
        </div>
    )
}
