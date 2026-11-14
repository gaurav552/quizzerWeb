import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const settings = v.object({
  category: v.union(v.number(), v.null()),
  difficulty: v.union(v.literal('easy'), v.literal('medium'), v.literal('hard'), v.null()),
  type: v.union(v.literal('multiple'), v.literal('boolean'), v.null()),
  amount: v.number(),
})

export default defineSchema({
  // A set of questions fetched from OpenTDB. The right answers never leave the server until
  // they've been answered; a party shares one quiz.
  quizzes: defineTable({
    settings,
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
  }),

  // One person working through one quiz. `choices[i]` is the option picked for question i
  // (null when the set was ended before it).
  attempts: defineTable({
    quizId: v.id('quizzes'),
    name: v.string(),
    key: v.string(),
    choices: v.array(v.union(v.number(), v.null())),
    correct: v.number(),
    finished: v.boolean(),
    /** Room code when played as part of a party. */
    party: v.optional(v.string()),
  }).index('by_quiz', ['quizId']),

  // Best set per name. Ranked by accuracy, then by the longer set (see src/quiz/scoring.ts).
  scores: defineTable({
    key: v.string(),
    name: v.string(),
    correct: v.number(),
    total: v.number(),
    accuracy: v.number(),
    attemptId: v.id('attempts'),
  })
    .index('by_key', ['key'])
    .index('by_rank', ['accuracy', 'total']),

  // OpenTDB's category list, cached so the menu doesn't hit their API on every visit.
  categories: defineTable({
    id: v.number(),
    name: v.string(),
  }).index('by_tdb_id', ['id']),
})
