import { useLiveQuery } from 'dexie-react-hooks'
import { db, type TaskList } from '../lib/db'
import { nanoid } from 'nanoid'
import { getColorForIndex } from '../lib/constants'
import { useAuthContext } from '../contexts/AuthContext'
import { syncAddList, syncUpdateList, syncDeleteList } from '../lib/sync'

export function useLists() {
  const { user } = useAuthContext()
  const lists = useLiveQuery(() => db.lists.orderBy('order').toArray()) ?? []

  async function addList(name: string, icon: string, color?: string): Promise<string> {
    const id = nanoid()
    const maxOrder = lists.length > 0 ? Math.max(...lists.map((l) => l.order)) : 0
    const assignedColor = color ?? getColorForIndex(lists.length).key

    const list: TaskList = {
      id,
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

  async function updateList(id: string, updates: Partial<Pick<TaskList, 'name' | 'icon' | 'color' | 'order'>>) {
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
    return db.lists.where('name').equalsIgnoreCase(name).first()
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
