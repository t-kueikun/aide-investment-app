import type { Metadata } from "next"

import { PricingView } from "./pricing-view"

export const metadata: Metadata = {
  title: "プランと料金",
  description: "Free / Pro プランの違いと、アップグレードのメリットをご確認ください。",
}

export default function PricingPage() {
  return <PricingView />
}
