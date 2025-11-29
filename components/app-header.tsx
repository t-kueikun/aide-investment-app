"use client"

import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/app/providers"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export function AppHeader() {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between pl-16 pr-4 sm:pl-22 sm:pr-6">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <Image
            src="/Nollen-logo-1.webp"
            alt="NOLENN"
            width={512}
            height={160}
            className="h-12 w-auto sm:h-14 dark:invert"
            priority
          />
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
