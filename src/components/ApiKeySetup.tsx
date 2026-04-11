import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STORAGE_KEYS } from '../lib/constants'

interface ApiKeySetupProps {
  onComplete: () => void
}

export function ApiKeySetup({ onComplete }: ApiKeySetupProps) {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (apiKey.trim()) {
      localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, apiKey.trim())
    }
    onComplete()
  }

  function handleSkip() {
    onComplete()
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-[#fafafa]">
      <div className="glass rounded-3xl p-8 max-w-md w-full space-y-6 text-center">
        {/* Logo */}
        <div className="w-20 h-20 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{t('setup.welcome')}</h1>
          <p className="text-gray-500 text-sm">{t('setup.description')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="text-sm text-gray-500 mb-1 block">{t('settings.apiKey')}</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('settings.apiKeyPlaceholder')}
              className="w-full bg-white/80 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none border border-gray-100 focus:border-emerald-300 transition-colors"
            />
            <p className="text-xs text-gray-400 mt-2">{t('setup.apiKeyNeeded')}</p>
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {t('setup.getKey')} →
          </a>

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
          >
            {t('setup.start')}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {t('common.cancel')} (mode hors-ligne)
          </button>
        </form>
      </div>
    </div>
  )
}
