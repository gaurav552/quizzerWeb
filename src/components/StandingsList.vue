<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useQuery } from '@/convex'

const props = defineProps<{ quizId: string; party: string; you: string }>()
const { data: rows } = useQuery(api.attempts.standings, () => ({ quizId: props.quizId as Id<'quizzes'>, party: props.party }))
const { data: quiz } = useQuery(api.quizzes.describe, () => ({ quizId: props.quizId as Id<'quizzes'> }))
</script>

<template>
  <section class="standings" aria-labelledby="standings-title">
    <h3 id="standings-title" class="section-title">Standings</h3>
    <p v-if="!rows" class="muted small">Loading…</p>
    <ol v-else class="rows">
      <li v-for="r in rows" :key="r._id" :class="{ me: r.name.toLowerCase() === you.toLowerCase() }">
        <span class="who">{{ r.name }}</span>
        <span class="muted small num">
          <template v-if="r.finished"><Check :size="14" aria-label="Finished" class="done" /></template>
          <template v-else>{{ r.answered }}<template v-if="quiz">/{{ quiz.total }}</template></template>
        </span>
        <strong class="num">{{ r.correct }}</strong>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.standings {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.rows {
  list-style: none;
}

.rows li {
  display: grid;
  grid-template-columns: 1fr auto 32px;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--rule);
}

.rows li:last-child {
  border-bottom: none;
}

.who {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.me .who {
  font-weight: 600;
}

strong {
  text-align: right;
}

.done {
  vertical-align: -2px;
}

.small {
  font-size: var(--fs-small);
}
</style>
