"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { getAuth, sendSignInLinkToEmail } from "firebase/auth"
import type { FirebaseError } from "firebase/app"
import { firebaseApp } from "@/lib/firebase"

export default function SignUpPage() {
  const router = useRouter()
  const auth = getAuth(firebaseApp)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const getContinueUrl = () => {
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || ""
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const baseUrl = envUrl || origin
    return baseUrl ? `${baseUrl}/sign-in` : null
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setError(null)
    setInfo(null)

    const trimmedEmail = email.trim()
    const trimmedName = name.trim()

    if (!trimmedEmail || !trimmedName) {
      setError("名前とメールアドレスを入力してください。")
      return
    }

    const continueUrl = getContinueUrl()
    if (!continueUrl) {
      setError("リンクの送信先URLを決定できません。管理者にサイトURLの設定を確認してください。")
      return
    }

    setLoading(true)
    try {
      await sendSignInLinkToEmail(auth, trimmedEmail, {
        url: continueUrl,
        handleCodeInApp: true,
      })
      window.localStorage.setItem("pendingEmail", trimmedEmail)
      window.localStorage.setItem("pendingName", trimmedName)
      setInfo("確認メールを送信しました。メール内のリンクを開いて登録を完了してください。")
    } catch (err) {
      let message = "アカウント作成に失敗しました。もう一度お試しください。"
      const code = typeof err === "object" && err && "code" in err ? (err as FirebaseError).code : null
      switch (code) {
        case "auth/invalid-email":
          message = "メールアドレスの形式が正しくありません。正しい形式で入力してください。"
          break
        case "auth/email-already-in-use":
          message = "このメールアドレスは既に登録されています。ログインをお試しください。"
          break
        case "auth/invalid-continue-uri":
        case "auth/unauthorized-continue-uri":
          message = "リンクのリダイレクト先が許可されていません。管理者にサイトURLのホワイトリスト設定を依頼してください。"
          break
        case "auth/operation-not-allowed":
          message = "この認証方法は有効化されていません。管理者に Firebase コンソールで Email/リンク認証を有効にするよう依頼してください。"
          break
        default:
          if (err instanceof Error && err.message) {
            message = message + ` (${err.message})`
          }
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
          <h1 className="text-2xl font-semibold text-gray-900">Sign up</h1>
          <p className="mt-3 text-sm text-gray-600">確認メールを送信し、リンクを開いて登録を完了してください。</p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                Name
              </label>
              <Input id="name" placeholder="山田 太郎" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

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
              {loading ? "Sending..." : "確認メールを送信する"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            すでにアカウントがありますか？{" "}
            <Link href="/sign-in" className="font-medium text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
