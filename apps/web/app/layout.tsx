import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tulay - Turn goals into human connections',
  description: 'Community-powered AI agent helping freelancers and career shifters find people to help and be helped.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <nav className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <a href="/" className="text-xl font-bold text-blue-600">Tulay</a>
              </div>
              <div className="flex items-center space-x-4">
                <a href="/" className="text-gray-700 hover:text-gray-900">Home</a>
                <a href="/find-help" className="text-gray-700 hover:text-gray-900">Find Help</a>
                <a href="/collaborations" className="text-gray-700 hover:text-gray-900">My Collaborations</a>
                <a href="/profile" className="text-gray-700 hover:text-gray-900">Profile</a>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
