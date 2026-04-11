import { GoogleGenerativeAI } from '@google/generative-ai'
import { STORAGE_KEYS } from './constants'
import type { TaskList } from './db'

export interface AIListResult {
  name: string
  icon: string
  isExisting: boolean
  existingId?: string
  tasks: string[]
}

export interface AIResponse {
  lists: AIListResult[]
}

function buildPrompt(userText: string, existingLists: TaskList[], lang: string): string {
  const isFr = lang.startsWith('fr')
  const listsDescription = existingLists.length > 0
    ? existingLists.map((l) => `- "${l.name}" (${l.icon})`).join('\n')
    : isFr ? 'Aucune' : 'None'

  const langInstruction = isFr
    ? 'Réponds en français.'
    : 'Respond in English.'

  return `You are an organization assistant. The user dictates voice notes that are transcribed by speech recognition.
The transcript may contain errors, misheard words, or missing punctuation — use context to correct them before organizing.

Analyze the text and organize it into categorized lists with tasks.

Rules:
- Fix speech recognition errors (homophones, missing words, wrong transcription) using context
- Create thematic lists (Grocery, To-do, Ideas, Appointments, etc.)
- Each item = one short, clear task
- If items match existing lists, reuse them (isExisting: true, with the exact name)
- Assign a relevant emoji to each new list
- ${langInstruction}
- Respond ONLY in valid JSON, no markdown, no backticks

Existing lists:
${listsDescription}

Expected response format:
{"lists":[{"name":"Courses","icon":"🛒","isExisting":false,"tasks":["Lait","Oeufs"]}]}

User text:
"${userText}"`
}

export async function organizeWithAI(
  userText: string,
  existingLists: TaskList[],
  lang: string,
): Promise<AIResponse> {
  const apiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY)
  if (!apiKey) {
    throw new Error('NO_API_KEY')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = buildPrompt(userText, existingLists, lang)

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Clean potential markdown wrapping
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  const parsed: AIResponse = JSON.parse(cleaned)

  if (!parsed.lists || !Array.isArray(parsed.lists)) {
    throw new Error('INVALID_RESPONSE')
  }

  return parsed
}

// Simple offline fallback using keyword matching
export function organizeOffline(userText: string, lang: string): AIResponse {
  const lists: AIListResult[] = []

  const groceryKeywords = ['acheter', 'courses', 'lait', 'pain', 'oeufs', 'fromage', 'viande', 'légumes', 'fruits', 'supermarché', 'buy', 'grocery', 'milk', 'bread', 'eggs']
  const appointmentKeywords = ['appeler', 'rendez-vous', 'rdv', 'médecin', 'dentiste', 'réunion', 'call', 'appointment', 'meeting', 'doctor']

  const sentences = userText.split(/[,.;!?]+/).map((s) => s.trim()).filter(Boolean)

  const grocery: string[] = []
  const appointments: string[] = []
  const general: string[] = []

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase()
    if (groceryKeywords.some((k) => lower.includes(k))) {
      grocery.push(sentence)
    } else if (appointmentKeywords.some((k) => lower.includes(k))) {
      appointments.push(sentence)
    } else {
      general.push(sentence)
    }
  }

  const isFr = lang.startsWith('fr')
  if (grocery.length > 0) {
    lists.push({ name: isFr ? 'Courses' : 'Grocery', icon: '🛒', isExisting: false, tasks: grocery })
  }
  if (appointments.length > 0) {
    lists.push({ name: isFr ? 'Rendez-vous' : 'Appointments', icon: '📅', isExisting: false, tasks: appointments })
  }
  if (general.length > 0) {
    lists.push({ name: isFr ? 'Notes' : 'Notes', icon: '📝', isExisting: false, tasks: general })
  }

  // If nothing was categorized, put everything in Notes
  if (lists.length === 0) {
    lists.push({ name: 'Notes', icon: '📝', isExisting: false, tasks: [userText] })
  }

  return { lists }
}
