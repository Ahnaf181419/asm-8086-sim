const BARE_BLOCKER = /\.(MODEL|CODE|DATA|STACK|SEGMENT|FARDATA)\b|\b(PROC|ENDP|END|INCLUDE)\b/i

function stripComments(src: string): string {
  return src.replace(/;.*$/gm, '')
}

export function isBareAsm(src: string): boolean {
  return src.trim().length > 0 && !BARE_BLOCKER.test(stripComments(src))
}
