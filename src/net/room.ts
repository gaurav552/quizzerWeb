import { Peer, type DataConnection, type PeerOptions } from 'peerjs'
import { reactive } from 'vue'
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from '@/quiz/settings'

const ID_PREFIX = 'grg-quiz-'
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const MAX_PLAYERS = 8
const JOIN_TIMEOUT_MS = 12000
/** WebRTC doesn't always report a closed tab, so everyone pings and gives up after a silence. */
const PING_MS = 3000
const SILENCE_MS = 10000

export interface Player {
  id: string
  name: string
}

type Phase = 'connecting' | 'lobby' | 'playing' | 'closed'

export type HostMsg =
  | { t: 'room'; players: Player[]; settings: Settings; quizId: string | null; notice: string }
  | { t: 'reject'; reason: string }
  | { t: 'ping' }
  | { t: 'bye' }

export type GuestMsg = { t: 'hello'; name: string } | { t: 'ping' } | { t: 'bye' }

function peerOptions(): PeerOptions {
  const env = import.meta.env
  const opts: PeerOptions = { debug: 1 }
  if (env.VITE_PEER_HOST) {
    opts.host = env.VITE_PEER_HOST
    opts.port = Number(env.VITE_PEER_PORT ?? 443)
    opts.path = env.VITE_PEER_PATH ?? '/'
    opts.secure = env.VITE_PEER_SECURE !== 'false'
  }
  return opts
}

function openPeer(id?: string): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id, peerOptions()) : new Peer(peerOptions())
    const fail = (e: unknown) => {
      peer.destroy()
      reject(e)
    }
    peer.once('open', () => {
      peer.off('error', fail)
      resolve(peer)
    })
    peer.once('error', fail)
  })
}

const randomCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
export const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, 16) || 'Player'

/**
 * A quiz party. PeerJS only carries the lobby: who's here, the host's settings, and which quiz
 * to play. Answers and standings go through Convex, where everyone plays the same quiz.
 */
export class PartyRoom {
  readonly state = reactive({
    role: 'guest' as 'host' | 'guest',
    code: '',
    you: '',
    players: [] as Player[],
    settings: { ...DEFAULT_SETTINGS } as Settings,
    quizId: null as string | null,
    phase: 'connecting' as Phase,
    notice: '',
    error: null as string | null,
  })

  private peer: Peer | null = null
  private guests = new Map<string, DataConnection>()
  private hostConn: DataConnection | null = null
  private heard = new Map<string, number>()
  private pulse: ReturnType<typeof setInterval> | null = null

  private startPulse() {
    this.pulse ??= setInterval(() => {
      const now = Date.now()
      if (this.state.role === 'host') {
        for (const [id, c] of this.guests) {
          if (now - (this.heard.get(id) ?? now) > SILENCE_MS) this.drop(id)
          else if (c.open) c.send({ t: 'ping' } satisfies HostMsg)
        }
      } else if (this.hostConn) {
        if (now - (this.heard.get('host') ?? now) > SILENCE_MS) this.fail('Lost touch with the host.')
        else if (this.hostConn.open) this.hostConn.send({ t: 'ping' } satisfies GuestMsg)
      }
    }, PING_MS)
  }

  // ---------- host ----------

  async host(name: string, settings: Settings): Promise<void> {
    this.state.role = 'host'
    this.state.settings = normalizeSettings(settings)
    for (let attempt = 0; ; attempt++) {
      const code = randomCode()
      try {
        this.peer = await openPeer(ID_PREFIX + code)
        this.state.code = code
        break
      } catch (e) {
        if ((e as { type?: string }).type !== 'unavailable-id' || attempt >= 5) return this.fail(e)
      }
    }
    const peer = this.peer!
    this.state.you = peer.id
    this.state.players = [{ id: peer.id, name: cleanName(name) }]
    this.state.phase = 'lobby'
    peer.on('connection', (conn) => this.accept(conn))
    peer.on('disconnected', () => !peer.destroyed && peer.reconnect())
    peer.on('error', (e) => console.warn('[quiz]', e.type, e.message))
    this.startPulse()
  }

  private accept(conn: DataConnection) {
    conn.on('data', (raw) => {
      const msg = raw as GuestMsg
      this.heard.set(conn.peer, Date.now())
      if (msg.t === 'bye') return this.drop(conn.peer)
      if (msg.t !== 'hello') return
      if (this.state.players.length >= MAX_PLAYERS) return this.reject(conn, 'That room is full.')
      this.guests.set(conn.peer, conn)
      this.state.players = [...this.state.players, { id: conn.peer, name: cleanName(msg.name) }]
      this.state.notice = ''
      this.broadcast()
    })
    const drop = () => this.drop(conn.peer)
    conn.on('close', drop)
    conn.on('error', drop)
  }

  private reject(conn: DataConnection, reason: string) {
    conn.send({ t: 'reject', reason } satisfies HostMsg)
    setTimeout(() => conn.close(), 500)
  }

  private drop(id: string) {
    const conn = this.guests.get(id)
    if (!conn) return
    this.guests.delete(id)
    this.heard.delete(id)
    conn.close()
    const leaving = this.state.players.find((p) => p.id === id)
    this.state.players = this.state.players.filter((p) => p.id !== id)
    this.state.notice = `${leaving?.name ?? 'Someone'} left the room.`
    this.broadcast()
  }

  setSettings(settings: Settings) {
    if (this.state.role !== 'host' || this.state.quizId) return
    this.state.settings = normalizeSettings(settings)
    this.broadcast()
  }

  /** Everyone starts on this quiz (host only). */
  go(quizId: string) {
    if (this.state.role !== 'host') return
    this.state.quizId = quizId
    this.state.phase = 'playing'
    this.state.notice = ''
    this.broadcast()
  }

  backToLobby() {
    if (this.state.role !== 'host') return
    this.state.quizId = null
    this.state.phase = 'lobby'
    this.broadcast()
  }

  private broadcast() {
    const { players, settings, quizId, notice } = this.state
    const msg: HostMsg = { t: 'room', players, settings, quizId, notice }
    for (const c of this.guests.values()) if (c.open) c.send(msg)
  }

  // ---------- guest ----------

  async join(name: string, code: string): Promise<void> {
    this.state.role = 'guest'
    this.state.code = code.trim().toUpperCase()
    try {
      this.peer = await openPeer()
    } catch (e) {
      return this.fail(e)
    }
    const peer = this.peer
    this.state.you = peer.id
    peer.on('error', (e) => {
      if (e.type === 'peer-unavailable') this.fail('No room with that code. Check it with the host.')
      else console.warn('[quiz]', e.type, e.message)
    })
    const conn = peer.connect(ID_PREFIX + this.state.code, { reliable: true, serialization: 'json' })
    this.hostConn = conn
    const timeout = setTimeout(
      () => this.state.phase === 'connecting' && this.fail("Couldn't reach that room."),
      JOIN_TIMEOUT_MS,
    )
    conn.on('open', () => {
      conn.send({ t: 'hello', name: cleanName(name) } satisfies GuestMsg)
      this.heard.set('host', Date.now())
      this.startPulse()
    })
    conn.on('data', (raw) => {
      const msg = raw as HostMsg
      this.heard.set('host', Date.now())
      if (msg.t === 'room') {
        clearTimeout(timeout)
        Object.assign(this.state, {
          players: msg.players,
          settings: normalizeSettings(msg.settings),
          quizId: msg.quizId,
          notice: msg.notice,
          phase: msg.quizId ? 'playing' : 'lobby',
        })
      } else if (msg.t === 'reject') {
        clearTimeout(timeout)
        this.fail(msg.reason)
      } else if (msg.t === 'bye') {
        this.fail('The host closed the room.')
      }
    })
    conn.on('close', () => this.state.phase !== 'closed' && this.fail('The host closed the room.'))
  }

  // ---------- both ----------

  private fail(e: unknown) {
    this.state.error = typeof e === 'string' ? e : (e as Error)?.message || 'Connection failed.'
    this.close()
  }

  close() {
    this.state.phase = 'closed'
    if (this.pulse) clearInterval(this.pulse)
    this.pulse = null
    // Say goodbye first so nobody has to wait for the silence timeout.
    for (const c of [...this.guests.values(), this.hostConn]) {
      if (c?.open) {
        c.send({ t: 'bye' })
        c.close({ flush: true })
      }
    }
    this.guests.clear()
    this.hostConn = null
    this.peer?.destroy()
    this.peer = null
  }
}
