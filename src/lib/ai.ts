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
The user speaks freely and your job is to interpret their INTENT, not just transcribe their words.
The input comes from speech recognition and may contain errors — fix them using context.

## Core principle: RESPECT THE USER'S STRUCTURE
- If the user asks for ONE list ("make me a list for the wedding"), create ONE list with all items inside.
- If the user mentions MULTIPLE topics in one message, THEN split into multiple lists.
- Never over-split: items that belong together should stay in ONE list.

## Your capabilities:

1. SINGLE TOPIC = SINGLE LIST
   Example: "make me a list for the wedding: send invitations, buy decorations, choose the cake" →
     - "Mariage" list: "Envoyer les invitations", "Acheter les décorations", "Choisir le gâteau"
   Example: "for the camping trip I need a tent, sleeping bags, and flashlights" →
     - "Camping trip" list: "Tent", "Sleeping bags", "Flashlights"

2. INGREDIENT/COMPONENT BREAKDOWN: When the user mentions a recipe, dish, cocktail, or project, break it down into individual components.
   Example: "add groceries for mojitos" → "Courses" list: limes, white rum, fresh mint, sugar, sparkling water

3. MULTIPLE TOPICS = MULTIPLE LISTS with CROSS-REFERENCING
   Only split into multiple lists when the user genuinely mentions different topics.
   Example: "remind me to change the lightbulb at the flat" →
     - "Travaux appart" list: "Changer l'ampoule"
     - "Courses" list: "Ampoule"
   Think: what is the ACTION and what MATERIALS/PURCHASES does it require?

4. SMART LIST NAMING: Create specific, contextual list names. Never use generic names like "Notes" or "Tasks" or "To-do".
   Use the user's own words when they name a topic.

## Rules:
- Fix speech recognition errors before organizing
- Each task = one short, clear, actionable item
- If items fit an existing list, REUSE it (isExisting: true, with the EXACT existing name)
- Assign a relevant emoji to each new list
- Include quantities when the user specifies them
- ${langInstruction}
- Respond ONLY in valid JSON, no markdown, no backticks

## Existing lists:
${listsDescription}

## JSON format:
{"lists":[{"name":"Courses","icon":"🛒","isExisting":false,"tasks":["Citrons verts","Rhum blanc","Menthe fraîche"]}]}

## User's spoken text:
"${userText}"`
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
