<script setup lang="ts">
import { api } from '../../convex/_generated/api'
import { useQuery } from '@/convex'
import { MIN_RANKED_QUESTIONS, percent } from '@/quiz/scoring'

const { data: rows } = useQuery(api.attempts.leaderboard, {})
</script>

<template>
  <section class="board" aria-labelledby="board-title">
    <h2 id="board-title">Leaderboard</h2>
    <p class="muted small">
      Everyone’s best set of {{ MIN_RANKED_QUESTIONS }} or more questions, by share answered correctly. On a tie, the
      longer set ranks higher.
    </p>
    <p v-if="!rows" class="muted small">Loading…</p>
    <p v-else-if="!rows.length" class="muted small">No ranked sets yet.</p>
    <table v-else class="table">
      <thead>
        <tr>
          <th class="rank"><span class="sr-only">Rank</span></th>
          <th>Name</th>
          <th class="n">Correct</th>
          <th class="n">Score</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in rows" :key="r._id">
          <td class="muted num rank">{{ i + 1 }}</td>
          <td class="who">{{ r.name }}</td>
          <td class="num n muted">{{ r.correct }} of {{ r.total }}</td>
          <td class="num n">{{ percent(r.correct, r.total) }}%</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

h2 {
  font-size: var(--fs-h3);
  letter-spacing: -0.01em;
}

.small {
  font-size: var(--fs-small);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

th {
  font-size: var(--fs-small);
  font-weight: 600;
  color: var(--pencil);
  text-align: left;
  padding-bottom: var(--space-1);
}

td {
  padding: var(--space-2) 0;
  border-top: 1px solid var(--rule);
}

.rank {
  width: 1%;
  padding-right: var(--space-4);
  white-space: nowrap;
}

.who {
  max-width: 0;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.n {
  text-align: right;
  white-space: nowrap;
  padding-left: var(--space-4);
}
</style>
