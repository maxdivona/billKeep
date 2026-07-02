import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'

export default function Customers() {
  const { customers, loading, fetchCustomers, addCustomer, addMultiPayment, allocateAcconto } =
    useStore()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  // Form State for New Customer
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')

  // Selected Customer Details States
  const [unpaidInvoices, setUnpaidInvoices] = useState([])
  const [clientPayments, setClientPayments] = useState([])
  const [clientJournal, setClientJournal] = useState([])
  const [detailTab, setDetailTab] = useState('unpaid') // 'unpaid' | 'payments' | 'accounting'
  const [detailLoading, setDetailLoading] = useState(false)

  // Advanced Receipt Modal States
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receiptAmount, setReceiptAmount] = useState('')
  const [receiptMethod, setReceiptMethod] = useState('Bonifico')
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().split('T')[0])
  const [allocType, setAllocType] = useState('auto') // 'auto' | 'manual' | 'acconto'
  const [manualAllocations, setManualAllocations] = useState({}) // { invoiceId: amount }
  const [receiptError, setReceiptError] = useState('')

  // Allocation Credit Modal States
  const [allocateModalOpen, setAllocateModalOpen] = useState(false)
  const [allocCreditAmount, setAllocCreditAmount] = useState('')
  const [allocCreditManual, setAllocCreditManual] = useState({}) // { invoiceId: amount }
  const [allocCreditError, setAllocCreditError] = useState('')

  // Expand state for customer journal double entry
  const [expandedJournal, setExpandedJournal] = useState({})

  useEffect(() => {
    fetchCustomers()
  }, [])

  // If a customer is selected, load their specific details
  const loadCustomerDetail = async (customerId) => {
    setDetailLoading(true)
    try {
      const [invoices, payments, journal] = await Promise.all([
        window.api.getCustomerUnpaidInvoices(customerId),
        window.api.getCustomerPayments(customerId),
        window.api.getJournalEntries({ customerId })
      ])
      setUnpaidInvoices(invoices)
      setClientPayments(payments)
      setClientJournal(journal)

      // Initialize manual allocation inputs to empty strings
      const initialManual = {}
      invoices.forEach((inv) => {
        initialManual[inv.id] = ''
      })
      setManualAllocations(initialManual)
      setAllocCreditManual(initialManual)
    } catch (err) {
      console.error('Errore caricamento dettagli cliente:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    if (isNaN(d)) return dateStr
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr)
    if (isNaN(d)) return dateStr
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Il nome o ragione sociale è richiesto.')
      return
    }

    const duplicate = customers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase())
    if (duplicate) {
      setFormError('Un cliente con questo nome esiste già.')
      return
    }

    const newCustomer = {
      id: `cust-${Date.now()}`,
      name: name.trim(),
      email: email.trim() || null
    }

    const res = await addCustomer(newCustomer)
    if (res.success) {
      setName('')
      setEmail('')
      setFormError('')
      setModalOpen(false)
    } else {
      setFormError(`Errore durante il salvataggio: ${res.error}`)
    }
  }

  // Handle register receipt (Advanced Incasso)
  const handleRegisterReceipt = async (e) => {
    e.preventDefault()
    setReceiptError('')

    const total = parseFloat(receiptAmount)
    if (isNaN(total) || total <= 0) {
      setReceiptError("L'importo deve essere maggiore di zero.")
      return
    }

    let allocations = []
    let accontoAmount = 0

    if (allocType === 'auto') {
      // Allocate automatically from oldest to newest unpaid invoice
      let remaining = total
      const sortedInvoices = [...unpaidInvoices].sort(
        (a, b) => new Date(a.due_date) - new Date(b.due_date)
      )

      for (const inv of sortedInvoices) {
        if (remaining <= 0) break
        const needed = inv.remaining_amount
        const toPay = Math.min(remaining, needed)
        allocations.push({ invoiceId: inv.id, amount: toPay })
        remaining -= toPay
      }

      if (remaining > 0) {
        accontoAmount = remaining
      }
    } else if (allocType === 'manual') {
      // Manual allocations
      let allocTotal = 0
      for (const invId in manualAllocations) {
        const amt = parseFloat(manualAllocations[invId])
        if (!isNaN(amt) && amt > 0) {
          allocations.push({ invoiceId: invId, amount: amt })
          allocTotal += amt
        }
      }

      if (allocTotal > total) {
        setReceiptError(
          `L'importo inserito (€ ${total}) è minore della somma delle allocazioni (€ ${allocTotal}).`
        )
        return
      }

      accontoAmount = total - allocTotal
    } else {
      // Solo Acconto
      accontoAmount = total
    }

    const paymentData = {
      customerId: selectedCustomer.id,
      totalAmount: total,
      method: receiptMethod,
      date: receiptDate,
      allocations,
      accontoAmount
    }

    const res = await addMultiPayment(paymentData)
    if (res.success) {
      // Reset & close
      setReceiptAmount('')
      setReceiptModalOpen(false)
      // Refresh details and customer list
      loadCustomerDetail(selectedCustomer.id)
      const updatedCust = useStore.getState().customers.find((c) => c.id === selectedCustomer.id)
      if (updatedCust) {
        setSelectedCustomer(updatedCust)
      }
    } else {
      setReceiptError(`Errore durante la registrazione: ${res.error}`)
    }
  }

  // Handle allocate credit (Alloca Acconto)
  const handleAllocateCredit = async (e) => {
    e.preventDefault()
    setAllocCreditError('')

    const totalToAllocate = parseFloat(allocCreditAmount)
    const availableCredit = selectedCustomer.total_acconto || 0

    if (isNaN(totalToAllocate) || totalToAllocate <= 0) {
      setAllocCreditError("L'importo da allocare deve essere maggiore di zero.")
      return
    }

    if (totalToAllocate > availableCredit) {
      setAllocCreditError(
        `Credito insufficiente. Credito disponibile: ${formatCurrency(availableCredit)}`
      )
      return
    }

    // Parse allocations
    let allocations = []
    let allocTotal = 0
    for (const invId in allocCreditManual) {
      const amt = parseFloat(allocCreditManual[invId])
      if (!isNaN(amt) && amt > 0) {
        allocations.push({ invoiceId: invId, amount: amt })
        allocTotal += amt
      }
    }

    if (allocTotal !== totalToAllocate) {
      setAllocCreditError(
        `La somma delle allocazioni manuali (€ ${allocTotal}) deve essere uguale all'importo da allocare (€ ${totalToAllocate}).`
      )
      return
    }

    const data = {
      customerId: selectedCustomer.id,
      amountToAllocate: totalToAllocate,
      allocations
    }

    const res = await allocateAcconto(data)
    if (res.success) {
      setAllocCreditAmount('')
      setAllocateModalOpen(false)
      // Refresh
      loadCustomerDetail(selectedCustomer.id)
      const updatedCust = useStore.getState().customers.find((c) => c.id === selectedCustomer.id)
      if (updatedCust) {
        setSelectedCustomer(updatedCust)
      }
    } else {
      setAllocCreditError(`Errore durante l'allocazione: ${res.error}`)
    }
  }

  // Quick Pay Invoice helper (Salda interamente)
  const handleQuickPay = (invoice) => {
    setReceiptAmount(invoice.remaining_amount.toString())
    setAllocType('manual')
    setManualAllocations({
      [invoice.id]: invoice.remaining_amount
    })
    setReceiptModalOpen(true)
  }

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  )

  const getInitials = (fullName) => {
    const parts = fullName.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return fullName.substring(0, 2).toUpperCase()
  }

  // LIST VIEW: If no customer is selected
  if (!selectedCustomer) {
    const totalClients = customers.length
    const totalInvoiced = customers.reduce((sum, c) => sum + (c.total_invoiced || 0), 0)
    const totalBalance = customers.reduce((sum, c) => sum + (c.balance || 0), 0)

    return (
      <div>
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="font-headline-xl text-headline-xl text-on-surface mb-xs">
              Anagrafica Clienti
            </h2>
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
        <div className="mb-6 max-w-[400px]">
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
              <h3 className="font-label-md text-label-md text-on-surface-variant">
                Totale Clienti
              </h3>
            </div>
            <p className="font-headline-lg text-headline-lg text-on-surface font-bold tabular-nums">
              {totalClients}
            </p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-secondary">
                account_balance_wallet
              </span>
              <h3 className="font-label-md text-label-md text-on-surface-variant">
                Fatturato Totale
              </h3>
            </div>
            <p className="font-headline-lg text-headline-lg text-on-surface font-bold tabular-nums">
              {formatCurrency(totalInvoiced)}
            </p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-error">warning</span>
              <h3 className="font-label-md text-label-md text-on-surface-variant">
                Saldo da Ricevere
              </h3>
            </div>
            <p className="font-headline-lg text-headline-lg text-on-surface font-bold tabular-nums">
              {formatCurrency(totalBalance)}
            </p>
          </div>
        </div>

        {/* Client Table */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <DataTable
            data={filteredCustomers}
            emptyMessage="Nessun cliente trovato."
            headers={[
              'Nome / Ragione Sociale',
              'Email',
              { align: 'right', text: 'Fatturato Totale' },
              { align: 'right', text: 'Saldo Corrente' }
            ]}
            loading={loading}
            renderRow={(c) => (
              <tr
                key={c.id}
                className="hover:bg-surface-container-high transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedCustomer(c)
                  loadCustomerDetail(c.id)
                }}
              >
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
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container tabular-nums">
                      {formatCurrency(c.balance)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-error-container text-on-error-container tabular-nums">
                      - {formatCurrency(c.balance)}
                    </span>
                  )}
                </td>
              </tr>
            )}
            renderSkeletonRow={(n) => (
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
            )}
          />
        </div>

        {/* Modal: Nuovo Cliente */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Aggiungi Nuovo Cliente"
        >
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            {formError && <p className="text-error font-label-md text-label-md">{formError}</p>}

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Ragione Sociale / Nome <span className="text-error">*</span>
              </label>
              <input
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md text-on-surface"
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
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md text-on-surface"
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
        </Modal>
      </div>
    )
  }

  // SELECTED CLIENT DETAILS VIEW
  const availableCredit = selectedCustomer.total_acconto || 0

  return (
    <div>
      {/* Back Button and Client Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="space-y-1">
          <button
            className="flex items-center gap-1 text-primary hover:text-primary/80 font-label-md text-label-md transition-colors cursor-pointer"
            onClick={() => setSelectedCustomer(null)}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {"Torna all'elenco clienti"}
          </button>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">
              {getInitials(selectedCustomer.name)}
            </div>
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                {selectedCustomer.name}
              </h2>
              <p className="text-on-surface-variant font-body-sm text-body-sm">
                {selectedCustomer.email || 'Nessuna email'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Panel Buttons */}
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            className="flex-1 sm:flex-initial bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            onClick={() => setReceiptModalOpen(true)}
          >
            <span className="material-symbols-outlined text-[20px]">add_card</span>
            Registra Incasso
          </button>
          <button
            className={`flex-1 sm:flex-initial font-label-md text-label-md px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer border ${
              availableCredit > 0
                ? 'bg-secondary-container hover:bg-secondary-container/80 text-on-secondary-container border-secondary-container'
                : 'bg-surface-container-low text-on-surface-variant/40 border-outline-variant/30 cursor-not-allowed'
            }`}
            onClick={() => availableCredit > 0 && setAllocateModalOpen(true)}
            disabled={availableCredit <= 0}
          >
            <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
            Alloca Acconto
          </button>
        </div>
      </div>

      {/* Customer Financial Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md shadow-sm">
          <span className="text-on-surface-variant font-label-sm text-label-sm block mb-1">
            Fatturato Totale
          </span>
          <span className="text-headline-sm text-headline-sm font-bold tabular-nums">
            {formatCurrency(selectedCustomer.total_invoiced)}
          </span>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md shadow-sm">
          <span className="text-on-surface-variant font-label-sm text-label-sm block mb-1">
            Totale Incassato
          </span>
          <span className="text-headline-sm text-headline-sm font-bold tabular-nums text-secondary">
            {formatCurrency(selectedCustomer.total_paid)}
          </span>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md shadow-sm">
          <span className="text-on-surface-variant font-label-sm text-label-sm block mb-1">
            Saldo da Ricevere
          </span>
          <span className="text-headline-sm text-headline-sm font-bold tabular-nums text-error">
            {formatCurrency(selectedCustomer.balance)}
          </span>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md shadow-sm">
          <span className="text-on-surface-variant font-label-sm text-label-sm block mb-1">
            Credito / Acconto Libero
          </span>
          <span
            className={`text-headline-sm text-headline-sm font-bold tabular-nums ${availableCredit > 0 ? 'text-primary' : 'text-on-surface-variant/60'}`}
          >
            {formatCurrency(availableCredit)}
          </span>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className="border-b border-outline-variant flex gap-4 mb-6">
        <button
          className={`pb-sm font-label-md text-label-md transition-colors cursor-pointer border-b-2 px-1 ${
            detailTab === 'unpaid'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => setDetailTab('unpaid')}
        >
          Fatture Scoperte ({unpaidInvoices.length})
        </button>
        <button
          className={`pb-sm font-label-md text-label-md transition-colors cursor-pointer border-b-2 px-1 ${
            detailTab === 'payments'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => setDetailTab('payments')}
        >
          Storico Pagamenti ({clientPayments.length})
        </button>
        <button
          className={`pb-sm font-label-md text-label-md transition-colors cursor-pointer border-b-2 px-1 ${
            detailTab === 'accounting'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => setDetailTab('accounting')}
        >
          Prima Nota Cliente ({clientJournal.length})
        </button>
      </div>

      {/* TAB CONTENTS */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl shadow-sm overflow-hidden min-h-[250px]">
        {detailLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-on-surface-variant text-body-md">Caricamento in corso...</p>
          </div>
        ) : detailTab === 'unpaid' ? (
          <DataTable
            headers={[
              'N° Fattura',
              'Data Emissione',
              'Scadenza',
              { text: 'Importo', align: 'right' },
              { text: 'Incassato', align: 'right' },
              { text: 'Saldo Residuo', align: 'right' },
              { text: 'Azione', align: 'center' }
            ]}
            data={unpaidInvoices}
            emptyMessage="Nessuna fattura scoperta trovata per questo cliente."
            renderRow={(inv) => (
              <tr key={inv.id} className="hover:bg-surface-container-high transition-colors">
                <td className="py-xs px-sm font-medium">#{inv.id}</td>
                <td className="py-xs px-sm text-on-surface-variant">
                  {formatDate(inv.issue_date)}
                </td>
                <td className="py-xs px-sm text-on-surface-variant">{formatDate(inv.due_date)}</td>
                <td className="py-xs px-sm text-right tabular-nums">
                  {formatCurrency(inv.amount)}
                </td>
                <td className="py-xs px-sm text-right text-secondary tabular-nums">
                  {formatCurrency(inv.total_paid)}
                </td>
                <td className="py-xs px-sm text-right font-medium text-error tabular-nums">
                  {formatCurrency(inv.remaining_amount)}
                </td>
                <td className="py-xs px-sm text-center">
                  <button
                    className="bg-primary-container text-on-primary-container hover:bg-primary-container/80 font-label-sm text-label-sm px-3 py-1.5 rounded transition-colors cursor-pointer"
                    onClick={() => handleQuickPay(inv)}
                  >
                    Salda
                  </button>
                </td>
              </tr>
            )}
          />
        ) : detailTab === 'payments' ? (
          <DataTable
            headers={['Data Incasso', 'Importo', 'Metodo', 'Destinazione Contabile']}
            data={clientPayments}
            emptyMessage="Nessun pagamento registrato per questo cliente."
            renderRow={(pay) => (
              <tr key={pay.id} className="hover:bg-surface-container-high transition-colors">
                <td className="py-xs px-sm text-on-surface-variant">
                  {formatDateTime(pay.payment_date)}
                </td>
                <td className="py-xs px-sm text-secondary font-medium tabular-nums">
                  + {formatCurrency(pay.amount)}
                </td>
                <td className="py-xs px-sm">{pay.method}</td>
                <td className="py-xs px-sm font-medium">
                  {pay.invoice_id ? (
                    <span className="text-primary">Fattura #{pay.invoice_id}</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[11px] font-bold rounded-full">
                      Acconto / Credito Libero
                    </span>
                  )}
                </td>
              </tr>
            )}
          />
        ) : (
          /* ACCOUNTING PRIMA NOTA */
          <div className="p-0">
            {clientJournal.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant text-body-md">
                Nessuna registrazione contabile trovata.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant text-left">
                    <th className="w-10"></th>
                    <th className="py-xs px-sm font-label-sm text-label-sm text-on-surface-variant">
                      Data
                    </th>
                    <th className="py-xs px-sm font-label-sm text-label-sm text-on-surface-variant">
                      Descrizione
                    </th>
                    <th className="py-xs px-sm font-label-sm text-label-sm text-on-surface-variant">
                      Rif. Tipo
                    </th>
                    <th className="py-xs px-sm font-label-sm text-label-sm text-on-surface-variant text-right">
                      Valore
                    </th>
                    <th className="py-xs px-sm font-label-sm text-label-sm text-on-surface-variant text-center">
                      Stato
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientJournal.map((entry) => {
                    const isExpanded = !!expandedJournal[entry.id]
                    const totalAmount = entry.lines
                      .filter((l) => l.type === 'debit')
                      .reduce((sum, l) => sum + l.amount, 0)
                    const totalCredit = entry.lines
                      .filter((l) => l.type === 'credit')
                      .reduce((sum, l) => sum + l.amount, 0)
                    const isBalanced = Math.abs(totalAmount - totalCredit) < 0.01

                    return (
                      <caption key={entry.id} className="w-full display-table-row-group text-left">
                        <tr
                          className="hover:bg-surface-container-high transition-colors cursor-pointer border-b border-outline-variant/60"
                          onClick={() =>
                            setExpandedJournal((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))
                          }
                        >
                          <td className="py-xs px-sm text-center">
                            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                              {isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                            </span>
                          </td>
                          <td className="py-xs px-sm text-on-surface-variant tabular-nums">
                            {formatDate(entry.entry_date)}
                          </td>
                          <td className="py-xs px-sm font-medium">{entry.description}</td>
                          <td className="py-xs px-sm text-on-surface-variant capitalize">
                            {entry.reference_type}
                          </td>
                          <td className="py-xs px-sm text-right font-medium tabular-nums">
                            {formatCurrency(totalAmount)}
                          </td>
                          <td className="py-xs px-sm text-center">
                            {isBalanced ? (
                              <span className="inline-flex px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[11px] rounded-full">
                                Bilanciato
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 bg-error-container text-on-error-container text-[11px] rounded-full">
                                Sbilanciato
                              </span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-surface-container-lowest/30 border-b border-outline-variant">
                            <td colSpan="6" className="p-sm">
                              <div className="ml-8 max-w-[600px] border border-outline-variant rounded-lg overflow-hidden bg-surface-container-lowest shadow-sm">
                                <table className="w-full border-collapse text-left">
                                  <thead>
                                    <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] text-on-surface-variant">
                                      <th className="py-xs px-sm">Conto Contabile</th>
                                      <th className="py-xs px-sm text-right">Dare</th>
                                      <th className="py-xs px-sm text-right">Avere</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {entry.lines.map((line) => (
                                      <tr
                                        key={line.id}
                                        className="border-b border-outline-variant/30 text-xs"
                                      >
                                        <td className="py-xs px-sm font-medium">
                                          {line.account_name}
                                        </td>
                                        <td className="py-xs px-sm text-right font-semibold text-on-surface tabular-nums">
                                          {line.type === 'debit'
                                            ? formatCurrency(line.amount)
                                            : '-'}
                                        </td>
                                        <td className="py-xs px-sm text-right font-semibold text-on-surface tabular-nums">
                                          {line.type === 'credit'
                                            ? formatCurrency(line.amount)
                                            : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="bg-surface-container-low font-bold text-xs border-t border-outline-variant">
                                      <td className="py-xs px-sm">Totale (Doppio Controllo)</td>
                                      <td className="py-xs px-sm text-right tabular-nums">
                                        {formatCurrency(totalAmount)}
                                      </td>
                                      <td className="py-xs px-sm text-right tabular-nums">
                                        {formatCurrency(totalAmount)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </caption>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL: REGISTRA NUOVO INCASSO */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title="Registra Incasso Avanzato"
      >
        <form onSubmit={handleRegisterReceipt} className="flex flex-col gap-4">
          {receiptError && <p className="text-error font-label-md text-label-md">{receiptError}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface mb-1">
                Importo Ricevuto (€) <span className="text-error">*</span>
              </label>
              <input
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface text-body-md text-on-surface focus:outline-none focus:border-primary"
                placeholder="0.00"
                type="number"
                step="0.01"
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface mb-1">
                Data Incasso
              </label>
              <input
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface text-body-md text-on-surface focus:outline-none focus:border-primary"
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">
              Metodo di Pagamento
            </label>
            <select
              className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface text-body-md text-on-surface focus:outline-none focus:border-primary"
              value={receiptMethod}
              onChange={(e) => setReceiptMethod(e.target.value)}
            >
              <option value="Bonifico">Bonifico Bancario</option>
              <option value="Carta">Carta di Credito</option>
              <option value="Contanti">Contanti</option>
              <option value="Altro">Altro</option>
            </select>
          </div>

          <div className="border-t border-outline-variant pt-3">
            <span className="block font-label-sm text-label-sm text-on-surface mb-2 font-semibold">
              Modalità Distribuzione Fondi
            </span>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                type="button"
                className={`py-2 px-2 border rounded text-xs font-semibold cursor-pointer text-center ${
                  allocType === 'auto'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-outline-variant text-on-surface-variant'
                }`}
                onClick={() => setAllocType('auto')}
              >
                Automatica (FIFO)
              </button>
              <button
                type="button"
                className={`py-2 px-2 border rounded text-xs font-semibold cursor-pointer text-center ${
                  allocType === 'manual'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-outline-variant text-on-surface-variant'
                }`}
                onClick={() => setAllocType('manual')}
              >
                Manuale su Fatture
              </button>
              <button
                type="button"
                className={`py-2 px-2 border rounded text-xs font-semibold cursor-pointer text-center ${
                  allocType === 'acconto'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-outline-variant text-on-surface-variant'
                }`}
                onClick={() => setAllocType('acconto')}
              >
                Solo Acconto
              </button>
            </div>

            {/* Render conditional inputs for manual allocation */}
            {allocType === 'manual' && (
              <div className="space-y-2 max-h-[160px] overflow-y-auto border border-outline-variant/60 rounded p-2 bg-surface-container-lowest">
                {unpaidInvoices.length === 0 ? (
                  <p className="text-xs text-on-surface-variant text-center py-2">
                    Nessuna fattura scoperta da saldare.
                  </p>
                ) : (
                  unpaidInvoices.map((inv) => (
                    <div key={inv.id} className="flex justify-between items-center text-xs">
                      <span className="font-medium text-on-surface">
                        #{inv.id} (Rimanente: {formatCurrency(inv.remaining_amount)})
                      </span>
                      <input
                        className="w-24 border border-outline-variant rounded px-2 py-1 bg-surface text-right tabular-nums text-on-surface focus:outline-none"
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        value={manualAllocations[inv.id] || ''}
                        onChange={(e) =>
                          setManualAllocations({
                            ...manualAllocations,
                            [inv.id]: e.target.value
                          })
                        }
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {allocType === 'auto' && (
              <p className="text-xs text-on-surface-variant/80 italic">
                I fondi verranno usati per pagare le fatture scoperte partendo dalla più vecchia
                (data scadenza). Eventuali eccedenze verranno registrate come acconto.
              </p>
            )}

            {allocType === 'acconto' && (
              <p className="text-xs text-on-surface-variant/80 italic">
                {
                  "L'intero importo verrà registrato come acconto sul conto del cliente, per essere allocato successivamente."
                }
              </p>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-3 pt-3 border-t border-outline-variant">
            <button
              type="button"
              className="px-4 py-2 rounded-md font-label-md text-label-md bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
              onClick={() => setReceiptModalOpen(false)}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md font-label-md text-label-md bg-primary hover:bg-primary/90 text-on-primary transition-colors shadow-sm cursor-pointer"
            >
              Registra Incasso
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ALLOCA ACCONTO ESISTENTE */}
      <Modal
        isOpen={allocateModalOpen}
        onClose={() => setAllocateModalOpen(false)}
        title="Alloca Credito Acconto"
      >
        <form onSubmit={handleAllocateCredit} className="flex flex-col gap-4">
          {allocCreditError && (
            <p className="text-error font-label-md text-label-md">{allocCreditError}</p>
          )}

          <div>
            <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
              Credito Disponibile:{' '}
              <strong className="text-primary">{formatCurrency(availableCredit)}</strong>
            </span>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1 mt-2">
              Importo da Allocare (€) <span className="text-error">*</span>
            </label>
            <input
              className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface text-body-md text-on-surface focus:outline-none focus:border-primary"
              placeholder="0.00"
              type="number"
              step="0.01"
              max={availableCredit}
              value={allocCreditAmount}
              onChange={(e) => setAllocCreditAmount(e.target.value)}
              required
            />
          </div>

          <div className="border-t border-outline-variant pt-3">
            <span className="block font-label-sm text-label-sm text-on-surface mb-2 font-semibold">
              Distribuzione su Fatture Scoperte
            </span>
            <div className="space-y-2 max-h-[200px] overflow-y-auto border border-outline-variant/60 rounded p-2 bg-surface-container-lowest">
              {unpaidInvoices.length === 0 ? (
                <p className="text-xs text-on-surface-variant text-center py-2">
                  Nessuna fattura scoperta da saldare.
                </p>
              ) : (
                unpaidInvoices.map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center text-xs">
                    <span className="font-medium text-on-surface font-semibold">
                      #{inv.id} (Rimanente: {formatCurrency(inv.remaining_amount)})
                    </span>
                    <input
                      className="w-24 border border-outline-variant rounded px-2 py-1 bg-surface text-right tabular-nums text-on-surface focus:outline-none"
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      value={allocCreditManual[inv.id] || ''}
                      onChange={(e) =>
                        setAllocCreditManual({
                          ...allocCreditManual,
                          [inv.id]: e.target.value
                        })
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3 pt-3 border-t border-outline-variant">
            <button
              type="button"
              className="px-4 py-2 rounded-md font-label-md text-label-md bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
              onClick={() => setAllocateModalOpen(false)}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md font-label-md text-label-md bg-primary hover:bg-primary/90 text-on-primary transition-colors shadow-sm cursor-pointer"
            >
              Alloca Credito
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
