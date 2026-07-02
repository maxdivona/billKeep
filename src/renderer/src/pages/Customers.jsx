import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'

export default function Customers() {
  const { customers, loading, fetchCustomers, addCustomer } = useStore()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  
  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Il nome o ragione sociale è richiesto.')
      return
    }

    const newCustomer = {
      id: `cust-${Date.now()}`,
      name: name.trim(),
      email: email.trim() || null
    }

    const res = await addCustomer(newCustomer)
    if (res.success) {
      // Reset form
      setName('')
      setEmail('')
      setFormError('')
      setModalOpen(false)
    } else {
      setFormError(`Errore durante il salvataggio: ${res.error}`)
    }
  }

  // Filter customers based on search
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  )

  // Calculate stats
  const totalClients = customers.length
  const totalInvoiced = customers.reduce((sum, c) => sum + (c.total_invoiced || 0), 0)
  const totalBalance = customers.reduce((sum, c) => sum + (c.balance || 0), 0)

  // Get initials for avatar
  const getInitials = (fullName) => {
    const parts = fullName.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return fullName.substring(0, 2).toUpperCase()
  }

  return (
    <div>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Anagrafica Clienti</h2>
          <p className="text-on-surface-variant font-body-md text-body-md">
            Gestisci la tua rubrica clienti e monitora i saldi contabili.
          </p>
        </div>
        <button
          className="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          onClick={() => setModalOpen(true)}
        >
          <span className="material-symbols-outlined">add</span>
          Nuovo Cliente
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-6 max-w-md">
        <div className="flex items-center bg-surface-container-low rounded-full px-md py-sm border border-outline-variant focus-within:border-primary transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant mr-sm">search</span>
          <input
            className="bg-transparent border-none outline-none w-full text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:ring-0 p-0"
            placeholder="Cerca cliente per nome o email..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary">group</span>
            <h3 className="font-label-md text-label-md text-on-surface-variant">Totale Clienti</h3>
          </div>
          <p className="font-headline-lg text-headline-lg text-on-surface font-bold tabular-nums">
            {totalClients}
          </p>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-secondary">account_balance_wallet</span>
            <h3 className="font-label-md text-label-md text-on-surface-variant">Fatturato Totale</h3>
          </div>
          <p className="font-headline-lg text-headline-lg text-on-surface font-bold tabular-nums">
            {formatCurrency(totalInvoiced)}
          </p>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-error">warning</span>
            <h3 className="font-label-md text-label-md text-on-surface-variant">Saldo da Ricevere</h3>
          </div>
          <p className="font-headline-lg text-headline-lg text-on-surface font-bold tabular-nums">
            {formatCurrency(totalBalance)}
          </p>
        </div>
      </div>

      {/* Client Table */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container">
                <th className="font-label-sm text-label-sm text-on-surface-variant py-sm px-sm font-semibold uppercase tracking-wider">
                  Nome / Ragione Sociale
                </th>
                <th className="font-label-sm text-label-sm text-on-surface-variant py-sm px-sm font-semibold uppercase tracking-wider">
                  Email
                </th>
                <th className="font-label-sm text-label-sm text-on-surface-variant py-sm px-sm font-semibold uppercase tracking-wider text-right">
                  Fatturato Totale
                </th>
                <th className="font-label-sm text-label-sm text-on-surface-variant py-sm px-sm font-semibold uppercase tracking-wider text-right">
                  Saldo Corrente
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-body-sm text-body-sm text-on-surface">
              {loading && filteredCustomers.length === 0 ? (
                // Skeleton rows
                [1, 2, 3].map((n) => (
                  <tr key={n}>
                    <td className="py-sm px-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container animate-pulse"></div>
                        <div className="h-4 w-32 bg-surface-container rounded animate-pulse"></div>
                      </div>
                    </td>
                    <td className="py-sm px-sm">
                      <div className="h-4 w-48 bg-surface-container rounded animate-pulse"></div>
                    </td>
                    <td className="py-sm px-sm">
                      <div className="h-4 w-24 bg-surface-container rounded ml-auto animate-pulse"></div>
                    </td>
                    <td className="py-sm px-sm">
                      <div className="h-6 w-20 bg-surface-container rounded-full ml-auto animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="py-sm px-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
                          {getInitials(c.name)}
                        </div>
                        <span className="font-medium text-on-surface">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-sm px-sm text-on-surface-variant">{c.email || '-'}</td>
                    <td className="py-sm px-sm text-right font-medium tabular-nums">
                      {formatCurrency(c.total_invoiced)}
                    </td>
                    <td className="py-sm px-sm text-right">
                      {c.balance <= 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-container text-on-secondary-container tabular-nums">
                          {formatCurrency(c.balance)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-container text-on-error-container tabular-nums">
                          - {formatCurrency(c.balance)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
              {!loading && filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 px-6 text-center text-on-surface-variant">
                    Nessun cliente trovato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nuovo Cliente */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm transition-opacity"
            onClick={() => setModalOpen(false)}
          ></div>
          
          {/* Modal Panel */}
          <div className="relative w-full max-w-lg bg-surface-container-low rounded-xl border border-outline-variant p-6 z-10 flex flex-col shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
                Aggiungi Nuovo Cliente
              </h2>
              <button
                className="text-on-surface-variant hover:text-on-surface rounded-full p-1 hover:bg-surface-container transition-colors cursor-pointer"
                onClick={() => setModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col gap-5">
              {formError && <p className="text-error font-label-md text-label-md">{formError}</p>}
              
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">
                  Ragione Sociale / Nome <span className="text-error">*</span>
                </label>
                <input
                  className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md"
                  placeholder="es. Acme Corp S.p.A."
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">
                  Indirizzo Email Principale
                </label>
                <input
                  className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md"
                  placeholder="amministrazione@azienda.it"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md font-label-md text-label-md bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                  onClick={() => setModalOpen(false)}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md font-label-md text-label-md bg-primary hover:bg-primary/90 text-on-primary transition-colors shadow-sm cursor-pointer"
                >
                  Salva Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
