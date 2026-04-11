import { useLiveQuery } from 'dexie-react-hooks'
import { db, type TaskList } from '../lib/db'
import { nanoid } from 'nanoid'
import { getColorForIndex } from '../lib/constants'

export function useLists() {
  const lists = useLiveQuery(() => db.lists.orderBy('order').toArray()) ?? []

  async function addList(name: string, icon: string, color?: string): Promise<string> {
    const id = nanoid()
    const maxOrder = lists.length > 0 ? Math.max(...lists.map((l) => l.order)) : 0
    const assignedColor = color ?? getColorForIndex(lists.length).key

    await db.lists.add({
      id,
      name,
      icon,
      color: assignedColor,
      order: maxOrder + 1,
      createdAt: Date.now(),
    })

    return id
  }

  async function updateList(id: string, updates: Partial<Pick<TaskList, 'name' | 'icon' | 'color' | 'order'>>) {
    await db.lists.update(id, updates)
  }

  async function deleteList(id: string) {
    await db.transaction('rw', db.lists, db.tasks, async () => {
      await db.tasks.where('listId').equals(id).delete()
      await db.lists.delete(id)
    })
  }

  async function findListByName(name: string): Promise<TaskList | undefined> {
    return db.lists.where('name').equalsIgnoreCase(name).first()
  }

  return { lists, addList, updateList, deleteList, findListByName }
}
