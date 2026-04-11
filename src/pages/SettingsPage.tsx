import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from '../components/Layout'
import { STORAGE_KEYS } from '../lib/constants'
import { db } from '../lib/db'

export function SettingsPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [apiKey, setApiKey] = useState(localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY) ?? '')
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleSaveApiKey() {
    if (apiKey.trim()) {
      localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, apiKey.trim())
    } else {
      localStorage.removeItem(STORAGE_KEYS.GEMINI_API_KEY)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleLanguageChange(lang: string) {
    i18n.changeLanguage(lang)
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang)
  }

  async function handleExportData() {
    const lists = await db.lists.toArray()
    const tasks = await db.tasks.toArray()
    const data = { lists, tasks, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ainotes-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDeleteAllData() {
    await db.tasks.clear()
    await db.lists.clear()
    await db.voiceEntries.clear()
    setShowDeleteConfirm(false)
    navigate('/')
  }

  return (
    <Layout>
      <div className="px-6 pt-14 pb-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">{t('common.back')}</span>
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-8">{t('settings.title')}</h1>

        <div className="space-y-6">
          {/* API Key */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <label className="text-sm font-medium text-gray-700">{t('settings.apiKey')}</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('settings.apiKeyPlaceholder')}
              className="w-full bg-white/80 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none border border-gray-100 focus:border-emerald-300 transition-colors"
            />
            <p className="text-xs text-gray-400">{t('settings.apiKeyDescription')}</p>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Google AI Studio →
            </a>
            <button
              onClick={handleSaveApiKey}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
            >
              {saved ? t('settings.saved') : t('settings.save')}
            </button>
          </div>

          {/* Language */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <label className="text-sm font-medium text-gray-700">{t('settings.language')}</label>
            <div className="flex gap-2">
              {[
                { code: 'fr', label: 'Francais' },
                { code: 'en', label: 'English' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    i18n.language.startsWith(lang.code)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <button
              onClick={handleExportData}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              {t('settings.exportData')}
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
            >
              {t('settings.deleteData')}
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full space-y-4">
            <p className="text-sm text-gray-700 text-center">{t('settings.deleteDataConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 bg-gray-100"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteAllData}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-red-500"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
