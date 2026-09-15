// Extracted from RegisterPanel so the radix rule is testable on its own and
// the component file exports only components (oxlint react/only-export-components),
// matching the existing addressMath.ts / AddressCalculator.tsx split.
/** Parse a register-edit entry. Hex by default (the field shows hex); an
 *  explicit `d` suffix or a leading sign means decimal. Returns null for
 *  anything unparseable, which leaves the register untouched. */
export function parseRegValue(text: string): number | null {
  const t = text.trim()
  if (t === '') return null
  if (/^-?\d+d$/i.test(t)) return parseInt(t.slice(0, -1), 10)
  if (/^[-+]\d+$/.test(t)) return parseInt(t, 10)
  if (/^(0x)?[0-9a-f]+h?$/i.test(t)) {
    return parseInt(t.replace(/^0x/i, '').replace(/h$/i, ''), 16)
  }
  return null
}
