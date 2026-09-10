import { describe, expect, it } from 'vitest'
import { loadWithChunkRecovery, type ChunkRecoveryEnv } from '../src/hooks/useLazyImport'

const CHUNK_FAIL = 'Failed to fetch dynamically imported module: http://localhost:5199/src/components/CodeEditor.tsx'
const OTHER_FAIL = 'SyntaxError: Unexpected token'

function fakeEnv(loadedFlag: string | null = null) {
  const store = new Map<string, string>(loadedFlag === null ? [] : [['asm-8086-sim:chunk-reloaded', loadedFlag]])
  const calls: string[] = []
  const env: ChunkRecoveryEnv & { calls: string[] } = {
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: k => void store.delete(k),
    reload: () => calls.push('reload'),
    calls,
  }
  return env
}

const PENDING = Symbol('pending')

describe('loadWithChunkRecovery', () => {
  it('resolves the module on success and clears a stale reload flag', async () => {
    const env = fakeEnv('1') // a previous recovery happened
    const mod = { default: 'component' }
    await expect(loadWithChunkRecovery(async () => mod, env)).resolves.toBe(mod)
    expect(env.getItem('asm-8086-sim:chunk-reloaded')).toBeNull()
    expect(env.calls).toEqual([])
  })

  it('reloads the page once on a chunk failure, then stays pending while unloading', async () => {
    const env = fakeEnv()
    const load = async () => {
      throw new TypeError(CHUNK_FAIL)
    }
    const p = loadWithChunkRecovery(load, env)
    const outcome = await Promise.race([
      p.then(() => 'settled', () => 'settled'),
      new Promise<typeof PENDING>(r => setTimeout(() => r(PENDING), 25)),
    ])
    expect(outcome).toBe(PENDING) // never settles — the page is reloading
    expect(env.calls).toEqual(['reload'])
    expect(env.getItem('asm-8086-sim:chunk-reloaded')).toBe('1')
  })

  it('bubbles the error (to the route errorElement) when a reload already happened', async () => {
    const env = fakeEnv('1')
    await expect(
      loadWithChunkRecovery(async () => { throw new TypeError(CHUNK_FAIL) }, env),
    ).rejects.toThrow(CHUNK_FAIL)
    expect(env.calls).toEqual([])
  })

  it('bubbles non-chunk errors immediately without reloading', async () => {
    const env = fakeEnv()
    await expect(
      loadWithChunkRecovery(async () => { throw new Error(OTHER_FAIL) }, env),
    ).rejects.toThrow(OTHER_FAIL)
    expect(env.calls).toEqual([])
  })

  it('recognizes the Firefox chunk-failure wording too', async () => {
    const env = fakeEnv()
    const p = loadWithChunkRecovery(async () => { throw new Error('Importing a module script failed') }, env)
    await Promise.race([p.catch(() => {}), new Promise(r => setTimeout(r, 10))])
    expect(env.calls).toEqual(['reload'])
  })
})
