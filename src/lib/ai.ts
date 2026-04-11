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
  const listsDescription = existingLists.length > 0
    ? existingLists.map((l) => `- "${l.name}" (${l.icon})`).join('\n')
    : 'Aucune'

  const langInstruction = lang === 'fr'
    ? 'Réponds en français.'
    : 'Respond in English.'

  return `Tu es un assistant d'organisation. L'utilisateur te dicte des notes vocales.
Analyse le texte et organise-le en listes catégorisées avec des tâches.

Règles:
- Crée des listes thématiques (Courses, À faire, Idées, Rendez-vous, etc.)
- Chaque élément = une tâche courte et claire
- Si des éléments correspondent à des listes existantes, réutilise-les (isExisting: true, avec le nom exact)
- Attribue un emoji pertinent à chaque nouvelle liste
- ${langInstruction}
- Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks

Listes existantes:
${listsDescription}

Format de réponse attendu:
{"lists":[{"name":"Courses","icon":"🛒","isExisting":false,"tasks":["Lait","Oeufs"]}]}

Texte de l'utilisateur:
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

  if (grocery.length > 0) {
    lists.push({ name: lang === 'fr' ? 'Courses' : 'Grocery', icon: '🛒', isExisting: false, tasks: grocery })
  }
  if (appointments.length > 0) {
    lists.push({ name: lang === 'fr' ? 'Rendez-vous' : 'Appointments', icon: '📅', isExisting: false, tasks: appointments })
  }
  if (general.length > 0) {
    lists.push({ name: lang === 'fr' ? 'Notes' : 'Notes', icon: '📝', isExisting: false, tasks: general })
  }

  // If nothing was categorized, put everything in Notes
  if (lists.length === 0) {
    lists.push({ name: 'Notes', icon: '📝', isExisting: false, tasks: [userText] })
  }

  return { lists }
}
