import type { ServerStatusDto } from '../types/terraria'
import { isBusyStatus } from '../utils/format'

interface ControlPanelProps {
  status: ServerStatusDto
  hasWorlds: boolean
  loading: string | null
  onStartAll: () => void
  onStopAll: () => void
  onRestartAll: () => void
  onCreateClick: () => void
}

export function ControlPanel({
  status,
  hasWorlds,
  loading,
  onStartAll,
  onStopAll,
  onRestartAll,
  onCreateClick,
}: ControlPanelProps) {
  const busy = isBusyStatus(status.status) || loading !== null
  const hasRunning = status.runningCount > 0
  const hasStoppedInstances = status.totalInstances > status.runningCount

  return (
    <section className="ops-section control-panel">
      <div className="panel__header">
        <h3>批量控制</h3>
        <p>
          对已注册的 {status.totalInstances} 个世界实例统一启停（日常请优先在世界卡片上操作）
        </p>
      </div>

      <div className="control-panel__actions">
        {status.installed && !hasWorlds ? (
          <button
            type="button"
            className="btn btn-success"
            disabled={busy}
            onClick={onCreateClick}
          >
            {loading === 'createWorld' ? '创建中...' : '创建世界'}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-success"
              disabled={busy || !hasWorlds || !hasStoppedInstances}
              onClick={onStartAll}
            >
              {loading === 'startAll' ? '启动中...' : '全部启动'}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy || !hasRunning}
              onClick={onStopAll}
            >
              {loading === 'stopAll' ? '停止中...' : '全部停止'}
            </button>
            <button
              type="button"
              className="btn btn-warning"
              disabled={busy || !hasWorlds || status.totalInstances === 0}
              onClick={onRestartAll}
            >
              {loading === 'restartAll' ? '重启中...' : '全部重启'}
            </button>
          </>
        )}
      </div>

      {!status.installed && (
        <p className="control-panel__hint">
          服务器尚未安装，请先完成下方安装后再批量控制。
        </p>
      )}

      {status.installed && !hasWorlds && (
        <p className="control-panel__hint">
          尚未检测到世界文件，请先创建世界。
        </p>
      )}

      {status.installed && hasWorlds && status.totalInstances === 0 && (
        <p className="control-panel__hint">
          可从世界列表单独启动，或使用「全部启动」。
        </p>
      )}
    </section>
  )
}
