'use client'

import { useAuth } from '@/lib/useAuth'

export default function TestAuth() {
  const { user, loading } = useAuth()

  return (
    <div className="p-10">
      <h1>Auth Test</h1>
      <p>Loading: {loading.toString()}</p>
      <p>User: {JSON.stringify(user)}</p>
    </div>
  )
}
