import CartButton from '@/app/components/CartButton'
import './globals.css'
import { CartProvider } from './context/CartContext'

export const metadata = {
  title: 'EdStop',
  description: 'Campus Food & Quick Mart',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <CartProvider>
          <div className="min-h-screen">
            <header className="bg-white shadow-sm border-b">
              <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold">EdStop</h1>
                <span className="text-sm text-gray-500">
                  IIT Kharagpur
                </span>
              </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-6">
          
              {children}
            </main>
          </div>
        </CartProvider>
      </body>
    </html>
  )
}