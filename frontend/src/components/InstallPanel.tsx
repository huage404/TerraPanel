import type { InstallProgressDto } from '../types/terraria'

interface InstallPanelProps {
  installed: boolean
  progress: InstallProgressDto
  loading: string | null
  onInstall: () => void
}

const PHASE_LABELS: Record<InstallProgressDto['phase'], string> = {
  idle: '待命',
  downloading: '下载中',
  extracting: '解压中',
  chmod: '赋权中',
  completed: '已完成',
  failed: '失败',
}

export function InstallPanel({
  installed,
  progress,
  loading,
  onInstall,
}: InstallPanelProps) {
  const installing =
    loading === 'install' ||
    (progress.phase !== 'idle' &&
      progress.phase !== 'completed' &&
      progress.phase !== 'failed')

  const showProgress =
    progress.phase !== 'idle' || loading === 'install'

  return (
    <section className="panel install-panel">
      <div className="panel__header">
        <h2>一键安装</h2>
        <p>下载 Terraria 专用服务器压缩包并自动解压、赋权</p>
      </div>

      <div className="install-panel__body">
        <button
          type="button"
          className="btn btn-primary"
          disabled={installing}
          onClick={onInstall}
        >
          {installing ? '安装进行中...' : installed ? '重新安装' : '开始安装'}
        </button>

        {showProgress && (
          <div className="install-panel__progress">
            <div className="install-panel__progress-meta">
              <span>{PHASE_LABELS[progress.phase]}</span>
              <span>{progress.progress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-bar__fill ${
                  progress.phase === 'failed' ? 'progress-bar__fill--error' : ''
                }`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <p className="install-panel__message">{progress.message}</p>
            {progress.error && (
              <p className="install-panel__error">{progress.error}</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
