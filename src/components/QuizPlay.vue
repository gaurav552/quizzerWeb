<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Check, X } from 'lucide-vue-next'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { mutate, useQuery } from '@/convex'
import { POINTS_PER_CORRECT } from '@/quiz/scoring'
import { DIFFICULTY_LABEL, shortCategory } from '@/quiz/settings'
import SummaryView from './SummaryView.vue'

const props = defineProps<{ attemptId: Id<'attempts'>; partyCode?: string }>()
const emit = defineEmits<{ again: []; leave: [] }>()
defineSlots<{ side?: () => unknown; after?: () => unknown }>()

const { data: view, error } = useQuery(api.attempts.view, () => ({ attemptId: props.attemptId }))

/** The question whose answer is on screen. The server has already moved on; we wait for "Next". */
const reviewing = ref<number | null>(null)
const sending = ref<number | null>(null)
const failed = ref('')
const confirmEnd = ref(false)
const heading = ref<HTMLElement | null>(null)

const LETTERS = 'ABCDEFGH'

/** What's on screen: the answered question being reviewed, or the current one. */
const shown = computed(() => {
  const v = view.value
  if (!v) return null
  if (reviewing.value !== null) {
    const a = v.answered[reviewing.value]
    if (a) return { index: reviewing.value, question: a.question, category: a.category, difficulty: a.difficulty, options: a.options, result: a }
  }
  if (v.current) return { index: v.index, ...v.current, result: null }
  return null
})
const finished = computed(() => !!view.value?.finished && reviewing.value === null)
const isLast = computed(() => !!view.value && shown.value?.index === view.value.total - 1)

async function choose(choice: number) {
  const v = view.value
  const s = shown.value
  if (!v || !s || s.result || sending.value !== null) return
  sending.value = choice
  failed.value = ''
  try {
    await mutate(api.attempts.answer, { attemptId: props.attemptId, index: s.index, choice })
    reviewing.value = s.index
  } catch {
    failed.value = 'That answer didn’t reach the server. Check your connection and pick again.'
  } finally {
    sending.value = null
  }
}

function next() {
  reviewing.value = null
  nextTick(() => heading.value?.focus())
}

async function endSet() {
  confirmEnd.value = false
  reviewing.value = null
  await mutate(api.attempts.end, { attemptId: props.attemptId }).catch(() => {})
}

function optionState(i: number) {
  const r = shown.value?.result
  if (!r) return sending.value === i ? 'sending' : ''
  if (i === r.correctIndex) return 'right'
  if (i === r.choice) return 'wrong'
  return 'dim'
}

const feedback = computed(() => {
  const r = shown.value?.result
  if (!r) return ''
  if (r.choice === r.correctIndex) return 'Correct.'
  return `Not quite. The answer is ${r.options[r.correctIndex]}.`
})

// Keyboard: 1–4 or A–D picks an option, Enter or → moves on.
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey || finished.value) return
  const t = e.target
  if (t instanceof Element && t.closest('input, select, textarea, [contenteditable]')) return
  const s = shown.value
  if (!s) return
  if (s.result) {
    if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault()
      next()
    }
    return
  }
  const k = e.key.toUpperCase()
  const i = /^[1-8]$/.test(k) ? Number(k) - 1 : LETTERS.indexOf(k)
  if (i >= 0 && i < s.options.length) {
    e.preventDefault()
    choose(i)
  }
}
onMounted(() => addEventListener('keydown', onKey))
onUnmounted(() => removeEventListener('keydown', onKey))

// If the page is reloaded after an answer, carry on from the next question.
watch(
  () => view.value?.attemptId,
  () => (reviewing.value = null),
)
</script>

<template>
  <p v-if="error" class="error">Couldn’t load this set. {{ error.message }}</p>
  <p v-else-if="view === undefined" class="muted">Loading…</p>
  <div v-else-if="view === null" class="gone">
    <p>This set has expired.</p>
    <button class="btn" type="button" @click="emit('leave')">Menu</button>
  </div>

  <div v-else-if="finished" class="layout">
    <SummaryView :view="view" :party="!!partyCode" @again="emit('again')" @leave="emit('leave')">
      <template #after><slot name="after" /></template>
    </SummaryView>
    <aside v-if="$slots.side" class="side"><slot name="side" /></aside>
  </div>

  <div v-else-if="shown" class="layout">
    <section class="play" aria-labelledby="q-text">
      <div class="meta">
        <span class="num">Question {{ shown.index + 1 }} of {{ view.total }}</span>
        <span class="muted">{{ shortCategory(shown.category) }}</span>
        <span v-if="shown.difficulty" class="muted">{{ DIFFICULTY_LABEL[shown.difficulty] }}</span>
      </div>
      <div
        class="progress"
        role="progressbar"
        :aria-valuenow="view.index"
        aria-valuemin="0"
        :aria-valuemax="view.total"
        aria-label="Answered"
      >
        <span :style="{ width: `${(view.index / view.total) * 100}%` }" />
      </div>

      <h2 id="q-text" ref="heading" class="question" tabindex="-1">{{ shown.question }}</h2>

      <ol class="options" :class="{ answered: !!shown.result }">
        <li v-for="(opt, i) in shown.options" :key="`${shown.index}-${i}`">
          <button
            type="button"
            class="option"
            :class="optionState(i)"
            :aria-disabled="!!shown.result || sending !== null"
            @click="choose(i)"
          >
            <span class="key" aria-hidden="true">{{ LETTERS[i] }}</span>
            <span class="text">{{ opt }}</span>
            <Check v-if="optionState(i) === 'right'" :size="18" class="icon" aria-label="Correct answer" />
            <X v-else-if="optionState(i) === 'wrong'" :size="18" class="icon" aria-label="Your answer" />
          </button>
        </li>
      </ol>

      <p class="feedback" role="status" aria-live="polite" :class="{ right: shown.result && shown.result.choice === shown.result.correctIndex }">
        {{ feedback }}
      </p>
      <p v-if="failed" class="error" role="alert">{{ failed }}</p>

      <div class="actions">
        <button v-if="shown.result" class="btn primary" type="button" @click="next">
          {{ isLast ? 'See results' : 'Next question' }}
        </button>
        <span v-else class="muted small hint">Pick an answer. Keys 1–{{ shown.options.length }} work too.</span>
        <span class="spacer" />
        <template v-if="!isLast || !shown.result">
          <template v-if="confirmEnd">
            <span class="small">End now? Questions left count as wrong.</span>
            <button class="btn" type="button" @click="endSet">End set</button>
            <button class="btn quiet" type="button" @click="confirmEnd = false">Keep going</button>
          </template>
          <button v-else class="btn quiet" type="button" @click="confirmEnd = true">End set</button>
        </template>
      </div>
    </section>

    <aside class="side">
      <div class="score">
        <div>
          <span class="label">Correct</span>
          <strong class="num">{{ view.correct }}<span v-if="view.index" class="muted of"> of {{ view.index }}</span></strong>
        </div>
        <div>
          <span class="label">Points</span>
          <strong class="num">{{ view.correct * POINTS_PER_CORRECT }}</strong>
        </div>
      </div>
      <slot name="side" />
    </aside>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--panel-w, 280px);
  gap: var(--space-7);
  align-items: start;
}

.play {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 680px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-4);
  font-size: var(--fs-small);
}

.progress {
  height: 2px;
  background: var(--rule);
  margin-top: calc(-1 * var(--space-2));
}

.progress span {
  display: block;
  height: 100%;
  background: var(--graphite);
  transition: width 0.3s var(--ease);
}

.question {
  font-size: var(--fs-h2);
  line-height: 1.3;
  letter-spacing: -0.01em;
  outline: none;
  margin: var(--space-2) 0;
}

.options {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 52px;
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--rule-strong);
  border-radius: var(--radius);
  background: var(--sheet);
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.15s var(--ease),
    border-color 0.15s var(--ease),
    opacity 0.2s var(--ease);
}

.option:not([aria-disabled='true']):hover {
  border-color: var(--graphite);
}

.option[aria-disabled='true'] {
  cursor: default;
}

.key {
  display: grid;
  place-items: center;
  flex: none;
  width: 26px;
  height: 26px;
  border: 1px solid var(--rule-strong);
  border-radius: var(--radius-s);
  font-size: var(--fs-caption);
  font-weight: 600;
  color: var(--pencil);
}

.text {
  flex: 1;
}

.icon {
  flex: none;
}

.option.sending {
  border-color: var(--graphite);
}

.option.right {
  background: var(--right-tint);
  border-color: var(--right);
  color: var(--graphite);
}

.option.right .icon,
.option.right .key {
  color: var(--right);
  border-color: var(--right);
}

.option.wrong {
  background: var(--wrong-tint);
  border-color: var(--wrong);
}

.option.wrong .icon,
.option.wrong .key {
  color: var(--wrong);
  border-color: var(--wrong);
}

.option.dim {
  opacity: 0.5;
}

.feedback {
  min-height: 1.5em;
  font-weight: 600;
  color: var(--wrong);
}

.feedback.right {
  color: var(--right);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.spacer {
  flex: 1;
}

.small {
  font-size: var(--fs-small);
}

.side {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.score {
  display: flex;
  gap: var(--space-6);
}

.score > div {
  display: flex;
  flex-direction: column;
}

.score strong {
  font-size: var(--fs-h2);
  line-height: 1.2;
}

.of {
  font-size: var(--fs-small);
  font-weight: 400;
}

.gone {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
}

@media (max-width: 860px) {
  .layout {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }
  .side {
    order: -1;
  }
  .question {
    font-size: var(--fs-h3);
  }
  .hint {
    display: none;
  }
}
</style>
