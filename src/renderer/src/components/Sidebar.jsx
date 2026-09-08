import { NavLink } from 'react-router-dom'
import { useStore } from '../store/useStore'

export default function Sidebar({ isOpen = false, onNavigate }) {
  const invoices = useStore((state) => state.invoices)
  const customers = useStore((state) => state.customers)
  const payments = useStore((state) => state.payments)
  const journalEntries = useStore((state) => state.journalEntries)

  const invoiceCount = invoices.length > 0 ? invoices.length : 48
  const customerCount = customers.length > 0 ? customers.length : 12
  const paymentsCount = payments.length > 0 ? payments.length : 14
  const journalCount = journalEntries.length > 0 ? journalEntries.length : 348

  const navItems = [
    { to: '/', label: 'Dashboard', icon: 'dashboard', badge: invoiceCount },
    { to: '/clients', label: 'Clienti', icon: 'group', badge: customerCount },
    { to: '/invoices', label: 'Fatture', icon: 'receipt_long', badge: invoiceCount },
    { to: '/payments', label: 'Pagamenti', icon: 'payments', badge: paymentsCount },
    { to: '/journal', label: 'Prima Nota', icon: 'menu_book', badge: journalCount }
  ]

  return (
    <aside className="w-60 bg-apple-sidebar border-r border-apple-border flex flex-col justify-between py-2 select-none flex-shrink-0 z-20">
      <div className="flex-1 overflow-y-auto px-2 space-y-3.5">
        {/* Database / Workspace Picker */}
        <div className="px-1.5 pt-1">
          <button
            type="button"
            className="w-full flex items-center justify-between p-1.5 rounded-lg bg-black/[0.03] hover:bg-black/[0.06] border border-black/[0.04] transition text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[17px] text-apple-accent">
                database
              </span>
              <div className="truncate">
                <div className="text-[13px] font-semibold text-apple-text truncate">
                  Studio Associato 2026
                </div>
                <div className="text-[11px] text-apple-secondary truncate">
                  SQLite Local • WAL Sync
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-[15px] text-apple-subtle">
              unfold_more
            </span>
          </button>
        </div>

        {/* Section: Operatività */}
        <div>
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-apple-subtle flex items-center justify-between">
            <span>Operatività</span>
            <span className="material-symbols-outlined text-[13px] text-apple-subtle cursor-pointer hover:text-apple-text">
              keyboard_arrow_down
            </span>
          </div>
          <nav className="space-y-0.5 text-[14px]">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center justify-between px-2.5 py-1.5 rounded transition ${
                    isActive
                      ? 'bg-black/[0.08] text-apple-text font-semibold'
                      : 'text-apple-secondary hover:bg-black/[0.04] hover:text-apple-text font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2">
                      <span
                        className={`material-symbols-outlined text-[17px] ${
                          isActive ? 'text-apple-accent' : ''
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    <span
                      className={`text-[12px] font-mono px-1.5 py-0.2 rounded ${
                        isActive
                          ? 'text-white bg-apple-accent font-semibold'
                          : 'text-apple-subtle bg-black/[0.04]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom Sidebar Footer */}
      <div className="px-2 pt-2 border-t border-apple-border/70">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `px-2.5 py-1.5 flex items-center justify-between text-[13px] rounded transition cursor-pointer ${
              isActive
                ? 'bg-black/[0.08] text-apple-text font-semibold'
                : 'text-apple-secondary hover:bg-black/[0.04] hover:text-apple-text font-medium'
            }`
          }
        >
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px]">settings</span>
            <span className="font-medium">Preferenze</span>
          </div>
          <kbd className="text-[11px] text-apple-subtle font-mono">⌘,</kbd>
        </NavLink>
      </div>
    </aside>
  )
}
