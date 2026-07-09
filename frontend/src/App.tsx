import { ControlPanel } from './components/ControlPanel'
import { CreateWorldModal } from './components/CreateWorldModal'
import { InstallPanel } from './components/InstallPanel'
import { LogTerminal } from './components/LogTerminal'
import { StatusCards } from './components/StatusCards'
import { WorldPanel } from './components/WorldPanel'
import { useTerrariaPanel } from './hooks/useTerrariaPanel'
import './App.css'

function App() {
  const {
    status,
    instances,
    selectedInstanceId,
    selectedInstance,
    logs,
    installProgress,
    worlds,
    worldsLoading,
    createModalOpen,
    connected,
    actionLoading,
    error,
    startAll,
    stopAll,
    restartAll,
    install,
    createWorld,
    startWorld,
    stopWorld,
    restartWorld,
    exportWorld,
    deleteWorld,
    selectInstance,
    openCreateModal,
    closeCreateModal,
    sendCommand,
    clearError,
  } = useTerrariaPanel()

  const hasWorlds = worlds.length > 0

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <img className="app-header__mark" src="/favicon.svg" alt="" width={48} height={48} />
          <div>
            <p className="app-header__eyebrow">Terraria Server Manager</p>
            <h1>TerraPanel</h1>
            <p className="app-header__subtitle">泰拉瑞亚多世界服务器 Web 管理面板</p>
          </div>
        </div>
        <div className="app-header__status">
          <span className={connected ? 'dot dot--online' : 'dot dot--offline'} />
          {connected ? 'WebSocket 已连接' : 'WebSocket 未连接'}
        </div>
      </header>
      <div className="grass-divider" aria-hidden="true" />

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

        <WorldPanel
          installed={status.installed}
          worlds={worlds}
          loading={worldsLoading}
          actionLoading={actionLoading}
          onCreateClick={openCreateModal}
          onStartWorld={startWorld}
          onStopWorld={stopWorld}
          onRestartWorld={restartWorld}
          onExportWorld={exportWorld}
          onDeleteWorld={deleteWorld}
        />

        <details className="ops-drawer panel" open={!status.installed}>
          <summary className="ops-drawer__summary">
            <span className="ops-drawer__title">运维工具</span>
            <span className="ops-drawer__hint">
              {status.installed
                ? '批量启停、重新安装等低频操作'
                : '请先安装服务器程序'}
            </span>
          </summary>
          <div className="ops-drawer__body dashboard-grid">
            <ControlPanel
              status={status}
              hasWorlds={hasWorlds}
              loading={actionLoading}
              onStartAll={startAll}
              onStopAll={stopAll}
              onRestartAll={restartAll}
              onCreateClick={openCreateModal}
            />
            <InstallPanel
              installed={status.installed}
              progress={installProgress}
              loading={actionLoading}
              onInstall={install}
            />
          </div>
        </details>

        <LogTerminal
          instances={instances}
          selectedInstanceId={selectedInstanceId}
          selectedInstance={selectedInstance}
          logs={logs}
          onSelectInstance={selectInstance}
          onSendCommand={sendCommand}
        />
      </main>

      <CreateWorldModal
        open={createModalOpen}
        loading={actionLoading === 'createWorld'}
        onClose={closeCreateModal}
        onSubmit={createWorld}
      />
    </div>
  )
}

export default App
