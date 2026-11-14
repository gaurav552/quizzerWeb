import { ConvexError, v } from 'convex/values'
import { mutation, query, type MutationCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { accuracy, isBetter, isRanked } from '../src/quiz/scoring'

const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, 16) || 'Player'
const keyOf = (name: string) => cleanName(name).toLowerCase()

/** Start working through a quiz. Party members each start their own attempt on the shared quiz. */
export const start = mutation({
  args: { quizId: v.id('quizzes'), name: v.string(), party: v.optional(v.string()) },
  handler: async (ctx, { quizId, name, party }) => {
    if (!(await ctx.db.get(quizId))) throw new ConvexError('That quiz has expired.')
    return ctx.db.insert('attempts', {
      quizId,
      name: cleanName(name),
      key: keyOf(name),
      choices: [],
      correct: 0,
      finished: false,
      party: party?.slice(0, 8),
    })
  },
})

/**
 * Everything the player may see: the current question without its answer, and every question
 * already answered with the right answer revealed.
 */
export const view = query({
  args: { attemptId: v.id('attempts') },
  handler: async (ctx, { attemptId }) => {
    const attempt = await ctx.db.get(attemptId)
    if (!attempt) return null
    const quiz = await ctx.db.get(attempt.quizId)
    if (!quiz) return null
    const index = attempt.choices.length
    const q = attempt.finished ? null : quiz.questions[index]
    return {
      attemptId,
      quizId: attempt.quizId,
      name: attempt.name,
      party: attempt.party ?? null,
      settings: quiz.settings,
      categoryName: quiz.categoryName,
      total: quiz.questions.length,
      index,
      correct: attempt.correct,
      finished: attempt.finished,
      current: q ? { type: q.type, difficulty: q.difficulty, category: q.category, question: q.question, options: q.options } : null,
      answered: attempt.choices.map((choice, i) => {
        const a = quiz.questions[i]
        return {
          question: a.question,
          category: a.category,
          difficulty: a.difficulty,
          options: a.options,
          correctIndex: a.correctIndex,
          choice,
        }
      }),
    }
  },
})

async function finish(ctx: MutationCtx, attempt: Doc<'attempts'>, choices: (number | null)[], correct: number) {
  await ctx.db.patch(attempt._id, { choices, correct, finished: true })
  const total = choices.length
  if (!isRanked(total)) return
  const best = await ctx.db
    .query('scores')
    .withIndex('by_key', (q) => q.eq('key', attempt.key))
    .unique()
  const next = { correct, total }
  if (best && !isBetter(next, best)) return
  const row = { key: attempt.key, name: attempt.name, correct, total, accuracy: accuracy(correct, total), attemptId: attempt._id }
  if (best) await ctx.db.replace(best._id, row)
  else await ctx.db.insert('scores', row)
}

/**
 * Answer question `index`. The index makes a retried request harmless: answering a question
 * that's already answered just returns its result again.
 */
export const answer = mutation({
  args: { attemptId: v.id('attempts'), index: v.number(), choice: v.number() },
  handler: async (ctx, { attemptId, index, choice }) => {
    const attempt = await ctx.db.get(attemptId)
    if (!attempt) throw new ConvexError('That set has expired.')
    const quiz = await ctx.db.get(attempt.quizId)
    if (!quiz) throw new ConvexError('That set has expired.')
    const q = quiz.questions[index]
    if (!q) throw new ConvexError('No such question.')
    if (index < attempt.choices.length) {
      const prev = attempt.choices[index]
      return { correctIndex: q.correctIndex, correct: prev === q.correctIndex }
    }
    if (attempt.finished || index !== attempt.choices.length) throw new ConvexError('Answer the questions in order.')
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) throw new ConvexError('No such option.')

    const right = choice === q.correctIndex
    const choices = [...attempt.choices, choice]
    const correct = attempt.correct + (right ? 1 : 0)
    if (choices.length === quiz.questions.length) await finish(ctx, attempt, choices, correct)
    else await ctx.db.patch(attemptId, { choices, correct })
    return { correctIndex: q.correctIndex, correct: right }
  },
})

/** End a set early. The questions left count as unanswered (wrong), so ending never helps a score. */
export const end = mutation({
  args: { attemptId: v.id('attempts') },
  handler: async (ctx, { attemptId }) => {
    const attempt = await ctx.db.get(attemptId)
    if (!attempt || attempt.finished) return
    const quiz = await ctx.db.get(attempt.quizId)
    if (!quiz) return
    const choices = [...attempt.choices, ...Array<null>(quiz.questions.length - attempt.choices.length).fill(null)]
    await finish(ctx, attempt, choices, attempt.correct)
  },
})

/** Live standings for a party: everyone on the same quiz from the same room. */
export const standings = query({
  args: { quizId: v.id('quizzes'), party: v.string() },
  handler: async (ctx, { quizId, party }) => {
    const rows = await ctx.db
      .query('attempts')
      .withIndex('by_quiz', (q) => q.eq('quizId', quizId))
      .take(50)
    return rows
      .filter((a) => a.party === party)
      .map((a) => ({
        _id: a._id,
        name: a.name,
        correct: a.correct,
        answered: a.choices.filter((c) => c !== null).length,
        finished: a.finished,
      }))
      .sort((a, b) => b.correct - a.correct || b.answered - a.answered)
  },
})

export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('scores').withIndex('by_rank').order('desc').take(10)
    return rows.map(({ _id, name, correct, total }) => ({ _id, name, correct, total }))
  },
})

export const personalBest = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    if (!name.trim()) return null
    const row = await ctx.db
      .query('scores')
      .withIndex('by_key', (q) => q.eq('key', keyOf(name)))
      .unique()
    return row ? { correct: row.correct, total: row.total } : null
  },
})
