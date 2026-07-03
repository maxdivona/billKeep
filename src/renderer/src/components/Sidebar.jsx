import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-md px-sm py-sm rounded-lg transition-colors duration-200 ease-in-out ${
      isActive
        ? 'text-primary dark:text-inverse-primary font-bold border-r-4 border-primary dark:border-inverse-primary bg-surface-container-low'
        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
    }`

  return (
    <nav className="bg-surface text-primary font-body-md text-body-md h-screen w-64 fixed left-0 top-0 border-r border-outline-variant flex flex-col py-md px-md z-20">
      <div className="mb-lg mt-sm">
        <h1 className="font-headline-lg text-headline-lg font-bold text-primary">BillKeep</h1>
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">
          Gestione Finanziaria
        </p>
      </div>

      <ul className="flex flex-col gap-sm flex-grow">
        <li>
          <NavLink to="/" className={linkClass}>
            <span className="material-symbols-outlined fill">dashboard</span>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/clients" className={linkClass}>
            <span className="material-symbols-outlined">group</span>
            Clienti
          </NavLink>
        </li>
        <li>
          <NavLink to="/invoices" className={linkClass}>
            <span className="material-symbols-outlined">receipt_long</span>
            Fatture
          </NavLink>
        </li>
        <li>
          <NavLink to="/payments" className={linkClass}>
            <span className="material-symbols-outlined">payments</span>
            Pagamenti
          </NavLink>
        </li>
        <li>
          <NavLink to="/journal" className={linkClass}>
            <span className="material-symbols-outlined">menu_book</span>
            Prima Nota
          </NavLink>
        </li>
        <li>
          <NavLink to="/settings" className={linkClass}>
            <span className="material-symbols-outlined">settings</span>
            Impostazioni
          </NavLink>
        </li>
      </ul>

      <div className="mt-auto pt-md border-t border-outline-variant">
        <div className="flex items-center gap-md">
          <span className="material-symbols-outlined text-[36px] text-on-surface-variant">
            account_circle
          </span>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface">Amministratore</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
