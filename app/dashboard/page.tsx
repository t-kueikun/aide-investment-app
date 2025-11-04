"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { doc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "../providers"
import { firestore } from "@/lib/firebase"

interface CompanyInsight {
  company: string
  ticker: string
  founded: string
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
  const { user } = useAuth()
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

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-semibold text-gray-900">
            AIDE
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/account"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                title="アカウント設定"
              >
                {user.displayName?.slice(0, 2) ?? user.email?.slice(0, 2)?.toUpperCase() ?? "AI"}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="font-medium" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button className="rounded-full font-medium" asChild>
                <Link href="/sign-up">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h2 className="text-5xl font-semibold text-gray-900 mb-4">企業を比較する。</h2>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          証券コードを入力して、AIによる投資判断材料を並べて比較できます。
        </p>
        {showSettingsSummary && (
          <p className="mb-10 text-sm text-gray-500">
            保存済みの比較セット：{" "}
            <span className="font-medium text-gray-700">{settings.defaultTickers.replace(/,/g, " / ")}</span>
          </p>
        )}

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="space-y-2">
                <Input
                  type="text"
                  placeholder="例：9831.T または ヤマダホールディングス"
                  value={tickers[index]}
                  onChange={(e) => setTickers((prev) => prev.map((t, i) => (i === index ? e.target.value : t)))}
                  onKeyDown={(e) => e.key === "Enter" && analyzeCompany(index)}
                  className="h-12 text-base rounded-full border-gray-300"
                  disabled={loading[index]}
                />
                <Button
                  onClick={() => analyzeCompany(index)}
                  disabled={loading[index] || !tickers[index].trim()}
                  className="w-full h-10 rounded-full bg-blue-600 hover:bg-blue-700 font-medium text-white text-sm"
                >
                  {loading[index] ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      分析中
                    </span>
                  ) : (
                    "分析"
                  )}
                </Button>
                {errors[index] && <p className="text-xs text-red-600">{errors[index]}</p>}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 text-left shadow-sm">
            <p className="text-sm font-semibold text-gray-900">主な企業セット</p>
            <p className="mt-1 text-xs text-gray-500">クリックすると空いている枠にティッカーが入力されます。</p>
            {settings.preferredMarket === "us" ? (
              <p className="mt-2 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                米国市場を優先表示中
              </p>
            ) : (
              <p className="mt-2 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                国内市場を優先表示中
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {suggestedCompanies.map((company) => (
                <Button
                  key={company.ticker}
                  type="button"
                  variant="outline"
                  className="rounded-full border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600"
                  onClick={() => handleSuggestedSelect(company.ticker)}
                >
                  {company.name}
                </Button>
              ))}
            </div>
          </div>
          {history.length > 0 && (
            <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 text-left shadow-sm">
              <p className="text-sm font-semibold text-gray-900">最近の入力</p>
              <p className="mt-1 text-xs text-gray-500">過去に分析したティッカーから再分析できます。</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {history.map((entry) => (
                  <Button
                    key={entry.ticker}
                    type="button"
                    variant="outline"
                    className="rounded-full border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600"
                    onClick={() => handleSuggestedSelect(entry.ticker)}
                  >
                    {entry.company ?? entry.ticker}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {validCompanies.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {companies.map((company, index) => {
              const websiteHref = company && company.website ? ensureHttps(company.website) ?? company.website : undefined
              const websiteLabel =
                company && company.website
                  ? company.website.replace(/^https?:\/\//i, "") || company.website
                  : websiteHref
              const tickerLabel = company?.ticker?.trim()
              const companyName = company?.company?.trim()
              const badgeClass = company
                ? "border-gray-300 text-gray-900"
                : "border-gray-200 bg-gray-50 text-gray-400"

              return (
                <div key={index} className="flex flex-col items-center gap-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className={`inline-flex rounded-full border px-6 py-1 text-sm font-semibold ${badgeClass}`}>
                      {company ? tickerLabel || "ティッカー未取得" : "未入力"}
                    </div>
                    {company && (
                      <div className="text-lg font-semibold text-gray-900">{companyName || "企業名情報なし"}</div>
                    )}
                  </div>
                  <div
                    className={`w-full rounded-3xl border bg-white px-8 py-10 shadow-sm ${
                      company ? "border-gray-300" : "border-dashed border-gray-200"
                    }`}
                  >
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
                            <span className="text-sm text-gray-400">ロゴが見つかりませんでした</span>
                          )}
                        </div>

                        <hr className="w-full border-gray-200" />

                        <div className="w-full space-y-4 text-left text-sm leading-6 text-gray-900">
                          {company.lastUpdated && (
                            <div className="text-xs text-gray-500">更新時点: {company.lastUpdated}</div>
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
                            <span className="font-semibold">設立：</span>
                            {company.founded}
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
                                <span className="ml-2 text-xs text-gray-500">
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
                            <p className="mt-2 text-sm leading-6 text-gray-600">{company.summary}</p>
                          )}
                        </div>

                        <hr className="w-full border-gray-200" />

                        <div className="w-full space-y-6 text-left">
                          <section>
                            <h5 className="mb-3 text-base font-semibold text-gray-900">強み</h5>
                            <ul className="space-y-2 text-sm leading-6 text-gray-800">
                              {company.strengths.map((strength, idx) => (
                                <li key={idx} className="relative pl-4">
                                  <span className="absolute left-0 top-2 h-1.5 w-1.5 rounded-full bg-gray-400" />
                                  {strength}
                                </li>
                              ))}
                            </ul>
                          </section>

                          <section>
                            <h5 className="mb-3 text-base font-semibold text-gray-900">課題</h5>
                            <ul className="space-y-2 text-sm leading-6 text-gray-800">
                              {company.risks.map((risk, idx) => (
                                <li key={idx} className="relative pl-4">
                                  <span className="absolute left-0 top-2 h-1.5 w-1.5 rounded-full bg-gray-400" />
                                  {risk}
                                </li>
                              ))}
                            </ul>
                          </section>

                          <section>
                            <h5 className="mb-3 text-base font-semibold text-gray-900">見通し</h5>
                            <ul className="space-y-2 text-sm leading-6 text-gray-800">
                              {company.outlook.map((outlook, idx) => (
                                <li key={idx} className="relative pl-4">
                                  <span className="absolute left-0 top-2 h-1.5 w-1.5 rounded-full bg-gray-400" />
                                  {outlook}
                                </li>
                              ))}
                            </ul>
                          </section>
                        </div>

                        <hr className="w-full border-gray-200" />

                        <div className="w-full text-center">
                          <p className="text-base font-semibold text-gray-900">総合スコア</p>
                          <p className={`text-2xl font-bold ${getScoreColor(company.score)}`}>
                            {company.score}
                            <span className="ml-1 text-sm font-medium text-gray-500">/ 100</span>
                          </p>
                          <p className="mt-2 text-sm text-gray-600">{company.commentary}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-sm text-gray-400">
                        <div className="h-20 w-20 rounded-full border border-dashed border-gray-200" />
                        <p className="text-center leading-6">
                          企業を入力すると
                          <br />
                          情報が表示されます
                        </p>
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
        <div className="text-center py-24 px-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
            <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">企業を追加して比較を開始</h3>
          <p className="text-base text-gray-600 max-w-md mx-auto leading-relaxed">
            証券コードを入力すると、AIが企業分析を生成します。
          </p>
        </div>
      )}
    </div>
  )
}
