import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { ListPage } from './pages/ListPage'
import { SettingsPage } from './pages/SettingsPage'
import { AuthPage } from './pages/AuthPage'
import { ApiKeySetup } from './components/ApiKeySetup'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import { pushLocalDataToSupabase, pullFromSupabase } from './lib/sync'
import { db } from './lib/db'

function AppInner() {
  const { user, loading: authLoading } = useAuthContext()

  const [setupDone, setSetupDone] = useState(
    () => localStorage.getItem('ainotes_setup_done') === 'true',
  )
  const [skippedAuth, setSkippedAuth] = useState(
    () => localStorage.getItem('ainotes_skipped_auth') === 'true',
  )
  const [syncing, setSyncing] = useState(false)

  // Sync on login
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function doSync() {
      setSyncing(true)
      try {
        // Check if there's local data to push
        const localLists = await db.lists.count()
        if (localLists > 0) {
          await pushLocalDataToSupabase(user!.id)
        }
        // Then pull remote data (merges everything)
        await pullFromSupabase(user!.id)
      } catch (err) {
        console.error('Sync error:', err)
      }
      if (!cancelled) setSyncing(false)
    }

    doSync()
    return () => { cancelled = true }
  }, [user])

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#fafafa]">
        <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Show auth page if not logged in and hasn't skipped
  if (!user && !skippedAuth) {
    return (
      <AuthPage
        onSkip={() => {
          localStorage.setItem('ainotes_skipped_auth', 'true')
          setSkippedAuth(true)
        }}
      />
    )
  }

  if (!setupDone) {
    return (
      <ApiKeySetup
        onComplete={() => {
          localStorage.setItem('ainotes_setup_done', 'true')
          setSetupDone(true)
        }}
      />
    )
  }

  if (syncing) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-[#fafafa]">
        <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Synchronisation...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/list/:id" element={<ListPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}

export default App
