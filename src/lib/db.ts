import Dexie, { type EntityTable } from 'dexie'
import { nanoid } from 'nanoid'

export interface Category {
  id: string
  name: string
  order: number
  createdAt: number
}

export interface TaskList {
  id: string
  categoryId: string
  name: string
  icon: string
  color: string
  order: number
  createdAt: number
}

export interface Task {
  id: string
  listId: string
  text: string
  completed: boolean
  order: number
  createdAt: number
}

export interface VoiceEntry {
  id: string
  rawText: string
  processedAt: number
  createdAt: number
}

const db = new Dexie('AiNotesDB') as Dexie & {
  categories: EntityTable<Category, 'id'>
  lists: EntityTable<TaskList, 'id'>
  tasks: EntityTable<Task, 'id'>
  voiceEntries: EntityTable<VoiceEntry, 'id'>
}

db.version(1).stores({
  lists: 'id, order, createdAt',
  tasks: 'id, listId, order, createdAt',
  voiceEntries: 'id, createdAt',
})

db.version(2).stores({
  lists: 'id, name, order, createdAt',
  tasks: 'id, listId, order, createdAt',
  voiceEntries: 'id, createdAt',
})

db.version(3)
  .stores({
    categories: 'id, order, createdAt',
    lists: 'id, categoryId, name, order, createdAt',
    tasks: 'id, listId, order, createdAt',
    voiceEntries: 'id, createdAt',
  })
  .upgrade(async (tx) => {
    const defaultId = nanoid()
    const now = Date.now()
    await tx.table('categories').bulkAdd([
      { id: defaultId, name: 'Perso', order: 1, createdAt: now },
      { id: nanoid(), name: 'Pro', order: 2, createdAt: now + 1 },
    ])
    await tx
      .table('lists')
      .toCollection()
      .modify((list: TaskList) => {
        if (!list.categoryId) list.categoryId = defaultId
      })
  })

export async function ensureDefaultCategories(): Promise<void> {
  const count = await db.categories.count()
  if (count > 0) return
  const now = Date.now()
  await db.categories.bulkAdd([
    { id: nanoid(), name: 'Perso', order: 1, createdAt: now },
    { id: nanoid(), name: 'Pro', order: 2, createdAt: now + 1 },
  ])
}

export { db }
