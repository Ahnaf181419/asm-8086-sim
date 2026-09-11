import type { CSSProperties, ReactNode } from 'react'

export default function TerminalPanel({
  title,
  children,
  className = '',
  right,
  style,
}: {
  title: string
  children: ReactNode
  className?: string
  right?: ReactNode
  style?: CSSProperties
}) {
  return (
    <section className={`term-panel ${className}`} style={style}>
      <div className="term-title">
        <span style={{ flexShrink: 0 }}>{title}</span>
        {right && <span style={{ marginLeft: 'auto', letterSpacing: 0, textTransform: 'none' }}>{right}</span>}
      </div>
      <div className="term-body">{children}</div>
    </section>
  )
}

