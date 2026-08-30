import { useEffect, useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { StreamLanguage, type StreamParser } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { indentUnit } from '@codemirror/language'
import { currentLineField, lineStartOffset, setCurrentLineOffsetEffect } from './editorLineField'
import { asmEditorTheme } from './editorTheme'
import { KEYWORDS, REGISTERS } from './masmTokens'


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
  // State, not a ref: the view does not exist on the first render, and with a
  // ref this effect would skip that pass and never re-run (currentLine has not
  // changed), leaving the very first program with no highlight at all.
  const [view, setView] = useState<EditorView | null>(null)

  // The editor owns its own highlight. Keeping this here (rather than having
  // the page dispatch into a view ref) means nothing outside this module
  // imports CodeMirror, so the whole editor can be code-split away.
  useEffect(() => {
    if (!view) return
    view.dispatch({ effects: setCurrentLineOffsetEffect.of(lineStartOffset(view.state.doc, currentLine)) })
  }, [view, currentLine, value])

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
      onCreateEditor={setView}
      extensions={extensions}
      theme={asmEditorTheme}
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
