import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useStore } from './store'
import LoginPage from './pages/LoginPage'
import OnboardPage from './pages/OnboardPage'
import ScanPage from './pages/ScanPage'
import InventoryPage from './pages/InventoryPage'
import AlertsPage from './pages/AlertsPage'
import SuppliersPage from './pages/SuppliersPage'
import NavBar from './components/NavBar'

function ProtectedApp() {
  const { shop, user, fetchShop, fetchStock, fetchSuppliers } = useStore()

  useEffect(() => {
    if (user) fetchShop(user.id)
  }, [user])

  useEffect(() => {
    if (shop) {
      fetchStock(shop.id)
      fetchSuppliers(shop.id)
    }
  }, [shop])

  if (!shop) return <OnboardPage />

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto pb-16">
        <Routes>
          <Route path="/" element={<Navigate to="/inventory" replace />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="*" element={<Navigate to="/inventory" replace />} />
        </Routes>
      </div>
      <NavBar />
    </div>
  )
}

export default function App() {
  const { setUser, user } = useStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      // Safety timeout to avoid perpetual loading screen
      const timeout = setTimeout(() => {
        if (loading) setLoading(false)
      }, 5000)

      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (e) {
        console.error('Auth initialization failed:', e)
      } finally {
        clearTimeout(timeout)
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/inventory" replace /> : <LoginPage />} />
        <Route path="/*" element={user ? <ProtectedApp /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
