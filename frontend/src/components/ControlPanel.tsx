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
    <section className="panel control-panel">
      <div className="panel__header">
        <h2>批量控制</h2>
        <p>
          已注册 {status.totalInstances} 个实例，{status.runningCount} 个运行中
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
          服务器尚未安装，请先使用下方「一键安装」完成部署。
        </p>
      )}

      {status.installed && !hasWorlds && (
        <p className="control-panel__hint">
          尚未检测到世界文件，请先创建世界后再启动服务器。
        </p>
      )}

      {status.installed && hasWorlds && status.totalInstances === 0 && (
        <p className="control-panel__hint">
          从世界列表单独启动实例，或使用「全部启动」批量运行。
        </p>
      )}
    </section>
  )
}
