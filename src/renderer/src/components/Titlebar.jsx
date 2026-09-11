import { useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'

export default function Titlebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const searchInputRef = useRef(null)

  const dashboardSearch = useStore((state) => state.dashboardSearch)
  const setDashboardSearch = useStore((state) => state.setDashboardSearch)
  const invoices = useStore((state) => state.invoices)

  const isDashboard = location.pathname === '/'

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
    <header className="h-11 w-full bg-apple-sidebar/95 backdrop-blur-md border-b border-apple-border grid grid-cols-3 items-center px-4 select-none flex-shrink-0 z-30">
      {/* Left: Vuoto per bilanciare la griglia e centrare perfettamente la ricerca */}
      <div className="flex items-center" />

      {/* Center: Ricerca al centro */}
      <div className="flex items-center justify-center">
        {isDashboard && (
          <div className="relative flex items-center w-80 max-w-full h-7 rounded-md bg-black/[0.04] hover:bg-black/[0.06] border border-black/[0.06] px-2.5 transition">
            <span className="material-symbols-outlined text-apple-subtle text-[15px] mr-2 select-none">
              search
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={dashboardSearch}
              onChange={(e) => setDashboardSearch(e.target.value)}
              placeholder="Cerca fattura, P.IVA..."
              className="w-full bg-transparent text-[13px] text-apple-text placeholder:text-apple-subtle focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Right: Esporta e Nuova Fattura */}
      <div className="flex items-center justify-end gap-2">
        {isDashboard && (
          <>
            <button
              type="button"
              onClick={handleExport}
              className="h-7 px-3 rounded-md bg-white border border-apple-border text-[13px] font-medium text-apple-text shadow-xs hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer"
              title="Esporta elenco in CSV"
            >
              <span className="material-symbols-outlined text-[15px] text-apple-secondary">
                file_download
              </span>
              <span>Esporta</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/invoices', { state: { focusNewInvoice: true } })}
              className="h-7 px-3 rounded-md bg-apple-accent hover:bg-apple-accent-hover text-white text-[13px] font-medium shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>Nuova Fattura</span>
            </button>
          </>
        )}
      </div>
    </header>
  )
}
