import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category } from '../lib/db'

interface CategoryBarProps {
  categories: Category[]
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void | Promise<void>
}

export function CategoryBar({
  categories,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: CategoryBarProps) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const longPressTimer = useRef<number | null>(null)

  function startLongPress(id: string) {
    clearLongPress()
    longPressTimer.current = window.setTimeout(() => {
      setMenuFor(id)
    }, 500)
  }
  function clearLongPress() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function submitAdd() {
    const name = newName.trim()
    if (name) onAdd(name)
    setNewName('')
    setAdding(false)
  }

  function handleRename(cat: Category) {
    setMenuFor(null)
    const name = window.prompt(t('category.renamePrompt'), cat.name)
    if (name && name.trim() && name.trim() !== cat.name) {
      onRename(cat.id, name.trim())
    }
  }

  function handleDelete(cat: Category) {
    setMenuFor(null)
    if (categories.length <= 1) {
      window.alert(t('category.cannotDeleteLast'))
      return
    }
    if (window.confirm(t('category.deleteConfirm', { name: cat.name }))) {
      Promise.resolve(onDelete(cat.id)).catch((err: unknown) => {
        if (err instanceof Error && err.message === 'CATEGORY_NOT_EMPTY') {
          window.alert(t('category.cannotDeleteFilled'))
        }
      })
    }
  }

  return (
    <div className="px-6 pb-4">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {categories.map((cat) => {
          const isActive = cat.id === activeId
          return (
            <div key={cat.id} className="relative">
              <button
                onClick={() => onSelect(cat.id)}
                onPointerDown={() => startLongPress(cat.id)}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
                onPointerCancel={clearLongPress}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'bg-white/60 backdrop-blur text-gray-500 hover:text-gray-700'
                }`}
              >
                {cat.name}
              </button>
              {menuFor === cat.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuFor(null)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 min-w-[140px]">
                    <button
                      onClick={() => handleRename(cat)}
                      className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                    >
                      {t('list.rename')}
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="w-full px-3 py-2 text-sm text-left text-rose-600 hover:bg-rose-50"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}

        {adding ? (
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={submitAdd}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitAdd()
              if (e.key === 'Escape') {
                setNewName('')
                setAdding(false)
              }
            }}
            placeholder={t('category.namePlaceholder')}
            className="px-3 py-1.5 rounded-full text-sm bg-white border border-gray-200 outline-none focus:border-gray-400 w-32"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            aria-label={t('category.add')}
            className="w-8 h-8 flex-shrink-0 rounded-full bg-white/60 backdrop-blur flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
