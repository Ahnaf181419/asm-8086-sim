import type { SourcePos, Token } from './types'

// Tokenizes one line of MASM/TASM source.
// Comments start with ';' (outside quotes). Strings use ' or ".
export function tokenizeLine(rawLine: string, file: string, lineNo: number): Token[] {
  const pos: SourcePos = { file, line: lineNo }
  const tokens: Token[] = []
  let i = 0
  const n = rawLine.length

  while (i < n) {
    const c = rawLine[i]

    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
      i++
      continue
    }

    // comment
    if (c === ';') break

    // string literal
    if (c === "'" || c === '"') {
      const quote = c
      i++
      let text = ''
      while (i < n && rawLine[i] !== quote) {
        text += rawLine[i]
        i++
      }
      if (i >= n) throw err(pos, 'unterminated string literal')
      i++ // closing quote
      tokens.push({ kind: 'string', text, pos })
      continue
    }

    // punctuation
    if (':,[]()+-*/'.includes(c)) {
      tokens.push({ kind: 'punct', text: c, pos })
      i++
      continue
    }

    if (c === '?') {
      tokens.push({ kind: 'question', text: '?', pos })
      i++
      continue
    }

    // identifier: letters, digits, _, $, @, ., ? (must not start with digit)
    // directives like .MODEL start with '.'
    if (/[A-Za-z_@.$?]/.test(c)) {
      let text = ''
      while (i < n && /[A-Za-z0-9_@.$?]/.test(rawLine[i])) {
        text += rawLine[i]
        i++
      }
      tokens.push({ kind: 'ident', text, pos })
      continue
    }

    // number: starts with digit; consume digits, hex letters and H/B/D suffix
    if (/[0-9]/.test(c)) {
      let text = ''
      while (i < n && /[0-9A-Fa-fHhBbDd]/.test(rawLine[i])) {
        text += rawLine[i]
        i++
      }
      tokens.push({ kind: 'number', text, pos })
      continue
    }

    throw err(pos, `unexpected character '${c}'`)
  }

  return tokens
}

function err(pos: SourcePos, message: string): Error & { asm?: SourcePos } {
  const e: Error & { asm?: SourcePos } = new Error(message)
  e.asm = pos
  return e
}
