import { computed, watch } from 'vue'
import { api } from '../convex/_generated/api'
import { convex, useQuery } from '@/convex'

let asked = false

/** OpenTDB's categories, cached in Convex. The first visitor after a fresh deploy fills the cache. */
export function useCategories() {
  const { data } = useQuery(api.quizzes.categories, () => (convex ? {} : null))
  watch(data, (list) => {
    if (list && !list.length && !asked && convex) {
      asked = true
      convex.action(api.quizzes.refreshCategories, {}).catch(() => (asked = false))
    }
  })
  const byId = computed(() => new Map((data.value ?? []).map((c) => [c.id, c.name])))
  return { categories: data, nameOf: (id: number | null) => (id == null ? null : (byId.value.get(id) ?? null)) }
}
