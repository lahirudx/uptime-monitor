'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Monitor } from '@/types'

interface MonitorFormProps {
  monitor?: Monitor
  onSuccess: () => void
  onCancel: () => void
}

export default function MonitorForm({ monitor, onSuccess, onCancel }: MonitorFormProps) {
  const [formData, setFormData] = useState({
    name: monitor?.name || '',
    url: monitor?.url || '',
    type: (monitor?.type || 'https') as 'http' | 'https',
    interval: monitor?.interval || 60,
    timeout: monitor?.timeout || 30,
    email: monitor?.alerts?.email?.join(', ') || '',
    webhook: monitor?.alerts?.webhook?.join(', ') || '',
    phone: monitor?.alerts?.phone?.join(', ') || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const alerts: { email?: string[], webhook?: string[], phone?: string[] } = {}

      if (formData.email) {
        alerts.email = formData.email.split(',').map(e => e.trim()).filter(Boolean)
      }

      if (formData.webhook) {
        alerts.webhook = formData.webhook.split(',').map(w => w.trim()).filter(Boolean)
      }

      if (formData.phone) {
        alerts.phone = formData.phone.split(',').map(p => p.trim()).filter(Boolean)
      }

      const url = monitor ? `/api/monitors/${monitor._id}` : '/api/monitors'
      const method = monitor ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          url: formData.url,
          type: formData.type,
          interval: formData.interval,
          timeout: formData.timeout,
          alerts,
        }),
      })

      const result = await response.json()

      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || `Failed to ${monitor ? 'update' : 'create'} monitor`)
      }
    } catch (err) {
      setError(`An error occurred while ${monitor ? 'updating' : 'creating'} the monitor`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      {error && (
        <div className="p-2 sm:p-3 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 dark:text-white">
            Monitor Name
          </label>
          <Input
            type="text"
            placeholder="My Website"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="h-9 sm:h-10 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 dark:text-white">
            URL
          </label>
          <Input
            type="url"
            placeholder="https://example.com"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            required
            className="h-9 sm:h-10 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 dark:text-white">
            Type
          </label>
          <select
            className="flex h-9 sm:h-10 w-full rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-xs sm:text-sm"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'http' | 'https' })}
          >
            <option value="https">HTTPS</option>
            <option value="http">HTTP</option>
          </select>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 dark:text-white">
            Interval (s)
          </label>
          <Input
            type="number"
            min="30"
            value={formData.interval}
            onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
            required
            className="h-9 sm:h-10 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 dark:text-white">
            Timeout (s)
          </label>
          <Input
            type="number"
            min="5"
            max="60"
            value={formData.timeout}
            onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
            required
            className="h-9 sm:h-10 text-sm"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 dark:text-white">
            Alert Emails
          </label>
          <Input
            type="text"
            placeholder="email@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="h-9 sm:h-10 text-sm"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Comma-separated</p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 dark:text-white">
            Phone Numbers
          </label>
          <Input
            type="text"
            placeholder="+1234567890"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="h-9 sm:h-10 text-sm"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Include country code</p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 dark:text-white">
            Webhook URLs
          </label>
          <Input
            type="text"
            placeholder="https://hooks.example.com"
            value={formData.webhook}
            onChange={(e) => setFormData({ ...formData, webhook: e.target.value })}
            className="h-9 sm:h-10 text-sm"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Comma-separated</p>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          size="sm"
          className="text-sm"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading} size="sm" className="text-sm">
          {loading
            ? (monitor ? 'Updating...' : 'Creating...')
            : (monitor ? 'Update' : 'Create')
          }
        </Button>
      </div>
    </form>
  )
}
