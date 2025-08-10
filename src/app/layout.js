import './globals.css'

export const metadata = {
  title: 'Lake St. Clair Fishing Intelligence',
  description: 'AI-powered fishing assistance for Lake St. Clair multi-species fishing',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  )
}