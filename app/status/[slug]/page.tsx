'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDuration } from '@/lib/utils'

interface StatusPageData {
  title: string
  description?: string
  branding?: {
    logo?: string
    primaryColor?: string
  }
  monitors: Array<{
    _id: string
    name: string
    url: string
    status: 'up' | 'down' | 'paused'
    uptime24h: number
    lastCheck?: Date
    recentChecks: Array<{
      success: boolean
      responseTime: number
      timestamp: Date
    }>
  }>
}

export default function PublicStatusPage() {
  const params = useParams()
  const [statusPage, setStatusPage] = useState<StatusPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.slug) {
      fetchStatusPage()
    }
  }, [params.slug])

  const fetchStatusPage = async () => {
    try {
      const response = await fetch(`/api/status-pages/${params.slug}`)
      const result = await response.json()

      if (result.success) {
        setStatusPage(result.data)
      } else {
        setError('Status page not found')
      }
    } catch (err) {
      setError('Failed to load status page')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (error || !statusPage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">{error || 'Status page not found'}</p>
      </div>
    )
  }

  const allOperational = statusPage.monitors.every(m => m.status === 'up')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8 sm:mb-12">
          {statusPage.branding?.logo && (
            <img
              src={statusPage.branding.logo}
              alt="Logo"
              className="h-8 sm:h-12 mx-auto mb-3 sm:mb-4"
            />
          )}
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {statusPage.title}
          </h1>
          {statusPage.description && (
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 px-4">
              {statusPage.description}
            </p>
          )}

          <Card className={`max-w-sm sm:max-w-md mx-auto ${allOperational ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <CardContent className="py-4 sm:py-6">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl mb-2">
                  {allOperational ? '✅' : '⚠️'}
                </div>
                <p className={`text-base sm:text-xl font-semibold ${allOperational ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {allOperational ? 'All Systems Operational' : 'Some Systems Down'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {statusPage.monitors.map((monitor) => (
            <Card key={monitor._id}>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg mb-1 sm:mb-2 truncate">{monitor.name}</CardTitle>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">
                      {monitor.url}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <Badge variant={monitor.status === 'up' ? 'success' : monitor.status === 'down' ? 'destructive' : 'warning'}>
                        {monitor.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        Uptime: {monitor.uptime24h.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="flex gap-0.5 h-8 sm:h-10 items-end overflow-hidden">
                  {monitor.recentChecks.slice(0, 90).reverse().map((check, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 min-w-[2px] ${check.success ? 'bg-green-500' : 'bg-red-500'} rounded-sm`}
                      style={{ height: `${Math.min(100, Math.max(20, (check.responseTime / 1000) * 100))}%` }}
                      title={`${check.success ? 'Success' : 'Failed'} - ${formatDuration(check.responseTime)} - ${new Date(check.timestamp).toLocaleString()}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <span>90 days ago</span>
                  <span>Today</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <p>Powered by Uptime Monitor</p>
          {statusPage.monitors[0]?.lastCheck && (
            <p className="mt-1">
              Last updated: {new Date(statusPage.monitors[0].lastCheck).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
