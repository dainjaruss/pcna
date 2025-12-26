import type { Metadata } from 'next'
import { ThemeProvider } from '@/app/components/theme-provider'
import { Navbar } from '@/app/components/navbar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pop Culture News - Your Daily Celebrity Gossip',
  description: 'Stay updated with the latest pop culture news, celebrity gossip, and entertainment updates',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t py-6 md:py-8">
              <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
                <p>&copy; {new Date().getFullYear()} Pop Culture News. All rights reserved.</p>
                <p className="mt-2">Stay updated with the latest celebrity gossip and entertainment news.</p>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
