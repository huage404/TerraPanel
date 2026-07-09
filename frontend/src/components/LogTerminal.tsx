import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  filterServerCommands,
  getSlashQuery,
  type ServerCommand,
} from '../data/serverCommands'
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

function normalizeOutgoingCommand(raw: string): string {
  const trimmed = raw.trim()
  return trimmed.startsWith('/') ? trimmed.slice(1).trim() : trimmed
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const autoScrollingRef = useRef(false)
  const selectedInstanceIdRef = useRef(selectedInstanceId)

  const disabled = selectedInstance?.status !== 'running'

  const slashQuery = getSlashQuery(input)
  const suggestions = useMemo(
    () => (slashQuery === null ? [] : filterServerCommands(slashQuery)),
    [slashQuery],
  )
  const showMenu = menuOpen && !disabled && selectedInstanceId && suggestions.length > 0

  useLayoutEffect(() => {
    const switched = selectedInstanceIdRef.current !== selectedInstanceId
    selectedInstanceIdRef.current = selectedInstanceId

    if (switched) {
      stickToBottomRef.current = true
    }

    if (!stickToBottomRef.current) return

    const el = viewportRef.current
    if (!el) return

    autoScrollingRef.current = true
    el.scrollTop = el.scrollHeight
    requestAnimationFrame(() => {
      autoScrollingRef.current = false
    })
  }, [logs, selectedInstanceId])

  useEffect(() => {
    setActiveIndex(0)
  }, [slashQuery])

  useEffect(() => {
    if (!showMenu) return
    const option = menuRef.current?.querySelector<HTMLElement>(
      `[data-command-index="${activeIndex}"]`,
    )
    option?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, showMenu])

  const handleScroll = () => {
    if (autoScrollingRef.current) return

    const el = viewportRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distance < 48
  }

  const applyCommand = (command: ServerCommand, autoSend = false) => {
    const needsArgs = command.insert.endsWith(' ')
    if (autoSend && !needsArgs) {
      onSendCommand(command.insert.trim())
      setInput('')
      setMenuOpen(false)
      setActiveIndex(0)
      return
    }

    setInput(command.insert)
    setMenuOpen(false)
    setActiveIndex(0)
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      const cursor = command.insert.length
      el.setSelectionRange(cursor, cursor)
    })
  }

  const submit = () => {
    const command = normalizeOutgoingCommand(input)
    if (!command || disabled) return
    onSendCommand(command)
    setInput('')
    setMenuOpen(false)
    setActiveIndex(0)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (showMenu) {
      const selected = suggestions[activeIndex]
      if (selected) {
        applyCommand(selected, true)
        return
      }
    }
    submit()
  }

  const handleChange = (value: string) => {
    setInput(value)
    setMenuOpen(getSlashQuery(value) !== null)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (showMenu) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((index) => (index + 1) % suggestions.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex(
          (index) => (index - 1 + suggestions.length) % suggestions.length,
        )
        return
      }
      if (event.key === 'Tab') {
        event.preventDefault()
        const selected = suggestions[activeIndex]
        if (selected) applyCommand(selected)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        return
      }
    }

    if (event.key === 'Enter' && !showMenu) {
      event.preventDefault()
      submit()
    }
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
            logs.map((entry) => (
              <div key={entry.id} className={`terminal-line ${streamClass(entry.stream)}`}>
                <span className="terminal-line__time">
                  [{formatTime(entry.timestamp)}]
                </span>
                <span className="terminal-line__text">{entry.message}</span>
              </div>
            ))
          )}
        </div>

        <form className="terminal__input-row" onSubmit={handleSubmit}>
          {showMenu && (
            <div
              ref={menuRef}
              className="command-menu"
              role="listbox"
              aria-label="服务器命令"
            >
              {suggestions.map((command, index) => (
                <button
                  key={command.name + command.usage}
                  type="button"
                  role="option"
                  data-command-index={index}
                  aria-selected={index === activeIndex}
                  className={`command-menu__item${index === activeIndex ? ' command-menu__item--active' : ''}`}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    applyCommand(command)
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span className="command-menu__usage">/{command.usage}</span>
                  <span className="command-menu__desc">{command.description}</span>
                </button>
              ))}
            </div>
          )}

          <span className="terminal__prompt">$</span>
          <input
            ref={inputRef}
            className="terminal__input"
            value={input}
            placeholder={
              !selectedInstanceId
                ? '请先选择实例'
                : disabled
                  ? '实例未运行'
                  : '输入 / 查看命令，回车发送'
            }
            disabled={disabled || !selectedInstanceId}
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-expanded={Boolean(showMenu)}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Delay so option mousedown can apply first.
              window.setTimeout(() => setMenuOpen(false), 120)
            }}
            onFocus={() => {
              if (getSlashQuery(input) !== null) setMenuOpen(true)
            }}
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
