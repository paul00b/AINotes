import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { db, ensureDefaultCategories, type Category, type TaskList } from '../lib/db'
import { useAuthContext } from '../contexts/AuthContext'
import { syncAddCategory, syncUpdateCategory, syncDeleteCategory } from '../lib/sync'

const ACTIVE_CATEGORY_KEY = 'ainotes_active_category'

export function useCategories() {
  const { user } = useAuthContext()
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray())

  const [activeCategoryId, setActiveCategoryIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_CATEGORY_KEY),
  )

  // Seed defaults + make sure active category is valid
  useEffect(() => {
    if (!categories) return
    if (categories.length === 0) {
      ensureDefaultCategories()
      return
    }
    if (!activeCategoryId || !categories.some((c) => c.id === activeCategoryId)) {
      setActiveCategoryIdState(categories[0].id)
      localStorage.setItem(ACTIVE_CATEGORY_KEY, categories[0].id)
    }
    // Heal orphan lists (no categoryId) — e.g. after a pull from Supabase
    // without category_id column.
    const fallbackId = categories[0].id
    db.lists
      .filter((l: TaskList) => !l.categoryId)
      .toArray()
      .then((orphans) => {
        if (orphans.length === 0) return
        return db.lists
          .where('id')
          .anyOf(orphans.map((o) => o.id))
          .modify({ categoryId: fallbackId })
      })
  }, [categories, activeCategoryId])

  function setActiveCategoryId(id: string) {
    setActiveCategoryIdState(id)
    localStorage.setItem(ACTIVE_CATEGORY_KEY, id)
  }

  async function addCategory(name: string): Promise<string> {
    const id = nanoid()
    const list = categories ?? []
    const maxOrder = list.length > 0 ? Math.max(...list.map((c) => c.order)) : 0
    const cat: Category = { id, name, order: maxOrder + 1, createdAt: Date.now() }
    await db.categories.add(cat)
    if (user) syncAddCategory(user.id, cat)
    return id
  }

  async function renameCategory(id: string, name: string) {
    await db.categories.update(id, { name })
    if (user) syncUpdateCategory(user.id, id, { name })
  }

  async function deleteCategory(id: string) {
    const listCount = await db.lists.where('categoryId').equals(id).count()
    if (listCount > 0) {
      throw new Error('CATEGORY_NOT_EMPTY')
    }
    await db.categories.delete(id)
    if (user) syncDeleteCategory(user.id, id)
  }

  return {
    categories: categories ?? [],
    activeCategoryId,
    setActiveCategoryId,
    addCategory,
    renameCategory,
    deleteCategory,
  }
}
