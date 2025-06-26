import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Canvas Coach - LMS Ondersteuning',
  description: 'Professionele Canvas LMS ondersteuning en coaching voor onderwijsprofessionals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className="bg-gray-50 min-h-screen" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}