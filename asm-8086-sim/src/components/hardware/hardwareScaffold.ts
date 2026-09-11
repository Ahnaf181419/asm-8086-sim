export function isBareAsm(src: string): boolean {
  if (!src.trim()) return false
  const upper = src.toUpperCase()
  return !(upper.includes('.CODE') || upper.includes('.MODEL') || upper.includes('SEGMENT') || upper.includes('PROC'))
}

export function wrapIfBare(src: string): string {
  if (!isBareAsm(src)) return src
  return `.MODEL SMALL\n.CODE\nMAIN PROC\n${src}\n  HLT\nMAIN ENDP\nEND MAIN\n`
}
