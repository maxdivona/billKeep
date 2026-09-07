import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import SearchableSelect from '../components/SearchableSelect'

export default function Invoices() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    paginatedInvoices,
    invoicesPagination,
    fetchInvoicesPaginated,
    setInvoicesFilters,
    customers,
    loading,
    fetchCustomers,
    addInvoice,
    updateInvoice,
    deleteInvoice
  } = useStore()
  const [modalOpen, setModalOpen] = useState(false)

  // Form State for New Invoice
  const [invoiceId, setInvoiceId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(() => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    return futureDate.toISOString().split('T')[0]
  })
  const [amount, setAmount] = useState('')
  const [formError, setFormError] = useState('')

  // Form State for Edit Invoice
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [editCustomerId, setEditCustomerId] = useState('')
  const [editIssueDate, setEditIssueDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editFormError, setEditFormError] = useState('')

  // Delete Invoice State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteInvoiceId, setDeleteInvoiceId] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const [searchTerm, setSearchTerm] = useState(invoicesPagination.search)
  const [statusFilter, setStatusFilter] = useState(invoicesPagination.status)

  const openNewInvoiceModal = () => {
    setInvoiceId(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)
    setCustomerId('')
    setIssueDate(new Date().toISOString().split('T')[0])
    setDueDate(() => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      return futureDate.toISOString().split('T')[0]
    })
    setAmount('')
    setFormError('')
    setModalOpen(true)
  }

  useEffect(() => {
    if (location.state?.openNewInvoiceModal) {
      setTimeout(() => {
        openNewInvoiceModal()
      }, 50)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate, location.pathname])

  // Sincronizza filtri e ricarica i dati su modifica
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setInvoicesFilters({ search: searchTerm, status: statusFilter })
      fetchInvoicesPaginated(true)
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchTerm, statusFilter, setInvoicesFilters, fetchInvoicesPaginated])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    if (isNaN(d)) return dateStr
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!invoiceId.trim()) {
      setFormError('ID Fattura è richiesto.')
      return
    }
    if (!customerId) {
      setFormError('Seleziona un cliente.')
      return
    }
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("L'importo deve essere maggiore di zero.")
      return
    }
    if (!issueDate || !dueDate) {
      setFormError('Date di emissione e scadenza sono richieste.')
      return
    }
    if (new Date(dueDate) < new Date(issueDate)) {
      setFormError('La data di scadenza non può essere precedente alla data di emissione.')
      return
    }

    const newInvoice = {
      id: invoiceId.trim(),
      customer_id: customerId,
      issue_date: issueDate,
      due_date: dueDate,
      amount: numAmount,
      status: 'unpaid'
    }

    const res = await addInvoice(newInvoice)
    if (res.success) {
      // Reset form
      setInvoiceId('')
      setCustomerId('')
      setAmount('')
      setModalOpen(false)
    } else {
      setFormError(`Errore durante il salvataggio: ${res.error}`)
    }
  }

  const handleEdit = (inv) => {
    setSelectedInvoice(inv)
    setEditCustomerId(inv.customer_id)
    setEditIssueDate(inv.issue_date)
    setEditDueDate(inv.due_date)
    setEditAmount((Math.round(inv.amount * 100) / 100).toString())
    setEditFormError('')
    setEditModalOpen(true)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setEditFormError('')

    if (!editCustomerId) {
      setEditFormError('Seleziona un cliente.')
      return
    }
    const numAmount = parseFloat(editAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setEditFormError("L'importo deve essere maggiore di zero.")
      return
    }
    if (!editIssueDate || !editDueDate) {
      setEditFormError('Date di emissione e scadenza sono richieste.')
      return
    }
    if (new Date(editDueDate) < new Date(editIssueDate)) {
      setEditFormError('La data di scadenza non può essere precedente alla data di emissione.')
      return
    }

    const updatedData = {
      customer_id: editCustomerId,
      issue_date: editIssueDate,
      due_date: editDueDate,
      amount: numAmount
    }

    const res = await updateInvoice(selectedInvoice.id, updatedData)
    if (res.success) {
      setEditModalOpen(false)
    } else {
      setEditFormError(`Errore durante il salvataggio: ${res.error}`)
    }
  }

  const handleDeleteClick = (invId) => {
    setDeleteInvoiceId(invId)
    setDeleteError('')
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setDeleteError('')
    const res = await deleteInvoice(deleteInvoiceId)
    if (res.success) {
      setDeleteConfirmOpen(false)
    } else {
      setDeleteError(res.error)
    }
  }

  return (
    <div>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface mb-xs">
            Gestione Fatture
          </h2>
          <p className="text-on-surface-variant font-body-md text-body-md">
            Visualizza l&apos;elenco delle fatture emesse e il loro stato di pagamento.
          </p>
        </div>
        <button
          className="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          onClick={openNewInvoiceModal}
        >
          <span className="material-symbols-outlined">add</span>
          Emetti Fattura
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              placeholder="Cerca per ID fattura o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-[18px] cursor-pointer"
              >
                close
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <label className="text-body-md text-on-surface-variant whitespace-nowrap">Stato:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-44 border border-outline-variant rounded-md px-3 py-2 bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md cursor-pointer"
            >
              <option value="">Tutti</option>
              <option value="unpaid">Non pagate (Scoperte)</option>
              <option value="partial">Pagate parzialmente</option>
              <option value="paid">Pagate totalmente</option>
            </select>
          </div>
        </div>

        <div className="text-body-sm font-label-sm text-on-surface-variant/80 bg-surface-container-high px-3 py-1.5 rounded-md self-end md:self-auto">
          Trovate: <strong className="text-on-surface">{invoicesPagination.totalCount}</strong>{' '}
          fatture
        </div>
      </div>

      {/* Invoice Table Container */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <DataTable
          headers={[
            'ID Fattura',
            'Cliente',
            'Data Emissione',
            'Scadenza',
            { text: 'Importo', align: 'right' },
            { text: 'Stato', align: 'center' },
            { text: 'Azioni', align: 'center' }
          ]}
          data={paginatedInvoices}
          loading={loading}
          emptyMessage="Nessuna fattura emessa."
          renderRow={(inv) => (
            <tr key={inv.id} className="hover:bg-surface-container-high transition-colors">
              <td className="py-sm px-sm font-medium">
                <button
                  type="button"
                  onClick={() =>
                    navigate('/clients', { state: { selectedCustomerId: inv.customer_id } })
                  }
                  className="text-primary hover:underline cursor-pointer font-semibold text-left focus:outline-none"
                >
                  #{inv.id}
                </button>
              </td>
              <td className="py-sm px-sm">
                <button
                  type="button"
                  onClick={() =>
                    navigate('/clients', { state: { selectedCustomerId: inv.customer_id } })
                  }
                  className="hover:underline cursor-pointer font-medium text-left focus:outline-none"
                >
                  {inv.customer_name}
                </button>
              </td>
              <td className="py-sm px-sm text-on-surface-variant">{formatDate(inv.issue_date)}</td>
              <td
                className={`py-sm px-sm ${
                  inv.status !== 'paid' && new Date(inv.due_date) < new Date()
                    ? 'text-error font-medium'
                    : 'text-on-surface-variant'
                }`}
              >
                {formatDate(inv.due_date)}
              </td>
              <td className="py-sm px-sm text-right font-medium tabular-nums">
                {formatCurrency(inv.amount)}
              </td>
              <td className="py-sm px-sm text-center">
                {inv.status === 'paid' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-container text-on-secondary-container uppercase tracking-wide">
                    Pagata
                  </span>
                )}
                {inv.status === 'partial' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-variant text-on-surface-variant uppercase tracking-wide">
                    Parziale
                  </span>
                )}
                {inv.status === 'unpaid' &&
                  (new Date(inv.due_date) < new Date() ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-container text-on-error-container uppercase tracking-wide">
                      Scaduta
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-variant text-on-surface-variant uppercase tracking-wide">
                      Attesa
                    </span>
                  ))}
              </td>
              <td className="py-sm px-sm text-center">
                <div className="flex justify-center gap-2">
                  <button
                    className="p-1 hover:text-primary transition-colors cursor-pointer flex items-center"
                    onClick={() => handleEdit(inv)}
                    title="Modifica"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    className="p-1 hover:text-error transition-colors cursor-pointer flex items-center"
                    onClick={() => handleDeleteClick(inv.id)}
                    title="Elimina"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          )}
        />
        {invoicesPagination.hasMore && (
          <div className="py-md flex justify-center border-t border-outline-variant bg-surface-container-low">
            <button
              onClick={() => fetchInvoicesPaginated(false)}
              className="px-6 py-2 rounded-md font-label-md text-label-md bg-secondary-container hover:bg-secondary-container/85 text-on-secondary-container transition-colors cursor-pointer flex items-center gap-2"
            >
              Mostra altre fatture
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal: Emetti Fattura */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Emetti Nuova Fattura">
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {formError && <p className="text-error font-label-md text-label-md">{formError}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                ID Fattura <span className="text-error">*</span>
              </label>
              <input
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md"
                placeholder="INV-YYYY-XXXX"
                type="text"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Cliente <span className="text-error">*</span>
              </label>
              <SearchableSelect
                options={customers}
                value={customerId}
                onChange={setCustomerId}
                placeholder="Seleziona o cerca cliente..."
                noResultsText="Nessun cliente trovato"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Data Emissione <span className="text-error">*</span>
              </label>
              <input
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md text-on-surface"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Scadenza <span className="text-error">*</span>
              </label>
              <input
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md text-on-surface"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1">
              Importo (€) <span className="text-error">*</span>
            </label>
            <input
              className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md"
              placeholder="0.00"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
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
              Emetti
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Modifica Fattura */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Modifica Fattura ${selectedInvoice?.id}`}
      >
        <form onSubmit={handleUpdate} className="flex flex-col gap-5">
          {editFormError && (
            <p className="text-error font-label-md text-label-md">{editFormError}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                ID Fattura (Immutabile)
              </label>
              <input
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface-container-low text-on-surface-variant font-body-md opacity-75 cursor-not-allowed"
                type="text"
                value={selectedInvoice?.id || ''}
                disabled
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Cliente <span className="text-error">*</span>
              </label>
              <SearchableSelect
                options={customers}
                value={editCustomerId}
                onChange={setEditCustomerId}
                placeholder="Seleziona o cerca cliente..."
                noResultsText="Nessun cliente trovato"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Data Emissione <span className="text-error">*</span>
              </label>
              <input
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md text-on-surface"
                type="date"
                value={editIssueDate}
                onChange={(e) => setEditIssueDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Scadenza <span className="text-error">*</span>
              </label>
              <input
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md text-on-surface"
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1">
              Importo (€) <span className="text-error">*</span>
            </label>
            <input
              className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md text-on-surface"
              placeholder="0.00"
              type="number"
              step="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              required
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-outline-variant">
            <button
              type="button"
              className="px-4 py-2 rounded-md font-label-md text-label-md bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
              onClick={() => setEditModalOpen(false)}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md font-label-md text-label-md bg-primary hover:bg-primary/90 text-on-primary transition-colors shadow-sm cursor-pointer"
            >
              Salva Modifiche
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Conferma Eliminazione Fattura */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Elimina Fattura"
      >
        <div className="flex flex-col gap-4">
          {deleteError && <p className="text-error font-label-md text-label-md">{deleteError}</p>}
          <p className="text-body-md text-on-surface">
            Sei sicuro di voler eliminare la fattura <strong>{deleteInvoiceId}</strong>?
          </p>
          <p className="text-xs text-on-surface-variant border border-outline-variant/60 bg-surface-container-lowest p-2 rounded">
            <strong>Nota bene:</strong> L&apos;eliminazione della fattura comporterà la
            cancellazione di tutte le relative registrazioni contabili in Prima Nota e
            l&apos;eliminazione a cascata di eventuali pagamenti/incassi ad essa correlati. Questa
            operazione è irreversibile.
          </p>
          <div className="mt-4 flex justify-end gap-3 pt-3 border-t border-outline-variant">
            <button
              type="button"
              className="px-4 py-2 rounded-md font-label-md text-label-md bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Annulla
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md font-label-md text-label-md bg-error hover:bg-error/90 text-on-error transition-colors shadow-sm cursor-pointer"
              onClick={handleDeleteConfirm}
            >
              Conferma Eliminazione
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
