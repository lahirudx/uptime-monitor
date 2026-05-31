import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { getServerSession } from "next-auth"
import Providers from "@/components/providers"
import { authOptions } from "@/lib/auth"
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand"
import { MIN_MONITOR_INTERVAL_SECONDS, MAX_MONITOR_TIMEOUT_SECONDS } from "@/lib/monitor-config"
import { isPhoneAlertAllowed } from "@/lib/phone-alerts"

// Force dynamic rendering so process.env (BRAND_NAME, BRAND_TAGLINE) is read
// per-request at runtime. Without this, Next.js statically pre-renders the
// layout at build time, baking whatever was in the env during CI build —
// which means the K8s ConfigMap override would be silently ignored.
export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ["latin"] })

export function generateMetadata(): Metadata {
  return {
    title: BRAND_NAME,
    description: BRAND_TAGLINE,
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const canUsePhoneAlerts = isPhoneAlertAllowed(session?.user?.email)
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Providers
          brand={{ name: BRAND_NAME, tagline: BRAND_TAGLINE }}
          config={{
            minMonitorInterval: MIN_MONITOR_INTERVAL_SECONDS,
            maxMonitorTimeout: MAX_MONITOR_TIMEOUT_SECONDS,
            canUsePhoneAlerts,
          }}
        >
          {children}
        </Providers>
      </body>
    </html>
  )
}
