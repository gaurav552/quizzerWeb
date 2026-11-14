import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()
crons.daily('prune old quizzes', { hourUTC: 5, minuteUTC: 0 }, internal.quizzes.prune)
export default crons
