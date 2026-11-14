import { ConvexError } from 'convex/values'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
import { convex, mutate } from '@/convex'
import type { Settings } from '@/quiz/settings'

/** Fetch a fresh quiz from OpenTDB (through Convex). */
export async function newQuiz(settings: Settings): Promise<Id<'quizzes'>> {
  if (!convex) throw new Error('Server not configured')
  return convex.action(api.quizzes.create, { settings })
}

export function startAttempt(quizId: Id<'quizzes'>, name: string, party?: string) {
  return mutate(api.attempts.start, { quizId, name, party })
}

/** A message fit for the screen: the server's own words when it refused, a generic line otherwise. */
export function errorText(e: unknown): string {
  if (e instanceof ConvexError && typeof e.data === 'string') return e.data
  if (!convex) return 'Quizzer’s server isn’t configured.'
  return 'Couldn’t start a set. Check your connection and try again.'
}
