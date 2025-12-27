'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function Navbar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <nav className="border-b bg-white dark:bg-gray-900 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              📰 Pop Culture News
            </Link>
            <Link href="/" className="text-sm font-medium hover:text-purple-600 transition-colors">
              Home
            </Link>
            <Link href="/settings" className="text-sm font-medium hover:text-purple-600 transition-colors">
              Settings
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-purple-600 transition-colors">
              Login
            </Link>
            <Link href="/register" className="text-sm font-medium hover:text-purple-600 transition-colors">
              Register
            </Link>
            <Link href="/profile" className="text-sm font-medium hover:text-purple-600 transition-colors">
              Profile
            </Link>
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '🌞' : '🌙'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
