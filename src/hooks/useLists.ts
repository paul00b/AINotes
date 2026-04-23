import { useLiveQuery } from 'dexie-react-hooks'
import { db, type TaskList } from '../lib/db'
import { nanoid } from 'nanoid'
import { getColorForIndex } from '../lib/constants'
import { useAuthContext } from '../contexts/AuthContext'
import { syncAddList, syncUpdateList, syncDeleteList } from '../lib/sync'

export function useLists(categoryId?: string | null) {
  const { user } = useAuthContext()
  const lists = useLiveQuery(
    async () => {
      if (!categoryId) return []
      const all = await db.lists.where('categoryId').equals(categoryId).toArray()
      return all.sort((a, b) => a.order - b.order)
    },
    [categoryId],
  ) ?? []

  async function addList(name: string, icon: string, color?: string, targetCategoryId?: string): Promise<string> {
    const cat = targetCategoryId ?? categoryId
    if (!cat) throw new Error('No category selected')
    const id = nanoid()
    const maxOrder = lists.length > 0 ? Math.max(...lists.map((l) => l.order)) : 0
    const assignedColor = color ?? getColorForIndex(lists.length).key

    const list: TaskList = {
      id,
      categoryId: cat,
      name,
      icon,
      color: assignedColor,
      order: maxOrder + 1,
      createdAt: Date.now(),
    }

    await db.lists.add(list)
    if (user) await syncAddList(user.id, list)

    return id
  }

  async function updateList(id: string, updates: Partial<Pick<TaskList, 'name' | 'icon' | 'color' | 'order' | 'categoryId'>>) {
    await db.lists.update(id, updates)
    if (user) syncUpdateList(user.id, id, updates)
  }

  async function deleteList(id: string) {
    await db.transaction('rw', db.lists, db.tasks, async () => {
      await db.tasks.where('listId').equals(id).delete()
      await db.lists.delete(id)
    })
    if (user) syncDeleteList(user.id, id)
  }

  async function findListByName(name: string): Promise<TaskList | undefined> {
    if (!categoryId) return undefined
    const matches = await db.lists.where('categoryId').equals(categoryId).toArray()
    const lower = name.toLowerCase()
    return matches.find((l) => l.name.toLowerCase() === lower)
  }

  async function reorderLists(orderedIds: string[]) {
    const updates = orderedIds.map((id, index) => ({ id, order: index + 1 }))
    await db.transaction('rw', db.lists, async () => {
      for (const { id, order } of updates) {
        await db.lists.update(id, { order })
      }
    })
    if (user) {
      for (const { id, order } of updates) {
        syncUpdateList(user.id, id, { order })
      }
    }
  }

  return { lists, addList, updateList, deleteList, findListByName, reorderLists }
}
