"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, serverTimestamp, setDoc } from "firebase/firestore"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ShieldCheck } from "lucide-react"
import { firestore } from "@/lib/firebase"
import { useAuth } from "../providers"

declare global {
  interface Window {
    Payjp?: (publicKey: string) => any
  }
}

const PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYJP_PUBLIC_KEY ?? ""

export default function CheckoutPage() {
  const router = useRouter()
  const { user, loading: authLoading, plan, planLoading } = useAuth()
  const [payjp, setPayjp] = useState<any>(null)
  const [cardElement, setCardElement] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [planUpdateError, setPlanUpdateError] = useState<string | null>(null)
  const canCollectCard = Boolean(PUBLIC_KEY && user && plan !== "pro")

  useEffect(() => {
    if (!canCollectCard) return
    if (typeof window === "undefined") return
    if (window.Payjp && payjp) return
    const existing = document.getElementById("payjp-script")
    const loadScript = () => {
      if (!window.Payjp) return
      const instance = window.Payjp(PUBLIC_KEY)
      setPayjp(instance)
    }
    if (!existing) {
      const script = document.createElement("script")
      script.id = "payjp-script"
      script.src = "https://js.pay.jp/v2/pay.js"
      script.async = true
      script.onload = loadScript
      document.body.appendChild(script)
    } else {
      existing.addEventListener("load", loadScript)
    }
  }, [payjp, canCollectCard])

  useEffect(() => {
    if (!payjp || !canCollectCard) return
    const elements = payjp.elements()
    const card = elements.create("card", {
      style: {
        base: {
          fontSize: "16px",
          color: "#1f2933",
        },
      },
    })
    const mountSelector = "#payjp-card"
    const mountTarget = document.querySelector(mountSelector)
    if (!mountTarget) {
      console.warn("[checkout] #payjp-card element is not present, skipping mount.")
      return
    }
    card.mount(mountSelector)
    setCardElement(card)
    return () => {
      card.unmount()
    }
  }, [payjp, canCollectCard])

  useEffect(() => {
    if (authLoading || planLoading) return
    if (plan === "pro") {
      router.replace("/dashboard")
    }
  }, [authLoading, planLoading, plan, router])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!payjp || !cardElement) return
    if (!user) {
      setError("ログインしてからアップグレードを行ってください。")
      return
    }
    setSubmitting(true)
    setError(null)
    setPlanUpdateError(null)
    try {
      const tokenResult = await payjp.createToken(cardElement)

      if (tokenResult?.error) {
        setError(tokenResult.error.message ?? "カード情報の認証に失敗しました。")
        setSubmitting(false)
        return
      }

      const tokenId =
        typeof tokenResult?.id === "string"
          ? tokenResult.id
          : typeof tokenResult?.token?.id === "string"
            ? tokenResult.token.id
            : null

      if (!tokenId) {
        setError("カードトークンの生成に失敗しました。入力内容を確認してください。")
        setSubmitting(false)
        return
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId,
          plan: "pro",
          email,
          name,
          uid: user.uid,
        }),
      })

      const body = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(body?.error ?? "決済処理に失敗しました。")
      }

      try {
        await setDoc(
          doc(firestore, "userPlans", user.uid),
          {
            plan: "pro",
            tier: "pro",
            subscriptionId: body?.subscriptionId ?? null,
            subscriptionStatus: body?.subscriptionStatus ?? null,
            customerId: body?.customerId ?? null,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
        setPlanUpdateError(null)
      } catch (planError) {
        console.error("[checkout] Failed to sync plan status", planError)
        setPlanUpdateError("決済は完了しましたが、プラン情報の更新に失敗しました。サポートまでご連絡ください。")
      }
      setSuccess(true)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "決済処理に失敗しました。")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || planLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-5 w-5 rounded-full border-2 border-foreground/40 border-t-transparent animate-spin" />
          ログイン状態を確認しています…
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center text-foreground">
        <Badge>CHECKOUT</Badge>
        <div>
          <h1 className="text-3xl font-semibold">ログインしてアップグレードしてください</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Pro プランのお申し込みにはアカウントが必要です。ログインまたは新規登録を行ってから再度お試しください。
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild>
            <Link href="/sign-in?redirect=/checkout">ログインする</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-up?redirect=/checkout">無料登録</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (plan === "pro") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 text-center">
          <Badge>CHECKOUT</Badge>
          <div>
            <p className="text-lg font-semibold">Pro プランはすでに有効です</p>
            <p className="mt-2 text-sm text-muted-foreground">ダッシュボードへリダイレクトしています…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16">
      <section>
        <Badge variant="secondary" className="mb-4">
          CHECKOUT
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pro プランへのアップグレード</h1>
        <p className="mt-2 text-muted-foreground">
          月額 ¥400 で分析回数の制限なし、広告なし、株特化AIチャットなどプロ向け機能をご利用いただけます。
        </p>
      </section>

      <div className="grid gap-8 md:grid-cols-[1.2fr,1fr]">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>お支払い情報</CardTitle>
            <CardDescription>安全な PAY.JP 決済を利用しています。クレジットカード情報は当社サーバーに保存されません。</CardDescription>
          </CardHeader>
          <CardContent>
            {!PUBLIC_KEY ? (
              <Alert variant="destructive">
                <AlertTitle>環境変数が設定されていません</AlertTitle>
                <AlertDescription>
                  NEXT_PUBLIC_PAYJP_PUBLIC_KEY を設定してから再度このページを読み込んでください。
                </AlertDescription>
              </Alert>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="name">カード名義</Label>
                  <Input
                    id="name"
                    placeholder="山田 太郎"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>カード情報</Label>
                  <div
                    id="payjp-card"
                    className="rounded-md border border-dashed border-muted-foreground/40 bg-white p-4"
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>エラー</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert>
                    <AlertTitle>決済が完了しました</AlertTitle>
                    <AlertDescription>Pro プランが有効になりました。ダッシュボードに戻って分析を開始しましょう。</AlertDescription>
                  </Alert>
                )}
                {planUpdateError && (
                  <Alert variant="destructive">
                    <AlertTitle>プラン反映に失敗しました</AlertTitle>
                    <AlertDescription>{planUpdateError}</AlertDescription>
                  </Alert>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || !payjp || !cardElement || success}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      決済処理中...
                    </>
                  ) : (
                    "Pro プランにアップグレード"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              <span>PAY.JP により決済情報は安全にトークン化されます。</span>
            </div>
            <p>
              決済完了後は自動的に Pro プランが有効になります。領収書は入力いただいたメールアドレス宛に送信されます。
            </p>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>プランの内容</CardTitle>
            <CardDescription>Pro プランで利用できる機能をまとめました。</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li>・分析回数：無制限</li>
              <li>・広告なし、Firestore 保存無制限</li>
              <li>・株特化 AI チャット、優先処理</li>
              <li>・CSV/グラフ/比較ビューでのエクスポート</li>
            </ul>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button asChild variant="outline" className="w-full">
              <Link href="/pricing">プランの詳細を見る</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              決済は PAY.JP を通じて処理されます。利用規約とプライバシーポリシーをご確認のうえお申し込みください。
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
