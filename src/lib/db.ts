import Dexie, { type EntityTable } from 'dexie'

export interface TaskList {
  id: string
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
  lists: EntityTable<TaskList, 'id'>
  tasks: EntityTable<Task, 'id'>
  voiceEntries: EntityTable<VoiceEntry, 'id'>
}

db.version(1).stores({
  lists: 'id, order, createdAt',
  tasks: 'id, listId, order, createdAt',
  voiceEntries: 'id, createdAt',
})

export { db }
