import './globals.css'
import Providers from './providers'

export const metadata = {
  title: 'Lake St. Clair Fishing Intelligence',
  description: 'AI-powered fishing assistance for Lake St. Clair multi-species fishing',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e3a8a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MuskyJihad" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <div id="root">
          <Providers>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  )
}