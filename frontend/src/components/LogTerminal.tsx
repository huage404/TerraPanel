import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import type { InstanceStatusDto, LogEntry } from '../types/terraria'
import { formatTime, getStatusLabel } from '../utils/format'

interface LogTerminalProps {
  instances: InstanceStatusDto[]
  selectedInstanceId: string | null
  selectedInstance: InstanceStatusDto | null
  logs: LogEntry[]
  onSelectInstance: (instanceId: string) => void
  onSendCommand: (command: string) => void
}

function streamClass(stream: LogEntry['stream']): string {
  if (stream === 'stderr') return 'terminal-line--stderr'
  if (stream === 'system') return 'terminal-line--system'
  return 'terminal-line--stdout'
}

export function LogTerminal({
  instances,
  selectedInstanceId,
  selectedInstance,
  logs,
  onSelectInstance,
  onSendCommand,
}: LogTerminalProps) {
  const [input, setInput] = useState('')
  const viewportRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const autoScrollingRef = useRef(false)

  const disabled = selectedInstance?.status !== 'running'

  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return

    autoScrollingRef.current = true
    bottomRef.current?.scrollIntoView({ block: 'end' })
    requestAnimationFrame(() => {
      autoScrollingRef.current = false
    })
  }, [logs, selectedInstanceId])

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
      <div className="panel__header terminal-panel__header">
        <div>
          <h2>实时日志终端</h2>
          <p>
            {selectedInstance
              ? `${selectedInstance.worldName} · 端口 ${selectedInstance.port} · ${getStatusLabel(selectedInstance.status)}`
              : '选择实例以查看日志并发送命令'}
          </p>
        </div>
      </div>

      {instances.length > 0 && (
        <div className="terminal-tabs">
          {instances.map((instance) => (
            <button
              key={instance.id}
              type="button"
              className={`terminal-tab${selectedInstanceId === instance.id ? ' terminal-tab--active' : ''}`}
              onClick={() => onSelectInstance(instance.id)}
            >
              {instance.worldName}
              <span className="terminal-tab__port">端口 {instance.port}</span>
            </button>
          ))}
        </div>
      )}

      <div className="terminal">
        <div
          ref={viewportRef}
          className="terminal__viewport"
          onScroll={handleScroll}
        >
          {!selectedInstanceId ? (
            <div className="terminal__empty">请从上方世界列表或 Tab 选择实例</div>
          ) : logs.length === 0 ? (
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
            placeholder={
              !selectedInstanceId
                ? '请先选择实例'
                : disabled
                  ? '实例未运行'
                  : '输入命令并回车发送'
            }
            disabled={disabled || !selectedInstanceId}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            className="btn btn-ghost"
            disabled={disabled || !selectedInstanceId}
          >
            发送
          </button>
        </form>
      </div>
    </section>
  )
}
