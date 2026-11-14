import { ConvexError, v } from 'convex/values'
import { action, internalMutation, internalQuery, query } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { settings as settingsValidator } from './schema'
import { decodeQuestion, type RawQuestion } from '../src/quiz/decode'
import { normalizeSettings, questionQuery, shortCategory } from '../src/quiz/settings'
import { arrangeOptions } from '../src/quiz/shuffle'

const TDB = 'https://opentdb.com'
/** OpenTDB allows one request per IP every five seconds. */
const RATE_WAIT_MS = 5200

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function getJson(url: string): Promise<Record<string, unknown>> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new ConvexError('Couldn’t reach the question bank. Try again in a moment.')
  }
  if (!res.ok) throw new ConvexError('The question bank is having trouble. Try again in a moment.')
  return (await res.json()) as Record<string, unknown>
}

// ---------- categories ----------

export const categories = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('categories').collect()
    return rows.map((r) => ({ id: r.id, name: shortCategory(r.name) })).sort((a, b) => a.name.localeCompare(b.name))
  },
})

/** Fill the category cache from OpenTDB. The client calls this when the cache is empty. */
export const refreshCategories = action({
  args: {},
  handler: async (ctx): Promise<number> => {
    const existing: number = await ctx.runQuery(internal.quizzes.categoryCount, {})
    if (existing > 0) return existing
    const json = await getJson(`${TDB}/api_category.php`)
    const list = (json.trivia_categories ?? []) as { id: number; name: string }[]
    await ctx.runMutation(internal.quizzes.saveCategories, { list })
    return list.length
  },
})

export const categoryCount = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query('categories').take(100)).length,
})

export const saveCategories = internalMutation({
  args: { list: v.array(v.object({ id: v.number(), name: v.string() })) },
  handler: async (ctx, { list }) => {
    for (const c of list) {
      const row = await ctx.db
        .query('categories')
        .withIndex('by_tdb_id', (q) => q.eq('id', c.id))
        .unique()
      if (row) await ctx.db.patch(row._id, { name: c.name })
      else await ctx.db.insert('categories', c)
    }
  },
})

// ---------- quizzes ----------

const NO_RESULTS =
  'There aren’t enough questions for those settings. Try fewer questions, or any difficulty or type.'

/**
 * Fetch a new set from OpenTDB and store it. Returns the quiz id; the questions (without their
 * answers) are read through attempts.
 */
export const create = action({
  args: { settings: settingsValidator },
  handler: async (ctx, args): Promise<Id<'quizzes'>> => {
    const s = normalizeSettings(args.settings)
    const url = `${TDB}/api.php?${questionQuery(s)}`
    let json = await getJson(url)
    if (json.response_code === 5) {
      await wait(RATE_WAIT_MS)
      json = await getJson(url)
    }
    switch (json.response_code) {
      case 0:
        break
      case 1:
        throw new ConvexError(NO_RESULTS)
      case 5:
        throw new ConvexError('The question bank is busy. Try again in a few seconds.')
      default:
        throw new ConvexError('The question bank didn’t accept those settings.')
    }
    const raw = (json.results ?? []) as RawQuestion[]
    if (!raw.length) throw new ConvexError(NO_RESULTS)
    const questions = raw.map((r) => {
      const q = decodeQuestion(r)
      const { options, correctIndex } = arrangeOptions(q.correct, q.incorrect, q.type)
      return { type: q.type, difficulty: q.difficulty, category: q.category, question: q.question, options, correctIndex }
    })
    const categoryName = s.category == null ? null : shortCategory(questions[0].category)
    return await ctx.runMutation(internal.quizzes.insert, { settings: s, categoryName, questions })
  },
})

export const insert = internalMutation({
  args: {
    settings: settingsValidator,
    categoryName: v.union(v.string(), v.null()),
    questions: v.array(
      v.object({
        type: v.union(v.literal('multiple'), v.literal('boolean')),
        difficulty: v.union(v.literal('easy'), v.literal('medium'), v.literal('hard')),
        category: v.string(),
        question: v.string(),
        options: v.array(v.string()),
        correctIndex: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => ctx.db.insert('quizzes', args),
})

/** What a quiz is, without its questions: enough to show a party what they're about to play. */
export const describe = query({
  args: { quizId: v.id('quizzes') },
  handler: async (ctx, { quizId }) => {
    const quiz = await ctx.db.get(quizId)
    if (!quiz) return null
    return { settings: quiz.settings, categoryName: quiz.categoryName, total: quiz.questions.length }
  },
})

/** Housekeeping: drop quizzes and attempts older than 30 days. The leaderboard keeps its own copy. */
export const prune = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    let removed = 0
    for (const table of ['attempts', 'quizzes'] as const) {
      const old = await ctx.db
        .query(table)
        .withIndex('by_creation_time', (q) => q.lt('_creationTime', cutoff))
        .take(300)
      for (const doc of old) {
        await ctx.db.delete(doc._id)
        removed++
      }
    }
    return removed
  },
})
