export function isBareAsm(src: string): boolean {
  if (!src.trim()) return false
  const upper = src.toUpperCase()
  return !(upper.includes('.CODE') || upper.includes('.MODEL') || upper.includes('SEGMENT') || upper.includes('PROC'))
}
