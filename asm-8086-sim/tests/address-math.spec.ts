import { describe, expect, it } from 'vitest'
import { physicalAddress, parseHex16, hex5, hex4, bin20 } from '../src/components/addressMath'

describe('addressMath: segment:offset → physical address', () => {
  it('lecture example A4FB:4872 → A9822', () => {
    expect(physicalAddress('A4FB', '4872')).toBe(0xa9822)
    expect(hex5(physicalAddress('A4FB', '4872'))).toBe('A9822')
  })

  it('reset vector FFFF:0000 → FFFF0 (top of the 1MB space)', () => {
    expect(physicalAddress('FFFF', '0000')).toBe(0xffff0)
    expect(bin20(physicalAddress('FFFF', '0000'))).toBe('11111111111111110000')
  })

  it('wraparound: FFFF:0010 wraps past 1MB boundary', () => {
    expect(physicalAddress('FFFF', '0010')).toBe(0x00000)
  })

  it('offset does the wrapping, not the segment: 0000:FFFF stays low', () => {
    expect(physicalAddress('0000', 'FFFF')).toBe(0x0ffff)
  })

  it('garbage input parses to 0, not NaN', () => {
    expect(parseHex16('G1')).toBe(0)
    expect(parseHex16('')).toBe(0)
    expect(physicalAddress('zz', 'zz')).toBe(0)
  })

  it('values mask to 16 bits before use', () => {
    expect(parseHex16('1FFFF')).toBe(0xffff)
    expect(hex4(0x123)).toBe('0123')
  })
})
