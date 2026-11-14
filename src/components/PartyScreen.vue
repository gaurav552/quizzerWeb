<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { Check, Link, LogOut } from 'lucide-vue-next'
import type { Id } from '../../convex/_generated/dataModel'
import { useCategories } from '@/categories'
import { describeSettings, parseSettings } from '@/quiz/settings'
import { PartyRoom } from '@/net/room'
import { errorText, newQuiz, startAttempt } from '@/sets'
import { storage } from '@/storage'
import QuizPlay from './QuizPlay.vue'
import SettingsForm from './SettingsForm.vue'
import StandingsList from './StandingsList.vue'

const props = defineProps<{ initialCode?: string }>()
const emit = defineEmits<{ exit: [] }>()

const name = ref(storage.get('quiz:name') ?? '')
const code = ref((props.initialCode ?? '').toUpperCase())
const formError = ref('')
const lastError = ref('')
const copied = ref(false)
const room = shallowRef<PartyRoom | null>(null)
const { nameOf } = useCategories()

const state = computed(() => room.value?.state)
const isHost = computed(() => state.value?.role === 'host')
const players = computed(() => state.value?.players ?? [])
const settingsLine = computed(() => (state.value ? describeSettings(state.value.settings, nameOf(state.value.settings.category)) : ''))

/** This device's attempt at the room's current quiz. Kept even if the room drops mid-set. */
const attempt = ref<{ quizId: string; attemptId: Id<'attempts'>; code: string } | null>(null)
const starting = ref(false)
const startError = ref('')

const phase = computed(() => {
  if (attempt.value) return 'quiz'
  const s = state.value
  if (!s || (s.phase === 'closed' && !s.error)) return 'setup'
  if (s.phase === 'playing') return 'joining-quiz'
  return s.phase
})

async function open(how: 'host' | 'join') {
  formError.value = ''
  if (!name.value.trim()) return void (formError.value = 'Add your name first.')
  if (how === 'join' && code.value.trim().length !== 4) return void (formError.value = 'Room codes are 4 characters.')
  storage.set('quiz:name', name.value.trim())
  lastError.value = ''
  const r = new PartyRoom()
  room.value = r
  if (how === 'host') await r.host(name.value, parseSettings(storage.get('quiz:settings')))
  else await r.join(name.value, code.value)
}

function leave() {
  if (state.value?.error) lastError.value = state.value.error
  room.value?.close()
  room.value = null
  attempt.value = null
  const url = new URL(location.href)
  if (url.searchParams.has('room')) {
    url.searchParams.delete('room')
    history.replaceState(null, '', url)
  }
}

async function copyInvite() {
  const url = new URL(location.href)
  url.search = `?room=${state.value!.code}`
  try {
    await navigator.clipboard.writeText(url.toString())
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    /* the code is on screen */
  }
}

/** Host: fetch a quiz and send everyone to it. */
async function startSet() {
  if (!room.value || starting.value) return
  starting.value = true
  startError.value = ''
  try {
    storage.set('quiz:settings', JSON.stringify(room.value.state.settings))
    room.value.go(await newQuiz(room.value.state.settings))
  } catch (e) {
    startError.value = errorText(e)
  } finally {
    starting.value = false
  }
}

async function joinQuiz(quizId: string) {
  const s = state.value
  if (!s || attempt.value?.quizId === quizId) return
  startError.value = ''
  try {
    const attemptId = await startAttempt(quizId as Id<'quizzes'>, name.value, s.code)
    attempt.value = { quizId, attemptId, code: s.code }
  } catch (e) {
    startError.value = errorText(e)
  }
}

// When the room starts a quiz, join it, unless still busy with the last one: nobody gets pulled
// out of a set halfway. They're offered the next one when they finish.
watch(
  () => state.value?.quizId,
  (quizId) => {
    if (quizId && !attempt.value) joinQuiz(quizId)
  },
)

/** The room has moved on from the set on screen (to the lobby, or to another quiz). */
const roomMovedOn = computed(() => !!attempt.value && !!state.value && state.value.quizId !== attempt.value.quizId)

/** Host, after a set: back to the lobby to pick the next one. */
function nextSet() {
  attempt.value = null
  room.value?.backToLobby()
}

/** Guest, after a set: catch up with the room. */
function followRoom() {
  const quizId = state.value?.quizId
  attempt.value = null
  if (quizId) joinQuiz(quizId)
}

const roomGone = computed(() => !!attempt.value && (!room.value || state.value?.phase === 'closed'))

if (code.value && name.value.trim()) open('join')
// Closing the tab doesn't unmount anything; say goodbye to the room anyway.
const bye = () => room.value?.close()
addEventListener('pagehide', bye)
onUnmounted(() => {
  removeEventListener('pagehide', bye)
  bye()
})
</script>

<template>
  <div class="party">
    <section v-if="phase === 'setup'" class="setup">
      <h2>Play with friends</h2>
      <p class="muted">
        Everyone answers the same questions on their own device, at their own pace, with live standings. One of you opens
        a room and picks the set; up to eight can join.
      </p>
      <div class="field-group">
        <label class="label" for="party-name">Your name</label>
        <input id="party-name" v-model="name" class="field" maxlength="16" placeholder="e.g. Sam" autocomplete="nickname" />
      </div>
      <div class="choices">
        <button class="btn primary" type="button" @click="open('host')">Open a room</button>
        <form class="join" @submit.prevent="open('join')">
          <label class="sr-only" for="party-room">Room code</label>
          <input
            id="party-room"
            v-model="code"
            class="field code-input"
            maxlength="4"
            placeholder="Code"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            @input="code = code.toUpperCase()"
          />
          <button class="btn" type="submit">Join</button>
        </form>
      </div>
      <p class="error" role="alert">{{ formError || lastError }}</p>
      <button class="btn quiet back" type="button" @click="emit('exit')">Back</button>
    </section>

    <section v-else-if="phase === 'connecting'" class="setup">
      <p>{{ isHost ? 'Opening your room…' : `Joining room ${state?.code}…` }}</p>
      <button class="btn" type="button" @click="leave">Cancel</button>
    </section>

    <section v-else-if="phase === 'closed'" class="setup">
      <p class="error" role="alert">{{ state?.error }}</p>
      <button class="btn primary" type="button" @click="leave">Back</button>
    </section>

    <section v-else-if="phase === 'joining-quiz'" class="setup">
      <p v-if="startError" class="error" role="alert">{{ startError }}</p>
      <p v-else class="muted">Starting the set…</p>
      <button class="btn quiet back" type="button" @click="leave"><LogOut :size="16" aria-hidden="true" /> Leave room</button>
    </section>

    <section v-else-if="phase === 'lobby' && state" class="lobby">
      <div class="room-head">
        <div>
          <span class="label">Room code</span>
          <strong class="code" data-testid="room-code">{{ state.code }}</strong>
        </div>
        <button class="btn" type="button" @click="copyInvite">
          <component :is="copied ? Check : Link" :size="16" aria-hidden="true" /> {{ copied ? 'Copied' : 'Copy link' }}
        </button>
      </div>

      <div class="people-block">
        <h3 class="section-title">Players, {{ players.length }} of 8</h3>
        <ol class="people">
          <li v-for="(p, i) in players" :key="p.id" :class="{ me: p.id === state.you }">
            <span class="pname">{{ p.name }} <span v-if="p.id === state.you" class="muted small">you</span></span>
            <span v-if="i === 0" class="muted small">host</span>
          </li>
        </ol>
        <p v-if="state.notice" class="muted small">{{ state.notice }}</p>
      </div>

      <template v-if="isHost">
        <SettingsForm :model-value="state.settings" @update:model-value="(s) => room!.setSettings(s)" />
        <p v-if="startError" class="error" role="alert">{{ startError }}</p>
        <button class="btn primary" type="button" :disabled="starting" @click="startSet">
          {{ starting ? 'Fetching questions…' : players.length < 2 ? 'Start on your own' : `Start for ${players.length} players` }}
        </button>
      </template>
      <p v-else class="muted">
        The set: {{ settingsLine }}.<br />
        The host starts it.
      </p>

      <button class="btn quiet back" type="button" @click="leave"><LogOut :size="16" aria-hidden="true" /> Leave room</button>
    </section>

    <QuizPlay
      v-else-if="attempt"
      :key="attempt.attemptId"
      :attempt-id="attempt.attemptId"
      :party-code="attempt.code"
      @leave="leave"
    >
      <template #side>
        <StandingsList :quiz-id="attempt.quizId" :party="attempt.code" :you="name.trim()" />
        <p v-if="roomGone" class="muted small">The room has closed. You can still finish this set.</p>
        <p v-else-if="roomMovedOn && state?.quizId" class="muted small">The host has started the next set. It’s waiting for you when you finish.</p>
        <p v-else class="muted small">Room <strong class="num">{{ attempt.code }}</strong></p>
      </template>
      <template #after>
        <template v-if="!roomGone">
          <button v-if="isHost" class="btn primary" type="button" @click="nextSet">Pick the next set</button>
          <button v-else-if="roomMovedOn" class="btn primary" type="button" @click="followRoom">
            {{ state?.quizId ? 'Join the next set' : 'Back to the room' }}
          </button>
          <span v-else class="muted small waiting">The host picks the next set.</span>
        </template>
        <p v-if="startError" class="error" role="alert">{{ startError }}</p>
      </template>
    </QuizPlay>
  </div>
</template>

<style scoped>
.setup,
.lobby {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-5);
  max-width: 560px;
}

h2 {
  font-size: var(--fs-h2);
  letter-spacing: -0.01em;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: min(320px, 100%);
}

.choices,
.join {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

.join {
  gap: var(--space-2);
}

.code-input {
  width: 110px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
}

.code-input::placeholder {
  text-transform: none;
  letter-spacing: normal;
}

.error:empty {
  display: none;
}

.back {
  margin-left: calc(-1 * var(--space-4));
}

.room-head {
  display: flex;
  align-items: flex-end;
  gap: var(--space-5);
}

.room-head > div {
  display: flex;
  flex-direction: column;
}

.code {
  font-size: var(--fs-big);
  font-weight: 600;
  letter-spacing: 0.18em;
  line-height: 1.1;
}

.people-block,
.people {
  width: min(360px, 100%);
  list-style: none;
}

.people li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--rule);
}

.people li:last-child {
  border-bottom: none;
}

.me .pname {
  font-weight: 600;
}

.pname {
  flex: 1;
}

.small {
  font-size: var(--fs-small);
}

.waiting {
  align-self: center;
}
</style>
