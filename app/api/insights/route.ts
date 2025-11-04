import { type NextRequest, NextResponse } from "next/server"

const MOCK_DATA: Record<string, any> = {
  "9831.T": {
    company: "ヤマダホールディングス",
    ticker: "9831.T",
    founded: "1983年9月",
    representative: "山田 昇",
    location: "群馬県高崎市",
    capital: "711億円",
    strengths: ["住宅×家電の連携による高単価販売", "プライベートブランド比率の上昇", "リフォーム・リユース事業の成長"],
    risks: ["家電単体販売の利益率が低い", "ECシフトへの対応が遅れ気味", "都市部での店舗網が限定的"],
    outlook: ["住宅・家電一体モデルの拡大余地", "DX化で在庫・人員源泉が進展", "低価格競争から脱却し収益構造へ"],
    score: 72,
    commentary: "→「成熟×再成長」フェーズ。リフォーム事業が収益を押し上げ。",
  },
  "7419.T": {
    company: "ノジマ",
    ticker: "7419.T",
    founded: "1962年4月",
    representative: "野島 廣司",
    location: "神奈川県横浜市",
    capital: "63億3,050万円",
    strengths: ["通信キャリア販売と家電の相乗効果", "提案型接客による高い顧客満足度", "グループ会社とのDX連携が進む"],
    risks: ["人件費や店舗運営コストの上昇", "非家電領域の収益基盤がまだ弱い", "全国展開スピードが緩やか"],
    outlook: ["通信×家電モデルの深化に期待", "EC併用で営業効率が向上傾向", "成長率は安定も収益性改善がカギ"],
    score: 63,
    commentary: "→顧客接点の強さが武器。利益率改善に向けた再構築期。",
  },
  "3048.T": {
    company: "ビックカメラ",
    ticker: "3048.T",
    founded: "1983年9月1日",
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
  },
}

interface InsightCacheEntry {
  timestamp: number
  data: Record<string, unknown>
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 6
const insightsCache = new Map<string, InsightCacheEntry>()

const YAHOO_FINANCE_ENDPOINT = "https://query2.finance.yahoo.com/v10/finance/quoteSummary"
const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; AIDE/1.0; +https://aide-investment-app.local)",
  Accept: "application/json",
} as const
const RAPIDAPI_HOST = "apidojo-yahoo-finance-v1.p.rapidapi.com"
const APIDOJO_PROFILE_ENDPOINT = `https://${RAPIDAPI_HOST}/stock/v2/get-profile`
const WIKIPEDIA_API_ENDPOINT = "https://ja.wikipedia.org/w/api.php"
const WIKIPEDIA_USER_AGENT = "AIDE-Investment-App/1.0 (+https://aide.example.com)"

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
  const cleaned = stripWikiMarkup(value)
    .replace(/^\s*[*•\-]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned.length > 0 ? cleaned : null
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
    const rawValue = keyMatch[2]
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

async function fetchWikipediaRepresentative(name: string | null, fallbackTicker: string): Promise<OfficerInfo | null> {
  const queryName = name?.trim()
  if (!queryName) return null

  const searchQueries = Array.from(
    new Set(
      [
        queryName,
        queryName.replace(/（.*?）/g, "").trim(),
        queryName.replace(/株式会社/g, "").trim(),
        `${queryName} 株式会社`.trim(),
        fallbackTicker.replace(/\.T$/i, ""),
      ].filter((candidate) => candidate && candidate.length > 0),
    ),
  ) as string[]

  for (const searchQuery of searchQueries) {
    try {
      const searchParams = new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: searchQuery,
        srlimit: "3",
        format: "json",
        formatversion: "2",
        redirects: "1",
      })
      const searchResponse = await fetch(`${WIKIPEDIA_API_ENDPOINT}?${searchParams.toString()}`, {
        headers: {
          "User-Agent": WIKIPEDIA_USER_AGENT,
        },
        next: { revalidate: 60 * 60 * 24 },
      })

      if (!searchResponse.ok) {
        continue
      }

      const searchData = await searchResponse.json()
      const titles: string[] = Array.isArray(searchData?.query?.search)
        ? searchData.query.search
            .map((entry: { title?: string }) => entry?.title)
            .filter((title: unknown): title is string => typeof title === "string" && title.trim().length > 0)
        : []

      for (const title of titles.slice(0, 3)) {
        try {
          const parseParams = new URLSearchParams({
            action: "parse",
            page: title,
            prop: "wikitext",
            format: "json",
            formatversion: "2",
            redirects: "1",
          })
          const parseResponse = await fetch(`${WIKIPEDIA_API_ENDPOINT}?${parseParams.toString()}`, {
            headers: {
              "User-Agent": WIKIPEDIA_USER_AGENT,
            },
            next: { revalidate: 60 * 60 * 24 },
          })

          if (!parseResponse.ok) continue
          const parseData = await parseResponse.json()
          const wikitext = parseData?.parse?.wikitext
          if (typeof wikitext !== "string") continue
          const officer = extractRepresentativeFromWikitext(wikitext)
          if (officer) return officer
        } catch (error) {
          console.error("Wikipedia parse error:", error)
        }
      }
    } catch (error) {
      console.error("Wikipedia search error:", error)
    }
  }

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
}

function mapQuoteSummaryResult(result: Record<string, any> | undefined, fallbackTicker: string): ExternalCompanyProfile | null {
  if (!result) return null
  const node = result?.quoteSummary?.result?.[0] ?? result
  if (!node) return null
  const price = node.price as Record<string, any> | undefined
  const summaryProfile = node.summaryProfile as Record<string, any> | undefined
  const assetProfile = node.assetProfile as Record<string, any> | undefined

  const symbol =
    typeof price?.symbol === "string" && price.symbol.trim().length > 0 ? price.symbol.trim() : fallbackTicker
  const longNameCandidate = typeof price?.longName === "string" ? price.longName : undefined
  const shortNameCandidate = typeof price?.shortName === "string" ? price.shortName : undefined
  const industryCandidate =
    typeof summaryProfile?.industry === "string"
      ? summaryProfile.industry
      : typeof assetProfile?.industry === "string"
        ? assetProfile.industry
        : null
  const sectorCandidate =
    typeof summaryProfile?.sector === "string"
      ? summaryProfile.sector
      : typeof assetProfile?.sector === "string"
        ? assetProfile.sector
        : null
  const headquarters =
    formatHeadquarters(summaryProfile) ??
    formatHeadquarters(assetProfile) ??
    null
  const website = normalizeWebsite(summaryProfile?.website ?? assetProfile?.website)

  const officers: OfficerInfo[] = Array.isArray(assetProfile?.companyOfficers)
    ? assetProfile.companyOfficers
        .filter((officer: any) => typeof officer === "object" && officer !== null)
        .map((officer: any) => ({
          name: typeof officer?.name === "string" ? officer.name.trim() : null,
          title: typeof officer?.title === "string" ? officer.title.trim() : null,
        }))
        .filter((officer: OfficerInfo) => officer.name !== null || officer.title !== null)
    : []

  return {
    symbol,
    longName: longNameCandidate ?? shortNameCandidate ?? null,
    shortName: shortNameCandidate ?? null,
    industry: industryCandidate,
    sector: sectorCandidate,
    headquarters,
    website,
    officers,
  }
}

async function fetchCompanyProfile(ticker: string): Promise<ExternalCompanyProfile | null> {
  if (!ticker) return null
  const rapidApiKey = process.env.RAPIDAPI_KEY

  if (rapidApiKey) {
    try {
      const params = new URLSearchParams({
        symbol: ticker,
        region: ticker.toUpperCase().endsWith(".T") ? "JP" : "US",
      })
      const response = await fetch(`${APIDOJO_PROFILE_ENDPOINT}?${params.toString()}`, {
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
        },
        next: { revalidate: 60 * 10 },
      })

      if (response.ok) {
        const payload = await response.json()
        const mapped = mapQuoteSummaryResult(payload as Record<string, any>, ticker)
        if (mapped) {
          if (mapped.officers.length === 0) {
            const wikiOfficer = await fetchWikipediaRepresentative(mapped.longName ?? mapped.shortName ?? ticker, ticker)
            if (wikiOfficer) mapped.officers = [wikiOfficer]
          }
          return mapped
        }
      } else {
        const bodyText = await response.text().catch(() => "")
        console.error("RapidAPI Yahoo Finance error:", response.status, bodyText.slice(0, 200))
      }
    } catch (error) {
      console.error("RapidAPI Yahoo Finance fetch error:", error)
    }
  }

  try {
    const response = await fetch(
      `${YAHOO_FINANCE_ENDPOINT}/${encodeURIComponent(ticker)}?modules=price,summaryProfile,assetProfile`,
      {
        headers: YAHOO_HEADERS,
        next: { revalidate: 60 * 10 },
      },
    )

    if (!response.ok) {
      return null
    }

    const payload = await response.json()
    const mapped = mapQuoteSummaryResult(payload, ticker)
    if (mapped) {
      if (mapped.officers.length === 0) {
        const wikiOfficer = await fetchWikipediaRepresentative(mapped.longName ?? mapped.shortName ?? ticker, ticker)
        if (wikiOfficer) mapped.officers = [wikiOfficer]
      }
      return mapped
    }
  } catch (error) {
    console.error("Company profile fetch error:", error)
  }

  return null
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

  if (!identifier) {
    return NextResponse.json({ error: "会社名または証券コードを入力してください" }, { status: 400 })
  }

  const normalized = identifier.trim()
  if (!normalized) {
    return NextResponse.json({ error: "会社名または証券コードを入力してください" }, { status: 400 })
  }

  const tickerLikeCandidate =
    /^[0-9A-Za-z.\-:]+$/.test(normalized) ? normalizeTickerSymbol(normalized) : undefined
  const alias =
    ALIAS_MAP[normalized.toLowerCase()] ??
    (tickerLikeCandidate ? ALIAS_MAP[tickerLikeCandidate.toLowerCase()] : undefined)
  const hintTicker = alias?.ticker ?? tickerLikeCandidate
  const hintCompany = alias?.company
  const cacheKey = (hintTicker ?? normalized).toLowerCase()

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
    if (profile?.longName) data.company = profile.longName
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
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data)
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini APIキーが設定されていません。環境変数 GEMINI_API_KEY を設定してください。" },
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
    const enforcedCompanyNameRaw = (externalProfile?.longName ?? hintCompany ?? normalized).trim()
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
  - strengths：3件（各30文字以内）
  - risks：3件（各30文字以内）
  - outlook：3件（各30文字以内）
- スコアは 0〜100 の整数値
- commentary は総合スコアの簡潔な説明（50文字以内）
- 企業情報（設立年、代表者、所在地、資本金）も含める
- company には正式な企業名を入れる
- ticker には最も一般的な証券コード（判別できない場合は空文字）を入れる
- 日本語で出力する

出力フォーマット例：
{
  "company": "企業名",
  "ticker": "XXXX",
  "founded": "1983年9月",
  "representative": "代表者名",
  "location": "所在地（都道府県・市区町村）",
  "capital": "資本金",
  "lastUpdated": "2024年3月時点",
  "strengths": ["強み1", "強み2", "強み3"],
  "risks": ["課題1", "課題2", "課題3"],
  "outlook": ["見通し1", "見通し2", "見通し3"],
  "score": 70,
  "commentary": "→スコアの簡潔な説明文。"
}`
    const primaryModelId = "gemini-2.5-flash-lite"
    const fallbackModelId = "gemini-2.0-flash"
    const requestBody = JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
      },
    })

    const callModel = (modelId: string) =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody,
      })

    let response = await callModel(primaryModelId)

    if (!response.ok && (response.status === 400 || response.status === 404 || response.status === 501)) {
      console.warn(`Primary model ${primaryModelId} unavailable (status ${response.status}); falling back to ${fallbackModelId}`)
      response = await callModel(fallbackModelId)
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Gemini API error:", errorData)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim()

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
      !analysis.founded ||
      !analysis.representative ||
      !analysis.location ||
      !analysis.capital ||
      !analysis.strengths ||
      !analysis.risks ||
      !analysis.outlook ||
      !analysis.commentary ||
      typeof analysis.score !== "number"
    ) {
      throw new Error("AI応答の形式が不正です")
    }

    const sanitizedCompanyName = sanitizeWikiValue(enforcedCompanyName)
    analysis.company = sanitizedCompanyName ?? enforcedCompanyName
    analysis.ticker = enforcedTicker
    let primaryOfficer = selectPrimaryOfficer(externalProfile?.officers ?? [])
    if (!primaryOfficer) {
      const wikiOfficer = await fetchWikipediaRepresentative(enforcedCompanyName, enforcedTicker)
      if (wikiOfficer) {
        primaryOfficer = wikiOfficer
        if (externalProfile) {
          externalProfile.officers = [...(externalProfile.officers ?? []), wikiOfficer]
        }
      }
    }
    const representativeOverride = composeRepresentative(primaryOfficer?.name, primaryOfficer?.title)
    if (representativeOverride) {
      analysis.representative = representativeOverride
    } else if (typeof analysis.representative === "string") {
      const sanitizedRepresentative = sanitizeWikiValue(analysis.representative)
      if (sanitizedRepresentative) {
        analysis.representative = sanitizedRepresentative
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
