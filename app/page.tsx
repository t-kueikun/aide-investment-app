"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, BarChart3, ChevronLeft, ChevronRight, NotebookPen, ShieldCheck, Sparkles, Workflow } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "./providers"

const features = [
  {
    title: "競合比較を一目で",
    description: "最大3社の強み・課題・見通しをAIが自動生成し、投資判断のヒントを並べて確認できます。",
    icon: Sparkles,
  },
  {
    title: "日本語で実務的な要約",
    description: "決算やIR情報を踏まえた自然な日本語で、重要ポイントだけを簡潔にサマリー。",
    icon: NotebookPen,
  },
  {
    title: "カスタマイズ可能なワークフロー",
    description: "ロゴや基本指標を揃えて比較できるから、レポート作成や社内共有にもそのまま使えます。",
    icon: BarChart3,
  },
]

const painPoints = [
  {
    title: "決算資料を読み解く時間がない",
    description: "PDF と IR を渡り歩いてメモを作るだけで数時間。要点だけをまとめて比較したい。",
  },
  {
    title: "チームで共通認識が持てない",
    description: "担当者ごとに分析粒度が違い、社内共有資料の統一に苦労している。",
  },
  {
    title: "競合比較が後回しになりがち",
    description: "投資先の追いかけで精一杯。競合のアップデートまで手が回らない。",
  },
]

interface HeroSnapshot {
  ticker: string
  company: string
  strengths: string[]
  risks: string[]
  outlook: string[]
  score: number
}

const formatCompanyName = (name: string) => {
  const cleaned = name
    .replace(/(株式会社|ホールディングス?|グループ)/g, "")
    .replace(/(HD|ＨＤ|ホールディングス|Holdings)/gi, "")
    .trim()
  if (!cleaned) return name
  return cleaned.length > 14 ? `${cleaned.slice(0, 14)}…` : cleaned
}


const heroSnapshots: HeroSnapshot[] = [
  {
    ticker: "7203.T",
    company: "トヨタ自動車",
    strengths: ["HV/HEVで圧倒的シェアと収益力。", "グローバル供給網と在庫管理の強さ。", "ソフトウェア／コネクテッド戦略の加速。"],
    risks: ["EVシフト速度への懸念。", "北米依存度が高く需要サイクル影響。", "半導体不足や物流制約。"],
    outlook: ["EV・HV最適ミックスで利益確保。", "ソフトウェア収益化モデルの構築。", "新興国需要取り込みで成長継続。"],
    score: 84,
  },
  {
    ticker: "7267.T",
    company: "ホンダ",
    strengths: ["二輪・四輪の多角ポートフォリオ。", "電動化に向けたアライアンス活用。", "北米でのSUV/ピックアップの強さ。"],
    risks: ["EV投資負担で利益圧迫。", "為替・原材料高の影響。", "一部地域での販売競争激化。"],
    outlook: ["北米でのEV立ち上げと電池調達強化。", "二輪の高収益を成長投資に充当。", "ソフトウェア定義車への転換を推進。"],
    score: 78,
  },
  {
    ticker: "7201.T",
    company: "日産自動車",
    strengths: ["コスト改善とアライアンス活用。", "SUV・EVの拡充（Ariya 等）。", "新興国でのブランド認知。"],
    risks: ["北米価格競争とインセンティブ増。", "EVシフトの資金負担。", "為替変動とサプライ制約。"],
    outlook: ["電動化ラインナップを拡大。", "固定費削減で利益率回復を狙う。", "ソフトウェアとコネクテッド収益強化。"],
    score: 70,
  },
  {
    ticker: "7270.T",
    company: "SUBARU",
    strengths: ["AWD・SUVのブランド力。", "北米での高単価ラインアップ。", "安全技術（アイサイト）の訴求。"],
    risks: ["北米需要サイクルに強く依存。", "為替変動の影響。", "電動化投資の負担。"],
    outlook: ["ハイブリッド/EV投入で北米の規制対応。", "生産能力とサプライの安定化。", "SUV主力の価格維持で収益確保。"],
    score: 74,
  },
  {
    ticker: "7261.T",
    company: "マツダ",
    strengths: ["CXシリーズ中心のSUV比率向上。", "商品力とデザインで価格強化。", "北米での販売回復。"],
    risks: ["スケールが小さく投資負担が重い。", "為替と原材料の影響。", "電動化対応の遅れリスク。"],
    outlook: ["ハイブリッド導入とEV展開を前倒し。", "価格維持とミックス改善で収益底上げ。", "北米・欧州での販売網強化。"],
    score: 68,
  },
]

const workflowSteps = [
  {
    step: "STEP 1",
    title: "ティッカーを入力",
    description: "国内銘柄コードを最大3つまで指定。人気セットからワンクリック選択も可能です。",
    icon: Workflow,
  },
  {
    step: "STEP 2",
    title: "AIが要約を生成",
    description: "強み・課題・見通し・スコアを日本語で自動作成。ロゴや基本情報も揃えて一覧に。",
    icon: Sparkles,
  },
  {
    step: "STEP 3",
    title: "チームで共有・保存",
    description: "比較結果をそのまま議論やレポートに転用。履歴保存や再分析もワンクリックです。",
    icon: ShieldCheck,
  },
]

const exampleComparisons = [
  {
    title: "国内大手OEM",
    description: "トヨタ・ホンダ・日産の電動化と収益力を横並びでチェック。",
    tickers: ["7203.T", "7267.T", "7201.T"],
    highlight: "北米依存度とEV投資負担、ソフトウェア収益化の進捗",
    scoreRange: "70 - 84",
  },
  {
    title: "SUV/AWD 強みの3社",
    description: "SUBARU・マツダ・三菱自でSUV/4WDラインを比較。",
    tickers: ["7270.T", "7261.T", "7211.T"],
    highlight: "SUV比率と価格維持、電動化ロードマップの差",
    scoreRange: "64 - 76",
  },
  {
    title: "小型・新興国ドライブ",
    description: "スズキを中心に小型車と新興国展開の強みを比較。",
    tickers: ["7269.T", "7267.T", "7203.T"],
    highlight: "新興国シェア、電動化コスト転嫁、為替耐性",
    scoreRange: "68 - 82",
  },
]

const faqs = [
  {
    question: "無料で使い続けられますか？",
    answer:
      "個人利用向けのフリープランを用意しています。比較回数に制限はありますが、主要機能はそのままお試しいただけます。",
  },
  {
    question: "海外銘柄にも対応していますか？",
    answer:
      "現在は東証上場企業を中心に最適化しています。米国株など海外マーケットにも順次対応予定です。",
  },
  {
    question: "生成された分析結果は保存できますか？",
    answer:
      "アカウント作成後、ダッシュボードから比較結果を保存・再利用できます。今後は共有リンクや PDF エクスポートも追加予定です。",
  },
  {
    question: "自社のカスタム指標を組み込めますか？",
    answer:
      "はい。エンタープライズプランでは、貴社の KPI や評価項目を反映したカスタムテンプレートを構築できます。",
  },
]

export default function LandingPage() {
  const { user } = useAuth()
  const [activeCompanyIndex, setActiveCompanyIndex] = useState(0)
  const [heroInsights, setHeroInsights] = useState<Record<string, HeroSnapshot>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      for (const company of heroSnapshots) {
        try {
          const response = await fetch(`/api/insights?ticker=${encodeURIComponent(company.ticker)}`)
          if (!response.ok) continue
          const data = await response.json()
          if (cancelled) return

          const snapshot: HeroSnapshot = {
            ticker: company.ticker,
            company: typeof data.company === "string" ? data.company : company.company,
            strengths:
              Array.isArray(data.strengths) && data.strengths.length > 0
                ? data.strengths.slice(0, 3)
                : company.strengths,
            risks:
              Array.isArray(data.risks) && data.risks.length > 0 ? data.risks.slice(0, 3) : company.risks,
            outlook:
              Array.isArray(data.outlook) && data.outlook.length > 0
                ? data.outlook.slice(0, 3)
                : company.outlook,
            score: typeof data.score === "number" ? data.score : company.score,
          }

          setHeroInsights((prev) => ({ ...prev, [company.ticker]: snapshot }))
        } catch (error) {
          console.error("Failed to fetch hero insight", error)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const activeConfig = heroSnapshots[activeCompanyIndex]
  const activeCompany = heroInsights[activeConfig.ticker] ?? activeConfig
  const displayCompanyName = formatCompanyName(activeCompany.company)
  const glassButtonClass =
    "rounded-full border border-white/40 bg-white/30 px-6 font-semibold text-foreground shadow-[0_18px_45px_rgba(2,6,23,0.18)] backdrop-blur-lg hover:bg-white/40 dark:border-white/15 dark:bg-white/10 dark:text-white"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <section className="border-b border-border/70 bg-linear-to-b from-background to-muted/40 dark:from-slate-950 dark:to-slate-900">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-2 md:items-center">
            <div className="space-y-8">
              <p className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
                投資先の比較を、もっと簡単に
              </p>
              <h1 className="text-4xl font-semibold md:text-5xl">
                企業の強み・リスクをAIが要約。比較と判断をこれ1つで。
              </h1>
              <p className="text-lg leading-8 text-muted-foreground">
                証券コードを入力するだけで、競合との相対的な立ち位置や押さえるべきポイントを抽出。投資メモづくりやチームでの検討にすぐ活用できます。
              </p>
              <div className="flex flex-wrap gap-4">
                {user ? (
                  <>
                    <Button size="lg" className="rounded-full px-6 font-semibold" asChild>
                      <Link href="/dashboard">
                        ダッシュボードを開く
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className={glassButtonClass} asChild>
                      <Link
                        href={{
                          pathname: "/dashboard",
                          query: { tickers: exampleComparisons[0].tickers.join(",") },
                        }}
                      >
                        自動車3社で試す
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="lg" className="rounded-full px-6 font-semibold" asChild>
                      <Link href="/sign-up">
                        無料で使ってみる
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="rounded-full px-6 font-semibold" asChild>
                      <Link href="/dashboard">デモを見る</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-4xl border border-white/35 bg-white/85 text-foreground shadow-[0_30px_80px_rgba(2,6,23,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:text-white">
              <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.12),transparent_32%),radial-gradient(circle_at_80%_15%,rgba(94,234,212,0.1),transparent_30%),radial-gradient(circle_at_60%_85%,rgba(244,63,94,0.08),transparent_40%)]" />
              <div className="relative space-y-6 px-6 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4 md:flex-nowrap">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                      Snapshot
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-white/60 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-white">
                        {activeCompany.ticker}
                      </span>
                      <p className="text-xl font-semibold text-foreground dark:text-white">{displayCompanyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-start rounded-3xl border border-white/50 bg-white/75 px-4 py-2 text-right shadow-sm backdrop-blur dark:border-white/15 dark:bg-white/10">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Score</p>
                      <p className="text-3xl font-bold text-primary dark:text-white">
                        {activeCompany.score}
                        <span className="ml-1 text-xs font-semibold text-muted-foreground">/100</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full border-white/60 bg-white/70 text-foreground shadow-sm hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white"
                        onClick={() =>
                          setActiveCompanyIndex((prev) => (prev - 1 + heroSnapshots.length) % heroSnapshots.length)
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full border-white/60 bg-white/70 text-foreground shadow-sm hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white"
                        onClick={() => setActiveCompanyIndex((prev) => (prev + 1) % heroSnapshots.length)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { title: "強み", accent: "text-blue-600", bullet: "bg-blue-500", items: activeCompany.strengths.slice(0, 3) },
                    { title: "課題", accent: "text-rose-600", bullet: "bg-rose-500", items: activeCompany.risks.slice(0, 3) },
                    { title: "見通し", accent: "text-emerald-600", bullet: "bg-emerald-500", items: activeCompany.outlook.slice(0, 3) },
                  ].map((section) => (
                    <div
                      key={section.title}
                      className="rounded-3xl border border-white/50 bg-white/80 px-5 py-4 shadow-[0_18px_40px_rgba(2,6,23,0.08)] backdrop-blur dark:border-white/15 dark:bg-white/10"
                    >
                      <p className={`text-[12px] font-semibold uppercase tracking-wide ${section.accent}`}>{section.title}</p>
                      {section.items.length > 0 ? (
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground dark:text-white/90">
                          {section.items.map((item, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className={`mt-2 h-1.5 w-1.5 rounded-full ${section.bullet}`} />
                              <span className="line-clamp-3">{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-[12px] text-muted-foreground">分析を取得しています...</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid gap-10 md:grid-cols-3">
            <div className="md:col-span-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">こんな課題はありませんか？</p>
              <h2 className="mt-4 text-3xl font-semibold text-foreground">投資情報の整理に追われる時間を削減</h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                NOLENN は投資判断の現場で繰り返される手作業を代替します。よくあるボトルネックを解消することで、議論に集中できる環境を整えます。
              </p>
            </div>
            <div className="md:col-span-2 grid gap-6">
              {painPoints.map((item) => (
                <div key={item.title} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="mb-12">
            <h2 className="text-3xl font-semibold text-foreground">NOLENN が選ばれる理由</h2>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
              情報収集から比較、チームでの共有まで。投資判断に必要なステップを一つのワークスペースで完結させます。
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-3xl border border-border bg-card p-8 shadow-sm">
                <feature.icon className="h-10 w-10 rounded-full border border-blue-100 bg-blue-50 p-2 text-blue-600" />
                <h3 className="mt-6 text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        

        <section className="border-y border-border bg-card">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="mb-12 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Workflow</p>
              <h2 className="mt-4 text-3xl font-semibold text-foreground">使い方はたったの 3 ステップ</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {workflowSteps.map((step) => (
                <div key={step.step} className="rounded-3xl border border-border bg-muted p-8 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">{step.step}</p>
                  <step.icon className="mt-4 h-10 w-10 text-blue-600" />
                  <h3 className="mt-4 text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(240,244,255,0.7))] backdrop-blur-xl dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.95),rgba(2,6,23,1))]">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="mb-12">
              <h2 className="text-3xl font-semibold text-foreground">人気の比較事例</h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                業界やテーマごとの代表的な比較セットを用意。ボタン一つでダッシュボードに読み込み、すぐに分析結果をチェックできます。
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {exampleComparisons.map((example) => (
                <div
                  key={example.title}
                  className="flex flex-col justify-between rounded-3xl border border-white/30 bg-white/70 p-6 text-foreground shadow-[0_20px_60px_rgba(2,6,23,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary/80 dark:text-primary/60">Ticker Set</p>
                      <p className="mt-1 text-sm text-muted-foreground">{example.tickers.join(" / ")}</p>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">{example.title}</h3>
                    <p className="text-sm leading-6 text-foreground">{example.description}</p>
                    <div className="rounded-2xl border border-white/30 bg-white/60 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:border-white/15 dark:bg-white/5">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">注目ポイント</p>
                      <p className="mt-2 text-sm text-foreground">{example.highlight}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium text-muted-foreground">スコア帯</p>
                      <p className="text-muted-foreground">{example.scoreRange}</p>
                    </div>
                    <Button asChild variant="outline" className={glassButtonClass}>
                      <Link
                        href={{
                          pathname: "/dashboard",
                          query: { tickers: example.tickers.join(",") },
                        }}
                      >
                        ダッシュボードで見る
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="mb-10 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">FAQ</p>
              <h2 className="mt-4 text-3xl font-semibold text-foreground">よくある質問</h2>
            </div>
            <div className="mx-auto max-w-3xl space-y-6">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-3xl border border-border bg-muted p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-foreground">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),rgba(226,232,240,0.6))] backdrop-blur-xl dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.9),rgba(2,6,23,1))]">
          <div className="mx-auto max-w-6xl px-6 py-16 text-center">
            <h2 className="text-3xl font-semibold text-foreground">投資判断をスピードアップしましょう</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              サインアップしてダッシュボードにアクセス。気になる企業の比較を数分で始められます。
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {user ? (
                <>
                  <Button size="lg" className="rounded-full px-6 font-semibold" asChild>
                    <Link href="/dashboard">ダッシュボードを開く</Link>
                  </Button>
                  <Button size="lg" variant="outline" className={glassButtonClass} asChild>
                    <Link
                      href={{
                        pathname: "/dashboard",
                        query: { tickers: exampleComparisons[1].tickers.join(",") },
                      }}
                    >
                      人気セットを読み込む
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" className="rounded-full px-6 font-semibold" asChild>
                    <Link href="/sign-up">今すぐ登録する</Link>
                  </Button>
                  <Button size="lg" variant="outline" className={glassButtonClass} asChild>
                    <Link href="/sign-in">既にアカウントをお持ちの方</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
