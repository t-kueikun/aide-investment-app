"use client"

import { type PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react"
import { getAuth, onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { firebaseApp, firestore } from "@/lib/firebase"

interface AuthContextValue {
  user: User | null
  loading: boolean
  plan: "free" | "pro" | null
  planLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  plan: null,
  planLoading: true,
  isAuthenticated: false,
})

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<"free" | "pro" | null>(null)
  const [planLoading, setPlanLoading] = useState(true)

  useEffect(() => {
    const auth = getAuth(firebaseApp)
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) {
        setPlan(null)
        setPlanLoading(false)
        return
      }
      setPlanLoading(true)
      try {
        const snapshot = await getDoc(doc(firestore, "userPlans", user.uid))
        if (snapshot.exists()) {
          const data = snapshot.data()
          const tier =
            typeof data.tier === "string" && data.tier.toLowerCase() === "pro"
              ? "pro"
              : typeof data.plan === "string" && data.plan.toLowerCase() === "pro"
                ? "pro"
                : "free"
          setPlan(tier)
        } else {
          setPlan("free")
        }
      } catch (error) {
        console.error("Failed to load plan information:", error)
        setPlan("free")
      } finally {
        setPlanLoading(false)
      }
    }
    void fetchPlan()
  }, [user])

  const value = useMemo(
    () => ({ user, loading, plan, planLoading, isAuthenticated: !!user }),
    [user, loading, plan, planLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
