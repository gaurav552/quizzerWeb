<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Users } from 'lucide-vue-next'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { convex, useQuery } from '@/convex'
import { percent } from '@/quiz/scoring'
import { parseSettings, type Settings } from '@/quiz/settings'
import { errorText, newQuiz, startAttempt } from '@/sets'
import { storage } from '@/storage'
import LeaderBoard from './LeaderBoard.vue'
import SettingsForm from './SettingsForm.vue'

const emit = defineEmits<{ play: [attemptId: Id<'attempts'>]; party: [] }>()

const name = ref(storage.get('quiz:name') ?? '')
const settings = ref<Settings>(parseSettings(storage.get('quiz:settings')))
const busy = ref(false)
const problem = ref('')

watch(settings, (s) => storage.set('quiz:settings', JSON.stringify(s)), { deep: true })

// An unfinished set from earlier, if there is one.
const lastId = storage.get('quiz:attempt') as Id<'attempts'> | null
const { data: last } = useQuery(api.attempts.view, () => (convex && lastId ? { attemptId: lastId } : null))
const resumable = computed(() => (last.value && !last.value.finished ? last.value : null))

const trimmed = computed(() => name.value.trim())
const { data: best } = useQuery(api.attempts.personalBest, () => (convex && trimmed.value ? { name: trimmed.value } : null))

async function start() {
  problem.value = ''
  if (!trimmed.value) return void (problem.value = 'Add your name first. It’s how the leaderboard knows you.')
  storage.set('quiz:name', trimmed.value)
  busy.value = true
  try {
    const quizId = await newQuiz(settings.value)
    emit('play', await startAttempt(quizId, trimmed.value))
  } catch (e) {
    problem.value = errorText(e)
  } finally {
    busy.value = false
  }
}

function party() {
  if (trimmed.value) storage.set('quiz:name', trimmed.value)
  emit('party')
}
</script>

<template>
  <div class="home">
    <div class="main">
      <section v-if="resumable" class="resume" aria-labelledby="resume-title">
        <h2 id="resume-title">Pick up where you left off</h2>
        <p class="muted small">
          {{ resumable.name }}, question {{ resumable.index + 1 }} of {{ resumable.total }}, {{ resumable.correct }} correct
          so far.
        </p>
        <div>
          <button class="btn primary" type="button" @click="emit('play', resumable.attemptId)">Continue</button>
        </div>
      </section>

      <form class="block" @submit.prevent="start">
        <h2>New set</h2>
        <div class="field-group">
          <label class="label" for="quiz-name">Your name</label>
          <input id="quiz-name" v-model="name" class="field" maxlength="16" placeholder="e.g. Sam" autocomplete="nickname" />
          <span v-if="best" class="muted small">Your best: {{ best.correct }} of {{ best.total }} ({{ percent(best.correct, best.total) }}%)</span>
        </div>

        <SettingsForm v-model="settings" />

        <p class="error" role="alert">{{ problem }}</p>
        <div class="go">
          <button class="btn primary" type="submit" :disabled="busy">{{ busy ? 'Fetching questions…' : 'Start' }}</button>
          <button class="btn" type="button" @click="party"><Users :size="16" aria-hidden="true" /> Play with friends</button>
        </div>
      </form>
    </div>

    <LeaderBoard v-if="convex" class="aside" />
  </div>
</template>

<style scoped>
.home {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: var(--space-7);
  align-items: start;
}

.main {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.block,
.resume {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.resume {
  gap: var(--space-2);
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--rule);
}

h2 {
  font-size: var(--fs-h3);
  letter-spacing: -0.01em;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: min(360px, 100%);
}

.go {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.error:empty {
  display: none;
}

.small {
  font-size: var(--fs-small);
}

@media (max-width: 860px) {
  .home {
    grid-template-columns: 1fr;
  }
  .aside {
    padding-top: var(--space-5);
    border-top: 1px solid var(--rule);
  }
}
</style>
