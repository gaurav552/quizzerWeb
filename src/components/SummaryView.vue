<script setup lang="ts">
import { computed } from 'vue'
import { Check, Minus, X } from 'lucide-vue-next'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '../../convex/_generated/api'
import { MIN_RANKED_QUESTIONS, POINTS_PER_CORRECT, isRanked, percent, verdict } from '@/quiz/scoring'
import { describeSettings, shortCategory } from '@/quiz/settings'

type View = NonNullable<FunctionReturnType<typeof api.attempts.view>>
const props = defineProps<{ view: View; party?: boolean }>()
const emit = defineEmits<{ again: []; leave: [] }>()

const total = computed(() => props.view.total)
const correct = computed(() => props.view.correct)
const unanswered = computed(() => props.view.answered.filter((a) => a.choice === null).length)
</script>

<template>
  <section class="summary" aria-labelledby="sum-title">
    <h2 id="sum-title" tabindex="-1">{{ verdict(correct, total) }}</h2>

    <div class="figures">
      <div>
        <span class="label">Correct</span>
        <strong class="num">{{ correct }} <span class="muted of">of {{ total }}</span></strong>
      </div>
      <div>
        <span class="label">Share</span>
        <strong class="num">{{ percent(correct, total) }}%</strong>
      </div>
      <div>
        <span class="label">Points</span>
        <strong class="num">{{ correct * POINTS_PER_CORRECT }}</strong>
      </div>
    </div>

    <p class="muted small">
      {{ describeSettings(view.settings, view.categoryName) }}.
      <template v-if="unanswered">Ended with {{ unanswered }} left unanswered.</template>
      {{
        isRanked(total)
          ? 'This set is ranked; the leaderboard shows your best one.'
          : `Sets of ${MIN_RANKED_QUESTIONS} or more questions count on the leaderboard.`
      }}
    </p>

    <div class="actions">
      <button v-if="!party" class="btn primary" type="button" @click="emit('again')">Another set like this</button>
      <slot name="after" />
      <button class="btn quiet" type="button" @click="emit('leave')">Menu</button>
    </div>

    <h3 class="section-title">Your answers</h3>
    <ol class="review">
      <li v-for="(a, i) in view.answered" :key="i">
        <span
          class="verdict"
          :class="a.choice === null ? 'skip' : a.choice === a.correctIndex ? 'right' : 'wrong'"
        >
          <Check v-if="a.choice === a.correctIndex" :size="16" aria-label="Correct" />
          <Minus v-else-if="a.choice === null" :size="16" aria-label="Unanswered" />
          <X v-else :size="16" aria-label="Wrong" />
        </span>
        <div class="body">
          <p class="q"><span class="muted num">{{ i + 1 }}.</span> {{ a.question }}</p>
          <p class="small">
            <template v-if="a.choice === a.correctIndex">{{ a.options[a.correctIndex] }}</template>
            <template v-else>
              <span v-if="a.choice !== null" class="yours">{{ a.options[a.choice] }}</span>
              <span v-else class="muted">Not answered</span>
              <span class="muted"> · answer: </span>{{ a.options[a.correctIndex] }}
            </template>
          </p>
          <p class="muted caption">{{ shortCategory(a.category) }}</p>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 680px;
}

h2 {
  font-size: var(--fs-h2);
  letter-spacing: -0.01em;
  outline: none;
}

.figures {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}

.figures > div {
  display: flex;
  flex-direction: column;
}

.figures strong {
  font-size: var(--fs-big);
  line-height: 1.1;
}

.of {
  font-size: var(--fs-body);
  font-weight: 400;
}

.small {
  font-size: var(--fs-small);
}

.caption {
  font-size: var(--fs-caption);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.section-title {
  margin-top: var(--space-4);
}

.review {
  list-style: none;
}

.review li {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--rule);
}

.verdict {
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  border-radius: 50%;
}

.verdict.right {
  color: var(--right);
  background: var(--right-tint);
}

.verdict.wrong {
  color: var(--wrong);
  background: var(--wrong-tint);
}

.verdict.skip {
  color: var(--pencil);
  background: var(--hover);
}

.body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.q {
  font-weight: 500;
}

.yours {
  color: var(--wrong);
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}
</style>
