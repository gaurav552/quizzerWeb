// Quiz settings: what a player picks before a set, how it's remembered, and how it becomes an OpenTDB query.
// Shared by the client and the Convex functions.

export type Difficulty = 'easy' | 'medium' | 'hard'
export type QuestionType = 'multiple' | 'boolean'

export interface Settings {
  /** OpenTDB category id; null means any category. */
  category: number | null
  difficulty: Difficulty | null
  type: QuestionType | null
  amount: number
}

/** OpenTDB returns at most 50 questions per request. */
export const MIN_AMOUNT = 1
export const MAX_AMOUNT = 50
export const DEFAULT_SETTINGS: Settings = { category: null, difficulty: null, type: null, amount: 10 }

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
export const TYPES: QuestionType[] = ['multiple', 'boolean']

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
export const TYPE_LABEL: Record<QuestionType, string> = { multiple: 'Multiple choice', boolean: 'True or false' }

export function clampAmount(n: unknown): number {
  const x = Math.round(Number(n))
  if (!Number.isFinite(x)) return DEFAULT_SETTINGS.amount
  return Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, x))
}

const isDifficulty = (d: unknown): d is Difficulty => DIFFICULTIES.includes(d as Difficulty)
const isType = (t: unknown): t is QuestionType => TYPES.includes(t as QuestionType)

/** Accept anything (stored JSON, a peer's message) and return valid settings. */
export function normalizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const cat = Number(r.category)
  return {
    category: r.category != null && Number.isInteger(cat) && cat > 0 ? cat : null,
    difficulty: isDifficulty(r.difficulty) ? r.difficulty : null,
    type: isType(r.type) ? r.type : null,
    amount: r.amount == null ? DEFAULT_SETTINGS.amount : clampAmount(r.amount),
  }
}

export function parseSettings(json: string | null): Settings {
  if (!json) return { ...DEFAULT_SETTINGS }
  try {
    return normalizeSettings(JSON.parse(json))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** Query string for api.php. Base64 encoding keeps every field ASCII until we decode it as UTF-8. */
export function questionQuery(s: Settings, token?: string | null): string {
  const q = new URLSearchParams({ amount: String(clampAmount(s.amount)) })
  if (s.category != null) q.set('category', String(s.category))
  if (s.difficulty) q.set('difficulty', s.difficulty)
  if (s.type) q.set('type', s.type)
  q.set('encode', 'base64')
  if (token) q.set('token', token)
  return q.toString()
}

/** OpenTDB groups categories with prefixes ("Entertainment: Film"); the list reads better without them. */
export function shortCategory(name: string): string {
  return name
    .replace(/^(Entertainment|Science): /, '')
    .replace(/^Japanese /, '')
    .trim()
}

/** One line describing a set, e.g. "10 questions · Film · Hard · True or false". */
export function describeSettings(s: Settings, categoryName?: string | null): string {
  const parts = [`${s.amount} ${s.amount === 1 ? 'question' : 'questions'}`]
  parts.push(s.category != null ? (categoryName ?? 'One category') : 'Any category')
  if (s.difficulty) parts.push(DIFFICULTY_LABEL[s.difficulty])
  if (s.type) parts.push(TYPE_LABEL[s.type])
  return parts.join(' · ')
}
