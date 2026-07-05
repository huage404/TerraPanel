import { ControlPanel } from './components/ControlPanel'
import { InstallPanel } from './components/InstallPanel'
import { LogTerminal } from './components/LogTerminal'
import { StatusCards } from './components/StatusCards'
import { useTerrariaPanel } from './hooks/useTerrariaPanel'
import './App.css'

function App() {
  const {
    status,
    logs,
    installProgress,
    connected,
    actionLoading,
    error,
    start,
    stop,
    restart,
    install,
    sendCommand,
    clearError,
  } = useTerrariaPanel()

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="app-header__eyebrow">Terraria Server Manager</p>
          <h1>TerraPanel</h1>
          <p className="app-header__subtitle">泰拉瑞亚服务器 Web 管理面板</p>
        </div>
        <div className="app-header__status">
          <span className={connected ? 'dot dot--online' : 'dot dot--offline'} />
          {connected ? 'WebSocket 已连接' : 'WebSocket 未连接'}
        </div>
      </header>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button type="button" className="alert__close" onClick={clearError}>
            ×
          </button>
        </div>
      )}

      <main className="app-main">
        <StatusCards status={status} connected={connected} />

        <div className="dashboard-grid">
          <ControlPanel
            status={status}
            loading={actionLoading}
            onStart={start}
            onStop={stop}
            onRestart={restart}
          />
          <InstallPanel
            installed={status.installed}
            progress={installProgress}
            loading={actionLoading}
            onInstall={install}
          />
        </div>

        <LogTerminal
          logs={logs}
          disabled={status.status !== 'running'}
          onSendCommand={sendCommand}
        />
      </main>
    </div>
  )
}

export default App
