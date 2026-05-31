'use client'

import { SessionProvider } from 'next-auth/react'
import { createContext, useContext, ReactNode } from 'react'

type Brand = { name: string; tagline: string }
type AppConfig = {
  minMonitorInterval: number
  maxMonitorTimeout: number
  canUsePhoneAlerts: boolean
}

const BrandContext = createContext<Brand>({
  name: 'Uptime Monitor',
  tagline: 'Open-source uptime monitoring and status pages',
})

const ConfigContext = createContext<AppConfig>({
  minMonitorInterval: 30,
  maxMonitorTimeout: 60,
  canUsePhoneAlerts: true,
})

export function useBrand() {
  return useContext(BrandContext)
}

export function useAppConfig() {
  return useContext(ConfigContext)
}

export default function Providers({
  children,
  brand,
  config,
}: {
  children: ReactNode
  brand: Brand
  config: AppConfig
}) {
  return (
    <SessionProvider>
      <BrandContext.Provider value={brand}>
        <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
      </BrandContext.Provider>
    </SessionProvider>
  )
}
