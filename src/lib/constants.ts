export const LIST_COLORS = [
  { key: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', accent: 'bg-emerald-500' },
  { key: 'rose', bg: 'bg-rose-100', text: 'text-rose-700', accent: 'bg-rose-500' },
  { key: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', accent: 'bg-indigo-500' },
  { key: 'amber', bg: 'bg-amber-100', text: 'text-amber-700', accent: 'bg-amber-500' },
  { key: 'sky', bg: 'bg-sky-100', text: 'text-sky-700', accent: 'bg-sky-500' },
  { key: 'violet', bg: 'bg-violet-100', text: 'text-violet-700', accent: 'bg-violet-500' },
  { key: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', accent: 'bg-orange-500' },
  { key: 'teal', bg: 'bg-teal-100', text: 'text-teal-700', accent: 'bg-teal-500' },
] as const

export function getColorForIndex(index: number) {
  return LIST_COLORS[index % LIST_COLORS.length]
}

export function getColorByKey(key: string) {
  return LIST_COLORS.find((c) => c.key === key) ?? LIST_COLORS[0]
}

export const STORAGE_KEYS = {
  GEMINI_API_KEY: 'ainotes_gemini_api_key',
  LANGUAGE: 'ainotes_language',
} as const
