/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly CONVEX_URL?: string
  /** Optional self-hosted PeerServer; defaults to the public PeerJS cloud. */
  readonly VITE_PEER_HOST?: string
  readonly VITE_PEER_PORT?: string
  readonly VITE_PEER_PATH?: string
  readonly VITE_PEER_SECURE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
