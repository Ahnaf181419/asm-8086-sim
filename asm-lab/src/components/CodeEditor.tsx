import { useEffect, useMemo, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { StreamLanguage, type StreamParser } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { indentUnit } from '@codemirror/language'
import { currentLineField, lineStartOffset, setCurrentLineOffsetEffect } from './editorLineField'

const KEYWORDS = new Set([
  'MOV', 'LEA', 'XCHG', 'PUSH', 'POP',
  'ADD', 'SUB', 'ADC', 'SBB', 'INC', 'DEC', 'NEG', 'CMP',
  'MUL', 'IMUL', 'DIV', 'IDIV', 'CBW', 'CWD',
  'AND', 'OR', 'XOR', 'NOT', 'TEST',
  'SHL', 'SAL', 'SHR', 'SAR', 'ROL', 'ROR', 'RCL', 'RCR',
  'JMP', 'CALL', 'RET', 'LOOP', 'LOOPE', 'LOOPZ', 'LOOPNE', 'LOOPNZ', 'JCXZ',
  'JE', 'JZ', 'JNE', 'JNZ', 'JG', 'JNLE', 'JGE', 'JNL', 'JL', 'JNGE', 'JLE', 'JNG',
  'JA', 'JNBE', 'JAE', 'JNB', 'JB', 'JNAE', 'JBE', 'JNA', 'JC', 'JNC', 'JS', 'JNS', 'JO', 'JNO',
  'INT', 'NOP', 'STC', 'CLC', 'CMC', 'STD', 'CLD', 'XLAT',
  'PROC', 'ENDP', 'EQU', 'DUP', 'PTR', 'LABEL', 'INCLUDE', 'END', 'ORG', 'ASSUME',
  'BYTE', 'WORD', 'NEAR', 'FAR', 'STACK',
])

const REGISTERS = new Set([
  'AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP', 'IP',
  'AH', 'AL', 'BH', 'BL', 'CH', 'CL', 'DH', 'DL',
  'DS', 'ES', 'CS', 'SS',
])

interface MasmState {
  inString: false | string
}

const masmMode: StreamParser<MasmState> = {
  name: 'masm',
  startState(): MasmState {
    return { inString: false }
  },
  token(stream, state) {
    // comments
    if (!state.inString && stream.eatWhile((c) => c === ' ' || c === '\t')) return null
    if (state.inString) {
      const quote = state.inString
      let escaped = false
      while (!stream.eol()) {
        const ch = stream.next()!
        if (ch === quote && !escaped) {
          state.inString = false
          break
        }
        escaped = ch === '\\' && !escaped
      }
      return 'string'
    }
    const ch = stream.next()
    if (ch === undefined) return null
    if (ch === ';') {
      stream.skipToEnd()
      return 'comment'
    }
    if (ch === "'" || ch === '"') {
      state.inString = ch
      return 'string'
    }
    if (/[0-9]/.test(ch)) {
      stream.eatWhile(/[0-9A-Fa-fHhBbDd]/)
      return 'number'
    }
    if (/[A-Za-z_.@?$]/.test(ch)) {
      stream.eatWhile(/[A-Za-z0-9_.@?$]/)
      const word = stream.current().toUpperCase()
      if (word.startsWith('.')) return 'keyword' // directives
      if (KEYWORDS.has(word)) return 'keyword'
      if (REGISTERS.has(word)) return 'variableName.special'
      if (stream.peek() === ':') return 'labelName'
      return 'variableName'
    }
    if ('[],:()+-*/'.includes(ch)) return 'operator'
    return null
  },
  languageData: {
    commentTokens: { line: ';' },
    indentOnInput: /$/,
  },
}

export default function CodeEditor({
  value,
  onChange,
  currentLine = null,
}: {
  value: string
  onChange: (v: string) => void
  /** 1-based source line to highlight, or null for none. */
  currentLine?: number | null
}) {
  const viewRef = useRef<EditorView | null>(null)

  // The editor owns its own highlight. Keeping this here (rather than having
  // the page dispatch into a view ref) means nothing outside this module
  // imports CodeMirror, so the whole editor can be code-split away.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: setCurrentLineOffsetEffect.of(lineStartOffset(view.state.doc, currentLine)) })
  }, [currentLine, value])

  const extensions = useMemo(
    () => [
      StreamLanguage.define(masmMode),
      indentUnit.of('    '),
      EditorView.lineWrapping,
      currentLineField,
    ],
    [],
  )

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      onCreateEditor={(view) => {
        viewRef.current = view
      }}
      extensions={extensions}
      height="100%"
      style={{ height: '100%' }}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        foldGutter: false,
        bracketMatching: true,
        closeBrackets: false,
        autocompletion: false,
        highlightSelectionMatches: false,
        searchKeymap: false,
      }}
    />
  )
}
