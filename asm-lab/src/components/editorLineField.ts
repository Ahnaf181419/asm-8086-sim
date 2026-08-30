import { EditorView, Decoration } from '@codemirror/view'
import { StateEffect, StateField, RangeSet } from '@codemirror/state'

// The payload is a DOCUMENT CHARACTER OFFSET at the start of a line — not a
// line number. `Decoration.line().range(pos)` decorates "the line starting at
// the given position", so passing a line index silently highlights whichever
// line happens to contain that offset (almost always line 1). Callers must
// convert with `doc.line(n).from`.
export const setCurrentLineOffsetEffect = StateEffect.define<number | null>()

export const currentLineField = StateField.define<RangeSet<Decoration>>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setCurrentLineOffsetEffect)) return lineDeco(e.value)
    // keep the highlight pinned to the right line while the user types above it
    return value.map(tr.changes)
  },
  provide: (f) => EditorView.decorations.from(f),
})

function lineDeco(offset: number | null): RangeSet<Decoration> {
  if (offset == null) return Decoration.none
  return Decoration.set([Decoration.line({ class: 'editor-current-line' }).range(offset)])
}

// Convert a 1-based source line number to the document offset of that line's
// start, clamped into range. Returns null when there is no line to highlight.
export function lineStartOffset(view: EditorView, line1Based: number | null): number | null {
  if (line1Based == null) return null
  const doc = view.state.doc
  const n = Math.min(Math.max(line1Based, 1), doc.lines)
  return doc.line(n).from
}
