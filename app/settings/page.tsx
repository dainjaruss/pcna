'use client'

import { useEffect, useState } from 'react'

interface Source {
  id: string
  name: string
  url: string
  rssUrl?: string
  enabled: boolean
  credibilityRating: number
  credibilityReason?: string
  lastCredibilityCheck?: string
  credibilityHistory?: any[]
  isCustom: boolean
  type: string
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

interface UserSettings {
  retentionDays: number
  preferredCelebrities: string[]
  preferredCategories: string[]
}

export default function SettingsPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [settings, setSettings] = useState<Settings>({
    refreshInterval: '6',
    emailTime: '08:00',
    enableRecommendations: 'true'
  })
  const [userSettings, setUserSettings] = useState<UserSettings>({
    retentionDays: 30,
    preferredCelebrities: [],
    preferredCategories: []
  })
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [fetchingNews, setFetchingNews] = useState(false)

  // Custom source form state
  const [showAddSource, setShowAddSource] = useState(false)
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    rssUrl: '',
    type: 'rss' as 'rss' | 'scrape' | 'api'
  })
  const [addingSource, setAddingSource] = useState(false)
  const [credibilityAnalysis, setCredibilityAnalysis] = useState<{
    score: number;
    reason: string;
    strengths: string[];
    concerns: string[];
    confidence: string;
  } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [sourcesRes, settingsRes, emailsRes, userSettingsRes] = await Promise.all([
        fetch('/api/sources'),
        fetch('/api/settings'),
        fetch('/api/settings/emails'),
        fetch('/api/settings') // This will get user settings if authenticated
      ])

      if (sourcesRes.ok) setSources(await sourcesRes.json())
      if (settingsRes.ok) setSettings(await settingsRes.json())
      if (emailsRes.ok) setEmailRecipients(await emailsRes.json())
      if (userSettingsRes.ok) {
        const userData = await userSettingsRes.json()
        if (userData.retentionDays !== undefined) {
          setUserSettings(userData)
        }
      }
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

  const handleSaveUserSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userSettings)
      })

      if (response.ok) {
        showMessage('success', 'User settings saved successfully!')
      } else {
        showMessage('error', 'Failed to save user settings')
      }
    } catch (error) {
      showMessage('error', 'Failed to save user settings')
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
        method: 'POST',
        headers: {
          'x-ui-trigger': 'true'
        }
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

  const handleAddSource = async () => {
    if (!newSource.name.trim() || !newSource.url.trim()) {
      showMessage('error', 'Source name and URL are required')
      return
    }

    // Basic URL validation
    try {
      new URL(newSource.url)
      if (newSource.rssUrl) {
        new URL(newSource.rssUrl)
      }
    } catch {
      showMessage('error', 'Please enter valid URLs')
      return
    }

    setAddingSource(true)
    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSource)
      })

      if (response.ok) {
        const source = await response.json()
        setSources([...sources, { ...source, _count: { articles: 0 } }])
        setNewSource({
          name: '',
          url: '',
          rssUrl: '',
          type: 'rss'
        })
        setCredibilityAnalysis(null)
        setShowAddSource(false)
        showMessage('success', 'Custom source added successfully!')
      } else {
        const error = await response.json()
        showMessage('error', error.error || 'Failed to add source')
      }
    } catch (error) {
      showMessage('error', 'Failed to add source')
    } finally {
      setAddingSource(false)
    }
  }

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this custom source? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/sources?id=${sourceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSources(sources.filter(s => s.id !== sourceId))
        showMessage('success', 'Source deleted successfully!')
      } else {
        showMessage('error', 'Failed to delete source')
      }
    } catch (error) {
      showMessage('error', 'Failed to delete source')
    }
  }

  const handleRefreshCredibility = async (sourceId: string) => {
    try {
      // Call the update credibility endpoint for a single source
      const response = await fetch('/api/sources/update-credibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }) // We'll need to modify the endpoint to accept single source
      })

      if (response.ok) {
        const result = await response.json()
        // Refresh the sources list
        await fetchData()
        showMessage('success', 'Credibility score refreshed!')
      } else {
        showMessage('error', 'Failed to refresh credibility score')
      }
    } catch (error) {
      showMessage('error', 'Failed to refresh credibility score')
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

      {/* User Settings */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Article Management</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Article Retention Period
            </label>
            <select
              value={userSettings.retentionDays}
              onChange={(e) => setUserSettings({ ...userSettings, retentionDays: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="7">1 week</option>
              <option value="14">2 weeks</option>
              <option value="30">1 month (recommended)</option>
              <option value="60">2 months</option>
              <option value="90">3 months</option>
              <option value="180">6 months</option>
              <option value="365">1 year</option>
              <option value="0">Never delete</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Articles older than this will be archived (not deleted) to save space while preserving your ratings.
            </p>
          </div>

          <button
            onClick={handleSaveUserSettings}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save User Settings'}
          </button>
        </div>
      </section>

      {/* News Sources */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">News Sources</h2>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = '/onboarding/sources'}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              🎯 Re-run Onboarding
            </button>
            <button
              onClick={() => setShowAddSource(!showAddSource)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              {showAddSource ? 'Cancel' : '+ Add Custom Source'}
            </button>
            <button
              onClick={handleFetchNews}
              disabled={fetchingNews}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
            >
              {fetchingNews ? 'Fetching...' : '🔄 Fetch News Now'}
            </button>
          </div>
        </div>

        {/* Add Custom Source Form */}
        {showAddSource && (
          <div className="mb-6 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Add Custom News Source</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Source Name *</label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  placeholder="e.g., TechCrunch"
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Website URL *</label>
                <input
                  type="url"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">RSS Feed URL</label>
                <input
                  type="url"
                  value={newSource.rssUrl}
                  onChange={(e) => setNewSource({ ...newSource, rssUrl: e.target.value })}
                  placeholder="https://example.com/rss"
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Source Type</label>
                <select
                  value={newSource.type}
                  onChange={(e) => setNewSource({ ...newSource, type: e.target.value as 'rss' | 'scrape' | 'api' })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="rss">RSS Feed</option>
                  <option value="scrape">Web Scraping</option>
                  <option value="api">API</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddSource}
                disabled={addingSource}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {addingSource ? 'Analyzing source credibility...' : 'Add Source'}
              </button>
              <button
                onClick={() => setShowAddSource(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
            {credibilityAnalysis && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Credibility Analysis Complete
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Score:</span>
                    <span className={`px-2 py-1 rounded text-white text-xs ${
                      credibilityAnalysis.score >= 8 ? 'bg-green-600' :
                      credibilityAnalysis.score >= 6 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}>
                      {credibilityAnalysis.score}/10
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      ({credibilityAnalysis.confidence} confidence)
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{credibilityAnalysis.reason}</p>
                  {credibilityAnalysis.strengths.length > 0 && (
                    <div>
                      <span className="font-medium text-green-700 dark:text-green-300">Strengths:</span>
                      <ul className="list-disc list-inside ml-4 text-gray-600 dark:text-gray-400">
                        {credibilityAnalysis.strengths.map((strength, i) => (
                          <li key={i}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {credibilityAnalysis.concerns.length > 0 && (
                    <div>
                      <span className="font-medium text-orange-700 dark:text-orange-300">Concerns:</span>
                      <ul className="list-disc list-inside ml-4 text-gray-600 dark:text-gray-400">
                        {credibilityAnalysis.concerns.map((concern, i) => (
                          <li key={i}>{concern}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-3">
          {sources.map(source => (
            <div
              key={source.id}
              className={`flex items-center justify-between p-4 border rounded-lg ${
                source.isCustom 
                  ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20' 
                  : 'dark:border-gray-700'
              }`}
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
                    <h3 className="font-medium flex items-center gap-2">
                      {source.name}
                      {source.isCustom && (
                        <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                          Custom
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {source._count.articles} articles • 
                      <span className={`font-medium ${
                        source.credibilityRating >= 8 ? 'text-green-600' :
                        source.credibilityRating >= 6 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        Credibility: {source.credibilityRating}/10
                      </span>
                      {source.type && ` • Type: ${source.type}`}
                    </p>
                    {source.credibilityReason && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 max-w-md">
                        {source.credibilityReason}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {source.url}
                      {source.lastCredibilityCheck && (
                        <span className="ml-2">
                          • Last checked: {new Date(source.lastCredibilityCheck).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRefreshCredibility(source.id)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  title="Refresh credibility score"
                >
                  🔄 Refresh Score
                </button>
                {source.isCustom && (
                  <button
                    onClick={() => handleDeleteSource(source.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                    title="Delete custom source"
                  >
                    🗑️
                  </button>
                )}
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
