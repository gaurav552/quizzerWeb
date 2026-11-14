// Scoring rules, shared by Convex (which does the scoring) and the client (which only displays it).

export const POINTS_PER_CORRECT = 10

/**
 * Leaderboard normalisation: a set's result is the share of its questions answered correctly
 * (unanswered questions count as wrong, so ending early never helps). Sets shorter than this
 * don't count, otherwise one lucky question would be a perfect 100%.
 */
export const MIN_RANKED_QUESTIONS = 10

export interface Answer {
  /** Index of the chosen option, or null when the question went unanswered. */
  choice: number | null
  correct: boolean
}

export const correctCount = (answers: readonly Answer[]) => answers.filter((a) => a.correct).length
export const points = (answers: readonly Answer[]) => correctCount(answers) * POINTS_PER_CORRECT

/** Share of the whole set answered correctly, 0..1. */
export function accuracy(correct: number, total: number): number {
  return total > 0 ? Math.min(1, Math.max(0, correct / total)) : 0
}

export const percent = (correct: number, total: number) => Math.round(accuracy(correct, total) * 100)

export const isRanked = (total: number) => total >= MIN_RANKED_QUESTIONS

export interface Result {
  correct: number
  total: number
}

/** Sort order, better result first: higher accuracy, and on equal accuracy the longer set (20/20 before 10/10). */
export function compareResults(a: Result, b: Result): number {
  const d = accuracy(b.correct, b.total) - accuracy(a.correct, a.total)
  if (Math.abs(d) > 1e-9) return d
  return b.total - a.total
}

export const isBetter = (next: Result, best: Result | null | undefined) => !best || compareResults(next, best) < 0

/** The line at the top of the summary. */
export function verdict(correct: number, total: number): string {
  if (total === 0) return 'No questions answered.'
  const p = accuracy(correct, total)
  if (p === 1) return 'A perfect set. Congratulations.'
  if (p >= 0.8) return 'Excellent work. Congratulations.'
  if (p >= 0.6) return 'Well played. Congratulations.'
  if (p >= 0.4) return 'A respectable set.'
  if (correct > 0) return 'A tough set. Try another.'
  return 'None this time. Try another set.'
}
