"use client"
import { SessionProvider } from "next-auth/react"

export const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
    return <SessionProvider>{children}</SessionProvider>
}
