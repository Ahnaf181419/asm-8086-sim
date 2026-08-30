import { EditorView, Decoration } from '@codemirror/view'
import { StateEffect, StateField, RangeSet } from '@codemirror/state'

export const setCurrentLineEffect = StateEffect.define<number | null>()

export const currentLineField = StateField.define<RangeSet<Decoration>>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setCurrentLineEffect)) return lineDeco(e.value)
    return value
  },
  provide: (f) => EditorView.decorations.from(f),
})

function lineDeco(line: number | null): RangeSet<Decoration> {
  if (line == null) return Decoration.none
  return Decoration.set([Decoration.line({ class: 'editor-current-line' }).range(line)])
}
