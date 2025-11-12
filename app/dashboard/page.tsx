"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "../providers"
import { firestore } from "@/lib/firebase"
import { cn } from "@/lib/utils"

interface CompanyInsight {
  company: string
  ticker: string
  representative: string
  location: string
  capital: string
  lastUpdated?: string
  strengths: string[]
  risks: string[]
  outlook: string[]
  score: number
  commentary: string
  logo?: string
  marketPrice?: number
  marketChangePercent?: number
  currency?: string
  marketTime?: string | null
  industry?: string
  sector?: string
  website?: string
  employees?: number
  summary?: string
}

interface DashboardSettings {
  defaultTickers: string
  preferredMarket: "jp" | "us"
}

const defaultDashboardSettings: DashboardSettings = {
  defaultTickers: "",
  preferredMarket: "jp",
}

const HISTORY_STORAGE_KEY = "aide-dashboard-ticker-history"

interface HistoryEntry {
  ticker: string
  company?: string
}

function ensureHttps(url?: string | null): string | undefined {
  if (typeof url !== "string") return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [tickers, setTickers] = useState(["", "", ""])
  const [companies, setCompanies] = useState<(CompanyInsight | null)[]>([null, null, null])
  const [loading, setLoading] = useState([false, false, false])
  const [errors, setErrors] = useState(["", "", ""])
  const [hasAppliedSettings, setHasAppliedSettings] = useState(false)
  const [settings, setSettings] = useState<DashboardSettings>(defaultDashboardSettings)
  const [hasFetchedSettings, setHasFetchedSettings] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const hasQueryParam = Boolean(searchParams.get("tickers"))
  const showSettingsSummary = !hasQueryParam && settings.defaultTickers.trim().length > 0

  const tickersRef = useRef(tickers)
  useEffect(() => {
    tickersRef.current = tickers
  }, [tickers])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return
      const sanitized = parsed
        .map((item): HistoryEntry | null => {
          if (typeof item === "string") {
            const ticker = item.trim()
            return ticker.length > 0 ? { ticker } : null
          }
          if (item && typeof item === "object") {
            const ticker =
              typeof item.ticker === "string" && item.ticker.trim().length > 0 ? item.ticker.trim() : undefined
            if (!ticker) return null
            const company =
              typeof item.company === "string" && item.company.trim().length > 0 ? item.company.trim() : undefined
            return { ticker, company }
          }
          return null
        })
        .filter((entry): entry is HistoryEntry => entry !== null)
      if (sanitized.length > 0) {
        setHistory(sanitized.slice(0, 20))
      }
    } catch (error) {
      console.error("Failed to load ticker history:", error)
    }
  }, [])

  const recordHistory = useCallback((ticker: string, company?: string | null): void => {
    const trimmed = ticker.trim()
    if (!trimmed) return
    const normalizedCompany = company && company.trim().length > 0 ? company.trim() : undefined
    setHistory((prev) => {
      const nextEntries = [
        { ticker: trimmed, company: normalizedCompany },
        ...prev.filter((item) => item.ticker !== trimmed),
      ].slice(0, 20)
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextEntries))
        } catch (error) {
          console.error("Failed to save ticker history:", error)
        }
      }
      return nextEntries
    })
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const redirect = encodeURIComponent("/dashboard")
      router.replace(`/sign-in?redirect=${redirect}`)
    }
  }, [authLoading, router, user])

  const loadCompanyInfo = useCallback(async (ticker: string, targetIndex: number): Promise<void> => {
    const symbol = ticker.trim()
    if (!symbol) return
    try {
      const response = await fetch(`/api/company-info?ticker=${encodeURIComponent(symbol)}`)
      if (!response.ok) {
        console.warn("会社情報の取得に失敗しました:", response.status)
        return
      }
      const info = await response.json()
      const websiteFromInfo = typeof info.website === "string" ? ensureHttps(info.website) : undefined
      const nameFromInfo =
        typeof info.longName === "string" && info.longName.trim().length > 0
          ? info.longName.trim()
          : typeof info.shortName === "string" && info.shortName.trim().length > 0
            ? info.shortName.trim()
            : undefined
      setCompanies((prev) =>
        prev.map((company, index) => {
          if (index !== targetIndex || company === null) return company
          const fallbackWebsite = ensureHttps(company.website) ?? company.website
          const existingTicker = company.ticker?.trim()
          const existingName = company.company?.trim()
          const shouldReplaceName =
            !existingName ||
            (existingTicker && existingName.toLowerCase() === existingTicker.toLowerCase())
          return {
            ...company,
            ticker: typeof info.ticker === "string" && info.ticker.trim().length > 0 ? info.ticker.trim() : company.ticker,
            company: shouldReplaceName && nameFromInfo ? nameFromInfo : company.company,
            marketPrice: typeof info.marketPrice === "number" ? info.marketPrice : company.marketPrice,
            marketChangePercent:
              typeof info.marketChangePercent === "number" ? info.marketChangePercent : company.marketChangePercent,
            currency: typeof info.currency === "string" ? info.currency : company.currency,
            marketTime: typeof info.marketTime === "string" ? info.marketTime : company.marketTime,
            industry: typeof info.industry === "string" ? info.industry : company.industry,
            sector: typeof info.sector === "string" ? info.sector : company.sector,
            website: websiteFromInfo ?? fallbackWebsite,
            employees: typeof info.employees === "number" ? info.employees : company.employees,
            summary: typeof info.summary === "string" ? info.summary : company.summary,
            location:
              company.location?.trim().length
                ? company.location
                : typeof info.headquarters === "string"
                  ? info.headquarters
                  : company.location,
          }
        }),
      )
    } catch (error) {
      console.error("Failed to fetch company info:", error)
    }
  }, [])

  const analyzeCompany = useCallback(async (index: number, providedTicker?: string) => {
    const currentTickers = tickersRef.current
    const ticker = (providedTicker ?? currentTickers[index]).trim()
    if (!ticker) return

    setLoading((prev) => prev.map((l, i) => (i === index ? true : l)))
    setErrors((prev) => prev.map((e, i) => (i === index ? "" : e)))

    try {
      const response = await fetch(`/api/insights?ticker=${encodeURIComponent(ticker)}`)

      if (!response.ok) {
        throw new Error("分析に失敗しました")
      }

      const data = await response.json()

      setCompanies((prev) => prev.map((c, i) => (i === index ? data : c)))
      const recordedTicker =
        typeof data.ticker === "string" && data.ticker.trim().length > 0 ? data.ticker.trim() : ticker
      const recordedCompany =
        typeof data.company === "string" && data.company.trim().length > 0 ? data.company.trim() : undefined
      recordHistory(recordedTicker, recordedCompany)
      void loadCompanyInfo(recordedTicker, index)
    } catch (err) {
      setErrors((prev) =>
        prev.map((e, i) => (i === index ? (err instanceof Error ? err.message : "分析に失敗しました") : e)),
      )
    } finally {
      setLoading((prev) => prev.map((l, i) => (i === index ? false : l)))
    }
  }, [loadCompanyInfo, recordHistory])

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600"
    return "text-orange-500"
  }

  useEffect(() => {
    if (hasAppliedSettings) return
    const preset = searchParams.get("tickers")
    if (!preset) return

    const tokens = preset
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean)
      .slice(0, 3)

    if (tokens.length === 0) return

    setTickers((prev) => {
      const next = [...prev]
      tokens.forEach((ticker, index) => {
        next[index] = ticker
      })
      for (let i = tokens.length; i < next.length; i += 1) {
        next[i] = ""
      }
      return next
    })

    tokens.forEach((ticker, index) => {
      analyzeCompany(index, ticker)
    })
    setHasAppliedSettings(true)
  }, [analyzeCompany, hasAppliedSettings, searchParams])

  useEffect(() => {
    let cancelled = false
    const loadSettings = async () => {
      if (!user || hasFetchedSettings) return
      try {
        const ref = doc(firestore, "userSettings", user.uid)
        const snapshot = await getDoc(ref)
        if (!snapshot.exists()) {
          if (!cancelled) {
            setSettings(defaultDashboardSettings)
            setHasFetchedSettings(true)
          }
          return
        }
        if (cancelled) return
        const data = snapshot.data()
        const merged: DashboardSettings = {
          defaultTickers:
            typeof data.defaultTickers === "string" ? data.defaultTickers : defaultDashboardSettings.defaultTickers,
          preferredMarket:
            data.preferredMarket === "us" || data.preferredMarket === "jp"
              ? data.preferredMarket
              : defaultDashboardSettings.preferredMarket,
        }
        setSettings(merged)

        const tokens = merged.defaultTickers
          .split(",")
          .map((token) => token.trim())
          .filter(Boolean)
          .slice(0, 3)

        if (tokens.length > 0 && !hasAppliedSettings) {
          setTickers((prev) => {
            const next = [...prev]
            tokens.forEach((ticker, index) => {
              next[index] = ticker
            })
            for (let i = tokens.length; i < next.length; i += 1) {
              next[i] = ""
            }
            return next
          })

          tokens.forEach((ticker, index) => {
            analyzeCompany(index, ticker)
          })
          setHasAppliedSettings(true)
        }
        setHasFetchedSettings(true)
      } catch (error) {
        console.error("Failed to load dashboard settings:", error)
        setHasFetchedSettings(true)
      }
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [analyzeCompany, hasAppliedSettings, hasFetchedSettings, user])

  const validCompanies = companies.filter((c): c is CompanyInsight => c !== null)

  const suggestedCompanies = useMemo(() => {
    const jp = [
      { ticker: "7203.T", name: "トヨタ自動車" },
      { ticker: "6758.T", name: "ソニーグループ" },
      { ticker: "8035.T", name: "東京エレクトロン" },
      { ticker: "6861.T", name: "キーエンス" },
      { ticker: "8306.T", name: "三菱UFJフィナンシャル・グループ" },
      { ticker: "9983.T", name: "ファーストリテイリング" },
    ]
    const us = [
      { ticker: "AAPL", name: "Apple" },
      { ticker: "MSFT", name: "Microsoft" },
      { ticker: "GOOGL", name: "Alphabet" },
      { ticker: "AMZN", name: "Amazon" },
      { ticker: "NVDA", name: "NVIDIA" },
    ]
    return settings.preferredMarket === "us" ? us : jp
  }, [settings.preferredMarket])

  const handleSuggestedSelect = useCallback(
    (ticker: string) => {
      const targetIndex = tickers.findIndex((value) => !value.trim())
      const indexToUse = targetIndex === -1 ? 0 : targetIndex
      setTickers((prev) => prev.map((value, idx) => (idx === indexToUse ? ticker : value)))
      analyzeCompany(indexToUse, ticker)
    },
    [analyzeCompany, tickers],
  )

  const primaryPanelClass =
    "rounded-4xl border border-white/30 bg-white/70 text-foreground shadow-[0_30px_80px_rgba(2,6,23,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:text-white"
  const secondaryPanelClass =
    "rounded-3xl border border-white/25 bg-white/55 text-foreground shadow-[0_20px_60px_rgba(2,6,23,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-white"
  const inputClasses =
    "h-12 rounded-2xl border border-white/50 bg-white/80 text-foreground placeholder:text-muted-foreground shadow-[inset_0_1px_2px_rgba(2,6,23,0.18)] transition focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-white/60"
  const companyCardClass =
    "rounded-4xl border border-white/35 bg-white/75 text-foreground shadow-[0_30px_80px_rgba(2,6,23,0.15)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:text-white"
  const emptyCompanyCardClass =
    "rounded-4xl border border-dashed border-white/40 bg-white/20 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-2xl dark:border-white/15 dark:bg-white/5 dark:text-white/50"
  const dividerClass = "my-6 w-full border-t border-white/60 dark:border-white/10"
  const bulletClass = "absolute left-0 top-2 h-1.5 w-1.5 rounded-full bg-slate-400/70 dark:bg-white/60"

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-sm text-slate-200">
          <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ログイン状態を確認しています…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors dark:bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.95),rgba(2,6,23,1))]">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
        <p className="text-xs uppercase tracking-[0.5em] text-slate-500 dark:text-slate-300">AIDE DASHBOARD</p>
        <h2 className="mt-4 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl dark:text-white">
          企業インサイトを、並べて比較する。
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 dark:text-slate-200/80">
          証券コードを入力すると、AI が代表者・所在地・資本金を含む要約を即座に生成します。
          最大 3 社を同時に並べ、投資判断に役立つ視点を整えましょう。
        </p>
        {showSettingsSummary && (
          <p className="mt-6 text-sm text-muted-foreground">
            保存済みの比較セット：
            <span className="ml-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-primary dark:bg-white/10 dark:text-white">
              {settings.defaultTickers.replace(/,/g, " / ")}
            </span>
          </p>
        )}

        <div className={cn("mx-auto mt-10 max-w-5xl p-6", primaryPanelClass)}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="space-y-3">
                <Input
                  type="text"
                  placeholder="例：9831.T または ヤマダホールディングス"
                  value={tickers[index]}
                  onChange={(e) => setTickers((prev) => prev.map((t, i) => (i === index ? e.target.value : t)))}
                  onKeyDown={(e) => e.key === "Enter" && analyzeCompany(index)}
                  className={cn(inputClasses)}
                  disabled={loading[index]}
                />
                <Button
                  onClick={() => analyzeCompany(index)}
                  disabled={loading[index] || !tickers[index].trim()}
                  className="h-11 w-full rounded-2xl"
                >
                  {loading[index] ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                      分析中
                    </span>
                  ) : (
                    "分析"
                  )}
                </Button>
                {errors[index] && <p className="text-xs text-red-500 dark:text-red-300">{errors[index]}</p>}
              </div>
            ))}
          </div>
        <div className={cn("mt-6 p-6 text-left", secondaryPanelClass)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">おすすめセット</p>
              <p className="mt-1 text-xs text-muted-foreground">クリックすると空枠にティッカーが差し込まれます。</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-input/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {settings.preferredMarket === "us" ? "米国市場を優先表示中" : "国内市場を優先表示中"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {suggestedCompanies.map((company) => (
              <Button
                key={company.ticker}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-input px-4 py-2 text-xs font-medium text-foreground/80"
                onClick={() => handleSuggestedSelect(company.ticker)}
              >
                {company.name}
              </Button>
            ))}
          </div>
        </div>
        {history.length > 0 && (
          <div className={cn("mt-6 p-6 text-left", secondaryPanelClass)}>
            <p className="text-sm font-semibold">最近の入力</p>
            <p className="mt-1 text-xs text-muted-foreground">過去に分析したティッカーから再分析できます。</p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                {history.map((entry) => (
                  <Button
                    key={`${entry.ticker}-${entry.company ?? "unknown"}`}
                    variant="outline"
                    size="sm"
                    className="rounded-full border-input px-3 py-1 text-foreground/80"
                    onClick={() => handleSuggestedSelect(entry.ticker)}
                  >
                    <span className="font-medium">{entry.ticker}</span>
                    {entry.company && <span className="ml-2 text-muted-foreground">{entry.company}</span>}
                  </Button>
                ))}
              </div>
          </div>
        )}
        </div>
      </section>

      {validCompanies.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl px-6 pb-24">
          <div className="grid grid-cols-1 items-stretch gap-10 md:grid-cols-3">
            {companies.map((company, index) => {
              const websiteHref = company && company.website ? ensureHttps(company.website) ?? company.website : undefined
              const websiteLabel =
                company && company.website
                  ? company.website.replace(/^https?:\/\//i, "") || company.website
                  : websiteHref
              const tickerLabel = company?.ticker?.trim()
              const companyName = company?.company?.trim()
              const badgeClass = company
                ? "border-white/50 bg-white/70 text-foreground shadow-sm backdrop-blur dark:border-white/20 dark:bg-white/10 dark:text-white"
                : "border-dashed border-white/40 bg-white/40 text-muted-foreground dark:border-white/20 dark:bg-white/5 dark:text-white/50"

              return (
                <div key={index} className="flex h-full flex-col gap-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className={`inline-flex rounded-full border px-6 py-1 text-sm font-semibold ${badgeClass}`}>
                      {company ? tickerLabel || "ティッカー未取得" : "未入力"}
                    </div>
                    {company && (
                      <div className="text-lg font-semibold text-foreground">{companyName || "企業名情報なし"}</div>
                    )}
                  </div>
                  <div className={cn("flex h-full w-full flex-col px-8 py-10", company ? companyCardClass : emptyCompanyCardClass)}>
                    {company ? (
                      <div className="flex flex-col items-center gap-8">
                        <div className="flex h-24 w-full items-center justify-center">
                        {company.logo ? (
                          <div className="relative h-16 w-40">
                            <Image
                              src={company.logo}
                              alt={`${company.company}のロゴ`}
                              fill
                              className="object-contain"
                              sizes="160px"
                              unoptimized
                            />
                          </div>
                        ) : (
                            <span className="text-sm text-muted-foreground">ロゴが見つかりませんでした</span>
                          )}
                        </div>

                        <hr className={dividerClass} />

                        <div className="w-full space-y-4 text-left text-sm leading-6 text-foreground">
                          {company.lastUpdated && (
                            <div className="text-xs text-muted-foreground">更新時点: {company.lastUpdated}</div>
                          )}
                          <div>
                            <span className="font-semibold">ティッカー：</span>
                            {tickerLabel || "情報未取得"}
                          </div>
                          <div>
                            <span className="font-semibold">企業名：</span>
                            {companyName || "情報未取得"}
                          </div>
                          <div>
                            <span className="font-semibold">代表者名：</span>
                            {company.representative}
                          </div>
                          <div>
                            <span className="font-semibold">所在地：</span>
                            {company.location}
                          </div>
                          <div>
                            <span className="font-semibold">資本金：</span>
                            {company.capital}
                          </div>
                          {(typeof company.marketPrice === "number" || typeof company.marketChangePercent === "number") && (
                            <div>
                              <span className="font-semibold">株価：</span>
                              {typeof company.marketPrice === "number"
                                ? `${company.marketPrice.toLocaleString()}${company.currency ? ` ${company.currency}` : ""}`
                                : "情報未取得"}
                              {typeof company.marketChangePercent === "number" && (
                                <span
                                  className={`ml-2 font-medium ${
                                    company.marketChangePercent >= 0 ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  {company.marketChangePercent >= 0 ? "+" : ""}
                                  {company.marketChangePercent.toFixed(2)}%
                                </span>
                              )}
                              {company.marketTime && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {new Date(company.marketTime).toLocaleString("ja-JP")}
                                  時点
                                </span>
                              )}
                            </div>
                          )}
                          {(company.industry || company.sector) && (
                            <div>
                              <span className="font-semibold">業種：</span>
                              {[company.industry, company.sector].filter(Boolean).join(" / ")}
                            </div>
                          )}
                          {typeof company.employees === "number" && (
                            <div>
                              <span className="font-semibold">従業員数：</span>
                              {company.employees.toLocaleString()} 人
                            </div>
                          )}
                          {websiteHref && (
                            <div>
                              <span className="font-semibold">公式サイト：</span>
                              <a
                                href={websiteHref}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 underline underline-offset-2 break-all"
                              >
                                {websiteLabel ?? websiteHref}
                              </a>
                            </div>
                          )}
                          {company.summary && (
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{company.summary}</p>
                          )}
                        </div>

                        <hr className={dividerClass} />

                        <div className="w-full space-y-6 text-left">
                          <section>
                            <h5 className="mb-3 text-base font-semibold text-foreground">強み</h5>
                            <ul className="space-y-2 text-sm leading-6 text-foreground">
                              {company.strengths.map((strength, idx) => (
                                <li key={idx} className="relative pl-4">
                                  <span className={bulletClass} />
                                  {strength}
                                </li>
                              ))}
                            </ul>
                          </section>

                          <section>
                            <h5 className="mb-3 text-base font-semibold text-foreground">課題</h5>
                            <ul className="space-y-2 text-sm leading-6 text-foreground dark:text-white/80">
                              {company.risks.map((risk, idx) => (
                                <li key={idx} className="relative pl-4">
                                  <span className={bulletClass} />
                                  {risk}
                                </li>
                              ))}
                            </ul>
                          </section>

                          <section>
                            <h5 className="mb-3 text-base font-semibold text-foreground">見通し</h5>
                            <ul className="space-y-2 text-sm leading-6 text-foreground dark:text-white/80">
                              {company.outlook.map((outlook, idx) => (
                                <li key={idx} className="relative pl-4">
                                  <span className={bulletClass} />
                                  {outlook}
                                </li>
                              ))}
                            </ul>
                          </section>
                        </div>

                        <hr className={dividerClass} />

                        <div className="mt-auto w-full text-center">
                          <p className="text-base font-semibold text-foreground">総合スコア</p>
                          <p className={`text-2xl font-bold ${getScoreColor(company.score)}`}>
                            {company.score}
                            <span className="ml-1 text-sm font-medium text-muted-foreground">/ 100</span>
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">{company.commentary}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-sm leading-6">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-white/40 dark:border-white/15">
                          <span className="text-muted-foreground">＋</span>
                        </div>
                        <p>企業を入力すると情報が表示されます</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {validCompanies.length === 0 && (
        <div className="px-6 py-24 text-center text-slate-600 dark:text-white/80">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 dark:border-white/30">
            <svg className="h-10 w-10 text-slate-400 dark:text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="mb-3 text-2xl font-semibold text-slate-900 dark:text-white">企業を入力して比較を開始</h3>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-500 dark:text-white/70">
            証券コードを入力すると、AIが企業分析を生成します。
          </p>
        </div>
      )}
    </div>
  )
}
