"use client"

import Link from "next/link"
import { Check, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useAuth } from "../providers"

type PlanTier = "free" | "pro" | null

const plans = [
  {
    name: "Free",
    label: "個人向け",
    price: "¥0",
    cadence: "/ 月",
    highlight: "日々の銘柄チェックや学習用途に。",
    description: "まずは操作感を試したい方に最適。主要機能はすべて無料枠で使えます。",
    badgeVariant: "secondary" as const,
    featured: false,
    features: [
      "1日9社までのAI分析（追加視聴で +3社/日）",
      "ダッシュボード比較・メモ保存：無制限",
      "代表者・所在地・資本金などの自動抽出",
      "広告あり（追加枠利用時のみ）",
      "メールサポート（48h以内）",
    ],
  },
  {
    name: "Pro",
    label: "おすすめ",
    price: "¥400",
    cadence: "/ 月",
    highlight: "投資判断やレポート作成を本格的に。",
    description: "業務で使うアナリスト・投資家向け。高速・優先処理と拡張機能を利用できます。",
    badgeVariant: "default" as const,
    featured: true,
    features: [
      "分析回数：無制限（優先処理付き）",
      "株特化AIチャット・インサイト自動更新",
      "CSV / グラフ / 比較ビューのエクスポート",
      "広告なし・カスタムラベル・共有リンク",
      "チャット / メールの優先サポート",
    ],
  },
] as const

const heroStats = [
  {
    label: "無料分析枠",
    value: "毎日9社",
    detail: "動画視聴で +3社/日",
  },
  {
    label: "比較セット保存",
    value: "無制限",
    detail: "ラベル・メモ機能付き",
  },
  {
    label: "AIサマリー言語",
    value: "日本語 / 英語",
    detail: "代表者・所在地も自動取得",
  },
]

const faqs = [
  {
    question: "支払い方法は？",
    answer: "主要なクレジットカード / デビットカードに対応しています。毎月自動更新で、ダッシュボードからいつでもキャンセル可能です。",
  },
  {
    question: "チームで共有できますか？",
    answer: "Pro プランでは保存した比較メモをリンクで共有できます。エンタープライズ契約では SSO や請求書払いにも対応します。",
  },
  {
    question: "AI 分析の上限は変更できますか？",
    answer: "Pro プランの想定を超える利用量でもご相談ください。利用状況に応じたカスタムプランをご提案します。",
  },
]

const glassCardClass =
  "rounded-4xl border border-white/30 bg-white/70 p-8 text-left shadow-[0_30px_90px_rgba(2,6,23,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5"

type CTAConfig = {
  label: string
  href: string
  variant: "default" | "outline" | "secondary"
  disabled?: boolean
}

function resolvePlanCta(planName: string, planTier: PlanTier, loading: boolean, isAuthenticated: boolean): CTAConfig {
  if (loading) {
    return { label: "確認中...", href: "#", disabled: true, variant: "outline" }
  }
  const isPro = planTier === "pro"
  if (planName === "Pro") {
    if (isPro) {
      return { label: "ご利用中", href: "/dashboard", disabled: true, variant: "secondary" }
    }
    if (!isAuthenticated) {
      return { label: "アカウントを作成してアップグレード", href: "/sign-up?redirect=/checkout", variant: "default" }
    }
    return { label: "今すぐアップグレード", href: "/checkout", variant: "default" }
  }
  if (planName === "Free") {
    return isPro
      ? { label: "ダッシュボードへ戻る", href: "/dashboard", variant: "outline" }
      : { label: "無料ではじめる", href: "/dashboard", variant: "outline" }
  }
  return { label: "詳細を見る", href: "/dashboard", variant: "outline" }
}

function HeroButtons({
  planTier,
  loading,
  isAuthenticated,
}: {
  planTier: PlanTier
  loading: boolean
  isAuthenticated: boolean
}) {
  if (loading) {
    return (
      <div className="flex flex-wrap justify-center gap-4">
        <Button size="lg" className="rounded-full px-6 font-semibold" disabled>
          確認中...
        </Button>
        <Button size="lg" variant="outline" className="rounded-full px-6 font-semibold" disabled>
          --
        </Button>
      </div>
    )
  }
  const isPro = planTier === "pro"
  const primaryHref = isPro ? "/dashboard" : isAuthenticated ? "/checkout" : "/sign-up?redirect=/checkout"
  const primaryLabel = isPro
    ? "ダッシュボードを開く"
    : isAuthenticated
      ? "Pro を申し込む"
      : "アカウントを作成してアップグレード"
  return (
    <div className="flex flex-wrap justify-center gap-4">
      <Button size="lg" className="rounded-full px-6 font-semibold" asChild>
        <Link href={primaryHref}>{primaryLabel}</Link>
      </Button>
      <Button size="lg" variant="outline" className="rounded-full px-6 font-semibold" asChild>
        <Link href={isPro ? "/account" : "/dashboard"}>{isPro ? "アカウント設定へ" : "無料で試す"}</Link>
      </Button>
    </div>
  )
}

export function PricingView() {
  const { plan, planLoading, isAuthenticated } = useAuth()
  const isPro = plan === "pro"
  const shouldShowPlans = !planLoading && !isPro

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.85),_rgba(2,6,23,1))]" />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-16 px-6 py-20">
        <section className="text-center">
          <Badge variant="secondary" className="mb-4">
            PLAN & PRICING
          </Badge>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            あなたの投資ワークフローに合わせて拡張
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
            Free プランで基本的な企業比較を体験。優先処理やエクスポート機能が必要になったら、いつでも Pro へアップグレードできます。
          </p>
          <div className="mt-8">
            <HeroButtons planTier={plan ?? null} loading={planLoading} isAuthenticated={isAuthenticated} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {heroStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-white/30 bg-white/60 px-6 py-5 text-left shadow-[0_20px_60px_rgba(2,6,23,0.12)] backdrop-blur-xl dark:border-white/15 dark:bg-white/5"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.detail}</p>
            </div>
          ))}
        </section>

        {shouldShowPlans && (
          <section className="grid gap-8 md:grid-cols-2">
            {plans.map((planCard) => {
              const cta = resolvePlanCta(planCard.name, plan ?? null, planLoading, isAuthenticated)
              return (
                <div key={planCard.name} className="group relative">
                  <div
                    className={cn(
                      glassCardClass,
                      "relative overflow-hidden transition-transform duration-300 ease-out hover:-translate-y-2",
                      "hover:shadow-[0_45px_140px_rgba(15,23,42,0.35)]",
                      planCard.featured &&
                        "border-primary/60 bg-gradient-to-br from-primary/10 via-white/70 to-white/90 dark:from-primary/20 dark:via-white/10 dark:to-white/5",
                    )}
                  >
                    <span className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                      <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_transparent_60%)] mix-blend-screen dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_65%)]" />
                      <span className="absolute -inset-x-10 -top-32 h-40 rotate-6 bg-gradient-to-r from-white/60 via-white/10 to-transparent opacity-70 blur-3xl dark:from-white/20 dark:via-white/5" />
                    </span>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">{planCard.label}</p>
                        <h2 className="mt-1 text-3xl font-semibold">{planCard.name}</h2>
                      </div>
                      <Badge variant={planCard.badgeVariant}>{planCard.featured ? "最も人気" : "エントリー"}</Badge>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">{planCard.highlight}</p>
                    <p className="mt-6 text-4xl font-semibold">
                      {planCard.price}
                      <span className="ml-1 text-base font-medium text-muted-foreground">{planCard.cadence}</span>
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{planCard.description}</p>
                    <Separator className="my-6 border-white/30 dark:border-white/10" />
                    <ul className="space-y-3">
                      {planCard.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-foreground">
                          <span className="mt-0.5 rounded-full bg-primary/15 p-1 text-primary dark:bg-primary/30">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8">
                      {cta.disabled ? (
                        <Button variant={cta.variant} className="w-full rounded-full py-6 text-base font-semibold" disabled>
                          {cta.label}
                        </Button>
                      ) : (
                        <Button
                          asChild
                          variant={cta.variant}
                          className="w-full rounded-full py-6 text-base font-semibold"
                        >
                          <Link href={cta.href}>{cta.label}</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </section>
        )}

        <section className={cn(glassCardClass, "flex flex-col items-center gap-6 text-center")}>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/20 px-4 py-1 text-sm font-semibold text-primary dark:border-white/15 dark:bg-white/5">
            <Sparkles className="h-4 w-4" />
            14日間の Pro トライアル付き
          </div>
          <h3 className="text-2xl font-semibold">まずは既存の比較セットをインポートしてみませんか？</h3>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            CSV やメモをアップロードすれば、AI が代表者・資本金・ロケーションを突き合わせて整理します。トライアル期間中に自動で課金されることはありません。
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 font-semibold"
              disabled={planLoading}
            >
              <Link href={isPro ? "/dashboard" : "/checkout"}>
                {isPro ? "ダッシュボードを開く" : "Pro を始める"}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border border-white/40 bg-transparent px-8 font-semibold text-foreground dark:border-white/20 dark:text-white"
            >
              <a href="mailto:support@nolenn-investment.app">営業と相談する</a>
            </Button>
          </div>
        </section>

        <section>
          <div className="mb-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold">よくある質問</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              料金やサポートに関する疑問はこちらから。その他の質問はサポートまでご連絡ください。
            </p>
          </div>
          <Separator className="mb-6 border-white/20 dark:border-white/10" />
          <div className="space-y-4">
            {faqs.map(({ question, answer }) => (
              <div key={question} className={cn(glassCardClass, "p-6")}>
                <h3 className="text-lg font-semibold">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
