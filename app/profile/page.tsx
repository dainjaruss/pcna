"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type User = {
  id: string
  email: string
  name?: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      } catch (e: any) {
        setError(e.message || 'Failed to fetch')
      } finally {
        setLoading(false)
      }
    }
    fetchMe()
  }, [])

  function logout() {
    // Call server logout to clear httpOnly cookies
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => router.push('/login'))
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
      <div className="space-y-3">
        <a href="/settings" className="text-blue-600">Edit preferences</a>
        <button onClick={logout} className="bg-red-600 text-white px-4 py-2 rounded">Logout</button>
      </div>
    </div>
  )
}
