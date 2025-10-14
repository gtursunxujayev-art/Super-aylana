export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Super-aylana</title>
      </head>
      <body style={{ margin: 0, background: '#0b0f14', color: '#e5e7eb' }}>
        {children}
      </body>
    </html>
  )
}