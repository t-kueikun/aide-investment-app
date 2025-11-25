import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const GEMINI_SUGGESTION_MODEL = process.env.SUGGESTION_GEMINI_MODEL ?? "gemini-2.5-flash"
const MAX_SUGGESTIONS = 6

interface SuggestionContext {
  ticker?: string
  name?: string
  sector?: string | null
  industry?: string | null
}

interface Suggestion {
  ticker: string
  name: string
  reason?: string
}

export async function POST(request: NextRequest) {
  let payload: any
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON ボディを解釈できませんでした。" }, { status: 400 })
  }

  const tickersInput: unknown[] = Array.isArray(payload?.tickers) ? payload.tickers : []
  const tickers = tickersInput
    .map((ticker) => (typeof ticker === "string" ? ticker.trim() : ""))
    .filter((ticker) => ticker.length > 0)
    .slice(0, MAX_SUGGESTIONS)
  const preferredMarket: "jp" | "us" = payload?.preferredMarket === "us" ? "us" : "jp"
  const contextInput: unknown[] = Array.isArray(payload?.companies) ? payload.companies : []
  const context: SuggestionContext[] = contextInput
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const candidate = entry as Record<string, unknown>
      const ticker = typeof candidate.ticker === "string" ? candidate.ticker.trim() : ""
      const name = typeof candidate.name === "string" ? candidate.name.trim() : ""
      const sector = typeof candidate.sector === "string" ? candidate.sector.trim() : ""
      const industry = typeof candidate.industry === "string" ? candidate.industry.trim() : ""
      if (!ticker && !name && !sector && !industry) return null
      return {
        ticker: ticker || undefined,
        name: name || undefined,
        sector: sector || undefined,
        industry: industry || undefined,
      }
    })
    .filter((entry): entry is SuggestionContext => entry !== null)
    .slice(0, 10)

  const rangeBase = typeof payload?.rangeBase === "number" ? payload.rangeBase : null
  const prompt = buildPrompt({ tickers, preferredMarket, context, rangeBase })
  let lastError: Error | null = null

  if (!process.env.GEMINI_API_KEY) {
    return respondWithFallback("候補生成には GEMINI_API_KEY が必要です。環境変数を設定してください。")
  }

  try {
    const geminiSuggestions = await generateGeminiSuggestions(prompt)
    if (geminiSuggestions.length > 0) {
      return NextResponse.json({ suggestions: geminiSuggestions.slice(0, MAX_SUGGESTIONS) })
    }
    lastError = new Error("Gemini から候補を取得できませんでした。")
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error))
    console.error("Gemini suggestions error:", lastError)
  }

  const message =
    lastError?.message ?? "候補の生成に失敗しました。少し時間を置いてから再度お試しください。"
  return respondWithFallback(message)
}

function respondWithFallback(message: string) {
  return NextResponse.json({ suggestions: [], error: message, fallback: true })
}

async function generateGeminiSuggestions(prompt: string): Promise<Suggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません。")

  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({ model: GEMINI_SUGGESTION_MODEL })
  const result = await model.generateContent(prompt)

  const text =
    result.response?.text?.() ??
    result.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
    ""
  if (!text || typeof text !== "string") {
    throw new Error("Gemini からテキスト応答を取得できませんでした。")
  }
  return parseSuggestionsFromText(text)
}

function buildPrompt({
  tickers,
  preferredMarket,
  context,
  rangeBase,
}: {
  tickers: string[]
  preferredMarket: "jp" | "us"
  context: SuggestionContext[]
  rangeBase?: number | null
}) {
  const marketLabel = preferredMarket === "us" ? "米国市場" : "日本市場"
  const tickerRule =
    preferredMarket === "us"
      ? "ティッカーは米国形式（例: MSFT, NVDA）。"
      : 'ティッカーは東証形式で末尾に ".T" を付与（例: 6501.T）。'
  const nameRule = preferredMarket === "us" ? "企業名は英語で記述。" : "企業名は正式な日本語名称で記述。"
  const baseTickers = tickers.length > 0 ? tickers.join(", ") : "なし"
  const contextJson = context.length > 0 ? JSON.stringify(context, null, 2) : "[]"
  const rangeRule =
    preferredMarket === "jp" && typeof rangeBase === "number"
      ? `- JPX番台ルール: ${rangeBase}〜${rangeBase + 99} の4桁コードに限定し、末尾に ".T" を付ける。`
      : null
  const rangeEmphasis =
    preferredMarket === "jp" && typeof rangeBase === "number"
      ? `- ${rangeBase} 番台で特に時価総額や出来高が大きい代表的な企業（例: ${rangeBase}台の大手・業界リーダー）を2社以上含める。`
      : null

  return [
    "あなたは投資判断を支援するアシスタントです。",
    `対象市場: ${marketLabel}`,
    tickerRule,
    nameRule,
    rangeRule,
    rangeEmphasis,
    "以下の既存リストと同じ業種・テーマの上場企業を最大6件提案してください。",
    `既に比較中のティッカー: ${baseTickers}`,
    `既に分析済み企業の文脈: ${contextJson}`,
    "",
    "要件:",
    "1. 既存ティッカーと同業界・サプライチェーンに属する企業を優先。",
    "2. 既存ティッカーと重複させない。",
    "3. 各候補に 15〜30 文字ほどの日本語理由（共通性や注目ポイント）を付与。",
    "4. 追加の文章やコードブロックは書かず、JSON 配列のみを返す。",
    '5. 出力形式: [{"ticker":"","name":"","reason":""}]',
    "6. 理由がない場合は空文字ではなく簡潔な日本語を生成する。",
    "7. 有名銘柄や大型株を優先し、存在しないコードを捏造しない。",
  ]
    .filter((line): line is string => typeof line === "string" && line.length > 0)
    .join("\n")
}

function extractJsonSegment(text: string): string | null {
  if (!text) return null
  const fencedMatch = text.match(/```json([\s\S]*?)```/i)
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1]
  }
  const genericFence = text.match(/```([\s\S]*?)```/i)
  if (genericFence && genericFence[1]) {
    return genericFence[1]
  }
  return text
}

function parseSuggestionsFromText(text: string): Suggestion[] {
  const segment = extractJsonSegment(text) ?? ""
  const trimmed = segment.trim()
  const arrayStart = trimmed.indexOf("[")
  const arrayEnd = trimmed.lastIndexOf("]")
  const jsonSlice =
    arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart
      ? trimmed.slice(arrayStart, arrayEnd + 1)
      : trimmed
  try {
    const parsed: unknown = JSON.parse(jsonSlice)
    let items: unknown[] = []
    if (Array.isArray(parsed)) {
      items = parsed
    } else if (parsed && typeof parsed === "object") {
      const suggestions = (parsed as Record<string, unknown>).suggestions
      if (Array.isArray(suggestions)) {
        items = suggestions
      }
    }
    return sanitizeSuggestionItems(items)
  } catch (error) {
    console.warn("Failed to parse suggestion JSON:", error)
    return []
  }
}

function sanitizeSuggestionItems(items: unknown[]): Suggestion[] {
  const suggestions: Suggestion[] = []
  const seen = new Set<string>()
  for (const item of items) {
    if (!item || typeof item !== "object") continue
    const record = item as Record<string, unknown>
    const ticker = typeof record.ticker === "string" ? record.ticker.trim() : ""
    const name = typeof record.name === "string" ? record.name.trim() : ""
    const reason =
      typeof record.reason === "string" && record.reason.trim().length > 0 ? record.reason.trim() : undefined
    if (!ticker || !name) continue
    const key = ticker.toUpperCase()
    if (seen.has(key)) continue
    seen.add(key)
    suggestions.push({ ticker, name, reason })
  }
  return suggestions
}
