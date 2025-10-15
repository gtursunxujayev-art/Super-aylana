import './globals.css'
import React from 'react'

export const metadata = { title: 'Super-aylana' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  )
}
