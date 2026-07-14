import { useState } from 'react'
import Modal from '../components/Modal'
import { useStore } from '../store/useStore'

export default function Settings() {
  const theme = useStore((state) => state.theme)
  const setTheme = useStore((state) => state.setTheme)
  const [activeTab, setActiveTab] = useState('info')
  const [logs, setLogs] = useState([])
  const [actionLoading, setActionLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearConfirmText, setClearConfirmText] = useState('')
  const [showSeedConfirm, setShowSeedConfirm] = useState(false)

  const fetchLogs = async () => {
    try {
      const systemLogs = await window.api.getLogs()
      setLogs(systemLogs.reverse()) // Show newest first
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

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    if (isNaN(d)) return dateStr
    return d.toLocaleString('it-IT')
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Impostazioni</h2>
        <p className="text-on-surface-variant font-body-md text-body-md">
          Gestisci le preferenze dell&apos;applicazione, i backup e visualizza i log di sistema.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Submenu Navigation */}
        <div className="w-full lg:w-64 shrink-0 bg-surface-container-low border border-outline-variant rounded-xl p-sm flex flex-col gap-1.5 h-fit">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-md px-sm py-sm rounded-lg text-left transition-all duration-150 cursor-pointer font-label-md text-label-md ${
              activeTab === 'info'
                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined">info</span>
            Info Applicazione
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-md px-sm py-sm rounded-lg text-left transition-all duration-150 cursor-pointer font-label-md text-label-md ${
              activeTab === 'backup'
                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined">database</span>
            Database & Backup
          </button>

          <button
            onClick={() => {
              setActiveTab('logs')
              fetchLogs()
            }}
            className={`flex items-center gap-md px-sm py-sm rounded-lg text-left transition-all duration-150 cursor-pointer font-label-md text-label-md ${
              activeTab === 'logs'
                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined">description</span>
            Log di Sistema
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-md px-sm py-sm rounded-lg text-left transition-all duration-150 cursor-pointer font-label-md text-label-md ${
              activeTab === 'preferences'
                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined">tune</span>
            Preferenze Generali
          </button>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl p-lg shadow-sm">
          {/* TAB: INFO */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* App Identity Card */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-outline-variant">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-on-primary shadow-md shrink-0">
                  <span className="material-symbols-outlined text-[48px]">
                    account_balance_wallet
                  </span>
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <h3 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                    BillKeep
                  </h3>
                  <p className="text-body-md text-on-surface-variant">
                    Applicazione desktop locale per la gestione di fatture, pagamenti e contabilità
                    in partita doppia.
                  </p>
                  <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      Versione 1.1.1
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container">
                      Stato: Stabile
                    </span>
                  </div>
                </div>
              </div>

              {/* Developer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-container p-md border border-outline-variant/60 rounded-xl space-y-2">
                  <h4 className="font-label-md text-label-md font-semibold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                    Sviluppatore
                  </h4>
                  <p className="font-headline-sm text-headline-sm text-on-surface font-medium">
                    Massimo Di Vona
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    © 2026 Massimo Di Vona. Tutti i diritti riservati.
                  </p>
                </div>

                <div className="bg-surface-container p-md border border-outline-variant/60 rounded-xl space-y-2">
                  <h4 className="font-label-md text-label-md font-semibold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[20px]">copyright</span>
                    Dettagli Legali & Licenza
                  </h4>
                  <p className="text-body-md text-on-surface">
                    Uso esclusivo e locale per la gestione contabile interna.
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    Tutti i diritti sono riservati all&apos;autore del software.
                  </p>
                </div>
              </div>

              {/* Technical Stack Section */}
              <div className="space-y-3">
                <h4 className="font-label-lg text-label-lg font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[20px]">widgets</span>
                  Struttura Tecnica (Tech Stack)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="border border-outline-variant rounded-lg p-sm bg-surface flex items-center gap-md">
                    <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                      terminal
                    </span>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">
                        Runtime
                      </div>
                      <div className="font-body-md text-body-md font-semibold text-on-surface">
                        Tauri + Rust
                      </div>
                    </div>
                  </div>

                  <div className="border border-outline-variant rounded-lg p-sm bg-surface flex items-center gap-md">
                    <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                      token
                    </span>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">
                        Frontend
                      </div>
                      <div className="font-body-md text-body-md font-semibold text-on-surface">
                        React + Vite
                      </div>
                    </div>
                  </div>

                  <div className="border border-outline-variant rounded-lg p-sm bg-surface flex items-center gap-md">
                    <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                      database
                    </span>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">
                        Database Engine
                      </div>
                      <div className="font-body-md text-body-md font-semibold text-on-surface">
                        SQLite (rusqlite)
                      </div>
                    </div>
                  </div>

                  <div className="border border-outline-variant rounded-lg p-sm bg-surface flex items-center gap-md">
                    <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                      css
                    </span>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">
                        Styling CSS
                      </div>
                      <div className="font-body-md text-body-md font-semibold text-on-surface">
                        Tailwind CSS
                      </div>
                    </div>
                  </div>

                  <div className="border border-outline-variant rounded-lg p-sm bg-surface flex items-center gap-md">
                    <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                      account_tree
                    </span>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">
                        Stato Globale
                      </div>
                      <div className="font-body-md text-body-md font-semibold text-on-surface">
                        Zustand
                      </div>
                    </div>
                  </div>

                  <div className="border border-outline-variant rounded-lg p-sm bg-surface flex items-center gap-md">
                    <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                      security
                    </span>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">
                        Architettura
                      </div>
                      <div className="font-body-md text-body-md font-semibold text-on-surface">
                        Context Isolation & IPC
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined">database</span>
                  Gestione Dati & Backup
                </h3>
                <p className="text-body-md text-on-surface-variant mt-xs">
                  Gestisci copie di sicurezza o esegui il ripristino e la pulizia totale dei dati di
                  BillKeep.
                </p>
              </div>

              {/* Status Banner */}
              {statusMessage && (
                <div
                  className={`p-md rounded-lg flex items-center gap-md border ${
                    statusMessage.type === 'success'
                      ? 'bg-secondary-container text-on-secondary-container border-secondary/20'
                      : 'bg-error-container text-on-error-container border-error/20'
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {statusMessage.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span className="font-body-md text-body-md">{statusMessage.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export Card */}
                <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-md flex flex-col justify-between">
                  <div className="space-y-sm mb-lg">
                    <div className="flex items-center gap-md text-primary">
                      <span className="material-symbols-outlined text-[32px]">upload</span>
                      <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
                        Esporta Backup
                      </h4>
                    </div>
                    <p className="text-body-md text-on-surface-variant">
                      Salva una copia completa del database SQLite sul tuo computer.
                      L&apos;esportazione è sicura e coerente in qualsiasi momento.
                    </p>
                  </div>
                  <button
                    disabled={actionLoading}
                    onClick={handleBackup}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    {actionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-primary"></div>
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">save</span>
                    )}
                    Salva Backup Database
                  </button>
                </div>

                {/* Import/Restore Card */}
                <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-md flex flex-col justify-between">
                  <div className="space-y-sm mb-lg">
                    <div className="flex items-center gap-md text-error">
                      <span className="material-symbols-outlined text-[32px]">download</span>
                      <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
                        Ripristina Backup
                      </h4>
                    </div>
                    <p className="text-body-md text-on-surface-variant">
                      Seleziona un file `.db` salvato in precedenza per ripristinare lo stato dei
                      dati. Il database verrà allineato e migrato automaticamente.
                    </p>
                  </div>
                  <button
                    disabled={actionLoading}
                    onClick={() => setShowRestoreConfirm(true)}
                    className="w-full bg-error hover:bg-error/90 disabled:opacity-50 text-on-error font-label-md text-label-md px-6 py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    {actionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-error"></div>
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">restore</span>
                    )}
                    Ripristina Database
                  </button>
                </div>

                {/* Clear Database Card */}
                <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-md flex flex-col justify-between">
                  <div className="space-y-sm mb-lg">
                    <div className="flex items-center gap-md text-error">
                      <span className="material-symbols-outlined text-[32px]">delete_sweep</span>
                      <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
                        Ripulisci Database
                      </h4>
                    </div>
                    <p className="text-body-md text-on-surface-variant">
                      Elimina definitivamente tutti i dati (clienti, fatture, pagamenti e prima
                      nota) per ricominciare da zero. Richiede doppia conferma di sicurezza.
                    </p>
                  </div>
                  <button
                    disabled={actionLoading}
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full bg-error hover:bg-error/90 disabled:opacity-50 text-on-error font-label-md text-label-md px-6 py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    {actionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-error"></div>
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                    )}
                    Ripulisci Tutti i Dati
                  </button>
                </div>

                {/* Seed Demo Data Card */}
                <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-md flex flex-col justify-between">
                  <div className="space-y-sm mb-lg">
                    <div className="flex items-center gap-md text-primary">
                      <span className="material-symbols-outlined text-[32px]">extension</span>
                      <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
                        Carica Dati Demo
                      </h4>
                    </div>
                    <p className="text-body-md text-on-surface-variant">
                      Popola l&apos;applicazione con dati fittizi (clienti, fatture, incassi e prima
                      nota) per scopi di test e dimostrazione.
                    </p>
                  </div>
                  <button
                    disabled={actionLoading}
                    onClick={() => setShowSeedConfirm(true)}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    {actionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-primary"></div>
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">science</span>
                    )}
                    Carica Dati Demo
                  </button>
                </div>
              </div>

              {/* Warning Alert */}
              <div className="p-md bg-error-container/30 border border-error/20 rounded-xl flex items-start gap-md text-on-error-container">
                <span className="material-symbols-outlined text-error shrink-0">warning</span>
                <div className="space-y-xs">
                  <h5 className="font-label-md text-label-md font-bold text-error">
                    Sicurezza e Protezione Dati
                  </h5>
                  <p className="text-body-sm text-on-surface-variant">
                    Le operazioni di ripristino e pulizia database sono irreversibili. Il
                    caricamento dei dati demo aggiungerà record fittizi ma manterrà quelli esistenti
                    se non si ripulisce prima.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined">description</span>
                    Log ed Errori di Sistema
                  </h3>
                  <p className="text-body-md text-on-surface-variant mt-xs">
                    Visualizza il log cronologico degli eventi e gli errori relativi a backup e
                    ripristini.
                  </p>
                </div>
                <button
                  onClick={fetchLogs}
                  className="bg-surface hover:bg-surface-container-high border border-outline-variant font-label-md text-label-md px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  Aggiorna
                </button>
              </div>

              {/* Log Viewer Container */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-inner flex flex-col h-[500px]">
                <div className="bg-surface px-md py-sm border-b border-outline-variant flex items-center justify-between text-label-sm font-semibold text-on-surface-variant">
                  <span>Registro Eventi</span>
                  <span>{logs.length} record trovati</span>
                </div>

                <div className="flex-1 overflow-y-auto p-md space-y-sm font-mono text-xs">
                  {logs.length === 0 ? (
                    <div className="text-center py-12 text-on-surface-variant/60 font-sans text-body-md">
                      Nessun log registrato nel sistema.
                    </div>
                  ) : (
                    logs.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-sm bg-surface border border-outline-variant/40 rounded-lg hover:border-outline transition-colors flex flex-col md:flex-row items-start md:items-center gap-md"
                      >
                        {/* Timestamp */}
                        <span className="text-on-surface-variant shrink-0 select-none">
                          [{formatDate(log.timestamp)}]
                        </span>

                        {/* Level badge */}
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                            log.level === 'error'
                              ? 'bg-error-container text-on-error-container'
                              : log.level === 'warning'
                                ? 'bg-error/10 text-error'
                                : 'bg-secondary-container text-on-secondary-container'
                          }`}
                        >
                          {log.level}
                        </span>

                        {/* Context badge */}
                        <span className="px-2 py-0.5 rounded bg-surface-container border border-outline-variant/60 text-[10px] font-semibold uppercase text-primary shrink-0 select-none">
                          {log.context}
                        </span>

                        {/* Message */}
                        <span className="text-on-surface font-sans text-body-md break-all">
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined">tune</span>
                  Preferenze Generali
                </h3>
                <p className="text-body-md text-on-surface-variant mt-xs">
                  Personalizza il comportamento e l&apos;aspetto visivo dell&apos;applicazione.
                </p>
              </div>

              {/* Theme Settings Card */}
              <div className="bg-surface border border-outline-variant rounded-xl p-md space-y-md">
                <div className="flex items-center gap-md">
                  <span className="material-symbols-outlined text-[32px] text-primary">
                    palette
                  </span>
                  <div>
                    <h4 className="font-label-md text-label-md font-bold text-on-surface">
                      Tema dell&apos;Applicazione
                    </h4>
                    <p className="text-body-sm text-on-surface-variant">
                      Seleziona la modalità di visualizzazione dell&apos;applicazione.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
                  {/* Light Theme Button */}
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-md p-md rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                      theme === 'light'
                        ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm'
                        : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">light_mode</span>
                    <div>
                      <div className="font-label-md text-label-md">Tema Chiaro</div>
                      <div className="text-[12px] font-normal text-on-surface-variant/80">
                        Tonalità calde riposanti per ambienti illuminati
                      </div>
                    </div>
                  </button>

                  {/* Dark Theme Button */}
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex items-center gap-md p-md rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                      theme === 'dark'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                        : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">dark_mode</span>
                    <div>
                      <div className="font-label-md text-label-md">Tema Oscuro</div>
                      <div className="text-[12px] font-normal text-on-surface-variant/80">
                        Contrasto ottimizzato per affaticare meno la vista
                      </div>
                    </div>
                  </button>

                  {/* Minimal Theme Button */}
                  <button
                    onClick={() => setTheme('minimal')}
                    className={`flex items-center gap-md p-md rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                      theme === 'minimal'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                        : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">contrast</span>
                    <div>
                      <div className="font-label-md text-label-md">Tema Minimal</div>
                      <div className="text-[12px] font-normal text-on-surface-variant/80">
                        Bianco e nero essenziale per massima leggibilità
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM RESTORE MODAL */}
      <Modal
        isOpen={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        title="Ripristina Database"
      >
        <div className="space-y-4">
          <p className="text-body-md text-on-surface">
            Sei sicuro di voler ripristinare il database?
          </p>
          <div className="p-md bg-error-container text-on-error-container rounded-lg border border-error/20 flex gap-sm">
            <span className="material-symbols-outlined shrink-0 text-[20px]">warning</span>
            <p className="text-body-sm">
              Questa azione sovrascriverà in modo irreversibile tutti i dati correnti con quelli del
              backup selezionato. L&apos;applicazione si riavvierà automaticamente al termine
              dell&apos;operazione.
            </p>
          </div>
          <div className="flex justify-end gap-sm pt-sm border-t border-outline-variant">
            <button
              onClick={() => setShowRestoreConfirm(false)}
              className="bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md px-4 py-2 rounded-lg cursor-pointer"
            >
              Annulla
            </button>
            <button
              onClick={handleRestore}
              className="bg-error hover:bg-error/90 text-on-error font-label-md text-label-md px-4 py-2 rounded-lg cursor-pointer"
            >
              Conferma e Ripristina
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM CLEAR MODAL (DOUBLE SECURITY) */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => {
          setShowClearConfirm(false)
          setClearConfirmText('')
        }}
        title="Ripulitura Completa Database"
      >
        <div className="space-y-4">
          <p className="text-body-md text-on-surface">
            Questa operazione eliminerà permanentemente tutti i dati. Per procedere, digita la
            parola <strong className="text-error">CANCELLA</strong> nel campo sottostante per
            sbloccare la conferma.
          </p>

          <input
            type="text"
            className="w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-mono text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-error"
            placeholder="Scrivi CANCELLA"
            value={clearConfirmText}
            onChange={(e) => setClearConfirmText(e.target.value)}
          />

          <div className="p-md bg-error-container text-on-error-container rounded-lg border border-error/20 flex gap-sm">
            <span className="material-symbols-outlined shrink-0 text-[20px]">warning</span>
            <p className="text-body-sm">
              Non sarà possibile recuperare i dati una volta cancellati, a meno che tu non abbia un
              file di backup salvato in precedenza.
            </p>
          </div>

          <div className="flex justify-end gap-sm pt-sm border-t border-outline-variant">
            <button
              onClick={() => {
                setShowClearConfirm(false)
                setClearConfirmText('')
              }}
              className="bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md px-4 py-2 rounded-lg cursor-pointer"
            >
              Annulla
            </button>
            <button
              disabled={clearConfirmText !== 'CANCELLA'}
              onClick={handleClear}
              className="bg-error hover:bg-error/90 disabled:opacity-50 text-on-error font-label-md text-label-md px-4 py-2 rounded-lg cursor-pointer transition-opacity"
            >
              Elimina Tutti i Dati
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM SEED MODAL */}
      <Modal
        isOpen={showSeedConfirm}
        onClose={() => setShowSeedConfirm(false)}
        title="Carica Dati Demo"
      >
        <div className="space-y-4">
          <p className="text-body-md text-on-surface">
            Sei sicuro di voler caricare i dati demo di prova?
          </p>
          <div className="p-md bg-secondary-container text-on-secondary-container rounded-lg border border-secondary/20 flex gap-sm">
            <span className="material-symbols-outlined shrink-0 text-[20px]">info</span>
            <p className="text-body-sm">
              Questa azione aggiungerà clienti, fatture e pagamenti fittizi per consentirti di
              esplorare le funzionalità dell&apos;applicazione. Si consiglia di eseguire questa
              operazione su un database vuoto.
            </p>
          </div>
          <div className="flex justify-end gap-sm pt-sm border-t border-outline-variant">
            <button
              onClick={() => setShowSeedConfirm(false)}
              className="bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md px-4 py-2 rounded-lg cursor-pointer"
            >
              Annulla
            </button>
            <button
              onClick={handleSeed}
              className="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md px-4 py-2 rounded-lg cursor-pointer"
            >
              Conferma e Carica
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
