import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Studio',
  description: 'Generate PRDs and visual roadmaps with AI, powered by Groq',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontSize: '13px',
              borderRadius: '8px',
              padding: '10px 14px',
            },
          }}
        />
      </body>
    </html>
  )
}
