"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, BarChart3, ChevronLeft, ChevronRight, NotebookPen, ShieldCheck, Sparkles, Workflow } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "./providers"
import { getAuth, signOut } from "firebase/auth"

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

const mobileNavTabs = ["ウォッチ", "比較", "アラート"] as const

const mobileInsightHighlight = {
  ticker: "9201.T",
  company: "日本航空",
  status: "安定モード",
  score: 74,
  change: "+1.2%",
  summary: "国際線の回復で稼働率がリバウンド。燃油コストはサーチャージでコントロール。",
  bullets: [
    "訪日需要の回復で国際線収益が改善。",
    "貨物のスローダウンもサービス改良で補完。",
    "AIメモ：コスト削減策を年次報告書から抽出済み。",
  ],
  metrics: [
    { label: "更新", value: "15分前" },
    { label: "AIメモ", value: "3件" },
    { label: "リマインダー", value: "本日19:00" },
  ],
}

const mobileUiPreviews = [
  {
    title: "片手で比較を更新",
    description: "ウォッチ中の企業をモバイルから再分析。Slackやメール通知から直接AI要約へジャンプできます。",
    tag: "Live更新",
    highlights: ["1日9社までモバイル優先処理", "通知センターに最新スコアを配信"],
  },
  {
    title: "アラートとメモを一体管理",
    description: "決算やリスクイベントを検知するとAIが要点を整理してメモと紐づけ。移動中でも抜け漏れなし。",
    tag: "Smart Alert",
    highlights: ["イベント感知でコメント自動生成", "Slack / Teams にも共有"],
  },
] as const

interface HeroSnapshot {
  ticker: string
  company: string
  strengths: string[]
  risks: string[]
  outlook: string[]
  score: number
}

const heroSnapshots: HeroSnapshot[] = [
  {
    ticker: "9831.T",
    company: "ヤマダ電機",
    strengths: ["住宅・リフォームとの連携で高単価モデルを確立。", "PB強化とリユース事業が伸長。", "店舗×ECの統合で来店価値を向上。"],
    risks: ["EC対応の遅れが粗利に響く懸念。", "家電単独販売の利益率が低め。", "都市部での店舗網拡大が課題。"],
    outlook: ["住宅×家電モデルの深耕で再成長フェーズへ。", "DX投資で在庫・人員効率化が進む見込み。", "リフォーム需要取り込みで収益改善期待。"],
    score: 72,
  },
  {
    ticker: "7419.T",
    company: "ノジマ",
    strengths: ["通信キャリア販売のシナジーが高い。", "提案型接客で顧客満足度が高水準。", "グループ横断のDXが営業効率を押し上げ。"],
    risks: ["人件費と運営コストが増加傾向。", "非家電領域の収益がまだ脆弱。", "全国展開スピードが緩やか。"],
    outlook: ["通信×家電モデルの深化で売上安定化を狙う。", "EC併用で営業効率が改善。", "利益率改善の再構築期にある。"],
    score: 63,
  },
  {
    ticker: "3048.T",
    company: "ビックカメラ",
    strengths: ["都市立地＋EC連携で高回転モデル。", "グループ内仕入・物流の効率化。", "家電以外（医薬・酒類など）の多角化が奏功。"],
    risks: ["家電量販業界の競争激化が続く。", "粗利率の変動が収益に直結。", "地方展開が限定的で拡大余地あり。"],
    outlook: ["オムニチャネル強化で収益安定化へ。", "顧客データ活用でリピート率向上が狙える。", "店舗改装とEC統合で成長余地。"],
    score: 68,
  },
  {
    ticker: "8058.T",
    company: "三菱商事",
    strengths: ["資源・非資源のバランスが良いポートフォリオ。", "総合的なトレーディング力が高い。", "脱炭素に向けた投資余力が大きい。"],
    risks: ["資源価格の急変動が利益を直撃。", "新興国プロジェクトの政治リスク。", "大型投資の回収期間が長い。"],
    outlook: ["脱炭素投資でポートフォリオ転換を加速。", "非資源領域の拡大で収益分散を目指す。", "デジタル活用で事業効率化を推進。"],
    score: 78,
  },
  {
    ticker: "8053.T",
    company: "住友商事",
    strengths: ["インフラ・資源・メディアを横断する事業基盤。", "アライアンス活用による事業開発力。", "ESGを意識した資産ポートフォリオ。"],
    risks: ["資源分野のボラティリティが高い。", "成熟事業が多く成長加速が課題。", "海外案件の地政学リスク。"],
    outlook: ["社会インフラ投資で中長期の安定収益を狙う。", "再生エネルギー領域で新規事業創出。", "既存資産の入れ替えでROA改善に注力。"],
    score: 74,
  },
  {
    ticker: "8031.T",
    company: "三井物産",
    strengths: ["機械・化学の収益力が高い。", "事業会社との連携力が大きい。", "多角化されたグローバルネットワーク。"],
    risks: ["大型投資の評価損リスク。", "一部資源依存の残存。", "海外規制や政情の影響を受ける。"],
    outlook: ["農業・ヘルスケアなど非資源領域を拡大。", "循環型社会を意識した投資を推進。", "デジタル化で事業最適化を進める。"],
    score: 71,
  },
  {
    ticker: "4755.T",
    company: "楽天グループ",
    strengths: ["EC・金融・通信のエコシステムが強固。", "会員基盤とポイント経済圏の訴求力。", "データ活用を軸に新サービス展開。"],
    risks: ["通信事業の大型投資負担が継続。", "競争激化でECマージンが圧迫。", "金融規制の強化で影響を受けやすい。"],
    outlook: ["スーパーアプリ戦略で顧客囲い込みを加速。", "通信の収益化が進めば全体の黒字化が見込める。", "海外展開とFinTech強化で成長余地。"],
    score: 65,
  },
  {
    ticker: "9418.T",
    company: "USEN-NEXT",
    strengths: ["店舗向けサービスで顧客基盤が強い。", "業務DXサービスの拡充。", "決済や通信サービスとのクロスセルが可能。"],
    risks: ["店舗市場の景気変動に影響を受ける。", "人件費・設備投資の負担。", "新規事業の収益化には時間を要する。"],
    outlook: ["店舗DX需要の高まりで成長ドライバーが明確。", "サブスク収益の安定化を図る段階。", "M&Aと新規領域開拓で事業拡張を目指す。"],
    score: 67,
  },
  {
    ticker: "3923.T",
    company: "ラクス",
    strengths: ["経費精算・請求書クラウドで高継続率。", "中小企業市場でのブランド認知が高い。", "利用料金が手頃で導入ハードルが低い。"],
    risks: ["競合の参入で価格圧力が高まる。", "人員増による販管費の上昇。", "大企業向け機能拡張に投資が必要。"],
    outlook: ["SaaS市場拡大で新規顧客獲得が継続。", "クロスセルでARPU向上が狙える。", "海外展開で第二の成長エンジンを模索。"],
    score: 70,
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
    title: "家電量販 × 住設",
    description: "住宅とのシナジー戦略が進む家電量販大手を比較。",
    tickers: ["9831.T", "7419.T", "3048.T"],
    highlight: "住宅リモデルの有無が投資判断を分ける",
    scoreRange: "63 - 72",
  },
  {
    title: "総合商社",
    description: "世界展開と脱炭素戦略が鍵となるメガトレーダー。",
    tickers: ["8058.T", "8053.T", "8031.T"],
    highlight: "資源価格敏感度と事業多角化を比較",
    scoreRange: "66 - 78",
  },
  {
    title: "IT プラットフォーム",
    description: "国内DXを牽引する SaaS / プラットフォーム企業。",
    tickers: ["4755.T", "9418.T", "3923.T"],
    highlight: "サブスク収益と継続率の強さがポイント",
    scoreRange: "60 - 75",
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
                        人気事例を試す
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

            <div className="space-y-6 rounded-3xl border border-border bg-card p-8 text-card-foreground shadow-xl shadow-black/5 dark:shadow-black/40">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">比較対象</span>
                  <p className="mt-1 text-muted-foreground">
                    {heroSnapshots.map((company) => company.company).join(" / ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                    {activeCompanyIndex + 1} / {heroSnapshots.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full border-input"
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
                      className="h-9 w-9 rounded-full border-input"
                      onClick={() => setActiveCompanyIndex((prev) => (prev + 1) % heroSnapshots.length)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex h-full min-h-80 flex-col rounded-2xl border border-border bg-card/90 p-6 shadow-sm">
                <div>
                  <p className="text-base font-semibold text-foreground">{activeCompany.company}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Score {activeCompany.score} / 100
                  </p>
                </div>
                <div className="mt-4 grid flex-1 gap-4 md:grid-cols-3 md:items-stretch">
                  {[
                    { title: "強み", accent: "text-blue-600", items: activeCompany.strengths.slice(0, 2) },
                    { title: "課題", accent: "text-rose-600", items: activeCompany.risks.slice(0, 2) },
                    { title: "見通し", accent: "text-emerald-600", items: activeCompany.outlook.slice(0, 2) },
                  ].map((section) => (
                    <div
                      key={section.title}
                      className="flex h-full flex-col rounded-xl border border-border bg-muted p-4 shadow-sm"
                    >
                      <p className={`text-xs font-semibold uppercase ${section.accent}`}>{section.title}</p>
                      {section.items.length > 0 ? (
                        <ul className="mt-3 flex flex-1 flex-col justify-between gap-2 text-xs text-muted-foreground leading-5">
                          {section.items.map((item, idx) => (
                            <li key={idx} className="line-clamp-3">
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 flex-1 text-xs text-muted-foreground">分析を取得しています...</p>
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
                AIDE は投資判断の現場で繰り返される手作業を代替します。よくあるボトルネックを解消することで、議論に集中できる環境を整えます。
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
            <h2 className="text-3xl font-semibold text-foreground">AIDE が選ばれる理由</h2>
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

        <section className="border-y border-white/20 bg-[radial-gradient(circle_at_top,rgba(248,250,255,0.95),rgba(228,232,255,0.7))] py-20 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.98),rgba(2,6,23,1))]">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.4em] text-primary">Mobile</p>
                <h2 className="mt-4 text-3xl font-semibold text-foreground">携帯1つで、比較とアラートを完結</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  通勤中でもウォッチリストを更新し、新しいAIメモやアラートを確認できます。Pro プランならモバイル優先処理で分析が数秒。
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {mobileUiPreviews.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-3xl border border-white/30 bg-white/70 p-5 shadow-[0_20px_50px_rgba(2,6,23,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{card.tag}</p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">{card.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{card.description}</p>
                    <ul className="mt-3 space-y-2 text-sm text-foreground">
                      {card.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                <Button asChild>
                  <Link href="/dashboard?view=mobile">
                    モバイルビューを試す
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className={glassButtonClass}>
                  <Link href="/pricing">利用条件を見る</Link>
                </Button>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-xs rounded-[36px] border border-white/40 bg-linear-to-b from-white to-white/80 p-4 shadow-[0_35px_80px_rgba(2,6,23,0.25)] dark:border-white/10 dark:from-slate-900 dark:to-slate-900/90">
                <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-slate-200/80 dark:bg-white/20" />
                <div className="flex items-center justify-between rounded-2xl bg-white/20 px-2 py-1 text-xs font-semibold text-white/70 dark:bg-slate-800/80">
                  {mobileNavTabs.map((tab, index) => (
                    <span
                      key={tab}
                      className={`flex-1 rounded-xl px-2 py-1 text-center ${
                        index === 1 ? "bg-white text-slate-900" : "text-white/70"
                      }`}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                <div className="mt-4 rounded-3xl bg-white/95 p-4 text-slate-900 shadow-[0_20px_60px_rgba(2,6,23,0.15)] dark:bg-slate-900/80 dark:text-white">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      <p className="text-base font-semibold text-foreground">{mobileInsightHighlight.company}</p>
                      <p>{mobileInsightHighlight.ticker}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{mobileInsightHighlight.status}</p>
                      <p className="text-lg font-semibold text-primary">{mobileInsightHighlight.score}</p>
                      <p className="text-xs text-green-600">{mobileInsightHighlight.change}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{mobileInsightHighlight.summary}</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {mobileInsightHighlight.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                    {mobileInsightHighlight.metrics.map((metric) => (
                      <div key={metric.label} className="rounded-2xl border border-slate-200/60 px-2 py-2 dark:border-white/20">
                        <p className="text-[11px] uppercase tracking-wide">{metric.label}</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl bg-muted px-3 py-2 text-xs font-medium text-muted-foreground dark:bg-slate-800">
                    AIが次の比較更新を準備中…
                  </div>
                </div>
              </div>
            </div>
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
