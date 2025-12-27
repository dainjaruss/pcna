"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<UserSettings>({ preferredCelebrities: [], preferredCategories: [] })
  const [editing, setEditing] = useState(false)

  function getToken() {
    return null
  }

  useEffect(() => {
    async function fetchMe() {
      // Try direct cookie-based request first
      try {
        let res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' })
        if (res.status === 401) {
          // Attempt silent refresh once
          const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
          if (r.ok) {
            res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' })
          }
        }
        if (!res.ok) {
          setError('Not authenticated')
          setLoading(false)
          return
        }
        const data = await res.json()
        setUser(data.user)
        await fetchSettings()
      } catch (e: any) {
        setError(e.message || 'Failed to fetch')
      } finally {
        setLoading(false)
      }
    }
    fetchMe()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings || { preferredCelebrities: [], preferredCategories: [] })
      }
    } catch (e) {
      console.error('Failed to fetch settings', e)
    }
  }

  function logout() {
    // Call server logout to clear httpOnly cookies
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => router.push('/login'))
  }

  const saveSettings = async () => {
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
      } else {
        alert('Failed to save settings')
      }
    } catch (e) {
      alert('Error saving settings')
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!user) return (
    <div className="p-6">
      <div className="mb-4">You are not signed in.</div>
      <a href="/login" className="text-blue-600">Sign in</a>
    </div>
  )

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="mb-4">
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Name:</strong> {user.name || '—'}</div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Preferences</h2>
        <div className="mb-2">
          <strong>Preferred Celebrities:</strong> {settings.preferredCelebrities.join(', ') || 'None'}
        </div>
        <div className="mb-2">
          <strong>Preferred Categories:</strong> {settings.preferredCategories.join(', ') || 'None'}
        </div>
        <button onClick={() => setEditing(!editing)} className="text-blue-600 hover:underline">
          {editing ? 'Cancel' : 'Edit Preferences'}
        </button>
      </div>

      {editing && (
        <div className="mb-4 p-4 border rounded">
          <div className="mb-2">
            <label className="block text-sm font-medium">Preferred Celebrities (comma-separated)</label>
            <input
              type="text"
              value={settings.preferredCelebrities.join(', ')}
              onChange={(e) => setSettings({ ...settings, preferredCelebrities: e.target.value.split(',').map(s => s.trim()) })}
              className="w-full border rounded p-2"
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium">Preferred Categories (comma-separated)</label>
            <input
              type="text"
              value={settings.preferredCategories.join(', ')}
              onChange={(e) => setSettings({ ...settings, preferredCategories: e.target.value.split(',').map(s => s.trim()) })}
              className="w-full border rounded p-2"
            />
          </div>
          <button onClick={saveSettings} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
        </div>
      )}

      <div className="space-y-3">
        <a href="/settings" className="text-blue-600">Edit preferences</a>
        <button onClick={logout} className="bg-red-600 text-white px-4 py-2 rounded">Logout</button>
      </div>
    </div>
  )
}
