<script setup lang="ts">
import { defineAsyncComponent, h, ref, watchEffect } from 'vue'
import { Moon, Sun } from 'lucide-vue-next'
import type { Id } from '../convex/_generated/dataModel'
import { convex } from '@/convex'
import { parseSettings } from '@/quiz/settings'
import { errorText, newQuiz, startAttempt } from '@/sets'
import { storage } from '@/storage'
import HomeScreen from './components/HomeScreen.vue'
import QuizPlay from './components/QuizPlay.vue'

// Party play (and PeerJS) loads only when someone opens it.
const PartyScreen = defineAsyncComponent({
  loader: () => import('./components/PartyScreen.vue'),
  loadingComponent: { render: () => h('p', { class: 'muted' }, 'Loading…') },
  delay: 150,
})

type Screen = { kind: 'home' } | { kind: 'solo'; attemptId: Id<'attempts'> } | { kind: 'party' }

const inviteCode = new URLSearchParams(location.search).get('room')?.toUpperCase() ?? ''
const screen = ref<Screen>(inviteCode ? { kind: 'party' } : { kind: 'home' })
const againBusy = ref(false)
const againError = ref('')

const theme = ref<'dark' | 'light'>(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
watchEffect(() => {
  document.documentElement.dataset.theme = theme.value
  storage.set('quiz:theme', theme.value)
})

function play(attemptId: Id<'attempts'>) {
  storage.set('quiz:attempt', attemptId)
  againError.value = ''
  screen.value = { kind: 'solo', attemptId }
}

/** Another set with the same settings, straight from the results. */
async function again() {
  againBusy.value = true
  againError.value = ''
  try {
    const name = storage.get('quiz:name') ?? 'Player'
    play(await startAttempt(await newQuiz(parseSettings(storage.get('quiz:settings'))), name))
  } catch (e) {
    againError.value = errorText(e)
  } finally {
    againBusy.value = false
  }
}

const home = () => (screen.value = { kind: 'home' })
</script>

<template>
  <div class="page">
    <header class="top">
      <h1 class="wordmark">
        <button v-if="screen.kind !== 'home'" class="home" type="button" @click="home">Quizzer</button>
        <template v-else>Quizzer</template>
      </h1>
      <span class="where muted">{{ screen.kind === 'party' ? 'With friends' : '' }}</span>
      <button
        class="btn quiet icon"
        type="button"
        :aria-label="theme === 'dark' ? 'Use light theme' : 'Use dark theme'"
        @click="theme = theme === 'dark' ? 'light' : 'dark'"
      >
        <component :is="theme === 'dark' ? Sun : Moon" :size="18" aria-hidden="true" />
      </button>
    </header>

    <main>
      <p v-if="!convex" class="error">
        Quizzer’s server isn’t configured. Run <code>npx convex dev</code> to create <code>.env.local</code>.
      </p>
      <HomeScreen v-else-if="screen.kind === 'home'" @play="play" @party="screen = { kind: 'party' }" />
      <QuizPlay v-else-if="screen.kind === 'solo'" :key="screen.attemptId" :attempt-id="screen.attemptId" @again="again" @leave="home">
        <template #after>
          <span v-if="againBusy" class="muted small busy">Fetching questions…</span>
          <span v-if="againError" class="error">{{ againError }}</span>
        </template>
      </QuizPlay>
      <PartyScreen v-else :initial-code="inviteCode" @exit="home" />
    </main>
  </div>
</template>

<style scoped>
.page {
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: var(--space-5) var(--space-6) var(--space-7);
}

.top {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-6);
  border-bottom: 1px solid var(--rule);
}

.wordmark {
  font-size: var(--fs-h3);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.home {
  border: none;
  background: none;
  font-weight: inherit;
  letter-spacing: inherit;
  cursor: pointer;
}

.where {
  flex: 1;
  font-size: var(--fs-small);
}

.busy {
  align-self: center;
}

@media (max-width: 720px) {
  .page {
    padding: var(--space-3) var(--space-4) var(--space-6);
  }
  .top {
    margin-bottom: var(--space-4);
  }
}
</style>
