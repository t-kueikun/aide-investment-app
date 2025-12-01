"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getAuth, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, updateProfile } from "firebase/auth"
import type { FirebaseError } from "firebase/app"
import { firebaseApp } from "@/lib/firebase"

export default function SignInPage() {
  const router = useRouter()
  const auth = getAuth(firebaseApp)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false)

  const getContinueUrl = useCallback(() => {
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || ""
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const baseUrl = envUrl || origin
    return baseUrl ? `${baseUrl}/sign-in` : null
  }, [])

  const completeSignIn = useCallback(
    async (emailForLink: string) => {
      setLoading(true)
      setError(null)
      setInfo("確認リンクを検証しています…")
      try {
        const { user } = await signInWithEmailLink(auth, emailForLink, window.location.href)
        const pendingName = window.localStorage.getItem("pendingName")
        if (pendingName && user && !user.displayName) {
          await updateProfile(user, { displayName: pendingName })
        }
        window.localStorage.removeItem("pendingEmail")
        window.localStorage.removeItem("pendingName")
        setNeedsEmailConfirm(false)
        setInfo(null)
        router.push("/dashboard")
      } catch (err) {
        let message = "ログインに失敗しました。もう一度お試しください。"
        const code = typeof err === "object" && err && "code" in err ? (err as FirebaseError).code : null
        switch (code) {
          case "auth/invalid-email":
            message = "メールアドレスの形式が正しくありません。正しい形式で入力してください。"
            break
          case "auth/invalid-action-code":
          case "auth/expired-action-code":
            message = "リンクが無効または期限切れです。もう一度ログインリンクを送信してください。"
            break
        }
        setError(message)
        setInfo(null)
      } finally {
        setLoading(false)
      }
    },
    [auth, router],
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const storedEmail = window.localStorage.getItem("pendingEmail") || ""
      const paramsEmail = new URLSearchParams(window.location.search).get("email") || ""
      const emailToUse = storedEmail || paramsEmail || email
      if (!emailToUse) {
        setNeedsEmailConfirm(true)
        setInfo("受信したメールアドレスを入力してログインを完了してください。")
        return
      }
      void completeSignIn(emailToUse)
    }
  }, [auth, completeSignIn, email])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setError(null)
    setInfo(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError("メールアドレスを入力してください。")
      return
    }

    setLoading(true)
    try {
      if (needsEmailConfirm && typeof window !== "undefined" && isSignInWithEmailLink(auth, window.location.href)) {
        await completeSignIn(trimmedEmail)
      } else {
        const continueUrl = getContinueUrl()
        if (!continueUrl) {
          setError("リンクの送信先URLを決定できません。管理者にサイトURLの設定を確認してください。")
          return
        }
        await sendSignInLinkToEmail(auth, trimmedEmail, {
          url: continueUrl,
          handleCodeInApp: true,
        })
        window.localStorage.setItem("pendingEmail", trimmedEmail)
        setNeedsEmailConfirm(false)
        setInfo("ログイン用の確認リンクを送信しました。メールをご確認ください。")
      }
    } catch (err) {
      let message = "ログインリンクの送信に失敗しました。もう一度お試しください。"
      const code = typeof err === "object" && err && "code" in err ? (err as FirebaseError).code : null
      if (code === "auth/invalid-email") {
        message = "メールアドレスの形式が正しくありません。正しい形式で入力してください。"
      } else if (code === "auth/invalid-continue-uri" || code === "auth/unauthorized-continue-uri") {
        message = "リンクのリダイレクト先が許可されていません。管理者にサイトURLのホワイトリスト設定を依頼してください。"
      } else if (code === "auth/operation-not-allowed") {
        message = "この認証方法は有効化されていません。管理者に Firebase コンソールで Email/リンク認証を有効にするよう依頼してください。"
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">

      <main className="px-6 py-16">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-gray-200 bg-white p-10 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
          <p className="mt-3 text-sm text-gray-600">
            メールアドレス宛にログイン用リンクを送ります。受信メールのリンクを開いてログインを完了してください。
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-green-600">{info}</p>}

            <Button type="submit" className="w-full rounded-full font-semibold" disabled={loading}>
              {loading ? "Sending..." : needsEmailConfirm ? "ログインを完了する" : "ログインリンクを送信"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            アカウントをお持ちでないですか？{" "}
            <Link href="/sign-up" className="font-medium text-blue-600 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
