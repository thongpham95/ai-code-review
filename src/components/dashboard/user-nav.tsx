"use client"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "next-auth/react"
import { useEffect, useState } from "react"

interface SessionUser {
    name?: string | null
    email?: string | null
    image?: string | null
}

interface SessionInfo {
    type: "oauth" | "gitlab-pat" | null
    user: SessionUser | null
}

export function UserNav() {
    const [sessionInfo, setSessionInfo] = useState<SessionInfo>({ type: null, user: null })

    useEffect(() => {
        fetch("/api/auth/session-info")
            .then(res => res.json())
            .then(data => setSessionInfo(data))
            .catch(() => { })
    }, [])

    async function handleLogout() {
        if (sessionInfo.type === "gitlab-pat") {
            // Clear PAT session
            await fetch("/api/auth/pat-login", { method: "DELETE" })
            // Clear sessionStorage
            sessionStorage.removeItem("gitlab-pat")
            sessionStorage.removeItem("gitlab-url")
            window.location.href = "/"
        } else {
            // OAuth signout
            signOut({ callbackUrl: "/" })
        }
    }

    const user = sessionInfo.user

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                        <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user?.email || ""}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem>
                        Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        Billing
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        Settings
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
