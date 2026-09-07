import { useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'

export default function Titlebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const searchInputRef = useRef(null)

  const dashboardFilter = useStore((state) => state.dashboardFilter)
  const setDashboardFilter = useStore((state) => state.setDashboardFilter)
  const dashboardSearch = useStore((state) => state.dashboardSearch)
  const setDashboardSearch = useStore((state) => state.setDashboardSearch)
  const invoices = useStore((state) => state.invoices)

  const isDashboard = location.pathname === '/'

  // Page title mapping for breadcrumbs
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Fatture & Clienti'
      case '/clients':
        return 'Anagrafica Clienti'
      case '/invoices':
        return 'Registro Fatture'
      case '/payments':
        return 'Riconciliazione Pagamenti'
      case '/journal':
        return 'Prima Nota & Bilancio'
      case '/settings':
        return 'Preferenze'
      default:
        return 'Panoramica'
    }
  }

  // Keyboard shortcut listener for Cmd+K and Cmd+N
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdKey = isMac ? e.metaKey : e.ctrlKey

      if (cmdKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (cmdKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        navigate('/invoices')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  // Export visible invoices to CSV
  const handleExport = () => {
    if (!invoices || invoices.length === 0) return

    const headers = ['ID', 'Cliente', 'Data Emissione', 'Data Scadenza', 'Totale', 'Stato']
    const rows = invoices.map((inv) => [
      `"${inv.id}"`,
      `"${inv.customer_name || ''}"`,
      `"${inv.issue_date || ''}"`,
      `"${inv.due_date || ''}"`,
      `"${inv.amount?.toFixed(2) || '0.00'}"`,
      `"${inv.status || ''}"`
    ])

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `billkeep_fatture_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <header className="h-11 w-full bg-apple-sidebar/95 backdrop-blur-md border-b border-apple-border flex items-center justify-between px-3 select-none flex-shrink-0 z-30">
      {/* Left: macOS Traffic Lights & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-1">
          <span
            className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-80 transition cursor-pointer"
            title="Chiudi"
          />
          <span
            className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] hover:opacity-80 transition cursor-pointer"
            title="Minimizza"
          />
          <span
            className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] hover:opacity-80 transition cursor-pointer"
            title="Espandi"
          />
        </div>
        <div className="h-4 w-px bg-apple-border" />
        <div className="flex items-center gap-1.5 text-[11px] text-apple-secondary">
          <span className="material-symbols-outlined text-[15px] text-apple-secondary">
            folder_open
          </span>
          <span className="font-medium text-apple-text">BillKeep</span>
          <span className="text-apple-subtle">/</span>
          <span>Esercizio {new Date().getFullYear()}</span>
          <span className="text-apple-subtle">/</span>
          <span>Q3</span>
          <span className="text-apple-subtle">/</span>
          <span className="font-semibold text-apple-text bg-black/[0.05] px-1.5 py-0.5 rounded text-[10px]">
            {getPageTitle()}
          </span>
        </div>
      </div>

      {/* Center: Segmented Control (only for Dashboard) */}
      {isDashboard && (
        <div className="flex items-center">
          <div className="inline-flex p-0.5 rounded-lg bg-black/[0.06] border border-black/[0.04]">
            {[
              { id: 'all', label: 'Tutte' },
              { id: 'issued', label: 'Emesse' },
              { id: 'received', label: 'Ricevute' },
              { id: 'unpaid', label: 'Da Incassare' },
              { id: 'paid', label: 'Saldate' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDashboardFilter(tab.id)}
                className={`px-2.5 py-0.5 text-[11px] rounded transition cursor-pointer ${
                  dashboardFilter === tab.id
                    ? 'font-semibold bg-white text-apple-text shadow-xs'
                    : 'font-medium text-apple-secondary hover:text-apple-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Right: Actions & Search */}
      <div className="flex items-center gap-1.5">
        {isDashboard && (
          <div className="relative flex items-center w-48 h-6 rounded bg-black/[0.04] hover:bg-black/[0.06] border border-black/[0.04] px-2 transition">
            <span className="material-symbols-outlined text-apple-subtle text-[13px] mr-1.5">
              search
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={dashboardSearch}
              onChange={(e) => setDashboardSearch(e.target.value)}
              placeholder="Cerca fattura, P.IVA..."
              className="w-full bg-transparent text-[11px] text-apple-text placeholder:text-apple-subtle focus:outline-none"
            />
            <kbd className="text-[9px] text-apple-subtle font-mono bg-white shadow-xs px-1 py-0.2 rounded border border-black/[0.05]">
              ⌘K
            </kbd>
          </div>
        )}

        {isDashboard && (
          <>
            <button
              type="button"
              className="h-6 px-2 rounded bg-white border border-apple-border text-[11px] font-medium text-apple-text shadow-xs hover:bg-slate-50 flex items-center gap-1 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px] text-apple-secondary">
                filter_alt
              </span>
              <span>Filtra</span>
              <kbd className="text-[9px] text-apple-subtle font-mono ml-0.5">⌥F</kbd>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="h-6 px-2 rounded bg-white border border-apple-border text-[11px] font-medium text-apple-text shadow-xs hover:bg-slate-50 flex items-center gap-1 transition cursor-pointer"
              title="Esporta elenco in CSV"
            >
              <span className="material-symbols-outlined text-[13px] text-apple-secondary">
                file_download
              </span>
              <span>Esporta</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="h-6 px-2 rounded bg-apple-accent hover:bg-apple-accent-hover text-white text-[11px] font-medium shadow-xs flex items-center gap-1 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">add</span>
              <span>Nuova Fattura</span>
              <kbd className="text-[9px] text-white/80 font-mono ml-0.5">⌘N</kbd>
            </button>
          </>
        )}
      </div>
    </header>
  )
}
