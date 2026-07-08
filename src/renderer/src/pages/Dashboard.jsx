import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Link } from 'react-router-dom'
import StatCard from '../components/StatCard'

export default function Dashboard() {
  const { stats, loading, fetchAllData } = useStore()

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
  }

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr)
    if (isNaN(d)) return dateStr
    // Ogg, Ieri, or standard date format
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    if (d.toDateString() === today.toDateString()) {
      return `Oggi, ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
    } else if (d.toDateString() === yesterday.toDateString()) {
      return `Ieri, ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
    }
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    if (isNaN(d)) return dateStr
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div>
      <header className="mb-xl">
        <h2 className="font-headline-xl text-headline-xl text-on-surface mb-xs">
          Panoramica Dashboard
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Bentornato. Ecco il riepilogo finanziario di questo mese.
        </p>
      </header>

      {/* KPI Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-md">
        <StatCard
          title="Totale Fatturato"
          value={formatCurrency(stats.totalInvoiced)}
          icon="receipt_long"
          variant="primary"
        />

        <StatCard
          title="Totale Incassato"
          value={formatCurrency(stats.totalPaid)}
          icon="payments"
          variant="secondary"
        />

        <StatCard
          title="Da Incassare"
          value={formatCurrency(stats.balance)}
          icon="account_balance_wallet"
          variant="error"
        />
      </section>

      {/* Loading Skeleton Loader wrapper */}
      {loading && stats.recentInvoices.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md h-64 animate-pulse"></div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md h-64 animate-pulse"></div>
        </div>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          {/* Ultime Fatture */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface">
              <h3 className="font-headline-md text-headline-md text-on-surface">Ultime Fatture</h3>
              <Link
                to="/invoices"
                className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors"
              >
                Vedi tutte
              </Link>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant uppercase">
                  <tr>
                    <th className="py-sm px-sm font-medium">Cliente</th>
                    <th className="py-sm px-sm font-medium">Importo</th>
                    <th className="py-sm px-sm font-medium">Stato</th>
                    <th className="py-sm px-sm font-medium">Scadenza</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md text-on-surface divide-y divide-outline-variant">
                  {stats.recentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-surface-container-lowest/50 transition-colors"
                    >
                      <td className="py-sm px-sm">{inv.customer_name}</td>
                      <td className="py-sm px-sm font-medium tabular-nums">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="py-sm px-sm">
                        {inv.status === 'paid' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-secondary-container/30 text-secondary font-label-sm text-[11px] uppercase tracking-wide">
                            Pagata
                          </span>
                        )}
                        {inv.status === 'partial' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-surface-variant text-on-surface-variant font-label-sm text-[11px] uppercase tracking-wide">
                            Parziale
                          </span>
                        )}
                        {inv.status === 'unpaid' &&
                          (new Date(inv.due_date) < new Date() ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-error-container/30 text-error font-label-sm text-[11px] uppercase tracking-wide">
                              Scaduta
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-surface-variant text-on-surface-variant font-label-sm text-[11px] uppercase tracking-wide">
                              Attesa
                            </span>
                          ))}
                      </td>
                      <td
                        className={`py-sm px-sm ${
                          inv.status !== 'paid' && new Date(inv.due_date) < new Date()
                            ? 'text-error font-medium'
                            : 'text-on-surface-variant'
                        }`}
                      >
                        {formatDate(inv.due_date)}
                      </td>
                    </tr>
                  ))}
                  {stats.recentInvoices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-md px-md text-center text-on-surface-variant">
                        Nessuna fattura inserita.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagamenti Recenti */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Pagamenti Recenti
              </h3>
              <Link
                to="/payments"
                className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors"
              >
                Storicizzazione
              </Link>
            </div>
            <div className="p-md flex-1">
              <ul className="flex flex-col gap-sm">
                {stats.recentPayments.map((pay) => (
                  <li
                    key={pay.id}
                    className="flex items-center justify-between p-sm rounded-lg hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-md">
                      <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined">arrow_downward</span>
                      </div>
                      <div>
                        <p className="font-label-md text-label-md text-on-surface">
                          {pay.method} da {pay.customer_name}
                        </p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          Fattura #{pay.invoice_id}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-label-md text-label-md text-secondary font-medium tabular-nums">
                        + {formatCurrency(pay.amount)}
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {formatDateTime(pay.payment_date)}
                      </p>
                    </div>
                  </li>
                ))}
                {stats.recentPayments.length === 0 && (
                  <li className="py-md text-center text-on-surface-variant">
                    Nessun pagamento registrato.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
