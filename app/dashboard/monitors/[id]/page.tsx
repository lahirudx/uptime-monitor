'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Monitor, MonitorCheck } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { formatDuration } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function MonitorDetailPage() {
  const params = useParams()
  const [monitor, setMonitor] = useState<Monitor | null>(null)
  const [checks, setChecks] = useState<MonitorCheck[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchMonitor()
      fetchChecks()
      fetchStats()
    }
  }, [params.id])

  const fetchMonitor = async () => {
    try {
      const response = await fetch(`/api/monitors/${params.id}`)
      const result = await response.json()

      if (result.success) {
        setMonitor(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch monitor:', error)
    }
  }

  const fetchChecks = async () => {
    try {
      const response = await fetch(`/api/monitors/${params.id}/checks?hours=24&limit=100`)
      const result = await response.json()

      if (result.success) {
        setChecks(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch checks:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/monitors/${params.id}/stats`)
      const result = await response.json()

      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="container mx-auto">
          <p className="text-center text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!monitor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="container mx-auto">
          <p className="text-center text-gray-600 dark:text-gray-400">Monitor not found</p>
        </div>
      </div>
    )
  }

  const chartData = checks
    .slice()
    .reverse()
    .map((check) => ({
      time: new Date(check.timestamp).toLocaleTimeString(),
      responseTime: check.responseTime,
      success: check.success ? 1 : 0,
    }))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="container mx-auto">
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold dark:text-white">{monitor.name}</h1>
            <Badge variant={monitor.status === 'up' ? 'success' : monitor.status === 'down' ? 'destructive' : 'warning'}>
              {monitor.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{monitor.url}</p>
        </div>

        {stats && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>24h Uptime</CardDescription>
                <CardTitle className="text-2xl">{stats.uptime24h.toFixed(2)}%</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>7d Uptime</CardDescription>
                <CardTitle className="text-2xl">{stats.uptime7d.toFixed(2)}%</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>30d Uptime</CardDescription>
                <CardTitle className="text-2xl">{stats.uptime30d.toFixed(2)}%</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Avg Response Time</CardDescription>
                <CardTitle className="text-2xl">{formatDuration(stats.avgResponseTime)}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Response Time (Last 24 Hours)</CardTitle>
            <CardDescription className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-xs">Success</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-xs">Failed</span>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string, props: any) => {
                    if (name === 'responseTime') {
                      return [formatDuration(value), 'Response Time']
                    }
                    return [value, name]
                  }}
                  labelFormatter={(label) => `Time: ${label}`}
                  contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload, index } = props
                    const isSuccess = payload.success === 1
                    return (
                      <circle
                        key={`dot-${index}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={isSuccess ? '#10b981' : '#ef4444'}
                        stroke={isSuccess ? '#10b981' : '#ef4444'}
                        strokeWidth={2}
                      />
                    )
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Checks</CardTitle>
            <CardDescription>Last 100 checks in the past 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4 dark:text-white">Timestamp</th>
                    <th className="text-left py-3 px-4 dark:text-white">Status</th>
                    <th className="text-left py-3 px-4 dark:text-white">Response Time</th>
                    <th className="text-left py-3 px-4 dark:text-white">Status Code</th>
                    <th className="text-left py-3 px-4 dark:text-white">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((check) => (
                    <tr key={check._id} className="border-b dark:border-gray-800">
                      <td className="py-3 px-4 text-sm dark:text-gray-300">
                        {new Date(check.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={check.success ? 'success' : 'destructive'}>
                          {check.success ? 'Success' : 'Failed'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300">
                        {formatDuration(check.responseTime)}
                      </td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300">
                        {check.statusCode || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm dark:text-gray-300">
                        {check.error || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
