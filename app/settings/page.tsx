'use client'

import { useEffect, useState } from 'react'

interface Source {
  id: string
  name: string
  url: string
  enabled: boolean
  credibilityRating: number
  _count: {
    articles: number
  }
}

interface EmailRecipient {
  id: string
  email: string
  active: boolean
}

interface Settings {
  refreshInterval: string
  emailTime: string
  enableRecommendations: string
}

export default function SettingsPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [settings, setSettings] = useState<Settings>({
    refreshInterval: '6',
    emailTime: '08:00',
    enableRecommendations: 'true'
  })
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [fetchingNews, setFetchingNews] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [sourcesRes, settingsRes, emailsRes] = await Promise.all([
        fetch('/api/sources'),
        fetch('/api/settings'),
        fetch('/api/settings/emails')
      ])

      if (sourcesRes.ok) setSources(await sourcesRes.json())
      if (settingsRes.ok) setSettings(await settingsRes.json())
      if (emailsRes.ok) setEmailRecipients(await emailsRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
      showMessage('error', 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        showMessage('success', 'Settings saved successfully!')
      } else {
        showMessage('error', 'Failed to save settings')
      }
    } catch (error) {
      showMessage('error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleSource = async (sourceId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sourceId, enabled })
      })

      if (response.ok) {
        setSources(sources.map(s => s.id === sourceId ? { ...s, enabled } : s))
        showMessage('success', 'Source updated successfully!')
      }
    } catch (error) {
      showMessage('error', 'Failed to update source')
    }
  }

  const handleAddEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      showMessage('error', 'Please enter a valid email address')
      return
    }

    try {
      const response = await fetch('/api/settings/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
      })

      if (response.ok) {
        const recipient = await response.json()
        setEmailRecipients([...emailRecipients, recipient])
        setNewEmail('')
        showMessage('success', 'Email recipient added successfully!')
      } else {
        const error = await response.json()
        showMessage('error', error.error || 'Failed to add email recipient')
      }
    } catch (error) {
      showMessage('error', 'Failed to add email recipient')
    }
  }

  const handleRemoveEmail = async (id: string) => {
    try {
      const response = await fetch(`/api/settings/emails?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setEmailRecipients(emailRecipients.filter(e => e.id !== id))
        showMessage('success', 'Email recipient removed successfully!')
      }
    } catch (error) {
      showMessage('error', 'Failed to remove email recipient')
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      showMessage('error', 'Please enter a valid email address')
      return
    }

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      })

      if (response.ok) {
        showMessage('success', 'Test email sent successfully! Check your inbox.')
      } else {
        const error = await response.json()
        showMessage('error', error.error || 'Failed to send test email')
      }
    } catch (error) {
      showMessage('error', 'Failed to send test email')
    }
  }

  const handleFetchNews = async () => {
    setFetchingNews(true)
    try {
      const response = await fetch('/api/cron/fetch-news', {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        showMessage('success', `News fetched! Saved: ${result.savedCount}, Skipped: ${result.skippedCount}`)
      } else {
        showMessage('error', 'Failed to fetch news')
      }
    } catch (error) {
      showMessage('error', 'Failed to fetch news')
    } finally {
      setFetchingNews(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">⚙️ Settings</h1>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* General Settings */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">General Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              News Refresh Interval
            </label>
            <select
              value={settings.refreshInterval}
              onChange={(e) => setSettings({ ...settings, refreshInterval: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="4">Every 4 hours</option>
              <option value="6">Every 6 hours (recommended)</option>
              <option value="8">Every 8 hours</option>
              <option value="12">Every 12 hours</option>
              <option value="24">Once a day</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Daily Email Time
            </label>
            <input
              type="time"
              value={settings.emailTime}
              onChange={(e) => setSettings({ ...settings, emailTime: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recommendations"
              checked={settings.enableRecommendations === 'true'}
              onChange={(e) => setSettings({ ...settings, enableRecommendations: e.target.checked ? 'true' : 'false' })}
              className="w-4 h-4"
            />
            <label htmlFor="recommendations" className="text-sm font-medium">
              Enable personalized recommendations
            </label>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </section>

      {/* News Sources */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">News Sources</h2>
          <button
            onClick={handleFetchNews}
            disabled={fetchingNews}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
          >
            {fetchingNews ? 'Fetching...' : '🔄 Fetch News Now'}
          </button>
        </div>
        
        <div className="space-y-3">
          {sources.map(source => (
            <div
              key={source.id}
              className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={source.enabled}
                    onChange={(e) => handleToggleSource(source.id, e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <h3 className="font-medium">{source.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {source._count.articles} articles • Credibility: {source.credibilityRating}/10
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Email Recipients */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Email Recipients</h2>
        
        <div className="space-y-3 mb-4">
          {emailRecipients.map(recipient => (
            <div
              key={recipient.id}
              className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700"
            >
              <span className="text-sm">{recipient.email}</span>
              <button
                onClick={() => handleRemoveEmail(recipient.id)}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter email address"
            className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
          <button
            onClick={handleAddEmail}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Add
          </button>
        </div>
      </section>

      {/* Test Email */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Test Email</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Send a test email to verify your email configuration is working correctly.
        </p>
        
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Enter test email address"
            className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
          <button
            onClick={handleTestEmail}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Send Test
          </button>
        </div>
      </section>
    </div>
  )
}
