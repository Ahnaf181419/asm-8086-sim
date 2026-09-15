import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { MachineStatus } from '../engine/types'

export default function Console({
  output,
  status,
  onInput,
  onClear,
}: {
  output: string
  status: MachineStatus
  onInput: (text: string) => void
  onClear?: () => void
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

  // An empty line is a legitimate answer — a program blocking on AH=01h or
  // AH=0Ah for a bare Enter could never be satisfied while this required text.
  // Input is also accepted before the program asks for it and queued.
  const submit = () => {
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
    <div className="console-shell">
      {/* role="log" + polite is the pattern for an append-only stream: the
          status chip announces that the machine halted, but without this the
          program's actual output was never announced at all. */}
      <div ref={bodyRef} className="console" role="log" aria-live="polite" aria-atomic="false" aria-label="program output">
        {norm.length === 0 ? <span className="console-empty">DOS output will appear here…</span> : norm}
        {!norm.endsWith('\n') && norm.length > 0 ? <span className="console-prompt">▊</span> : null}
      </div>
      <div className={`console-input ${waiting ? 'waiting' : ''}`}>
        <span className="console-prompt" aria-hidden="true">
          INPUT&gt;
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          aria-label="console input for INT 21H"
          placeholder={waiting ? 'type value + Enter (feeds INT 21H)' : 'type ahead — queued until the program reads'}
        />
        <button className={waiting ? 'primary' : ''} onClick={submit}>
          send
        </button>
        {onClear && (
          <button
            onClick={onClear}
            title="Clear console output history"
            aria-label="Clear console output"
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            ⌫ clear
          </button>
        )}
      </div>
    </div>
  )
}
