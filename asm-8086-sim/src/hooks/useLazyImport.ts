import { lazy, type ComponentType } from 'react'

// A failed dynamic import poisons the browser's module map: retrying the same
// import() rejects from cache without a new network request. The only real
// recovery is one full page reload (source code lives in localStorage), after
// which the module map is fresh. A sessionStorage flag guarantees we do it at
// most once per session — a second failure bubbles to the route errorElement.
const CHUNK_FAILURE = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i
const RELOAD_FLAG = 'asm-8086-sim:chunk-reloaded'

export interface ChunkRecoveryEnv {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  reload(): void
}

const defaultEnv: ChunkRecoveryEnv = {
  getItem: key => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: key => sessionStorage.removeItem(key),
  reload: () => location.reload(),
}

export function loadWithChunkRecovery<T>(loader: () => Promise<T>, env: ChunkRecoveryEnv = defaultEnv): Promise<T> {
  return loader().then(
    mod => {
      env.removeItem(RELOAD_FLAG) // healthy load: allow a future recovery
      return mod
    },
    e => {
      const message = e instanceof Error ? e.message : String(e)
      if (CHUNK_FAILURE.test(message) && !env.getItem(RELOAD_FLAG)) {
        env.setItem(RELOAD_FLAG, '1')
        env.reload()
        return new Promise<T>(() => {}) // page is unloading; never settle
      }
      throw e
    },
  )
}

export function lazyImport<T extends ComponentType<any>>(loader: () => Promise<{ default: T }>) {
  return lazy(() => loadWithChunkRecovery(loader))
}
