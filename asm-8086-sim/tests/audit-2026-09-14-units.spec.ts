// @vitest-environment jsdom
// Unit cover for the two helpers extracted during the 2026-09-14 batch.
// Both exist because a defect was hiding in inline code: ERR-20 (register
// edits parsed digits-only input as hex, silently) and ERR-06 (a throwing
// storage accessor took the whole app down).
import { describe, expect, it, afterEach, vi } from 'vitest'
import { parseRegValue } from '../src/components/parseRegValue'
import { readStored, writeStored, removeStored } from '../src/lib/safeStorage'

describe('ERR-20 — parseRegValue radix rules', () => {
  it('reads bare input as hex, matching the field it edits', () => {
    expect(parseRegValue('10')).toBe(0x10)
    expect(parseRegValue('19')).toBe(0x19)
    expect(parseRegValue('ffff')).toBe(0xffff)
    expect(parseRegValue('BEEF')).toBe(0xbeef)
  })

  it('accepts the two hex spellings the app itself uses', () => {
    expect(parseRegValue('1Ah')).toBe(0x1a)
    expect(parseRegValue('0x1A')).toBe(0x1a)
    expect(parseRegValue('  1a  ')).toBe(0x1a)
  })

  it('takes decimal only when the entry says so', () => {
    expect(parseRegValue('10d')).toBe(10)
    expect(parseRegValue('100D')).toBe(100)
    expect(parseRegValue('-5')).toBe(-5)
    expect(parseRegValue('+42')).toBe(42)
    expect(parseRegValue('-5d')).toBe(-5)
  })

  it('returns null for anything unparseable, leaving the register alone', () => {
    expect(parseRegValue('')).toBeNull()
    expect(parseRegValue('   ')).toBeNull()
    expect(parseRegValue('zz')).toBeNull()
    expect(parseRegValue('12 34')).toBeNull()
    expect(parseRegValue('1.5')).toBeNull()
    expect(parseRegValue('0x')).toBeNull()
  })

  it('d wins over the hex reading for an all-digit entry', () => {
    // '10' and '10d' must not mean the same thing — that ambiguity is the bug.
    expect(parseRegValue('10')).not.toBe(parseRegValue('10d'))
  })
})

describe('ERR-06 — safeStorage survives a hostile storage backend', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    try { localStorage.clear() } catch { /* nothing to clear */ }
  })

  it('round-trips a value when storage works', () => {
    expect(writeStored('probe:key', 'hello')).toBe(true)
    expect(readStored('probe:key')).toBe('hello')
    removeStored('probe:key')
    expect(readStored('probe:key')).toBeNull()
  })

  it('returns null instead of throwing when reads throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    })
    expect(() => readStored('probe:key')).not.toThrow()
    expect(readStored('probe:key')).toBeNull()
  })

  it('reports failure instead of throwing when writes are over quota', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded.', 'QuotaExceededError')
    })
    expect(() => writeStored('probe:key', 'x')).not.toThrow()
    expect(writeStored('probe:key', 'x')).toBe(false)
  })

  it('swallows a throwing remove', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    })
    expect(() => removeStored('probe:key')).not.toThrow()
  })
})
