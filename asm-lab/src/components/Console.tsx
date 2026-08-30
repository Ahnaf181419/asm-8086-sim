import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { MachineStatus } from '../engine/types'

export default function Console({
  output,
  status,
  onInput,
}: {
  output: string
  status: MachineStatus
  onInput: (text: string) => void
}) {
  const [input, setInput] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const waiting = status === 'waiting-input'

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [output])

  useEffect(() => {
    if (waiting) inputRef.current?.focus()
  }, [waiting])

  const submit = () => {
    if (!waiting || input.length === 0) return
    onInput(input + '\n')
    setInput('')
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
    // AH=01h consumes single chars; typing char-by-char is closer to DOS
    // but line mode with Enter is friendlier for INDEC — we send the whole line.
  }

  const norm = output.replace(/\r/g, '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        ref={bodyRef}
        className="console"
        style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
      >
        {norm.length === 0 ? <span style={{ color: 'var(--text-faint)' }}>DOS output will appear here…</span> : norm}
        {!norm.endsWith('\n') && norm.length > 0 ? <span className="console-prompt">▊</span> : null}
      </div>
      {waiting && (
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
          <span className="console-prompt">INPUT&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="type value + Enter (feeds INT 21H AH=01h)"
            style={{ flex: 1 }}
            autoFocus
          />
          <button className="primary" onClick={submit}>
            send
          </button>
        </div>
      )}
    </div>
  )
}
