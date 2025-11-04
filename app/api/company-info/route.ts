import { NextRequest, NextResponse } from "next/server"

const YAHOO_HEADERS = {
  // Yahoo Finance は User-Agent がないと 403 を返すことがあるため簡易的に指定
  "User-Agent": "Mozilla/5.0 (compatible; AIDE/1.0; +https://aide-investment-app.local)",
  Accept: "application/json",
} as const

const QUOTE_SUMMARY_ENDPOINTS = [
  "https://query2.finance.yahoo.com/v10/finance/quoteSummary",
  "https://query1.finance.yahoo.com/v10/finance/quoteSummary",
] as const

const QUOTE_ENDPOINT = "https://query1.finance.yahoo.com/v7/finance/quote"

function normalizeTickerSymbol(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  const upper = trimmed.toUpperCase()
  if (/^\d{4}$/.test(upper)) {
    return `${upper}.T`
  }
  if (/^\d{4}\.[A-Z]+$/.test(upper)) {
    return upper
  }
  if (/^[A-Z]{1,5}$/.test(upper)) {
    return upper
  }
  return trimmed
}

function buildHeadquarters(profile: Record<string, any> | undefined) {
  if (!profile) return null
  const parts = [profile.state, profile.city, profile.country]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
  if (parts.length === 0) return null
  return parts.join(", ")
}

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")
  if (!ticker) {
    return NextResponse.json({ error: "ticker パラメータを指定してください。" }, { status: 400 })
  }

  const lookupTicker = normalizeTickerSymbol(ticker)

  try {
    const summary = await fetchQuoteSummary(lookupTicker)
    if (summary) {
      return NextResponse.json(summary)
    }

    const quoteFallback = await fetchQuoteFallback(lookupTicker)
    if (quoteFallback) {
      return NextResponse.json(quoteFallback)
    }

    return NextResponse.json({
      ticker: lookupTicker,
      fetchTimestamp: new Date().toISOString(),
      errorMessage: "該当する企業情報が見つかりませんでした。",
    })
  } catch (error) {
    console.error("Company info fetch error:", error)
    return NextResponse.json({ error: "企業情報の取得中にエラーが発生しました。" }, { status: 500 })
  }
}

async function fetchQuoteSummary(ticker: string) {
  for (const endpoint of QUOTE_SUMMARY_ENDPOINTS) {
    const url = `${endpoint}/${encodeURIComponent(ticker)}?modules=price,summaryProfile`
    try {
      const response = await fetch(url, {
        headers: YAHOO_HEADERS,
        next: { revalidate: 60 * 10 },
      })
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Try next endpoint; this usually indicates region/cookie issues.
          continue
        }
        const errorText = await response.text()
        console.warn("Yahoo Finance API error:", response.status, errorText)
        continue
      }

      const payload = await response.json()
      const result = payload?.quoteSummary?.result?.[0]
      if (!result) continue

      const price = result.price as Record<string, any> | undefined
      const profile = result.summaryProfile as Record<string, any> | undefined

      const marketTime =
        typeof price?.regularMarketTime === "number"
          ? new Date((price.regularMarketTime as number) * 1000).toISOString()
          : null

      return {
        ticker: typeof price?.symbol === "string" ? price.symbol : ticker,
        shortName: typeof price?.shortName === "string" ? price.shortName : null,
        longName: typeof price?.longName === "string" ? price.longName : null,
        exchange: typeof price?.exchangeName === "string" ? price.exchangeName : null,
        currency: typeof price?.currency === "string" ? price.currency : null,
        marketPrice:
          typeof price?.regularMarketPrice?.raw === "number" ? price.regularMarketPrice.raw : null,
        marketChange:
          typeof price?.regularMarketChange?.raw === "number" ? price.regularMarketChange.raw : null,
        marketChangePercent:
          typeof price?.regularMarketChangePercent?.raw === "number"
            ? price.regularMarketChangePercent.raw
            : null,
        marketTime,
        industry: typeof profile?.industry === "string" ? profile.industry : null,
        sector: typeof profile?.sector === "string" ? profile.sector : null,
        website: typeof profile?.website === "string" ? profile.website : null,
        employees:
          typeof profile?.fullTimeEmployees === "number" ? profile.fullTimeEmployees : null,
        headquarters: buildHeadquarters(profile),
        summary: typeof profile?.longBusinessSummary === "string" ? profile.longBusinessSummary : null,
        fetchTimestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.warn("Quote summary fetch failed:", error)
    }
  }
  return null
}

async function fetchQuoteFallback(ticker: string) {
  const url = `${QUOTE_ENDPOINT}?symbols=${encodeURIComponent(ticker)}`
  try {
    const response = await fetch(url, {
      headers: YAHOO_HEADERS,
      next: { revalidate: 60 * 5 },
    })
    if (!response.ok) {
      const errorText = await response.text()
      console.warn("Yahoo quote fallback error:", response.status, errorText)
      return null
    }
    const payload = await response.json()
    const result = payload?.quoteResponse?.result?.[0]
    if (!result) return null

    const marketTime =
      typeof result?.regularMarketTime === "number"
        ? new Date(result.regularMarketTime * 1000).toISOString()
        : null

    return {
      ticker: typeof result?.symbol === "string" ? result.symbol : ticker,
      shortName: typeof result?.shortName === "string" ? result.shortName : null,
      longName: typeof result?.longName === "string" ? result.longName : null,
      exchange: typeof result?.fullExchangeName === "string" ? result.fullExchangeName : null,
      currency: typeof result?.currency === "string" ? result.currency : null,
      marketPrice:
        typeof result?.regularMarketPrice === "number" ? result.regularMarketPrice : null,
      marketChange:
        typeof result?.regularMarketChange === "number" ? result.regularMarketChange : null,
      marketChangePercent:
        typeof result?.regularMarketChangePercent === "number"
          ? result.regularMarketChangePercent
          : null,
      marketTime,
      fetchTimestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.warn("Quote fallback fetch failed:", error)
    return null
  }
}
