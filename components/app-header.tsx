"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/app/providers"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/dashboard", label: "ダッシュボード", description: "比較・ウォッチリスト" },
  { href: "/pricing", label: "プラン", description: "Free / Pro の違い" },
  { href: "/checkout", label: "アップグレード", description: "決済と請求" },
]

export function AppHeader() {
  const pathname = usePathname()
  const { user, plan, planLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const normalizedPlan = typeof plan === "string" ? plan.toLowerCase() : plan
  const isPro = normalizedPlan === "pro"
  const showPlanCta = !planLoading && !isPro
  const filteredNavLinks = navLinks.filter((link) => {
    if (user && link.href === "/dashboard") {
      return false
    }
    if (isPro && (link.href === "/pricing" || link.href === "/checkout")) {
      return false
    }
    return true
  })

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-foreground">
            <span className="text-base font-semibold tracking-tight">AIDE</span>
            <span className="text-xs text-muted-foreground">AI Insights</span>
          </Link>
          <nav className="hidden items-center gap-1.5 lg:flex">
            {filteredNavLinks.map((link) => {
              const isActive = pathname?.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-full border border-transparent px-3 py-1.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "border-primary/30 bg-primary/5 text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {link.label}
                  <span className="ml-2 hidden text-[11px] text-muted-foreground xl:inline">{link.description}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1">
            <ThemeToggle />
            <span className="text-xs text-muted-foreground">テーマ</span>
          </div>
          {showPlanCta && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing">プランを見る</Link>
            </Button>
          )}
          {user ? (
            <>
              <Button size="sm" className="shadow-[0_10px_30px_rgba(37,99,235,0.35)]" asChild>
                <Link href="/dashboard">ダッシュボード</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/account">アカウント設定</Link>
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" className="shadow-[0_10px_30px_rgba(37,99,235,0.35)]" asChild>
                <Link href="/sign-up">無料で試す</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/sign-in">ログイン</Link>
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">メニューを開く</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-6">
              <div className="pt-2">
                <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 text-foreground">
                  <span className="text-base font-semibold tracking-tight">AIDE</span>
                  <span className="text-xs text-muted-foreground">AI Insights</span>
                </Link>
              </div>
              <div className="flex flex-col gap-4">
                {filteredNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-2xl border border-border/60 px-4 py-3 text-sm font-semibold text-foreground"
                  >
                    <div>{link.label}</div>
                    <p className="text-xs text-muted-foreground">{link.description}</p>
                  </Link>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-2">
                <span className="text-sm font-medium text-foreground">テーマ</span>
                <ThemeToggle />
              </div>
              <div className="flex flex-col gap-3">
                {isPro ? (
                  <Badge variant="outline" className="w-fit">
                    Pro プラン
                  </Badge>
                ) : (
                  <Button variant="outline" onClick={() => setOpen(false)} asChild>
                    <Link href="/pricing">プランを見る</Link>
                  </Button>
                )}
                {user ? (
                  <>
                    <Button onClick={() => setOpen(false)} asChild>
                      <Link href="/dashboard">ダッシュボード</Link>
                    </Button>
                    <Button variant="outline" onClick={() => setOpen(false)} asChild>
                      <Link href="/account">アカウント設定</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => setOpen(false)} asChild>
                      <Link href="/sign-up">無料で試す</Link>
                    </Button>
                    <Button variant="outline" onClick={() => setOpen(false)} asChild>
                      <Link href="/sign-in">ログイン</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
