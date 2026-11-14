<script setup lang="ts">
import { computed } from 'vue'
import { useCategories } from '@/categories'
import { MIN_RANKED_QUESTIONS } from '@/quiz/scoring'
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  MAX_AMOUNT,
  MIN_AMOUNT,
  TYPES,
  TYPE_LABEL,
  clampAmount,
  type Settings,
} from '@/quiz/settings'

const settings = defineModel<Settings>({ required: true })
const { categories } = useCategories()
const uid = Math.random().toString(36).slice(2, 7)

const set = <K extends keyof Settings>(k: K, v: Settings[K]) => (settings.value = { ...settings.value, [k]: v })
const amountNote = computed(() =>
  settings.value.amount >= MIN_RANKED_QUESTIONS
    ? 'Counts on the leaderboard.'
    : `Sets of ${MIN_RANKED_QUESTIONS} or more count on the leaderboard.`,
)
</script>

<template>
  <div class="settings">
    <div class="row">
      <label class="label" :for="`cat-${uid}`">Category</label>
      <select
        :id="`cat-${uid}`"
        class="field"
        :value="settings.category ?? ''"
        @change="set('category', ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)"
      >
        <option value="">Any category</option>
        <option v-for="c in categories ?? []" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="row">
      <span :id="`diff-${uid}`" class="label">Difficulty</span>
      <div class="tabs" role="radiogroup" :aria-labelledby="`diff-${uid}`">
        <button type="button" role="radio" :aria-checked="settings.difficulty === null" @click="set('difficulty', null)">
          Any
        </button>
        <button
          v-for="d in DIFFICULTIES"
          :key="d"
          type="button"
          role="radio"
          :aria-checked="settings.difficulty === d"
          @click="set('difficulty', d)"
        >
          {{ DIFFICULTY_LABEL[d] }}
        </button>
      </div>
    </div>

    <div class="row">
      <span :id="`type-${uid}`" class="label">Questions</span>
      <div class="tabs" role="radiogroup" :aria-labelledby="`type-${uid}`">
        <button type="button" role="radio" :aria-checked="settings.type === null" @click="set('type', null)">Both kinds</button>
        <button
          v-for="t in TYPES"
          :key="t"
          type="button"
          role="radio"
          :aria-checked="settings.type === t"
          @click="set('type', t)"
        >
          {{ TYPE_LABEL[t] }}
        </button>
      </div>
    </div>

    <div class="row">
      <label class="label" :for="`amt-${uid}`">How many</label>
      <div class="amount">
        <input
          :id="`amt-${uid}`"
          class="field num"
          type="number"
          inputmode="numeric"
          :min="MIN_AMOUNT"
          :max="MAX_AMOUNT"
          :value="settings.amount"
          @change="set('amount', clampAmount(($event.target as HTMLInputElement).value))"
        />
        <span class="muted small">{{ amountNote }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.row .tabs {
  margin-top: calc(-1 * var(--space-2));
  flex-wrap: wrap;
}

select.field {
  width: min(360px, 100%);
  cursor: pointer;
}

.amount {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.amount .field {
  width: 88px;
}

.small {
  font-size: var(--fs-small);
}
</style>
