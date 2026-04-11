import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { ListPage } from './pages/ListPage'
import { SettingsPage } from './pages/SettingsPage'
import { ApiKeySetup } from './components/ApiKeySetup'

function App() {
  const [setupDone, setSetupDone] = useState(
    () => localStorage.getItem('ainotes_setup_done') === 'true',
  )

  function handleSetupComplete() {
    localStorage.setItem('ainotes_setup_done', 'true')
    setSetupDone(true)
  }

  if (!setupDone) {
    return <ApiKeySetup onComplete={handleSetupComplete} />
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

export default App
