import { useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'

export default function StatusBar({ selectedInvoiceInfo: propInfo, totalInvoicesCount }) {
  const location = useLocation()
  const invoices = useStore((state) => state.invoices)
  const storeInfo = useStore((state) => state.selectedInvoiceInfo)
  const isDashboard = location.pathname === '/'

  const selectedInvoiceInfo = propInfo || storeInfo
  const totalCount = totalInvoicesCount ?? (invoices.length > 0 ? invoices.length : 48)

  return (
    <footer className="h-7 w-full bg-[#ECECED] border-t border-apple-border px-3 flex items-center justify-between text-[12px] text-apple-secondary select-none z-20 flex-shrink-0">
      <div className="flex items-center gap-3 truncate">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-apple-green animate-pulse" />
          <span className="font-medium text-apple-text">SQLite WAL 3.42 • Connesso</span>
        </div>
        <span className="h-2.5 w-px bg-apple-border flex-shrink-0" />
        <span className="truncate">
          {isDashboard
            ? selectedInvoiceInfo || 'Nessun documento selezionato'
            : 'Sistema contabile operativo'}
        </span>
        <span className="h-2.5 w-px bg-apple-border flex-shrink-0" />
        <span className="text-apple-subtle flex-shrink-0">{totalCount} fatture totali</span>
      </div>

      <div className="flex items-center gap-3 font-mono text-[11px] flex-shrink-0 hidden sm:flex">
        <span className="text-apple-subtle">Esc: Deseleziona</span>
        <span>Space: Anteprima PDF</span>
        <span>↵: Modifica</span>
        <span className="h-2.5 w-px bg-apple-border" />
        <span className="text-apple-secondary">Zoom 100%</span>
      </div>
    </footer>
  )
}
