import { useState } from 'react'
import Modal from '../components/Modal'
import { useStore } from '../store/useStore'
import packageInfo from '../../../../package.json'

export default function Settings() {
  const theme = useStore((state) => state.theme)
  const setTheme = useStore((state) => state.setTheme)
  const updateStatus = useStore((state) => state.updateStatus)
  const updateInfo = useStore((state) => state.updateInfo)
  const updateError = useStore((state) => state.updateError)
  const updateDownloadProgress = useStore((state) => state.updateDownloadProgress)
  const checkForUpdates = useStore((state) => state.checkForUpdates)
  const installUpdate = useStore((state) => state.installUpdate)

  const [activeTab, setActiveTab] = useState('info') // 'info' | 'backup' | 'logs' | 'preferences'
  const [logs, setLogs] = useState([])
  const [logFilter, setLogFilter] = useState('all') // 'all' | 'error' | 'warning' | 'info'
  const [actionLoading, setActionLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)

  // Confirm Modals State
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearConfirmText, setClearConfirmText] = useState('')
  const [showSeedConfirm, setShowSeedConfirm] = useState(false)
  const [copiedLogs, setCopiedLogs] = useState(false)

  const fetchLogs = async () => {
    try {
      const systemLogs = await window.api.getLogs()
      setLogs((systemLogs || []).reverse())
    } catch (err) {
      console.error('Errore durante il caricamento dei log:', err)
    }
  }


  const handleBackup = async () => {
    setActionLoading(true)
    setStatusMessage(null)
    try {
      const result = await window.api.backupDatabase()
      if (result.success) {
        setStatusMessage({ type: 'success', text: 'Backup del database esportato con successo!' })
      } else {
        setStatusMessage({ type: 'error', text: `Esportazione fallita: ${result.error}` })
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Errore: ${err.message}` })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRestore = async () => {
    setShowRestoreConfirm(false)
    setActionLoading(true)
    setStatusMessage(null)
    try {
      const result = await window.api.restoreDatabase()
      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: "Database ripristinato con successo! Riavvio dell'applicazione in corso..."
        })
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setStatusMessage({ type: 'error', text: `Ripristino fallito: ${result.error}` })
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Errore: ${err.message}` })
    } finally {
      setActionLoading(false)
    }
  }

  const handleClear = async () => {
    if (clearConfirmText !== 'CANCELLA') return
    setShowClearConfirm(false)
    setClearConfirmText('')
    setActionLoading(true)
    setStatusMessage(null)
    try {
      const result = await window.api.clearDatabase()
      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: 'Tutti i dati sono stati cancellati con successo! Riavvio in corso...'
        })
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setStatusMessage({ type: 'error', text: `Cancellazione fallita: ${result.error}` })
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Errore: ${err.message}` })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSeed = async () => {
    setShowSeedConfirm(false)
    setActionLoading(true)
    setStatusMessage(null)
    try {
      const result = await window.api.seedDatabase()
      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: 'Dati demo caricati con successo! Riavvio in corso...'
        })
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setStatusMessage({ type: 'error', text: `Caricamento fallito: ${result.error}` })
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Errore: ${err.message}` })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCopyLogs = () => {
    if (logs.length === 0) return
    const text = logs
      .map((l) => `[${formatDate(l.timestamp)}] [${l.level?.toUpperCase()}] [${l.context}] ${l.message}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    setCopiedLogs(true)
    setTimeout(() => setCopiedLogs(false), 2000)
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('it-IT')
  }

  // Filtra log in base al livello selezionato
  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'all') return true
    return l.level === logFilter
  })

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden select-none font-sans">
      {/* 1. Workstation Top Toolbar */}
      <div className="h-10 bg-slate-50/70 border-b border-apple-border px-4 flex items-center justify-between text-[13px] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-apple-secondary font-medium">
            <span className="material-symbols-outlined text-[16px] text-apple-accent">settings</span>
            <span className="text-apple-text font-semibold">Impostazioni di Sistema</span>
          </div>
          <div className="h-3.5 w-px bg-apple-border hidden md:block" />
          <span className="text-[12px] text-apple-secondary hidden md:inline">
            Preferenze dell&apos;applicazione, manutenzione database e diagnostica
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono text-apple-secondary bg-slate-100 px-2 py-0.5 rounded border border-apple-border/50">
            v{packageInfo.version}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-apple-green" />
            SQLite Attivo
          </span>
        </div>
      </div>

      {/* 2. macOS System Settings 2-Pane View */}
      <div className="flex-1 grid grid-cols-12 min-h-0 divide-x divide-apple-border bg-[#F9F9FA]">
        {/* Left Submenu Navigation Pane */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3 xl:col-span-3 bg-slate-50/70 p-3 flex flex-col justify-between overflow-y-auto min-h-0">
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-apple-subtle">
              Preferenze BillKeep
            </div>

            {/* TAB: INFO */}
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition cursor-pointer ${
                activeTab === 'info'
                  ? 'bg-white text-apple-text shadow-xs font-semibold border border-apple-border'
                  : 'text-apple-secondary hover:bg-slate-200/60 hover:text-apple-text'
              }`}
            >
              <div className="w-6 h-6 rounded-md bg-blue-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                <span className="material-symbols-outlined text-[15px]">info</span>
              </div>
              <div className="truncate">
                <div className="text-[13px] leading-tight">Info &amp; Licenza</div>
                <div className="text-[11px] text-apple-subtle font-normal truncate">
                  Versione, autore e dettagli
                </div>
              </div>
            </button>

            {/* TAB: BACKUP */}
            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-white text-apple-text shadow-xs font-semibold border border-apple-border'
                  : 'text-apple-secondary hover:bg-slate-200/60 hover:text-apple-text'
              }`}
            >
              <div className="w-6 h-6 rounded-md bg-emerald-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                <span className="material-symbols-outlined text-[15px]">database</span>
              </div>
              <div className="truncate">
                <div className="text-[13px] leading-tight">Database &amp; Backup</div>
                <div className="text-[11px] text-apple-subtle font-normal truncate">
                  Salvataggio, ripristino ed esportazione
                </div>
              </div>
            </button>

            {/* TAB: LOGS */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('logs')
                fetchLogs()
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-white text-apple-text shadow-xs font-semibold border border-apple-border'
                  : 'text-apple-secondary hover:bg-slate-200/60 hover:text-apple-text'
              }`}
            >
              <div className="w-6 h-6 rounded-md bg-amber-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                <span className="material-symbols-outlined text-[15px]">terminal</span>
              </div>
              <div className="truncate">
                <div className="text-[13px] leading-tight">Log &amp; Diagnostica</div>
                <div className="text-[11px] text-apple-subtle font-normal truncate">
                  Registro eventi e anomalie
                </div>
              </div>
            </button>

            {/* TAB: PREFERENCES */}
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition cursor-pointer ${
                activeTab === 'preferences'
                  ? 'bg-white text-apple-text shadow-xs font-semibold border border-apple-border'
                  : 'text-apple-secondary hover:bg-slate-200/60 hover:text-apple-text'
              }`}
            >
              <div className="w-6 h-6 rounded-md bg-indigo-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                <span className="material-symbols-outlined text-[15px]">palette</span>
              </div>
              <div className="truncate">
                <div className="text-[13px] leading-tight">Aspetto &amp; Preferenze</div>
                <div className="text-[11px] text-apple-subtle font-normal truncate">
                  Tema grafico e impostazioni
                </div>
              </div>
            </button>
          </div>

          {/* Developer Card at bottom of sidebar */}
          <div className="p-2.5 rounded-lg bg-white/70 border border-apple-border/70 text-[11px] text-apple-secondary space-y-0.5">
            <div className="font-semibold text-apple-text">BillKeep Accounting</div>
            <div>© {new Date().getFullYear()} Massimo Di Vona</div>
            <div className="text-apple-subtle">Architettura locale Tauri + Rust</div>
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className="col-span-12 md:col-span-8 lg:col-span-9 xl:col-span-9 bg-white overflow-y-auto min-h-0 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Status Feedback Banner */}
            {statusMessage && (
              <div
                className={`p-3 rounded-lg flex items-center justify-between text-[13px] border ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    {statusMessage.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span className="font-medium">{statusMessage.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusMessage(null)}
                  className="text-apple-subtle hover:text-apple-text cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* TAB 1: INFO & LICENZA */}
            {activeTab === 'info' && (
              <div className="space-y-5">
                {/* Hero App Identity */}
                <div className="p-5 rounded-xl border border-apple-border bg-gradient-to-br from-slate-50 to-white shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-apple-accent text-white flex items-center justify-center shadow-md shrink-0">
                    <span className="material-symbols-outlined text-[36px]">
                      account_balance_wallet
                    </span>
                  </div>
                  <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h2 className="text-[20px] font-bold text-apple-text">BillKeep Workstation</h2>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-apple-accent/10 text-apple-accent border border-apple-accent/20 font-semibold">
                        v{packageInfo.version}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50 font-medium">
                        Stabile Locale
                      </span>
                    </div>
                    <p className="text-[13px] text-apple-secondary leading-relaxed">
                      Applicazione desktop per la gestione e tracciamento locale di clienti,
                      fatture contabili, scadenze, incassi e contabilità in partita doppia (Prima
                      Nota).
                    </p>
                  </div>
                </div>

                {/* Sviluppatore e Privacy Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-apple-border bg-slate-50/50 flex flex-col justify-between h-full">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-apple-accent font-semibold text-[13px] mb-1">
                        <span className="material-symbols-outlined text-[17px]">person</span>
                        <span>Sviluppatore Software</span>
                      </div>
                      <div className="text-[15px] font-bold text-apple-text">Massimo Di Vona</div>
                      <p className="text-[12px] text-apple-secondary">
                        © {new Date().getFullYear()} Massimo Di Vona. Tutti i diritti riservati.
                      </p>
                    </div>
                    <p className="text-[11px] text-apple-subtle pt-2 mt-3 border-t border-apple-border/60">
                      Uso esclusivo per la gestione contabile interna e locale.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-apple-border bg-slate-50/50 flex flex-col justify-between h-full">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[13px] mb-1">
                        <span className="material-symbols-outlined text-[17px]">shield</span>
                        <span>Privacy &amp; Sovranità Dati</span>
                      </div>
                      <div className="text-[15px] font-bold text-apple-text">Zero Cloud / 100% Locale</div>
                      <p className="text-[12px] text-apple-secondary">
                        Tutti i dati risiedono unicamente sul database SQLite locale di questo computer.
                      </p>
                    </div>
                    <p className="text-[11px] text-apple-subtle pt-2 mt-3 border-t border-apple-border/60">
                      Nessuna telemetria invasiva o esportazione non autorizzata.
                    </p>
                  </div>
                </div>

                {/* Struttura Tecnica (Tech Stack) */}
                <div className="space-y-2.5">
                  <div className="text-[12px] uppercase font-bold tracking-wider text-apple-subtle flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">widgets</span>
                    <span>Stack Tecnologico &amp; Architettura</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-lg border border-apple-border bg-white flex items-center gap-2.5 shadow-2xs">
                      <span className="material-symbols-outlined text-[22px] text-apple-accent">
                        terminal
                      </span>
                      <div>
                        <div className="text-[10px] text-apple-subtle font-medium uppercase">
                          Runtime
                        </div>
                        <div className="text-[13px] font-semibold text-apple-text">Tauri + Rust</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-apple-border bg-white flex items-center gap-2.5 shadow-2xs">
                      <span className="material-symbols-outlined text-[22px] text-apple-accent">
                        database
                      </span>
                      <div>
                        <div className="text-[10px] text-apple-subtle font-medium uppercase">
                          Database
                        </div>
                        <div className="text-[13px] font-semibold text-apple-text">
                          SQLite (rusqlite)
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-apple-border bg-white flex items-center gap-2.5 shadow-2xs">
                      <span className="material-symbols-outlined text-[22px] text-apple-accent">
                        token
                      </span>
                      <div>
                        <div className="text-[10px] text-apple-subtle font-medium uppercase">
                          Frontend
                        </div>
                        <div className="text-[13px] font-semibold text-apple-text">React + Vite</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-apple-border bg-white flex items-center gap-2.5 shadow-2xs">
                      <span className="material-symbols-outlined text-[22px] text-apple-accent">
                        css
                      </span>
                      <div>
                        <div className="text-[10px] text-apple-subtle font-medium uppercase">
                          Design System
                        </div>
                        <div className="text-[13px] font-semibold text-apple-text">
                          Apple Style (Tailwind)
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-apple-border bg-white flex items-center gap-2.5 shadow-2xs">
                      <span className="material-symbols-outlined text-[22px] text-apple-accent">
                        account_tree
                      </span>
                      <div>
                        <div className="text-[10px] text-apple-subtle font-medium uppercase">
                          Stato Globale
                        </div>
                        <div className="text-[13px] font-semibold text-apple-text">Zustand Store</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-apple-border bg-white flex items-center gap-2.5 shadow-2xs">
                      <span className="material-symbols-outlined text-[22px] text-apple-accent">
                        security
                      </span>
                      <div>
                        <div className="text-[10px] text-apple-subtle font-medium uppercase">
                          Sicurezza
                        </div>
                        <div className="text-[13px] font-semibold text-apple-text">IPC Isolated Bridge</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DATABASE & BACKUP */}
            {activeTab === 'backup' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-[16px] font-bold text-apple-text">
                    Gestione Dati &amp; Copie di Sicurezza
                  </h3>
                  <p className="text-[13px] text-apple-secondary mt-0.5">
                    Esporta copie di sicurezza, ripristina salvataggi o gestisci la manutenzione
                    dell&apos;archivio locale SQLite.
                  </p>
                </div>

                {/* 4 Action Cards in Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Export Card */}
                  <div className="p-4 rounded-xl border border-apple-border bg-white shadow-2xs flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-apple-accent font-semibold text-[13px]">
                        <span className="material-symbols-outlined text-[20px]">upload_file</span>
                        <span>Esporta Backup</span>
                      </div>
                      <p className="text-[12px] text-apple-secondary leading-relaxed">
                        Salva una copia completa e coerente del database SQLite locale (.db) sul tuo
                        computer.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleBackup}
                      className="w-full h-8 bg-apple-accent hover:bg-apple-accent-hover text-white text-[12px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <span className="material-symbols-outlined text-[15px] animate-spin">
                          progress_activity
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">save</span>
                      )}
                      <span>Salva Backup Database</span>
                    </button>
                  </div>

                  {/* Restore Card */}
                  <div className="p-4 rounded-xl border border-apple-border bg-white shadow-2xs flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-700 font-semibold text-[13px]">
                        <span className="material-symbols-outlined text-[20px]">restore_page</span>
                        <span>Ripristina Backup</span>
                      </div>
                      <p className="text-[12px] text-apple-secondary leading-relaxed">
                        Seleziona un file `.db` salvato in precedenza per allineare e ripristinare
                        l&apos;archivio dati.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setShowRestoreConfirm(true)}
                      className="w-full h-8 bg-white border border-apple-border hover:bg-slate-50 text-apple-text text-[12px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px] text-amber-600">
                        restore
                      </span>
                      <span>Ripristina da File...</span>
                    </button>
                  </div>

                  {/* Seed Demo Data Card */}
                  <div className="p-4 rounded-xl border border-apple-border bg-white shadow-2xs flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-indigo-700 font-semibold text-[13px]">
                        <span className="material-symbols-outlined text-[20px]">science</span>
                        <span>Carica Dati Demo</span>
                      </div>
                      <p className="text-[12px] text-apple-secondary leading-relaxed">
                        Popola l&apos;applicazione con registrazioni fittizie di clienti, fatture e
                        pagamenti per collaudo.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setShowSeedConfirm(true)}
                      className="w-full h-8 bg-white border border-apple-border hover:bg-slate-50 text-apple-text text-[12px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px] text-indigo-600">
                        extension
                      </span>
                      <span>Carica Dati di Prova...</span>
                    </button>
                  </div>

                  {/* Clear Database Card */}
                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 shadow-2xs flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-rose-700 font-semibold text-[13px]">
                        <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
                        <span>Azzera Database</span>
                      </div>
                      <p className="text-[12px] text-rose-700/80 leading-relaxed">
                        Elimina permanentemente tutte le registrazioni per ripartire con
                        un&apos;applicazione vergine.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setShowClearConfirm(true)}
                      className="w-full h-8 bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                      <span>Ripulisci Tutti i Dati...</span>
                    </button>
                  </div>
                </div>

                {/* Safety Notice */}
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[12px] flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0 mt-0.5">
                    warning
                  </span>
                  <div className="leading-snug">
                    <span className="font-semibold">Sicurezza dei dati contabili:</span> Si consiglia
                    di eseguire regolarmente un backup prima di operazioni di ripristino o
                    pulizia. Le cancellazioni irreversibili non sono recuperabili senza backup.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: LOG & DIAGNOSTICA */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[16px] font-bold text-apple-text">
                      Registro Eventi e Diagnostica
                    </h3>
                    <p className="text-[13px] text-apple-secondary mt-0.5">
                      Visualizza lo storico cronologico di sistema, operazioni di database ed
                      eventuali errori.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLogs}
                      className="h-7 px-2.5 bg-white border border-apple-border hover:bg-slate-50 text-apple-text text-[12px] font-medium rounded flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedLogs ? 'done' : 'content_copy'}
                      </span>
                      <span>{copiedLogs ? 'Copiati!' : 'Copia'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={fetchLogs}
                      className="h-7 px-2.5 bg-white border border-apple-border hover:bg-slate-50 text-apple-text text-[12px] font-medium rounded flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      <span>Aggiorna</span>
                    </button>
                  </div>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded text-[11px] font-medium w-fit">
                  {[
                    { id: 'all', label: `Tutti (${logs.length})` },
                    { id: 'error', label: `Errori (${logs.filter((l) => l.level === 'error').length})` },
                    {
                      id: 'warning',
                      label: `Avvisi (${logs.filter((l) => l.level === 'warning').length})`
                    },
                    { id: 'info', label: `Info (${logs.filter((l) => l.level === 'info').length})` }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setLogFilter(f.id)}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${
                        logFilter === f.id
                          ? 'bg-white text-apple-text shadow-xs font-semibold'
                          : 'text-apple-secondary hover:text-apple-text'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* macOS Console Style Log Box */}
                <div className="rounded-xl border border-slate-800 bg-slate-900 text-slate-100 font-mono text-[12px] h-[460px] flex flex-col overflow-hidden shadow-inner">
                  <div className="h-8 bg-slate-950/80 px-3 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 select-none">
                    <span>Console di Sistema (SQLite &amp; Rust IPC)</span>
                    <span>{filteredLogs.length} eventi visualizzati</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {filteredLogs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 font-sans text-[13px]">
                        <span className="material-symbols-outlined text-[28px] mb-1">
                          check_circle
                        </span>
                        <span>Nessun log registrato per questa categoria.</span>
                      </div>
                    ) : (
                      filteredLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-1.5 rounded hover:bg-slate-800/60 transition"
                        >
                          <span className="text-slate-500 shrink-0 select-none text-[11px]">
                            {formatDate(log.timestamp)}
                          </span>

                          <span
                            className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold uppercase shrink-0 ${
                              log.level === 'error'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : log.level === 'warning'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {log.level}
                          </span>

                          {log.context && (
                            <span className="text-emerald-400 shrink-0 select-none text-[11px]">
                              [{log.context}]
                            </span>
                          )}

                          <span className="text-slate-200 font-sans text-[12px] break-all">
                            {log.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ASPETTO & PREFERENZE */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[16px] font-bold text-apple-text">
                    Aspetto &amp; Preferenze Visive
                  </h3>
                  <p className="text-[13px] text-apple-secondary mt-0.5">
                    Personalizza l&apos;esperienza visiva della workstation e le opzioni
                    predefinite di compilazione contabile.
                  </p>
                </div>

                {/* Theme Selector Cards */}
                <div className="space-y-3">
                  <label className="block text-[12px] uppercase font-bold tracking-wider text-apple-subtle">
                    Tema dell&apos;Interfaccia
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Light Mode */}
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                        theme === 'light'
                          ? 'border-apple-accent bg-blue-50/40 ring-2 ring-apple-accent shadow-xs'
                          : 'border-apple-border bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-3">
                        <span className="material-symbols-outlined text-[24px] text-amber-500">
                          light_mode
                        </span>
                        {theme === 'light' && (
                          <span className="material-symbols-outlined text-[18px] text-apple-accent">
                            check_circle
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-apple-text">Tema Chiaro</div>
                        <div className="text-[11px] text-apple-secondary mt-0.5">
                          Tonalità calde, leggibilità ottimale per ambienti illuminati.
                        </div>
                      </div>
                    </button>

                    {/* Dark Mode */}
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                        theme === 'dark'
                          ? 'border-apple-accent bg-blue-50/40 ring-2 ring-apple-accent shadow-xs'
                          : 'border-apple-border bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-3">
                        <span className="material-symbols-outlined text-[24px] text-indigo-500">
                          dark_mode
                        </span>
                        {theme === 'dark' && (
                          <span className="material-symbols-outlined text-[18px] text-apple-accent">
                            check_circle
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-apple-text">Tema Oscuro</div>
                        <div className="text-[11px] text-apple-secondary mt-0.5">
                          Tonalità scure riposanti per minore affaticamento visivo.
                        </div>
                      </div>
                    </button>

                    {/* Minimal Mode */}
                    <button
                      type="button"
                      onClick={() => setTheme('minimal')}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                        theme === 'minimal'
                          ? 'border-apple-accent bg-blue-50/40 ring-2 ring-apple-accent shadow-xs'
                          : 'border-apple-border bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-3">
                        <span className="material-symbols-outlined text-[24px] text-slate-700">
                          contrast
                        </span>
                        {theme === 'minimal' && (
                          <span className="material-symbols-outlined text-[18px] text-apple-accent">
                            check_circle
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-apple-text">Tema Minimal</div>
                        <div className="text-[11px] text-apple-secondary mt-0.5">
                          Bianco e nero essenziale ad alto contrasto per massima nitidezza.
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Default Accounting Preferences */}
                <div className="space-y-3 pt-2">
                  <label className="block text-[12px] uppercase font-bold tracking-wider text-apple-subtle">
                    Parametri Contabili Predefiniti
                  </label>

                  <div className="rounded-xl border border-apple-border bg-white divide-y divide-apple-border/60 shadow-2xs">
                    <div className="p-3.5 flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-semibold text-apple-text">
                          Valuta Operativa
                        </div>
                        <div className="text-[11px] text-apple-secondary">
                          Tutti i conteggi e le transazioni sono espresse in valuta europea.
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-slate-100 rounded border border-apple-border text-[12px] font-mono font-medium text-apple-text">
                        Euro (€ - EUR)
                      </span>
                    </div>

                    <div className="p-3.5 flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-semibold text-apple-text">
                          Scadenza Predefinita Documenti
                        </div>
                        <div className="text-[11px] text-apple-secondary">
                          Intervallo automatico proposto alla registrazione di una nuova fattura.
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-slate-100 rounded border border-apple-border text-[12px] font-medium text-apple-text">
                        +30 Giorni Data Fattura
                      </span>
                    </div>

                    <div className="p-3.5 flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-semibold text-apple-text">
                          Modalità Tracciamento SDI
                        </div>
                        <div className="text-[11px] text-apple-secondary">
                          Registrazione interna senza interscambio telematico esterno.
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded text-[11px] font-semibold">
                        Gestione Interna Locale
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aggiornamenti Applicazione */}
                <div className="space-y-3 pt-2">
                  <label className="block text-[12px] uppercase font-bold tracking-wider text-apple-subtle">
                    Aggiornamenti
                  </label>

                  <div className="rounded-xl border border-apple-border bg-white p-3.5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-semibold text-apple-text">
                          Versione Installata
                        </div>
                        <div className="text-[11px] text-apple-secondary">
                          Controllo automatico eseguito all&apos;avvio dell&apos;app.
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-slate-100 rounded border border-apple-border text-[12px] font-mono font-medium text-apple-text">
                        v{packageInfo.version}
                      </span>
                    </div>

                    {updateStatus === 'up-to-date' && (
                      <div className="flex items-center gap-1.5 text-[12px] text-emerald-700 font-medium">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Stai usando l&apos;ultima versione disponibile.
                      </div>
                    )}

                    {updateStatus === 'error' && (
                      <div className="flex items-center gap-1.5 text-[12px] text-rose-600 font-medium">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        {'Controllo fallito: '}
                        {updateError || 'riprova più tardi.'}
                      </div>
                    )}

                    {updateStatus === 'available' && updateInfo && (
                      <div className="p-2.5 bg-sky-50 border border-sky-200/60 rounded-lg space-y-2">
                        <p className="text-[12px] text-apple-text">
                          È disponibile la versione{' '}
                          <strong className="text-apple-accent">{updateInfo.version}</strong>.
                        </p>
                        <button
                          type="button"
                          onClick={installUpdate}
                          className="h-7 px-3 bg-apple-accent hover:bg-apple-accent-hover text-white text-[12px] font-medium rounded cursor-pointer"
                        >
                          Installa ora
                        </button>
                      </div>
                    )}

                    {(updateStatus === 'downloading' || updateStatus === 'installing') && (
                      <div className="space-y-1.5">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-apple-accent h-1.5 transition-all"
                            style={{ width: `${updateDownloadProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-[11px] text-apple-secondary">
                          {updateStatus === 'installing'
                            ? 'Installazione in corso, riavvio imminente...'
                            : `Download in corso... ${updateDownloadProgress}%`}
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                      onClick={checkForUpdates}
                      className="h-7 px-3 rounded-md bg-white border border-apple-border hover:bg-slate-50 text-[12px] font-medium text-apple-secondary transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {updateStatus === 'checking' ? (
                        <span className="material-symbols-outlined text-[14px] animate-spin">
                          progress_activity
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-[14px]">refresh</span>
                      )}
                      Controlla aggiornamenti
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: CONFERMA RIPRISTINO DATABASE */}
      <Modal
        isOpen={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        title="Ripristina Backup Database"
      >
        <div className="space-y-3">
          <p className="text-[13px] text-apple-text">
            Sei sicuro di voler ripristinare il database da un file salvato in precedenza?
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[12px] space-y-1">
            <div className="font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-amber-600">warning</span>
              <span>Azione sovrascrittiva irreversibile:</span>
            </div>
            <p>
              I dati attuali verranno sostituiti integralmente con quelli presenti nel backup
              selezionato. L&apos;applicazione si riavvierà automaticamente al termine del
              ripristino.
            </p>
          </div>

          <div className="pt-3 border-t border-apple-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRestoreConfirm(false)}
              className="h-8 px-3 rounded-md bg-white border border-apple-border text-apple-secondary text-[12px] hover:bg-slate-50 cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleRestore}
              className="h-8 px-4 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-semibold cursor-pointer shadow-xs"
            >
              Conferma e Ripristina
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CONFERMA CANCELLAZIONE TOTALE (DOPPIA SICUREZZA CANCELLA) */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => {
          setShowClearConfirm(false)
          setClearConfirmText('')
        }}
        title="Ripulitura Completa Database"
      >
        <div className="space-y-3">
          <p className="text-[13px] text-apple-text">
            Questa operazione eliminerà permanentemente tutti i dati (clienti, fatture, pagamenti e
            prima nota). Per sbloccare la conferma, digita la parola{' '}
            <strong className="text-rose-600 font-mono">CANCELLA</strong> nel campo qui sotto:
          </p>

          <input
            type="text"
            value={clearConfirmText}
            onChange={(e) => setClearConfirmText(e.target.value)}
            placeholder="Scrivi CANCELLA"
            className="w-full h-9 px-3 bg-white border border-rose-300 rounded-md font-mono text-[13px] text-rose-700 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />

          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[12px] space-y-1">
            <div className="font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>Attenzione: Azione distruttiva</span>
            </div>
            <p>
              Non sarà possibile recuperare le registrazioni una volta azzerate se non si possiede
              un file di backup salvato in precedenza.
            </p>
          </div>

          <div className="pt-3 border-t border-apple-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowClearConfirm(false)
                setClearConfirmText('')
              }}
              className="h-8 px-3 rounded-md bg-white border border-apple-border text-apple-secondary text-[12px] hover:bg-slate-50 cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={clearConfirmText !== 'CANCELLA'}
              onClick={handleClear}
              className="h-8 px-4 rounded-md bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-[12px] font-semibold cursor-pointer shadow-xs"
            >
              Elimina Definitivamente
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CONFERMA DATI DEMO */}
      <Modal
        isOpen={showSeedConfirm}
        onClose={() => setShowSeedConfirm(false)}
        title="Carica Dati Demo di Prova"
      >
        <div className="space-y-3">
          <p className="text-[13px] text-apple-text">
            Vuoi caricare un set dimostrativo completo di clienti, fatture e pagamenti?
          </p>

          <div className="p-3 bg-slate-50 border border-apple-border text-apple-secondary rounded-lg text-[12px] space-y-1">
            <div className="font-semibold text-apple-text flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-apple-accent">info</span>
              <span>Scopo di prova e collaudo:</span>
            </div>
            <p>
              Verranno aggiunti record di prova per consentirti di esplorare grafici, scadenze e
              incassi. L&apos;applicazione si riavvierà al termine dell&apos;operazione.
            </p>
          </div>

          <div className="pt-3 border-t border-apple-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowSeedConfirm(false)}
              className="h-8 px-3 rounded-md bg-white border border-apple-border text-apple-secondary text-[12px] hover:bg-slate-50 cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSeed}
              className="h-8 px-4 rounded-md bg-apple-accent hover:bg-apple-accent-hover text-white text-[12px] font-semibold cursor-pointer shadow-xs"
            >
              Conferma e Popola
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
