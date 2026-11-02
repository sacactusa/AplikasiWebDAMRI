import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DAMRI - Pencatatan & Verifikasi Operasional Bus',
  description:
    'Streamline operational bus production tracking for drivers and coordinators with real-time data entry, verification, and reporting features.',
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-white text-ink antialiased">
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
