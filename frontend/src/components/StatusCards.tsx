import type { ServerStatusDto } from '../types/terraria'
import { formatUptime, getStatusLabel } from '../utils/format'

interface StatusCardsProps {
  status: ServerStatusDto
  connected: boolean
}

const STATUS_CLASS: Record<ServerStatusDto['status'], string> = {
  stopped: 'badge-stopped',
  starting: 'badge-starting',
  running: 'badge-running',
  stopping: 'badge-starting',
  error: 'badge-error',
}

export function StatusCards({ status, connected }: StatusCardsProps) {
  const cards = [
    {
      label: '运行状态',
      value: getStatusLabel(status.status),
      badge: STATUS_CLASS[status.status],
    },
    {
      label: '游戏端口',
      value: String(status.port),
    },
    {
      label: '在线玩家',
      value: `${status.playerCount} / ${status.maxPlayers}`,
    },
    {
      label: '运行时长',
      value: formatUptime(status.uptimeSeconds),
    },
    {
      label: '进程 PID',
      value: status.pid ? String(status.pid) : '-',
    },
    {
      label: '安装状态',
      value: status.installed ? '已安装' : '未安装',
    },
    {
      label: '实时连接',
      value: connected ? '已连接' : '未连接',
      badge: connected ? 'badge-running' : 'badge-stopped',
    },
  ]

  return (
    <section className="status-grid">
      {cards.map((card) => (
        <article key={card.label} className="status-card">
          <span className="status-card__label">{card.label}</span>
          <span
            className={
              card.badge
                ? `status-card__badge ${card.badge}`
                : 'status-card__value'
            }
          >
            {card.value}
          </span>
        </article>
      ))}
    </section>
  )
}
