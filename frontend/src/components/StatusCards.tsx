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
      label: '整体状态',
      value: getStatusLabel(status.status),
      badge: STATUS_CLASS[status.status],
    },
    {
      label: '运行中的世界',
      value: `${status.runningCount} / ${status.totalInstances}`,
    },
    {
      label: '在线玩家',
      value: String(status.totalPlayerCount),
    },
    {
      label: '最长运行时长',
      value: formatUptime(status.uptimeSeconds),
    },
    {
      label: '服务器程序',
      value: status.installed ? '已就绪' : '未安装',
      badge: status.installed ? 'badge-running' : 'badge-stopped',
    },
    {
      label: '面板连接',
      value: connected ? '实时同步中' : '已断开',
      badge: connected ? 'badge-running' : 'badge-stopped',
    },
  ]

  return (
    <section className="status-grid" aria-label="运行概览">
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
