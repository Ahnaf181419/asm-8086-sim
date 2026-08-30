import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// CodeMirror ships a LIGHT theme by default. Without this the editor rendered
// as a white box inside a dark app, and any text the MASM parser did not
// tokenize fell back to the inherited --text (a pale green) on white — 1.21:1,
// effectively invisible. Colours come from the CSS custom properties in
// global.css so the editor tracks the rest of the palette.
export const asmDarkTheme = EditorView.theme(
  {
    '&': {
      color: 'var(--text)',
      backgroundColor: 'var(--editor-bg)',
    },
    '.cm-content': {
      caretColor: 'var(--accent)',
      padding: '8px 0',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--accent)',
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(51, 255, 102, 0.22)',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(51, 255, 102, 0.05)' },
    '.cm-gutters': {
      backgroundColor: 'var(--panel)',
      color: 'var(--text-faint)',
      border: 'none',
      borderRight: '1px solid var(--border)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(51, 255, 102, 0.08)',
      color: 'var(--accent)',
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 12px' },
    '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
      backgroundColor: 'rgba(51, 255, 102, 0.2)',
      outline: '1px solid var(--accent-dim)',
    },
    '.cm-nonmatchingBracket': { color: 'var(--err)' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.5' },
    '.cm-selectionMatch': { backgroundColor: 'rgba(102, 204, 255, 0.18)' },
  },
  { dark: true },
)

// Token colours for the MASM stream parser in CodeEditor.tsx. Each was checked
// against --editor-bg for at least 4.5:1 (see tests/editor-theme.spec.ts).
const asmHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: t.keyword, color: 'var(--syn-keyword)', fontWeight: '600' },
  { tag: t.number, color: 'var(--syn-number)' },
  { tag: t.string, color: 'var(--syn-string)' },
  // registers — CodeEditor tags these 'variableName.special'
  { tag: t.special(t.variableName), color: 'var(--syn-register)', fontWeight: '600' },
  { tag: t.labelName, color: 'var(--syn-label)', fontWeight: '600' },
  // user symbols: data labels, procedure names
  { tag: t.variableName, color: 'var(--syn-symbol)' },
  { tag: t.operator, color: 'var(--syn-op)' },
])

export const asmEditorTheme = [asmDarkTheme, syntaxHighlighting(asmHighlightStyle)]
