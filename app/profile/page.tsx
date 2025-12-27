"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'

type User = {
  id: string
  email: string
  name?: string | null
}

type UserSettings = {
  preferredCelebrities: string[]
  preferredCategories: string[]
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [settings, setSettings] = useState<UserSettings>({ preferredCelebrities: [], preferredCategories: [] })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchSettings()
    }
  }, [user, loading, router])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings({
          preferredCelebrities: data.preferredCelebrities || [],
          preferredCategories: data.preferredCategories || []
        })
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e)
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      })
      if (res.ok) {
        setEditing(false)
        await fetchSettings()
        showMessage('success', 'Settings saved successfully!')
      } else {
        showMessage('error', 'Failed to save settings')
      }
    } catch (e) {
      showMessage('error', 'Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="mb-4">You must be logged in to view your profile.</p>
          <Link href="/login" className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">👤 Profile</h1>

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

      {/* Profile Information */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border rounded-lg">
              {user.email}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border rounded-lg">
              {user.name || 'Not set'}
            </div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Preferences</h2>
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {editing ? 'Cancel' : 'Edit Preferences'}
          </button>
        </div>

        {!editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Celebrities
              </label>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border rounded-lg min-h-[2.5rem]">
                {settings.preferredCelebrities.length > 0
                  ? settings.preferredCelebrities.join(', ')
                  : 'None set'
                }
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Categories
              </label>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border rounded-lg min-h-[2.5rem]">
                {settings.preferredCategories.length > 0
                  ? settings.preferredCategories.join(', ')
                  : 'None set'
                }
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Celebrities (comma-separated)
              </label>
              <input
                type="text"
                value={settings.preferredCelebrities.join(', ')}
                onChange={(e) => setSettings({
                  ...settings,
                  preferredCelebrities: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g. Taylor Swift, Beyoncé, Drake"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Categories (comma-separated)
              </label>
              <input
                type="text"
                value={settings.preferredCategories.join(', ')}
                onChange={(e) => setSettings({
                  ...settings,
                  preferredCategories: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g. Music, Movies, Sports"
              />
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </section>

      {/* Account Actions */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Account Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/settings"
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ⚙️ Manage Settings
          </Link>
          <button
            onClick={logout}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            🚪 Logout
          </button>
        </div>
      </section>
    </div>
  )
}