import { ConvexClient } from 'convex/browser'
import type { FunctionArgs, FunctionReference, FunctionReturnType } from 'convex/server'
import { onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'

const url = import.meta.env.CONVEX_URL as string | undefined

/** Null when no deployment is configured. Quizzer needs it: the questions and answers live on the server. */
export const convex = url ? new ConvexClient(url) : null

/** Reactive Convex subscription. Return `null` from the args getter to skip (no subscription). */
export function useQuery<Q extends FunctionReference<'query'>>(
  query: Q,
  args: MaybeRefOrGetter<FunctionArgs<Q> | null>,
) {
  const data = shallowRef<FunctionReturnType<Q> | undefined>()
  const error = shallowRef<Error | null>(null)
  let stop: (() => void) | null = null

  watch(
    () => JSON.stringify(toValue(args)),
    () => {
      stop?.()
      stop = null
      const a = toValue(args)
      data.value = undefined
      error.value = convex ? null : new Error('Server not configured')
      if (!convex || a === null) return
      stop = convex.onUpdate(
        query,
        a,
        (result) => {
          data.value = result
          error.value = null
        },
        (e) => (error.value = e),
      )
    },
    { immediate: true },
  )
  onScopeDispose(() => stop?.())
  return { data, error }
}

export async function mutate<M extends FunctionReference<'mutation'>>(
  fn: M,
  args: FunctionArgs<M>,
): Promise<FunctionReturnType<M>> {
  if (!convex) throw new Error('Server not configured')
  return convex.mutation(fn, args)
}
