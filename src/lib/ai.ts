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

function buildPrompt(
  userText: string,
  existingLists: TaskList[],
  lang: string,
  existingTasks: Record<string, string[]> = {},
): string {
  const isFr = lang.startsWith('fr')
  const none = isFr ? 'Aucune' : 'None'

  const listsDescription = existingLists.length > 0
    ? existingLists.map((l) => {
        const tasks = existingTasks[l.id] ?? []
        const preview = tasks.length > 0
          ? ` — contains: ${tasks.slice(0, 8).join(', ')}${tasks.length > 8 ? '...' : ''}`
          : ' — empty'
        return `- "${l.name}" (${l.icon}, id: "${l.id}")${preview}`
      }).join('\n')
    : none

  const langInstruction = isFr
    ? 'Réponds en français.'
    : 'Respond in English.'

  return `You are an intelligent personal assistant that organizes spoken notes into actionable lists.
Input comes from speech recognition and may contain errors — fix them using context before processing.

## PRIORITY RULES (apply in order):

1. USER-NAMED LIST → single list, no split
   If the user explicitly names a topic ("for the wedding...", "my shopping list..."), ALL related items go into ONE list with that name. Never split a user-named list.

2. MULTI-TOPIC → one list per topic
   If the user mentions clearly distinct subjects in one message, create one list per subject.
   Trigger: the user switches context mid-sentence ("...and also...", "...plus I need to...", "...oh and...").

3. PURCHASE INFERENCE → cross-reference into "Courses"
   If a task implies buying something, add the purchase item to an existing or new "Courses" list.
   Only infer purchases that are unambiguous (replacing a lightbulb = buy a lightbulb).
   Never infer purchases for tasks where the user might already have the item or use a service.

4. RECIPE/INGREDIENT BREAKDOWN
   If the user mentions a recipe, dish, or cocktail, break it down into individual ingredients with quantities scaled to the number of people mentioned.

## RULES:
- Each task = one short, clear, actionable item
- Smart list naming: use the user's own words. Never use generic names like "Notes", "Tasks", "To-do"
- If an item fits an existing list, reuse it (isExisting: true, with the EXACT existing name)
- Assign a relevant emoji to each new list
- Include quantities when specified or inferable
- ${langInstruction}
- Respond ONLY in valid JSON, no markdown, no backticks

## EXAMPLES:

Input: "Pour le mariage j'ai besoin d'envoyer les faire-part, réserver le traiteur, et créer un mood board pour le gâteau. J'ai aussi besoin de changer l'ampoule du couloir. Et il me faut des mojitos pour 5 personnes ce soir."

Output:
{
  "lists": [
    {
      "name": "Mariage",
      "icon": "💍",
      "isExisting": false,
      "tasks": ["Envoyer les faire-part", "Réserver le traiteur", "Créer un mood board pour le gâteau"]
    },
    {
      "name": "Maison",
      "icon": "🏠",
      "isExisting": false,
      "tasks": ["Changer l'ampoule du couloir"]
    },
    {
      "name": "Courses",
      "icon": "🛒",
      "isExisting": false,
      "tasks": ["Ampoule", "Citrons verts x5", "Rhum blanc 50cl", "Menthe fraîche", "Sucre de canne", "Eau gazeuse"]
    }
  ]
}

## Existing lists:
${listsDescription}

## User's spoken text:
"${userText}"`
}

export async function transcribeWithGemini(audioBlob: Blob, lang: string): Promise<string> {
  const apiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY)
  if (!apiKey) throw new Error('NO_API_KEY')

  const buffer = await audioBlob.arrayBuffer()
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
  )

  const isFr = lang.startsWith('fr')
  const transcribePrompt = isFr
    ? 'Transcris cet audio mot pour mot. Retourne uniquement le texte transcrit, sans commentaire.'
    : 'Transcribe this audio word for word. Return only the transcribed text, no commentary.'

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: audioBlob.type || 'audio/webm', data: base64 } },
            { text: transcribePrompt },
          ],
        }],
      }),
    },
  )

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    console.error('Gemini transcription error:', res.status, errBody)
    throw new Error(`API_ERROR_${res.status}`)
  }

  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const textPart = parts.filter((p: { text?: string }) => p.text !== undefined).pop()
  return (textPart?.text ?? '').trim()
}

export async function organizeWithAI(
  userText: string,
  existingLists: TaskList[],
  lang: string,
  existingTasks: Record<string, string[]> = {},
): Promise<AIResponse> {
  const apiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY)
  if (!apiKey) {
    throw new Error('NO_API_KEY')
  }

  const prompt = buildPrompt(userText, existingLists, lang, existingTasks)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  )

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    console.error('Gemini API error:', res.status, errBody)
    throw new Error(`API_ERROR_${res.status}`)
  }

  const data = await res.json()
  // gemini-2.5-flash may return thinking + text parts, grab the last text part
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const textPart = parts.filter((p: { text?: string }) => p.text !== undefined).pop()
  const text = textPart?.text ?? ''

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
