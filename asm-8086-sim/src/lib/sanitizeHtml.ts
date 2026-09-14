// Allowlist sanitizer for authored lesson HTML. The content in
// src/data/lessons.ts is compile-time static, but every dangerouslySetInnerHTML
// sink deserves a boundary: a future edit routing search excerpts, example
// names, or error text into a LessonBlock must not become script execution.
// Allowed: <b>, <i>, <code> — exactly what lessons.ts uses today. Everything
// else is unwrapped (children kept), attributes are dropped entirely.
const ALLOWED = new Set(['B', 'I', 'CODE'])

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      walk(child)
      if (!ALLOWED.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes))
      } else if (child.attributes.length > 0) {
        while (child.attributes.length > 0) child.removeAttribute(child.attributes[0].name)
      }
    }
  }
  walk(doc.body)
  return doc.body.innerHTML
}
