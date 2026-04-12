import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthContext } from '../contexts/AuthContext'

interface AuthPageProps {
  onSkip: () => void
}

export function AuthPage({ onSkip }: AuthPageProps) {
  const { t } = useTranslation()
  const { signIn, signUp } = useAuthContext()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) return

    if (isSignUp && password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }

    if (isSignUp && password.length < 6) {
      setError(t('auth.passwordTooShort'))
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email.trim(), password)
        setConfirmationSent(true)
      } else {
        await signIn(email.trim(), password)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Invalid login credentials')) {
        setError(t('auth.invalidCredentials'))
      } else if (msg.includes('User already registered')) {
        setError(t('auth.emailTaken'))
      } else if (msg.includes('Email rate limit exceeded')) {
        setError(t('auth.rateLimited'))
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  if (confirmationSent) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 bg-[#fafafa]">
        <div className="glass rounded-3xl p-8 max-w-md w-full space-y-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">{t('auth.checkEmail')}</h2>
          <p className="text-sm text-gray-500">{t('auth.confirmationSent')}</p>
          <button
            onClick={() => { setConfirmationSent(false); setIsSignUp(false) }}
            className="w-full py-3 rounded-xl text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    )
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {isSignUp ? t('auth.createAccount') : t('auth.login')}
          </h1>
          <p className="text-gray-500 text-sm">{t('auth.syncDescription')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="text-sm text-gray-500 mb-1 block">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              className="w-full bg-white/80 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none border border-gray-100 focus:border-emerald-300 transition-colors"
              autoComplete="email"
            />
          </div>

          <div className="text-left">
            <label className="text-sm text-gray-500 mb-1 block">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/80 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none border border-gray-100 focus:border-emerald-300 transition-colors"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          {isSignUp && (
            <div className="text-left">
              <label className="text-sm text-gray-500 mb-1 block">{t('auth.confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/80 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none border border-gray-100 focus:border-emerald-300 transition-colors"
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 text-left">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-200"
          >
            {loading
              ? '...'
              : isSignUp
                ? t('auth.signUp')
                : t('auth.signIn')
            }
          </button>

          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          >
            {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.noAccount')}
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {t('auth.continueWithout')}
          </button>
        </form>
      </div>
    </div>
  )
}
