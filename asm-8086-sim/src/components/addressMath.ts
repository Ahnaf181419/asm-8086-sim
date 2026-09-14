// Pure math for the segment:offset → 20-bit physical address widget.
// Extracted from AddressCalculator so the teaching arithmetic (shift, add,
// wraparound, formatting) is unit-testable — an error here literally
// teaches the wrong hardware concept.

export function parseHex16(s: string): number {
  const v = parseInt(s, 16)
  return Number.isFinite(v) ? v & 0xffff : 0
}

export function physicalAddress(segStr: string, offStr: string): number {
  const seg = parseHex16(segStr)
  const off = parseHex16(offStr)
  return ((seg * 16 + off) & 0xfffff) >>> 0
}

export function hex5(v: number): string {
  return v.toString(16).toUpperCase().padStart(5, '0')
}

export function hex4(v: number): string {
  return v.toString(16).toUpperCase().padStart(4, '0')
}

export function bin20(v: number): string {
  return v.toString(2).padStart(20, '0')
}
