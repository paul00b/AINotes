import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Task } from '../lib/db'
import { nanoid } from 'nanoid'

export function useTasks(listId?: string) {
  const tasks = useLiveQuery(
    () => {
      if (!listId) return db.tasks.orderBy('order').toArray()
      return db.tasks.where('listId').equals(listId).sortBy('order')
    },
    [listId],
  ) ?? []

  async function addTask(text: string, targetListId: string): Promise<string> {
    const id = nanoid()
    const existing = await db.tasks.where('listId').equals(targetListId).toArray()
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((t) => t.order)) : 0

    await db.tasks.add({
      id,
      listId: targetListId,
      text,
      completed: false,
      order: maxOrder + 1,
      createdAt: Date.now(),
    })

    return id
  }

  async function toggleTask(id: string) {
    const task = await db.tasks.get(id)
    if (task) {
      await db.tasks.update(id, { completed: !task.completed })
    }
  }

  async function updateTask(id: string, updates: Partial<Pick<Task, 'text' | 'completed' | 'order' | 'listId'>>) {
    await db.tasks.update(id, updates)
  }

  async function deleteTask(id: string) {
    await db.tasks.delete(id)
  }

  async function getTaskCountForList(targetListId: string) {
    const all = await db.tasks.where('listId').equals(targetListId).toArray()
    const done = all.filter((t) => t.completed).length
    return { total: all.length, done }
  }

  return { tasks, addTask, toggleTask, updateTask, deleteTask, getTaskCountForList }
}
