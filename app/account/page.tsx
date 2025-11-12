"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { getAuth, signOut } from "firebase/auth"
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { firestore } from "@/lib/firebase"
import { useAuth } from "../providers"

type UserSettings = {
  defaultTickers: string
  preferredMarket: "jp" | "us"
  subscribeDigest: boolean
  notifyProductUpdates: boolean
  notes: string
  updatedAt?: Date | null
}

const defaultSettings: UserSettings = {
  defaultTickers: "",
  preferredMarket: "jp",
  subscribeDigest: true,
  notifyProductUpdates: true,
  notes: "",
  updatedAt: null,
}

const profileFields: Array<{ label: string; value: (params: { name: string | null; email: string | null }) => string }> =
  [
    {
      label: "表示名",
      value: ({ name, email }) => name ?? (email ? email.split("@")[0] : "ゲストユーザー"),
    },
    {
      label: "メールアドレス",
      value: ({ email }) => email ?? "未設定",
    },
  ]

export default function AccountPage() {
  const { user, loading, plan } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [initializing, setInitializing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const glassPanelClass =
    "rounded-3xl border border-white/30 bg-white/70 p-8 text-foreground shadow-[0_30px_80px_rgba(2,6,23,0.15)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:text-white"
  const glassFieldClass =
    "rounded-2xl border border-white/30 bg-white/60 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-xl dark:border-white/15 dark:bg-white/5"
  const glassInputClass =
    "rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)] focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-white/60"

  const settingsRef = useMemo(() => (user ? doc(firestore, "userSettings", user.uid) : null), [user])

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/sign-in")
    }
  }, [loading, user, router])

  useEffect(() => {
    const loadSettings = async () => {
      if (!settingsRef) return
      setInitializing(true)
      try {
        const snapshot = await getDoc(settingsRef)
        if (snapshot.exists()) {
          const data = snapshot.data()
          setSettings({
            defaultTickers: typeof data.defaultTickers === "string" ? data.defaultTickers : defaultSettings.defaultTickers,
            preferredMarket:
              data.preferredMarket === "us" || data.preferredMarket === "jp"
                ? data.preferredMarket
                : defaultSettings.preferredMarket,
            subscribeDigest:
              typeof data.subscribeDigest === "boolean" ? data.subscribeDigest : defaultSettings.subscribeDigest,
            notifyProductUpdates:
              typeof data.notifyProductUpdates === "boolean"
                ? data.notifyProductUpdates
                : defaultSettings.notifyProductUpdates,
            notes: typeof data.notes === "string" ? data.notes : defaultSettings.notes,
            updatedAt: data.updatedAt?.toDate?.() ?? null,
          })
        } else {
          setSettings(defaultSettings)
        }
        setDirty(false)
      } catch (error) {
        console.error("Failed to load user settings:", error)
        toast({
          variant: "destructive",
          title: "設定の読み込みに失敗しました",
          description: "ネットワーク状況を確認して、再度お試しください。",
        })
      } finally {
        setInitializing(false)
      }
    }

    if (user) {
      void loadSettings()
    }
  }, [settingsRef, user, toast])

  const handleFieldChange = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }))
      setDirty(true)
    },
    [],
  )

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!settingsRef || saving) return
      setSaving(true)
      try {
        await setDoc(
          settingsRef,
          {
            ...settings,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
        setDirty(false)
        toast({
          title: "設定を保存しました",
          description: "ダッシュボードの推奨コンテンツに反映されます。",
        })
      } catch (error) {
        console.error("Failed to save user settings:", error)
        toast({
          variant: "destructive",
          title: "設定の保存に失敗しました",
          description: "しばらく待ってから再度お試しください。",
        })
      } finally {
        setSaving(false)
      }
    },
    [settingsRef, settings, saving, toast],
  )

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_65%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.85),_rgba(2,6,23,1))]" />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-3xl border border-white/25 bg-white/70 p-10 text-center shadow-[0_30px_80px_rgba(2,6,23,0.2)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
            <h1 className="text-xl font-semibold">ログインが必要です</h1>
            <p className="mt-3 text-sm text-muted-foreground">アカウント情報を閲覧するにはサインインしてください。</p>
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild className="rounded-full font-semibold">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full font-semibold">
                <Link href="/sign-up">Create account</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const auth = getAuth()

  const planLabel = plan === "pro" ? "Pro プラン" : plan === "free" ? "Free プラン" : "読み込み中..."

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_65%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.85),_rgba(2,6,23,1))]" />
      <main className="relative z-10 mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold">アカウント</h1>
            <p className="mt-2 text-sm text-muted-foreground">AIDE アカウントの基本情報と設定を管理できます。</p>
          </div>
          <div className="flex items-center gap-3">
            {plan === "pro" ? (
              <Badge variant="outline" className="border-primary text-primary">
                Pro プラン
              </Badge>
            ) : plan === "free" ? (
              <Button asChild size="sm" className="rounded-full font-semibold">
                <Link href="/checkout">アップグレード</Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" className="rounded-full font-medium" onClick={async () => {
              await signOut(auth)
              router.replace("/")
            }}>
              ログアウト
            </Button>
          </div>
        </div>

        <section className={glassPanelClass}>
          <h2 className="text-lg font-semibold">プラン状況</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            現在のプラン: <span className="font-medium">{planLabel}</span>
          </p>
          {plan === "free" ? (
            <div className="mt-4">
              <Button asChild>
                <Link href="/checkout">Pro にアップグレードする</Link>
              </Button>
            </div>
          ) : plan === "pro" ? (
            <p className="mt-4 text-sm text-muted-foreground">
              アップグレード済みです。請求情報の変更や解約はサポートチームまでご連絡ください。
            </p>
          ) : null}
        </section>

        <section className={glassPanelClass}>
          <dl className="mt-8 grid gap-6 md:grid-cols-2">
            {profileFields.map((field) => (
              <div key={field.label} className={glassFieldClass}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{field.label}</dt>
                <dd className="mt-2 text-sm text-foreground">
                  {field.value({ name: user.displayName, email: user.email })}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={glassPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">比較設定</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                ダッシュボードや推奨コンテンツで優先的に表示したい条件を記録します。
              </p>
            </div>
            {settings.updatedAt && (
              <p className="text-xs text-muted-foreground">
                最終更新：{settings.updatedAt.toLocaleString("ja-JP", { hour12: false })}
              </p>
            )}
          </div>

          <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultTickers">よく比較する証券コード</Label>
                <Textarea
                  id="defaultTickers"
                  placeholder="例: 9831.T, 7419.T, 3048.T"
                  value={settings.defaultTickers}
                  onChange={(event) => handleFieldChange("defaultTickers", event.target.value)}
                  className={`min-h-[96px] resize-none ${glassInputClass}`}
                  disabled={initializing}
                />
                <p className="text-xs text-muted-foreground">カンマ区切りで最大 6 件まで入力できます。</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredMarket">優先するマーケット</Label>
                <div className={`${glassFieldClass} space-y-2`}>
                  <select
                    id="preferredMarket"
                    value={settings.preferredMarket}
                    onChange={(event) =>
                      handleFieldChange("preferredMarket", event.target.value === "us" ? "us" : "jp")
                    }
                    className="w-full rounded-full border border-white/40 bg-transparent px-4 py-2 text-sm text-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] focus:border-primary focus:outline-none dark:border-white/20 dark:text-white"
                    disabled={initializing}
                  >
                    <option value="jp">国内市場（東証）</option>
                    <option value="us">海外市場（米国株）</option>
                  </select>
                  <p className="mt-2 text-xs text-muted-foreground">
                    ダッシュボードの推奨企業やニュースの優先順位が変わります。
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className={`${glassFieldClass} flex items-start justify-between`}>
                <div>
                  <p className="text-sm font-semibold text-foreground">ウィークリーダイジェスト</p>
                  <p className="mt-1 text-xs text-muted-foreground">週次で主要比較結果と市況トレンドをメールでお届けします。</p>
                </div>
                <Switch
                  checked={settings.subscribeDigest}
                  onCheckedChange={(value) => handleFieldChange("subscribeDigest", value)}
                  disabled={initializing}
                />
              </div>

              <div className={`${glassFieldClass} flex items-start justify-between`}>
                <div>
                  <p className="text-sm font-semibold text-foreground">新機能のお知らせ</p>
                  <p className="mt-1 text-xs text-muted-foreground">プロダクトアップデートやリリース注記を受け取ります。</p>
                </div>
                <Switch
                  checked={settings.notifyProductUpdates}
                  onCheckedChange={(value) => handleFieldChange("notifyProductUpdates", value)}
                  disabled={initializing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">メモ</Label>
              <Input
                id="notes"
                placeholder="社内で共有したいメモやカスタム指標など"
                value={settings.notes}
                onChange={(event) => handleFieldChange("notes", event.target.value)}
                className={glassInputClass}
                disabled={initializing}
              />
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-muted-foreground">
                設定はアカウントに紐づいて保存され、ダッシュボードの比較候補や推奨ティッカーに反映されます。
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border border-white/40 bg-white/20 px-6 font-semibold text-foreground shadow-[0_15px_35px_rgba(2,6,23,0.18)] backdrop-blur hover:bg-white/30 dark:border-white/15 dark:bg-white/10 dark:text-white"
                  disabled={!dirty || initializing || saving}
                  onClick={() => {
                    setSettings(defaultSettings)
                    setDirty(true)
                  }}
                >
                  デフォルトに戻す
                </Button>
                <Button
                  type="submit"
                  className="rounded-full px-6 font-semibold shadow-[0_20px_50px_rgba(59,130,246,0.45)]"
                  disabled={!dirty || initializing || saving}
                >
                  {saving ? "保存中..." : "設定を保存"}
                </Button>
              </div>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
