import { type NextRequest, NextResponse } from "next/server"
import { fetchEdinetCompanyInfoByTicker } from "../../../lib/edinet"

const MOCK_DATA: Record<string, any> = {
  "9831.T": {
    company: "ヤマダホールディングス",
    ticker: "9831.T",
    representative: "山田 昇",
    location: "群馬県高崎市",
    capital: "711億円",
    strengths: ["住宅×家電の連携による高単価販売", "プライベートブランド比率の上昇", "リフォーム・リユース事業の成長"],
    risks: ["家電単体販売の利益率が低い", "ECシフトへの対応が遅れ気味", "都市部での店舗網が限定的"],
    outlook: ["住宅・家電一体モデルの拡大余地", "DX化で在庫・人員源泉が進展", "低価格競争から脱却し収益構造へ"],
    score: 72,
    commentary: "→「成熟×再成長」フェーズ。リフォーム事業が収益を押し上げ。",
    analysisSummary:
      "住宅×家電の統合提案で単価を底上げしつつ、動画視聴による集客策で来店頻度を維持。粗利を圧迫する家電単体販売はPBや付帯サービスで補い、DX投資で在庫回転と人件費を同時に改善するシナリオ。",
  },
  "7419.T": {
    company: "ノジマ",
    ticker: "7419.T",
    representative: "野島 廣司",
    location: "神奈川県横浜市",
    capital: "63億3,050万円",
    strengths: ["通信キャリア販売と家電の相乗効果", "提案型接客による高い顧客満足度", "グループ会社とのDX連携が進む"],
    risks: ["人件費や店舗運営コストの上昇", "非家電領域の収益基盤がまだ弱い", "全国展開スピードが緩やか"],
    outlook: ["通信×家電モデルの深化に期待", "EC併用で営業効率が向上傾向", "成長率は安定も収益性改善がカギ"],
    score: 63,
    commentary: "→顧客接点の強さが武器。利益率改善に向けた再構築期。",
    analysisSummary:
      "キャリアショップと家電販売の両面から顧客データを集約し、高単価の通信サービスを抱き合わせるモデルが浸透。足元は人件費と店舗改装費で利益が圧迫されるが、提案営業力とサブスク収益が固定費を吸収するかが焦点。",
  },
  "3048.T": {
    company: "ビックカメラ",
    ticker: "3048.T",
    representative: "秋保 徹",
    location: "東京都豊島区",
    capital: "259億2,900万円",
    strengths: [
      "都市立地＋EC連携による高回転モデル",
      "グループ内仕入・物流の効率化",
      "家電以外（医薬・酒類・玩具）の多角化",
    ],
    risks: ["家電量販業界の競争激化", "粗利率の変動が収益に直結", "地方展開が限定的"],
    outlook: [
      "オムニチャネルで収益安定化が進む",
      "顧客データ活用によりリピート率向上",
      "店舗リニューアルとEC統合の加速",
    ],
    score: 68,
    commentary: "→「都市型ECハイブリッド」の成功モデル。効率改善で上昇余地大。",
    analysisSummary:
      "都心大型店とECの在庫を一体で管理し、当日受取や専門スタッフの相談導線で差別化。医薬・酒類など日用品のトラフィックを活用しながら粗利の安い家電を補填し、DX投資の成果が販管費率の改善に繋がりつつある。",
  },
}

interface InsightCacheEntry {
  timestamp: number
  data: Record<string, unknown>
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 6
const insightsCache = new Map<string, InsightCacheEntry>()

const WIKIPEDIA_API_ENDPOINT = "https://ja.wikipedia.org/w/api.php"
export const WIKIPEDIA_USER_AGENT = "AIDE-Investment-App/1.0 (+https://aide.example.com)"

interface OfficerInfo {
  name: string | null
  title: string | null
}

const ALIAS_MAP: Record<
  string,
  {
    ticker?: string
    company?: string
  }
> = {
  "三井商事": { ticker: "8031.T", company: "三井物産" },
  "三井物産": { ticker: "8031.T", company: "三井物産" },
  "mitsui & co": { ticker: "8031.T", company: "三井物産" },
  "8031": { ticker: "8031.T", company: "三井物産" },
  "8031.t": { ticker: "8031.T", company: "三井物産" },
  "三菱商事": { ticker: "8058.T", company: "三菱商事" },
  "mitsubishi corporation": { ticker: "8058.T", company: "三菱商事" },
  "8058": { ticker: "8058.T", company: "三菱商事" },
  "8058.t": { ticker: "8058.T", company: "三菱商事" },
  "伊藤忠商事": { ticker: "8001.T", company: "伊藤忠商事" },
  "itochu": { ticker: "8001.T", company: "伊藤忠商事" },
  "8001": { ticker: "8001.T", company: "伊藤忠商事" },
  "8001.t": { ticker: "8001.T", company: "伊藤忠商事" },
  "8053": { ticker: "8053.T", company: "住友商事" },
  "8053.t": { ticker: "8053.T", company: "住友商事" },
  "スカイマーク": { ticker: "9204.T", company: "スカイマーク" },
  "skymark": { ticker: "9204.T", company: "スカイマーク" },
  "9204": { ticker: "9204.T", company: "スカイマーク" },
  "9204.t": { ticker: "9204.T", company: "スカイマーク" },
  "キーエンス": { ticker: "6861.T", company: "キーエンス" },
  "keyence": { ticker: "6861.T", company: "キーエンス" },
  "6861": { ticker: "6861.T", company: "キーエンス" },
  "6861.t": { ticker: "6861.T", company: "キーエンス" },
  "jal": { ticker: "9201.T", company: "日本航空" },
  "japan airlines": { ticker: "9201.T", company: "日本航空" },
  "japan airline": { ticker: "9201.T", company: "日本航空" },
  "日本航空": { ticker: "9201.T", company: "日本航空" },
  "全日本空輸": { ticker: "9202.T", company: "ANAホールディングス" },
  "全日空": { ticker: "9202.T", company: "ANAホールディングス" },
  "ana": { ticker: "9202.T", company: "ANAホールディングス" },
  "ana holdings": { ticker: "9202.T", company: "ANAホールディングス" },
}

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

function buildLogoFromWebsite(website?: string | null): string | null {
  const normalized = normalizeWebsite(website)
  if (!normalized) return null
  try {
    const url = new URL(normalized)
    if (!url.hostname) return null
    return `https://logo.clearbit.com/${url.hostname}`
  } catch {
    return null
  }
}

async function fetchCompanyLogo(ticker: string, website?: string | null): Promise<string | null> {
  const normalizedTicker = ticker.trim().toUpperCase()
  if (normalizedTicker) {
    const directImageUrl = `https://financialmodelingprep.com/image-stock/${encodeURIComponent(normalizedTicker)}.png`
    try {
      const headResponse = await fetch(directImageUrl, {
        method: "HEAD",
        next: { revalidate: 60 * 60 },
      })
      if (headResponse.ok) {
        return directImageUrl
      }
    } catch (error) {
      console.error("FMP direct logo probe error:", error)
    }
  }

  const apiKey = process.env.FMP_API_KEY
  if (apiKey) {
    const variations = [normalizedTicker || ticker]

    if (ticker.includes(".")) {
      const [base] = ticker.split(".")
      if (base) variations.push(base)
      const [prefix, suffix] = ticker.split(".")
      if (prefix && suffix) {
        variations.push(`${suffix.toUpperCase()}:${prefix}`)
        variations.push(`${suffix.toLowerCase()}:${prefix}`)
      }
    }

    for (const symbol of variations) {
      try {
        const response = await fetch(
          `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(symbol)}?apikey=${apiKey}`,
          {
            next: { revalidate: 60 * 60 },
          },
        )

        if (!response.ok) {
          continue
        }

        const profiles = await response.json()
        const profile = Array.isArray(profiles) ? profiles[0] : undefined
        const logo = profile?.image

        if (typeof logo === "string" && logo.startsWith("http")) {
          return logo
        }
      } catch (error) {
        console.error("FMP logo fetch error:", error)
      }
    }
  }

  return buildLogoFromWebsite(website)
}

function formatHeadquarters(profile: Record<string, any> | undefined) {
  if (!profile) return null
  const parts = [profile.address1, profile.city, profile.state ?? profile.region, profile.country]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
  if (parts.length === 0) return null
  return parts.join(", ")
}

function formatCapitalAmount(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/[^\d.,-]/.test(trimmed)) {
    return trimmed
  }
  const numeric = Number(trimmed.replace(/,/g, ""))
  if (!Number.isFinite(numeric)) return trimmed
  return `${new Intl.NumberFormat("ja-JP").format(Math.round(numeric))}円`
}

function normalizeWebsite(url: unknown): string | null {
  if (typeof url !== "string") return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function selectPrimaryOfficer(officers: OfficerInfo[]): OfficerInfo | null {
  if (!officers || officers.length === 0) return null
  const prioritizedPatterns = [
    /代表取締役社長/,
    /代表取締役/,
    /CEO/i,
    /Chief Executive Officer/i,
    /社長/,
  ]
  for (const pattern of prioritizedPatterns) {
    const match = officers.find((officer) => officer.name && officer.title && pattern.test(officer.title))
    if (match) return match
  }
  const fallback = officers.find((officer) => officer.name)
  return fallback ?? null
}

function normalizePlainList(template: string): string {
  let content = template
    .replace(/^\{\{\s*plain\s*list/i, "")
    .replace(/\}\}\s*$/i, "")
  if (content.startsWith("|")) {
    content = content.slice(1)
  }
  content = content.replace(/^\s*1\s*=\s*/i, "")
  const lines = content.split(/\r?\n/)
  const items = lines
    .map((line) => line.replace(/^\s*[*•\-]\s*/g, "").trim())
    .filter((line) => line.length > 0 && !/^[a-z0-9_-]+\s*=/.test(line))
  return items.join("\n")
}

function expandPlainListTemplates(value: string): string {
  const pattern = /\{\{\s*plain\s*list/gi
  let result = ""
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(value)) !== null) {
    const start = match.index
    let index = start
    let depth = 0
    let end = -1

    while (index < value.length - 1) {
      if (value[index] === "{" && value[index + 1] === "{") {
        depth += 1
        index += 2
        continue
      }
      if (value[index] === "}" && value[index + 1] === "}") {
        depth -= 1
        index += 2
        if (depth === 0) {
          end = index
          break
        }
        continue
      }
      index += 1
    }

    if (end === -1) {
      break
    }

    const template = value.slice(start, end)
    result += value.slice(lastIndex, start) + normalizePlainList(template)
    lastIndex = end
    pattern.lastIndex = end
  }

  if (lastIndex < value.length) {
    result += value.slice(lastIndex)
  }

  return result
}

function stripWikiMarkup(value: string): string {
  let result = value
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/\{\{br\}\}/gi, "\n")
  result = expandPlainListTemplates(result)
  result = result
    .replace(/\{\{lang\|[^|]+\|([^}]+)\}\}/gi, "$1")
    .replace(/\{\{nowrap\|([^}]+)\}\}/gi, "$1")
    .replace(/\{\{(?:Ruby|ruby)\|([^|]+)\|[^}]+\}\}/gi, "$1")
  let previous: string
  do {
    previous = result
    result = result.replace(/\{\{[^{}]*\}\}/g, "")
  } while (previous !== result)
  return result
    .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, "$1")
    .replace(/''+/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[\t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n+/g, "\n")
    .trim()
}

function sanitizeWikiValue(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const cleaned = stripWikiMarkup(expandPlainListTemplates(value))
    .replace(/^\s*[*•\-]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned.length > 0 ? cleaned : null
}

function normalizeRepresentativeForComparison(value: string | null | undefined): string | null {
  if (!value) return null
  return value
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[・（）()［］\[\]\s　]/g, "")
    .toLowerCase()
}

function composeRepresentative(name?: string | null, title?: string | null): string | null {
  const cleanName = sanitizeWikiValue(name)
  const cleanTitle = sanitizeWikiValue(title)
  if (cleanName && cleanTitle) return `${cleanName}（${cleanTitle}）`
  if (cleanName) return cleanName
  if (cleanTitle) return cleanTitle
  return null
}

function extractRepresentativeFromWikitext(wikitext: string): OfficerInfo | null {
  const candidates: OfficerInfo[] = []
  const lines = wikitext.split(/\r?\n/)
  const keys = ["代表者", "代表者1", "代表者名", "代表", "代表取締役", "CEO", "代表取締役社長"]
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line.startsWith("|")) continue
    const keyMatch = line.match(/^\|\s*([^=]+?)\s*=\s*(.+)$/)
    if (!keyMatch) continue
    const key = keyMatch[1].trim()
    if (!keys.some((candidateKey) => key.includes(candidateKey))) continue
    const rawValue = expandPlainListTemplates(keyMatch[2])
    const value = stripWikiMarkup(rawValue)
    if (!value) continue
    const parts = value.split(/\n|、|，|；|;/)
    for (const part of parts) {
      const cleaned = part.trim()
      if (!cleaned) continue
      const parenMatch = cleaned.match(/^(.+?)（(.+?)）$/)
      if (parenMatch) {
        candidates.push({ name: parenMatch[1].trim(), title: parenMatch[2].trim() })
        continue
      }
      const spaceMatch = cleaned.match(/^([^\s　]+)[\s　]+(.+)$/)
      if (spaceMatch && /代表|CEO|社長|会長/.test(spaceMatch[2])) {
        candidates.push({ name: spaceMatch[1].trim(), title: spaceMatch[2].trim() })
        continue
      }
      candidates.push({ name: cleaned, title: null })
    }
    if (candidates.length > 0) break
  }

  if (candidates.length === 0) return null

  const sanitizedCandidates = candidates
    .map((candidate) => ({
      name: sanitizeWikiValue(candidate.name),
      title: sanitizeWikiValue(candidate.title),
    }))
    .filter((candidate) => candidate.name || candidate.title)

  if (sanitizedCandidates.length === 0) return null

  const primary = sanitizedCandidates[0]
  return {
    name: primary.name ?? null,
    title: primary.title ?? null,
  }
}

async function fetchWikipediaRepresentative(_name: string | null, _fallbackTicker: string): Promise<OfficerInfo | null> {
  console.info("Skipping Wikipedia representative lookup temporarily")
  return null
}

interface ExternalCompanyProfile {
  symbol: string
  longName: string | null
  shortName: string | null
  industry: string | null
  sector: string | null
  headquarters: string | null
  website: string | null
  officers: OfficerInfo[]
  exchange?: string | null
}

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; AIDE/1.0; +https://aide-investment-app.local)",
  Accept: "application/json",
} as const

const YAHOO_QUOTE_SUMMARY_ENDPOINTS = [
  "https://query2.finance.yahoo.com/v10/finance/quoteSummary",
  "https://query1.finance.yahoo.com/v10/finance/quoteSummary",
] as const

const YAHOO_QUOTE_ENDPOINT = "https://query1.finance.yahoo.com/v7/finance/quote"
const YAHOO_SEARCH_ENDPOINT = "https://query2.finance.yahoo.com/v1/finance/search"
const YAHOO_AUTOCOMPLETE_ENDPOINT = "https://query2.finance.yahoo.com/v6/finance/autocomplete"

function isTokyoSymbol(symbol?: string | null, exchange?: string | null): boolean {
  if (!symbol) return false
  if (symbol.toUpperCase().endsWith(".T")) return true
  if (exchange) {
    return exchange.toUpperCase() === "JPX"
  }
  return false
}

function quoteExchange(quote: any): string | null {
  if (!quote) return null
  if (typeof quote.exchange === "string") return quote.exchange
  if (typeof quote.exch === "string") return quote.exch
  return null
}

function selectPreferredAutocompleteResult(
  results: any[],
  normalizedExpected?: string,
): { symbol: string; name?: string | null; shortname?: string | null; exchange?: string | null } | null {
  if (!Array.isArray(results) || results.length === 0) return null
  if (normalizedExpected) {
    const exact = results.find(
      (result: any) => typeof result?.symbol === "string" && normalizeTickerSymbol(result.symbol) === normalizedExpected,
    )
    if (exact) {
      return {
        symbol: normalizeTickerSymbol(exact.symbol),
        name: exact.name,
        shortname: exact.shortname,
        exchange: exact.exch ?? null,
      }
    }
  }
  const tokyo = results.find(
    (result: any) => typeof result?.symbol === "string" && isTokyoSymbol(result.symbol, result.exch ?? null),
  )
  if (tokyo) {
    return {
      symbol: normalizeTickerSymbol(tokyo.symbol),
      name: tokyo.name,
      shortname: tokyo.shortname,
      exchange: tokyo.exch ?? null,
    }
  }
  return null
}

function selectPreferredQuote(
  quotes: any[],
  normalizedExpected?: string,
): { symbol: string; longname?: string | null; shortname?: string | null; exchange?: string | null } | null {
  if (!Array.isArray(quotes) || quotes.length === 0) return null
  if (normalizedExpected) {
    const exact = quotes.find(
      (quote: any) => typeof quote?.symbol === "string" && normalizeTickerSymbol(quote.symbol) === normalizedExpected,
    )
    if (exact) {
      return {
        symbol: normalizeTickerSymbol(exact.symbol),
        longname: exact.longname,
        shortname: exact.shortname,
        exchange: quoteExchange(exact),
      }
    }
  }
  const tokyo = quotes.find(
    (quote: any) => typeof quote?.symbol === "string" && isTokyoSymbol(quote.symbol, quoteExchange(quote)),
  )
  if (tokyo) {
    return {
      symbol: normalizeTickerSymbol(tokyo.symbol),
      longname: tokyo.longname,
      shortname: tokyo.shortname,
      exchange: quoteExchange(tokyo),
    }
  }
  return null
}

function buildYahooHeadquarters(profile: Record<string, any> | undefined) {
  if (!profile) return null
  const parts = [profile.state, profile.city, profile.country]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
  if (parts.length === 0) return null
  return parts.join(", ")
}

async function fetchCompanyProfile(ticker: string): Promise<ExternalCompanyProfile | null> {
  const normalizedTicker = normalizeTickerSymbol(ticker)

  for (const endpoint of YAHOO_QUOTE_SUMMARY_ENDPOINTS) {
    const url = `${endpoint}/${encodeURIComponent(normalizedTicker)}?modules=price,summaryProfile`
    try {
      const response = await fetch(url, {
        headers: YAHOO_HEADERS,
        next: { revalidate: 60 * 10 },
      })
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          continue
        }
        const errorText = await response.text()
        console.warn("Yahoo Finance summary error:", response.status, errorText)
        continue
      }
      const payload = await response.json()
      const result = payload?.quoteSummary?.result?.[0]
      if (!result) continue
      const price = result.price as Record<string, any> | undefined
      const profile = result.summaryProfile as Record<string, any> | undefined

      return {
        symbol: typeof price?.symbol === "string" ? price.symbol : normalizedTicker,
        longName: typeof price?.longName === "string" ? price.longName : null,
        shortName: typeof price?.shortName === "string" ? price.shortName : null,
        industry: typeof profile?.industry === "string" ? profile.industry : null,
        sector: typeof profile?.sector === "string" ? profile.sector : null,
        headquarters: buildYahooHeadquarters(profile),
        website: typeof profile?.website === "string" ? profile.website : null,
        officers: [],
      }
    } catch (error) {
      console.warn("Yahoo Finance profile fetch failed:", error)
    }
  }

  try {
    const response = await fetch(`${YAHOO_QUOTE_ENDPOINT}?symbols=${encodeURIComponent(normalizedTicker)}`, {
      headers: YAHOO_HEADERS,
      next: { revalidate: 60 * 5 },
    })
    if (!response.ok) {
      const errorText = await response.text()
      console.warn("Yahoo Finance quote fallback error:", response.status, errorText)
      return null
    }
    const payload = await response.json()
    const result = payload?.quoteResponse?.result?.[0]
    if (!result) return null
    return {
      symbol: typeof result?.symbol === "string" ? result.symbol : normalizedTicker,
      longName: typeof result?.longName === "string" ? result.longName : null,
      shortName: typeof result?.shortName === "string" ? result.shortName : null,
      industry: typeof result?.industry === "string" ? result.industry : null,
      sector: typeof result?.sector === "string" ? result.sector : null,
      headquarters: null,
      website: null,
      officers: [],
    }
  } catch (error) {
    console.warn("Yahoo Finance quote fallback fetch failed:", error)
  }

  const searchProfile = await fetchYahooSearchProfile(normalizedTicker, normalizedTicker)
  if (searchProfile) return searchProfile

  return null
}

async function fetchYahooSearchProfile(query: string, expectedTicker?: string): Promise<ExternalCompanyProfile | null> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return null
  const normalizedExpected = expectedTicker ? normalizeTickerSymbol(expectedTicker) : undefined

  const attemptedQueries = new Set<string>([trimmedQuery.toLowerCase()])

  const fromAutocomplete = await fetchYahooAutocomplete(trimmedQuery, normalizedExpected)
  if (fromAutocomplete) {
    if (isTokyoSymbol(fromAutocomplete.symbol, fromAutocomplete.exchange ?? null)) {
      return fromAutocomplete
    }
    if (typeof fromAutocomplete.longName === "string") {
      attemptedQueries.add(fromAutocomplete.longName.toLowerCase())
    }
    if (typeof fromAutocomplete.shortName === "string") {
      attemptedQueries.add(fromAutocomplete.shortName.toLowerCase())
    }
  }

  const fromSearch = await fetchYahooSearch(trimmedQuery, normalizedExpected)
  if (!fromSearch) {
    return fromAutocomplete
  }
  if (fromSearch.profile && isTokyoSymbol(fromSearch.profile.symbol, fromSearch.profile.exchange ?? null)) {
    return fromSearch.profile
  }

  const refinedFromQuotes = await refineProfileFromQuoteNames(fromSearch.quotes, attemptedQueries, normalizedExpected)
  if (refinedFromQuotes) {
    return refinedFromQuotes
  }

  if (fromSearch.profile) {
    return fromSearch.profile
  }

  return fromAutocomplete
}

async function fetchYahooAutocomplete(query: string, expectedTicker?: string): Promise<ExternalCompanyProfile | null> {
  const url = `${YAHOO_AUTOCOMPLETE_ENDPOINT}?lang=ja-JP&region=JP&query=${encodeURIComponent(query)}`
  try {
    const response = await fetch(url, {
      headers: YAHOO_HEADERS,
      next: { revalidate: 60 * 5 },
    })
    if (!response.ok) {
      const errorText = await response.text()
      console.warn("Yahoo Finance autocomplete error:", response.status, errorText)
      return null
    }
    const payload = await response.json()
    const results = Array.isArray(payload?.ResultSet?.Result) ? payload.ResultSet.Result : []
    if (results.length === 0) return null
    const normalizedExpected = expectedTicker ? normalizeTickerSymbol(expectedTicker) : undefined
    const preferred = selectPreferredAutocompleteResult(results, normalizedExpected)
    if (!preferred) return null
    const resolvedSymbol = preferred.symbol
    return {
      symbol: resolvedSymbol,
      longName: typeof preferred.name === "string" ? preferred.name : null,
      shortName: typeof preferred.shortname === "string" ? preferred.shortname : null,
      industry: null,
      sector: null,
      headquarters: null,
      website: null,
      officers: [],
      exchange: typeof preferred.exchange === "string" ? preferred.exchange : null,
    }
  } catch (error) {
    console.warn("Yahoo Finance autocomplete fetch failed:", error)
    return null
  }
}

type YahooSearchPayload = {
  profile: ExternalCompanyProfile | null
  quotes: any[]
}

async function fetchYahooSearch(query: string, expectedTicker?: string): Promise<YahooSearchPayload | null> {
  const normalizedExpected = expectedTicker ? normalizeTickerSymbol(expectedTicker) : undefined
  const normalizedQuery =
    normalizedExpected && query.toUpperCase() === normalizedExpected
      ? normalizedExpected.replace(/\.T$/i, "")
      : query
  const url = `${YAHOO_SEARCH_ENDPOINT}?q=${encodeURIComponent(normalizedQuery)}&quotesCount=5&newsCount=0&lang=ja-JP&region=JP`
  try {
    const response = await fetch(url, {
      headers: YAHOO_HEADERS,
      next: { revalidate: 60 * 5 },
    })
    if (!response.ok) {
      const errorText = await response.text()
      console.warn("Yahoo Finance search error:", response.status, errorText)
      return null
    }
    const payload = await response.json()
    const quotes = Array.isArray(payload?.quotes) ? payload.quotes : []
    const preferred = selectPreferredQuote(quotes, normalizedExpected)
    if (!preferred) {
      return { profile: null, quotes }
    }
    return {
      profile: {
        symbol: preferred.symbol,
        longName: typeof preferred.longname === "string" ? preferred.longname : null,
        shortName: typeof preferred.shortname === "string" ? preferred.shortname : null,
        industry: null,
        sector: null,
        headquarters: null,
        website: null,
        officers: [],
        exchange: typeof preferred.exchange === "string" ? preferred.exchange : null,
      },
      quotes,
    }
  } catch (error) {
    console.warn("Yahoo Finance search fetch failed:", error)
    return null
  }
}

async function refineProfileFromQuoteNames(
  quotes: any[],
  attemptedQueries: Set<string>,
  normalizedExpected?: string,
): Promise<ExternalCompanyProfile | null> {
  if (!Array.isArray(quotes) || quotes.length === 0) return null
  for (const quote of quotes) {
    const candidateNames = [
      typeof quote?.longname === "string" ? quote.longname : null,
      typeof quote?.shortname === "string" ? quote.shortname : null,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    for (const name of candidateNames) {
      const normalizedName = name.trim()
      const key = normalizedName.toLowerCase()
      if (attemptedQueries.has(key)) continue
      attemptedQueries.add(key)
      const profile = await fetchYahooAutocomplete(normalizedName, normalizedExpected)
      if (profile && isTokyoSymbol(profile.symbol, profile.exchange ?? null)) {
        return profile
      }
    }
  }
  return null
}

async function inferTickerWithAI(query: string): Promise<{ ticker?: string; company?: string } | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return null

  const prompt = `以下の入力は日本語または英語で書かれた企業名・略称・愛称です。東京証券取引所の銘柄の場合、対応する4桁コードに".T"を付けたティッカーと正式名称をJSONで返してください。該当が不明な場合は空文字のまま返してください。

入力: ${trimmedQuery}

出力形式:
{
  "ticker": "XXXX.T",
  "company": "正式名称"
}`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "You convert Japanese company nicknames into JPX ticker symbols. Respond with JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      console.warn("AI ticker inference failed:", response.status)
      return null
    }
    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content
    const text = typeof rawContent === "string" ? rawContent.trim() : ""
    if (!text) return null
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed || typeof parsed !== "object") return null
    const tickerValue = typeof parsed.ticker === "string" ? parsed.ticker.trim() : ""
    const companyValue = typeof parsed.company === "string" ? parsed.company.trim() : ""
    return {
      ticker: tickerValue || undefined,
      company: companyValue || undefined,
    }
  } catch (error) {
    console.error("Failed to infer ticker via AI:", error)
    return null
  }
}

function findMockData(identifier: string) {
  if (MOCK_DATA[identifier]) return MOCK_DATA[identifier]
  return Object.values(MOCK_DATA).find((entry) => {
    const normalizedCompany = entry.company?.toLowerCase()
    const normalizedTicker = entry.ticker?.toLowerCase()
    const candidate = identifier.toLowerCase()
    return normalizedCompany === candidate || normalizedTicker === candidate
  })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const identifier = searchParams.get("ticker") ?? searchParams.get("q")
  const nocacheParam = searchParams.get("nocache")
  const skipCache =
    typeof nocacheParam === "string" &&
    ["1", "true", "yes"].includes(nocacheParam.trim().toLowerCase())

  if (!identifier) {
    return NextResponse.json({ error: "会社名または証券コードを入力してください" }, { status: 400 })
  }

  const normalized = identifier.trim()
  if (!normalized) {
    return NextResponse.json({ error: "会社名または証券コードを入力してください" }, { status: 400 })
  }
  console.info(`[insights] lookup start input="${identifier}" normalized="${normalized}"`)

  const tickerLikeCandidate =
    /^[0-9A-Za-z.\-:]+$/.test(normalized) ? normalizeTickerSymbol(normalized) : undefined
  const alias =
    ALIAS_MAP[normalized.toLowerCase()] ??
    (tickerLikeCandidate ? ALIAS_MAP[tickerLikeCandidate.toLowerCase()] : undefined)
  let hintTicker = alias?.ticker ?? null
  let hintCompany = alias?.company
  if (hintTicker) {
    console.info(`[insights] alias lookup hit: ticker=${hintTicker} company=${hintCompany ?? "-"}`)
  } else {
    console.info("[insights] alias lookup miss, falling back to Yahoo search")
  }

  if (!hintTicker && normalized.length >= 2) {
    console.info(`[insights] attempting Yahoo search for "${normalized}"`)
    const searchProfile = await fetchYahooSearchProfile(normalized)
    if (searchProfile?.symbol) {
      hintTicker = searchProfile.symbol
      if (!hintCompany) {
        hintCompany = searchProfile.longName ?? searchProfile.shortName ?? undefined
      }
      console.info(
        `[insights] Yahoo search resolved ticker=${hintTicker} company=${hintCompany ?? "-"} exchange=${
          searchProfile.exchange ?? "-"
        }`,
      )
    } else {
      console.info("[insights] Yahoo search did not resolve a ticker")
    }
  }

  if (!hintTicker && normalized.length >= 2) {
    console.info(`[insights] falling back to AI ticker inference for "${normalized}"`)
    const aiGuess = await inferTickerWithAI(normalized)
    if (aiGuess?.ticker) {
      hintTicker = normalizeTickerSymbol(aiGuess.ticker)
      if (!hintCompany) {
        hintCompany = aiGuess.company ?? undefined
      }
      console.info(`[insights] AI inference resolved ticker=${hintTicker} company=${hintCompany ?? "-"}`)
    } else {
      console.info("[insights] AI inference failed to resolve ticker")
    }
  }
  if (!hintTicker && tickerLikeCandidate) {
    hintTicker = tickerLikeCandidate
    console.info(`[insights] defaulting to raw ticker-like input ${hintTicker}`)
  }
  if (!hintTicker) {
    console.warn("[insights] unable to resolve ticker from input, proceeding with normalized text only")
  }

  const cacheKey = (hintTicker ?? normalized).toLowerCase()
  if (skipCache) {
    insightsCache.delete(cacheKey)
  }

  // Check if mock data exists
  const mockIdentifierCandidates = [normalized]
  if (tickerLikeCandidate) mockIdentifierCandidates.unshift(tickerLikeCandidate)
  if (hintTicker) mockIdentifierCandidates.unshift(hintTicker)
  if (hintCompany) mockIdentifierCandidates.unshift(hintCompany)

  const mockHit =
    mockIdentifierCandidates
      .map((candidate) => findMockData(candidate))
      .find((entry) => entry !== undefined) ?? undefined
  if (mockHit) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const targetTickerRaw = hintTicker ?? mockHit.ticker ?? normalized
    const targetTicker = normalizeTickerSymbol(targetTickerRaw)
    const profile = await fetchCompanyProfile(targetTicker)
    const logo = await fetchCompanyLogo(targetTicker, profile?.website)

    const data: Record<string, unknown> = { ...mockHit }
    if (typeof data.company === "string") {
      const sanitizedCompany = sanitizeWikiValue(data.company)
      if (sanitizedCompany) {
        data.company = sanitizedCompany
      }
    }
    if (logo) data.logo = logo
    if (profile?.longName || profile?.shortName) {
      data.company = profile.longName ?? profile.shortName ?? data.company
    }
    if (profile?.symbol) {
      data.ticker = profile.symbol
    } else if (!data.ticker) {
      data.ticker = targetTicker
    }
    const currentLocation = typeof data.location === "string" ? data.location.trim() : ""
    if (profile?.headquarters && currentLocation.length === 0) {
      data.location = profile.headquarters
    }
    if (profile?.website) {
      data.website = profile.website
    }
    let mockOfficer = selectPrimaryOfficer(profile?.officers ?? [])
    if (!mockOfficer) {
      const wikiOfficer = await fetchWikipediaRepresentative(
        profile?.longName ?? profile?.shortName ?? mockHit.company ?? targetTicker,
        targetTicker,
      )
      if (wikiOfficer) {
        mockOfficer = wikiOfficer
      }
    }
    const mockRepresentative = composeRepresentative(mockOfficer?.name, mockOfficer?.title)
    if (mockRepresentative) {
      data.representative = mockRepresentative
    } else if (typeof data.representative === "string") {
      const sanitizedRepresentative = sanitizeWikiValue(data.representative)
      if (sanitizedRepresentative) {
        data.representative = sanitizedRepresentative
      }
    }

    insightsCache.set(cacheKey, { timestamp: Date.now(), data })
    return NextResponse.json(data)
  }

  const cached = insightsCache.get(cacheKey)
  if (!skipCache && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data)
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI APIキーが設定されていません。環境変数 OPENAI_API_KEY を設定してください。" },
        { status: 500 },
      )
    }

    const tickerCandidateBase = hintTicker ?? tickerLikeCandidate
    const tickerCandidate = tickerCandidateBase ? normalizeTickerSymbol(tickerCandidateBase) : undefined
    const externalProfile = tickerCandidate ? await fetchCompanyProfile(tickerCandidate) : null

    const enforcedTickerRaw = (
      externalProfile?.symbol ??
      tickerCandidate ??
      hintTicker ??
      tickerLikeCandidate ??
      normalized
    ).toString().trim()
    const enforcedCompanyNameRaw = (
      externalProfile?.longName ??
      externalProfile?.shortName ??
      hintCompany ??
      normalized
    ).trim()
    const enforcedTicker = normalizeTickerSymbol(
      enforcedTickerRaw.length > 0 ? enforcedTickerRaw : hintTicker ?? tickerLikeCandidate ?? normalized,
    )
    const enforcedCompanyName = (enforcedCompanyNameRaw.length > 0 ? enforcedCompanyNameRaw : (hintCompany ?? normalized)).trim()

    const profileContext = externalProfile
      ? `\n参考情報（外部データ）:\n- 証券コード: ${externalProfile.symbol}\n- 企業名候補: ${
          externalProfile.longName ?? externalProfile.shortName ?? "不明"
        }\n- 業種: ${externalProfile.industry ?? "不明"}\n- セクター: ${
          externalProfile.sector ?? "不明"
        }\n- 本社所在地: ${externalProfile.headquarters ?? "不明"}\n- 公式サイト: ${
          externalProfile.website ?? "不明"
        }\n`
      : ""

    const promptInput = `${enforcedCompanyName}（証券コード: ${enforcedTicker}）`

    const currentYear = new Date().getFullYear()

    const prompt = `あなたは金融アナリストAIです。
指定された日本企業または証券コードに関する最新の公開情報（決算・IR・ニュース等）を参考に、
投資判断に役立つ「強み」「課題」「見通し」を簡潔に抽出し、総合スコアを算出してください。

入力: ${promptInput}${profileContext}

以下の条件で出力してください：
- 出力形式は必ず JSON のみ（説明文やMarkdown記号は不要）
- 各項目は可能な限り${currentYear}年時点で最新の公開情報を用いる
- 最新性を確認できた最も遅い年月を lastUpdated（例: "${currentYear}年3月時点"）として付与する
- 最新情報が不明な場合は代表者などの項目に「情報未確認（◯◯年時点）」等の注記を入れる
- 代表者は原則として最新の代表取締役社長・CEO等の経営トップの氏名と役職を明記する
- 指定された証券コード（${enforcedTicker}）に該当する企業のみを対象とし、他社の情報を混在させない
- 出力する ticker は必ず "${enforcedTicker}" とし、判別不能な場合も同値を維持する
- company は可能な限り "${enforcedCompanyName}" の正式名称を用いる
- 会社名や証券コードが曖昧な場合は一般的に認知されている日本企業を前提に推定し、結果に明記する
- 各配列の最大要素数は：
  - strengths：3件（各60〜80文字で、定量的な指標や根拠を含める）
  - risks：3件（各60〜80文字で、リスクが顕在化する条件や確率も触れる）
  - outlook：3件（各60〜80文字で、時間軸や打ち手を明記する）
- スコアは 0〜100 の整数値
- commentary は総合スコアの簡潔な説明（60文字以内、矢印「→」から始める）
- analysisSummary は 2〜3 文（120〜180文字）で強み・課題・見通しの関係性や注目イベントを要約する
- 企業情報（代表者、所在地、資本金）も含める
- company には正式な企業名を入れる
- ticker には最も一般的な証券コード（判別できない場合は空文字）を入れる
- 日本語で出力する

出力フォーマット例：
{
  "company": "企業名",
  "ticker": "XXXX",
  "representative": "代表者名",
  "location": "所在地（都道府県・市区町村）",
  "capital": "資本金",
  "lastUpdated": "2024年3月時点",
  "strengths": ["強み1", "強み2", "強み3"],
  "risks": ["課題1", "課題2", "課題3"],
  "outlook": ["見通し1", "見通し2", "見通し3"],
  "score": 70,
  "commentary": "→スコアの簡潔な説明文。",
  "analysisSummary": "強みや課題、足元のイベントを繋いで状況を説明する文章。"
}`
    const primaryModelId = "gpt-5-nano"
    const fallbackModelId = "gpt-4o-mini"

    const buildRequestBody = (modelId: string) =>
      JSON.stringify({
        model: modelId,
        messages: [
          {
            role: "system",
            content: "You are a financial analyst assistant. Follow the provided instructions precisely and respond in Japanese only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      })

    const callModel = (modelId: string) =>
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: buildRequestBody(modelId),
      })

    let response = await callModel(primaryModelId)

    if (!response.ok && (response.status === 400 || response.status === 404 || response.status === 501)) {
      console.warn(`Primary model ${primaryModelId} unavailable (status ${response.status}); falling back to ${fallbackModelId}`)
      response = await callModel(fallbackModelId)
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error("OpenAI API error:", errorData)
      if (response.status === 429) {
        throw new Error("OpenAI APIのレート制限に達しました。少し時間を置いて再試行してください。")
      }
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content
    const text = (typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.join("") : "").trim()

    if (!text) {
      throw new Error("AI応答が空です")
    }

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("AI応答の解析に失敗しました")
    }

    const analysis = JSON.parse(jsonMatch[0])

    if (
      !analysis.company ||
      !analysis.representative ||
      !analysis.location ||
      !analysis.capital ||
      !analysis.strengths ||
      !analysis.risks ||
      !analysis.outlook ||
      !analysis.commentary ||
      !analysis.analysisSummary ||
      typeof analysis.score !== "number"
    ) {
      throw new Error("AI応答の形式が不正です")
    }

    const sanitizedCompanyName = sanitizeWikiValue(enforcedCompanyName)
    analysis.company = sanitizedCompanyName ?? enforcedCompanyName
    analysis.ticker = enforcedTicker

    let aiRepresentative: string | null = null
    if (typeof analysis.representative === "string" && analysis.representative.trim().length > 0) {
      const sanitizedRepresentative = sanitizeWikiValue(analysis.representative)
      if (sanitizedRepresentative) {
        analysis.representative = sanitizedRepresentative
        aiRepresentative = sanitizedRepresentative
      } else {
        delete analysis.representative
      }
    } else {
      delete analysis.representative
    }

    const edinetInfo = await fetchEdinetCompanyInfoByTicker(enforcedTicker, { forceRefresh: skipCache })
    const edinetRepresentative = edinetInfo?.representativeName
      ? composeRepresentative(edinetInfo.representativeName, edinetInfo.representativeTitle ?? null)
      : null

    const wikipediaOfficer = await fetchWikipediaRepresentative(enforcedCompanyName, enforcedTicker)
    let primaryOfficer = selectPrimaryOfficer(externalProfile?.officers ?? [])
    if (!primaryOfficer && wikipediaOfficer) {
      primaryOfficer = wikipediaOfficer
      if (externalProfile) {
        externalProfile.officers = [...(externalProfile.officers ?? []), wikipediaOfficer]
      }
    }
    const representativeOverride = composeRepresentative(primaryOfficer?.name, primaryOfficer?.title)
    const wikipediaRepresentative = composeRepresentative(wikipediaOfficer?.name, wikipediaOfficer?.title)
    const fmpRepresentative = externalProfile?.officers
      ? composeRepresentative(selectPrimaryOfficer(externalProfile.officers)?.name, selectPrimaryOfficer(externalProfile.officers)?.title)
      : null
    const normalizedAI = normalizeRepresentativeForComparison(aiRepresentative)
    const normalizedEdinet = normalizeRepresentativeForComparison(edinetRepresentative)
    const normalizedWikipedia = normalizeRepresentativeForComparison(wikipediaRepresentative)
    const normalizedFmp = normalizeRepresentativeForComparison(fmpRepresentative)
    const normalizedOverride = normalizeRepresentativeForComparison(representativeOverride)

    let finalRepresentative: string | null = null
    if (representativeOverride) {
      finalRepresentative = representativeOverride
    } else if (edinetRepresentative) {
      finalRepresentative =
        !normalizedAI || (normalizedEdinet && normalizedAI !== normalizedEdinet)
          ? edinetRepresentative
          : aiRepresentative ?? edinetRepresentative
    } else if (wikipediaRepresentative) {
      finalRepresentative =
        !normalizedAI || (normalizedWikipedia && normalizedAI !== normalizedWikipedia)
          ? wikipediaRepresentative
          : aiRepresentative ?? wikipediaRepresentative
    } else if (fmpRepresentative) {
      finalRepresentative =
        !normalizedAI || (normalizedFmp && normalizedAI !== normalizedFmp)
          ? fmpRepresentative
          : aiRepresentative ?? fmpRepresentative
    } else if (aiRepresentative) {
      finalRepresentative = aiRepresentative
    }

    if (!finalRepresentative) {
      finalRepresentative = `情報未確認（${currentYear}年時点）`
    }
    analysis.representative = finalRepresentative
    if (typeof analysis.analysisSummary === "string") {
      analysis.analysisSummary = analysis.analysisSummary.trim()
    }

    const normalizedFinalRepresentative = normalizeRepresentativeForComparison(analysis.representative)
    const usedEdinet =
      normalizedFinalRepresentative && normalizedEdinet && normalizedFinalRepresentative === normalizedEdinet
    const usedWikipedia =
      normalizedFinalRepresentative && normalizedWikipedia && normalizedFinalRepresentative === normalizedWikipedia
    const usedFmp = normalizedFinalRepresentative && normalizedFmp && normalizedFinalRepresentative === normalizedFmp
    const usedOverride =
      normalizedFinalRepresentative && normalizedOverride && normalizedFinalRepresentative === normalizedOverride
    const usedAI = normalizedFinalRepresentative && normalizedAI && normalizedFinalRepresentative === normalizedAI

    if (!usedOverride && !usedEdinet && !usedWikipedia && !usedFmp && usedAI) {
      analysis.representative = `情報未確認（${currentYear}年時点）`
    }

    if (edinetInfo?.companyName) {
      const sanitizedEdinetCompany = sanitizeWikiValue(edinetInfo.companyName)
      if (sanitizedEdinetCompany) {
        const existingCompany = typeof analysis.company === "string" ? analysis.company.trim() : ""
        if (!existingCompany || existingCompany.toLowerCase() === analysis.ticker.toLowerCase()) {
          analysis.company = sanitizedEdinetCompany
        }
      }
    }

    if (edinetInfo?.headOfficeAddress) {
      const edinetAddress = edinetInfo.headOfficeAddress.replace(/\s+/g, " ").trim()
      if (edinetAddress.length > 0) {
        analysis.location = edinetAddress
      }
    }

    if (edinetInfo?.capitalStock) {
      const formattedCapital = formatCapitalAmount(edinetInfo.capitalStock)
      if (formattedCapital) {
        analysis.capital = formattedCapital
      }
    }

    if (typeof analysis.lastUpdated !== "string" || analysis.lastUpdated.trim().length === 0) {
      analysis.lastUpdated = `${currentYear}年時点`
    }

    if (externalProfile?.headquarters && (typeof analysis.location !== "string" || analysis.location.trim().length === 0)) {
      analysis.location = externalProfile.headquarters
    }

    const normalizedExistingWebsite = normalizeWebsite(analysis.website)
    if (externalProfile?.website) {
      analysis.website = externalProfile.website
    } else if (normalizedExistingWebsite) {
      analysis.website = normalizedExistingWebsite
    } else if (analysis.website !== undefined) {
      analysis.website = undefined
    }

    const refinedTickerSource = (analysis.ticker ?? "").trim() || hintTicker || tickerLikeCandidate || normalized
    const refinedTicker = normalizeTickerSymbol(refinedTickerSource)
    const logo = await fetchCompanyLogo(refinedTicker, externalProfile?.website ?? analysis.website)
    const result = logo ? { ...analysis, logo } : analysis
    insightsCache.set(cacheKey, { timestamp: Date.now(), data: result })
    return NextResponse.json(result)
  } catch (error) {
    console.error("AI analysis error:", error)
    return NextResponse.json({ error: "分析中にエラーが発生しました。もう一度お試しください。" }, { status: 500 })
  }
}
