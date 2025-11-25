"use client"

import Link from "next/link"
import { useAuth } from "@/app/providers"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export function AppHeader() {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <span className="text-base font-semibold tracking-tight">AIDE</span>
          <span className="text-xs text-muted-foreground">Insights</span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button size="sm" asChild>
                <Link href="/dashboard">ダッシュボード</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/account">アカウント</Link>
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" asChild>
                <Link href="/sign-up">無料で試す</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/sign-in">ログイン</Link>
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
