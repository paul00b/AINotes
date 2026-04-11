import { useTranslation } from 'react-i18next'

export function EmptyState() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        {t('home.emptyTitle')}
      </h2>

      <p className="text-gray-400 text-sm text-center max-w-xs">
        {t('home.emptyDescription')}
      </p>
    </div>
  )
}
