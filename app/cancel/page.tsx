"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { doc, serverTimestamp, setDoc } from "firebase/firestore"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ShieldOff, Undo2 } from "lucide-react"
import { firestore } from "@/lib/firebase"
import { useAuth } from "../providers"

async function fetchSubscriptionFromFirestore(uid: string) {
  const { getDoc } = await import("firebase/firestore")
  const { doc: firestoreDoc } = await import("firebase/firestore")
  const snapshot = await getDoc(firestoreDoc(firestore, "userPlans", uid))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return {
    subscriptionId: data.subscriptionId as string | undefined,
  }
}

export default function CancelPage() {
  const { user, loading: authLoading, plan, planLoading } = useAuth()
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    void fetchSubscriptionFromFirestore(user.uid).then((result) => {
      setSubscriptionId(result?.subscriptionId ?? null)
    })
  }, [user])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) {
      setError("ログインしてから操作してください。")
      return
    }
    if (!subscriptionId) {
      setError("解約対象のサブスクリプションが見つかりませんでした。")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch("/api/payments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body?.error ?? "解約処理に失敗しました。")
      }
      await setDoc(
        doc(firestore, "userPlans", user.uid),
        {
          plan: "free",
          tier: "free",
          subscriptionId: null,
          subscriptionStatus: "canceled",
          canceledAt: serverTimestamp(),
          cancelReason: reason || null,
        },
        { merge: true },
      )
      setSuccess(true)
    } catch (err) {
      console.error("[cancel] Failed to cancel subscription", err)
      setError(err instanceof Error ? err.message : "解約処理に失敗しました。")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || planLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <span className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          ログイン状態を確認しています…
        </span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
        <Badge>Cancel Pro</Badge>
        <p className="text-lg font-semibold">アカウントにログインしてください</p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/sign-in?redirect=/cancel">ログイン</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-up">新規登録</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (plan !== "pro") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
        <Badge>Cancel Pro</Badge>
        <p className="text-lg font-semibold">現在 Pro プランではありません</p>
        <Button asChild>
          <Link href="/pricing">プランを確認する</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
      <section>
        <Badge variant="secondary" className="mb-4">
          CANCEL PRO
        </Badge>
        <h1 className="text-3xl font-semibold">Pro プランの解約</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          次回更新日の前日までに解約すると、以降の請求は発生しません。よろしければ以下のフォームから解約手続きを完了してください。
        </p>
      </section>
      <div className="grid gap-6 md:grid-cols-[1.1fr,0.9fr]">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>解約フォーム</CardTitle>
            <CardDescription>入力後、「解約を完了する」を押すとサブスクリプションが停止されます。</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="subscriptionId">サブスクリプション ID</Label>
                <Input id="subscriptionId" value={subscriptionId ?? ""} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">解約理由（任意）</Label>
                <Input
                  id="reason"
                  placeholder="例：利用頻度が少なくなった"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
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
                  <AlertTitle>解約が完了しました</AlertTitle>
                  <AlertDescription>
                    Free プランに戻りました。必要になったらいつでも Pro へアップグレードできます。
                  </AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                disabled={submitting || success || !subscriptionId}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    手続き中...
                  </>
                ) : (
                  "解約を完了する"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            解約後も解約前に保存した分析データは閲覧できます。Pro 機能は無効になりますが、ダッシュボードで Free プランを引き続きお使いいただけます。
          </CardFooter>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>注意事項</CardTitle>
            <CardDescription>解約手続きの前に、以下をご確認ください。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="font-semibold">返金について</p>
              <p className="mt-1 text-muted-foreground">途中解約による日割り返金は行っていません。</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="font-semibold">再開について</p>
              <p className="mt-1 text-muted-foreground">再度アップグレードすると Pro 機能をすぐに再開できます。</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="font-semibold">サポート</p>
              <p className="mt-1 text-muted-foreground">不明点があれば support@nolenn-investment.app までお問い合わせください。</p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/dashboard">
                <Undo2 className="mr-2 h-4 w-4" />
                ダッシュボードに戻る
              </Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/pricing">
                <ShieldOff className="mr-2 h-4 w-4" />
                プランを見直す
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
