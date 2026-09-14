// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from '../src/lib/sanitizeHtml'

describe('sanitizeHtml: lesson HTML allowlist boundary', () => {
  it('keeps the tags lessons actually use', () => {
    expect(sanitizeHtml('<b>bold</b> <i>it</i> <code>MOV AX, 5</code>')).toBe(
      '<b>bold</b> <i>it</i> <code>MOV AX, 5</code>',
    )
  })

  it('strips script/img/event handlers outright', () => {
    expect(sanitizeHtml('<script>alert(1)</script>ok')).toBe('ok')
    expect(sanitizeHtml('<img src=x onerror=alert(1)>after')).toBe('after')
    expect(sanitizeHtml('<span onclick="x()">click</span>')).toBe('click')
  })

  it('unwraps unknown containers but keeps their text and allowed children', () => {
    expect(sanitizeHtml('<p>hello <b>world</b></p>')).toBe('hello <b>world</b>')
    expect(sanitizeHtml('<ul><li>a</li></ul>')).toBe('a')
  })

  it('drops attributes even on allowed tags', () => {
    expect(sanitizeHtml('<code class="x" onmouseover="y()">c</code>')).toBe('<code>c</code>')
  })

  it('preserves entities and plain text untouched', () => {
    expect(sanitizeHtml('S = 1³ + 2³ &amp; more')).toBe('S = 1³ + 2³ &amp; more')
  })
})
