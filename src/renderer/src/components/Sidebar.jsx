import { NavLink } from 'react-router-dom'

export default function Sidebar({ isOpen = false, onNavigate }) {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/clients', label: 'Clienti', icon: 'group' },
    { to: '/payments', label: 'Pagamenti', icon: 'payments' }
  ]

  return (
    <aside className="w-60 bg-apple-sidebar border-r border-apple-border flex flex-col justify-between py-2 select-none flex-shrink-0 z-20">
      <div className="flex-1 overflow-y-auto px-2 space-y-3.5">
        {/* Section: Operatività */}
        <div className="pt-1">
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-apple-subtle">
            Operatività
          </div>
          <nav className="space-y-0.5 text-[14px]">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2.5 py-1.5 rounded transition ${
                    isActive
                      ? 'bg-black/[0.08] text-apple-text font-semibold'
                      : 'text-apple-secondary hover:bg-black/[0.04] hover:text-apple-text font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`material-symbols-outlined text-[17px] ${
                        isActive ? 'text-apple-accent' : ''
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
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
        </NavLink>
      </div>
    </aside>
  )
}
