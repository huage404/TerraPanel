import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import type { LogEntry } from '../types/terraria'
import { formatTime } from '../utils/format'

interface LogTerminalProps {
  logs: LogEntry[]
  disabled: boolean
  onSendCommand: (command: string) => void
}

function streamClass(stream: LogEntry['stream']): string {
  if (stream === 'stderr') return 'terminal-line--stderr'
  if (stream === 'system') return 'terminal-line--system'
  return 'terminal-line--stdout'
}

export function LogTerminal({ logs, disabled, onSendCommand }: LogTerminalProps) {
  const [input, setInput] = useState('')
  const viewportRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const autoScrollingRef = useRef(false)

  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return

    autoScrollingRef.current = true
    bottomRef.current?.scrollIntoView({ block: 'end' })
    requestAnimationFrame(() => {
      autoScrollingRef.current = false
    })
  }, [logs])

  const handleScroll = () => {
    if (autoScrollingRef.current) return

    const el = viewportRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distance < 48
  }

  const submit = () => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSendCommand(trimmed)
    setInput('')
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') submit()
  }

  return (
    <section className="panel terminal-panel">
      <div className="panel__header">
        <h2>实时日志终端</h2>
        <p>服务器 stdout / stderr 输出，支持发送控制台命令</p>
      </div>

      <div className="terminal">
        <div
          ref={viewportRef}
          className="terminal__viewport"
          onScroll={handleScroll}
        >
          {logs.length === 0 ? (
            <div className="terminal__empty">等待日志输出...</div>
          ) : (
            <>
              {logs.map((entry) => (
                <div key={entry.id} className={`terminal-line ${streamClass(entry.stream)}`}>
                  <span className="terminal-line__time">
                    [{formatTime(entry.timestamp)}]
                  </span>
                  <span className="terminal-line__text">{entry.message}</span>
                </div>
              ))}
              <div ref={bottomRef} aria-hidden="true" />
            </>
          )}
        </div>

        <form className="terminal__input-row" onSubmit={handleSubmit}>
          <span className="terminal__prompt">$</span>
          <input
            className="terminal__input"
            value={input}
            placeholder={disabled ? '服务器未运行' : '输入命令并回车发送'}
            disabled={disabled}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button type="submit" className="btn btn-ghost" disabled={disabled}>
            发送
          </button>
        </form>
      </div>
    </section>
  )
}
