// Shuffling answer options. Pure: nothing is mutated, and the random source can be injected for tests.

export type Rng = () => number

/** Fisher–Yates on a copy. */
export function shuffled<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * The options a player sees, and which one is right. True/false questions keep a fixed
 * "True, False" order; anything else is shuffled.
 */
export function arrangeOptions(
  correct: string,
  incorrect: readonly string[],
  type: 'multiple' | 'boolean',
  rng: Rng = Math.random,
): { options: string[]; correctIndex: number } {
  const all = [correct, ...incorrect]
  const options = type === 'boolean' ? ['True', 'False'].filter((o) => all.includes(o)) : []
  const arranged = options.length === all.length ? options : shuffled(all, rng)
  return { options: arranged, correctIndex: arranged.indexOf(correct) }
}
