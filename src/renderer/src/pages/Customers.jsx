import { useEffect, useState, Fragment, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import Modal from '../components/Modal'
import SearchableSelect from '../components/SearchableSelect'
import {
  groupPaymentsByReceipt,
  computeAutoAllocation,
  computeManualAllocation
} from '../utils/payments'

export default function Customers() {
  const {
    customers,
    loading,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addMultiPayment,
    allocateAcconto,
    updateInvoice
  } = useStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  // Form State for New Customer
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')

  // Form State for Edit Customer
  const [editCustomerModalOpen, setEditCustomerModalOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editFormError, setEditFormError] = useState('')

  // Delete Customer State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Selected Customer Details States
  const [unpaidInvoices, setUnpaidInvoices] = useState([])
  const [clientPayments, setClientPayments] = useState([])
  const [clientJournal, setClientJournal] = useState([])
  const [detailTab, setDetailTab] = useState('unpaid') // 'unpaid' | 'payments' | 'accounting'
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  // Advanced Receipt Modal States
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receiptAmount, setReceiptAmount] = useState('')
  const [receiptMethod, setReceiptMethod] = useState('Contanti')
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
  // Expand state for grouped receipts in Storico Pagamenti
  const [expandedReceipts, setExpandedReceipts] = useState({})

  // Invoice Edit Modal States
  const [invoiceEditModalOpen, setInvoiceEditModalOpen] = useState(false)
  const [selectedInvoiceToEdit, setSelectedInvoiceToEdit] = useState(null)
  const [invoiceEditCustomerId, setInvoiceEditCustomerId] = useState('')
  const [invoiceEditIssueDate, setInvoiceEditIssueDate] = useState('')
  const [invoiceEditDueDate, setInvoiceEditDueDate] = useState('')
  const [invoiceEditAmount, setInvoiceEditAmount] = useState('')
  const [invoiceEditError, setInvoiceEditError] = useState('')
  const [pendingInvoiceEditId, setPendingInvoiceEditId] = useState(null)

  // If a customer is selected, load their specific details
  const loadCustomerDetail = async (customerId) => {
    setDetailLoading(true)
    setDetailError('')
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
      setDetailError(
        'Errore nel caricamento dei dettagli del cliente. Riprova selezionando nuovamente il cliente.'
      )
    } finally {
      setDetailLoading(false)
    }
  }

  const handleOpenInvoiceEdit = useCallback(
    (inv) => {
      setSelectedInvoiceToEdit(inv)
      setInvoiceEditCustomerId(selectedCustomer?.id || '')
      setInvoiceEditIssueDate(inv.issue_date ? inv.issue_date.split(' ')[0] : '')
      setInvoiceEditDueDate(inv.due_date ? inv.due_date.split(' ')[0] : '')
      setInvoiceEditAmount((Math.round(inv.amount * 100) / 100).toString())
      setInvoiceEditError('')
      setInvoiceEditModalOpen(true)
    },
    [selectedCustomer]
  )

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    if (location.state?.selectedCustomerId && customers.length > 0) {
      const cust = customers.find((c) => c.id === location.state.selectedCustomerId)
      if (cust) {
        const editInvoiceId = location.state.openEditInvoiceId
        // Usa setTimeout per evitare cascading render sincroni derivanti da setState nell'effetto
        setTimeout(() => {
          setSelectedCustomer(cust)
          loadCustomerDetail(cust.id)
          if (editInvoiceId) {
            setPendingInvoiceEditId(editInvoiceId)
          }
        }, 0)
        // Pulisce lo stato per evitare reinvocazioni su re-render
        navigate(location.pathname, { replace: true, state: {} })
      }
    }

    if (location.state?.openNewCustomerModal) {
      setTimeout(() => {
        setModalOpen(true)
      }, 0)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, customers, navigate, location.pathname])

  useEffect(() => {
    if (pendingInvoiceEditId && unpaidInvoices.length > 0) {
      const inv = unpaidInvoices.find((i) => i.id === pendingInvoiceEditId)
      if (inv) {
        setTimeout(() => {
          handleOpenInvoiceEdit(inv)
          setPendingInvoiceEditId(null)
        }, 0)
      }
    }
  }, [pendingInvoiceEditId, unpaidInvoices, handleOpenInvoiceEdit])

  const handleUpdateInvoice = async (e) => {
    e.preventDefault()
    setInvoiceEditError('')

    if (!invoiceEditCustomerId) {
      setInvoiceEditError('Seleziona un cliente.')
      return
    }

    const numAmount = parseFloat(invoiceEditAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setInvoiceEditError("L'importo deve essere maggiore di zero.")
      return
    }

    if (!invoiceEditIssueDate || !invoiceEditDueDate) {
      setInvoiceEditError('Date di emissione e scadenza sono richieste.')
      return
    }

    const updatedData = {
      customer_id: invoiceEditCustomerId,
      issue_date: invoiceEditIssueDate,
      due_date: invoiceEditDueDate,
      amount: numAmount
    }

    const res = await updateInvoice(selectedInvoiceToEdit.id, updatedData)
    if (res.success) {
      setInvoiceEditModalOpen(false)
      // Ricarica i dettagli del cliente per riflettere le modifiche
      loadCustomerDetail(selectedCustomer.id)
      const updatedCust = useStore.getState().customers.find((c) => c.id === selectedCustomer.id)
      if (updatedCust) {
        setSelectedCustomer(updatedCust)
      }
    } else {
      setInvoiceEditError(`Errore durante il salvataggio: ${res.error}`)
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

    const newCustomerId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `cust-${crypto.randomUUID()}`
        : `cust-${Date.now()}-${Math.floor(Math.random() * 100000)}`

    const newCustomer = {
      id: newCustomerId,
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

  const handleEditCustomerSubmit = async (e) => {
    e.preventDefault()
    setEditFormError('')
    if (!editName.trim()) {
      setEditFormError('Il nome o ragione sociale è richiesto.')
      return
    }

    const duplicate = customers.find(
      (c) => c.name.toLowerCase() === editName.trim().toLowerCase() && c.id !== selectedCustomer.id
    )
    if (duplicate) {
      setEditFormError('Un cliente con questo nome esiste già.')
      return
    }

    const res = await updateCustomer(selectedCustomer.id, {
      name: editName.trim(),
      email: editEmail.trim() || null
    })

    if (res.success) {
      setEditCustomerModalOpen(false)
      const updated = useStore.getState().customers.find((c) => c.id === selectedCustomer.id)
      if (updated) {
        setSelectedCustomer(updated)
      }
    } else {
      setEditFormError(`Errore durante il salvataggio: ${res.error}`)
    }
  }

  const handleDeleteCustomer = async () => {
    setDeleteError('')
    const res = await deleteCustomer(selectedCustomer.id)
    if (res.success) {
      setDeleteConfirmOpen(false)
      setSelectedCustomer(null)
    } else {
      setDeleteError(res.error)
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
      const result = computeAutoAllocation(total, unpaidInvoices)
      allocations = result.allocations
      accontoAmount = result.accontoAmount
    } else if (allocType === 'manual') {
      const result = computeManualAllocation(manualAllocations, unpaidInvoices, total)
      if (result.error) {
        setReceiptError(result.error)
        return
      }
      allocations = result.allocations
      accontoAmount = result.accontoAmount
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

    if (Math.abs(allocTotal - totalToAllocate) > 0.001) {
      setAllocCreditError(
        `La somma delle allocazioni manuali (€ ${allocTotal.toFixed(2)}) deve essere uguale all'importo da allocare (€ ${totalToAllocate.toFixed(2)}).`
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
    const rem = Math.round((invoice.remaining_amount ?? invoice.amount) * 100) / 100
    setReceiptAmount(rem.toString())
    setAllocType('manual')

    // Initialize all unpaid invoices to empty strings, except the selected one
    const initialManual = {}
    unpaidInvoices.forEach((inv) => {
      initialManual[inv.id] = inv.id === invoice.id ? rem.toString() : ''
    })
    setManualAllocations(initialManual)

    setReceiptError('')
    setReceiptModalOpen(true)
  }

  // Open receipt modal helper
  const openReceiptModal = () => {
    setReceiptAmount('')
    setReceiptError('')
    setReceiptDate(new Date().toISOString().split('T')[0])
    setReceiptMethod('Contanti')
    if (unpaidInvoices.length === 0) {
      setAllocType('acconto')
    } else {
      setAllocType('auto')
    }
    // Initialize/Reset manual allocations
    const initialManual = {}
    unpaidInvoices.forEach((inv) => {
      initialManual[inv.id] = ''
    })
    setManualAllocations(initialManual)
    setReceiptModalOpen(true)
  }

  // Dynamic remaining amount for manual allocation
  const getManualRemaining = () => {
    const total = parseFloat(receiptAmount) || 0
    let allocTotal = 0
    for (const invId in manualAllocations) {
      const amt = parseFloat(manualAllocations[invId])
      if (!isNaN(amt) && amt > 0) {
        allocTotal += amt
      }
    }
    return total - allocTotal
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
      <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden select-none font-sans">
        {/* 1. Desktop Workstation Toolbar */}
        <div className="h-10 bg-slate-50/70 border-b border-apple-border px-4 flex items-center justify-between text-[13px] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-apple-secondary font-medium">
              <span className="material-symbols-outlined text-[16px] text-apple-accent">
                group
              </span>
              <span className="text-apple-text font-semibold">Anagrafica Clienti</span>
            </div>
            <div className="h-3.5 w-px bg-apple-border hidden md:block" />
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded border border-apple-border text-[12px] text-apple-text focus-within:border-apple-accent">
              <span className="material-symbols-outlined text-[14px] text-apple-secondary">search</span>
              <input
                type="text"
                placeholder="Cerca per nome o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-[12px] text-apple-text placeholder:text-apple-subtle w-48 focus:ring-0 p-0"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-apple-subtle hover:text-apple-text cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[12px] text-apple-secondary font-mono bg-slate-100 px-2.5 py-0.5 rounded hidden lg:inline">
              Fatturato: {formatCurrency(totalInvoiced)}
            </span>
            <span
              className={`text-[12px] font-mono px-2.5 py-0.5 rounded font-medium border ${
                totalBalance > 0
                  ? 'bg-rose-50 text-rose-600 border-rose-200/50'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
              }`}
            >
              Crediti: {formatCurrency(totalBalance)}
            </span>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="h-7 px-3 bg-apple-accent hover:bg-apple-accent-hover text-white text-[12px] font-medium rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[14px]">person_add</span>
              <span>Nuovo Cliente</span>
            </button>
          </div>
        </div>

        {/* 2. Top Summary KPI Cards Strip */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-[#FAFAFA] border-b border-apple-border flex-shrink-0">
          <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle">
                Totale Clienti
              </span>
              <span className="material-symbols-outlined text-[18px] text-apple-accent">group</span>
            </div>
            <div className="font-mono font-bold text-[18px] text-apple-text">
              {totalClients}
            </div>
            <div className="text-[11px] text-apple-subtle mt-0.5">
              {filteredCustomers.length} anagrafiche filtrate
            </div>
          </div>

          <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle">
                Volume d&apos;Affari
              </span>
              <span className="material-symbols-outlined text-[18px] text-emerald-600">
                trending_up
              </span>
            </div>
            <div className="font-mono font-bold text-[18px] text-apple-text">
              {formatCurrency(totalInvoiced)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
              Fatturato complessivo emesso
            </div>
          </div>

          <div className="bg-white border border-rose-200/60 rounded-lg p-3 shadow-xs bg-rose-50/30">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">
                Crediti da Riscuotere
              </span>
              <span className="material-symbols-outlined text-[18px] text-rose-600">
                pending
              </span>
            </div>
            <div className="font-mono font-bold text-[18px] text-rose-600">
              {formatCurrency(totalBalance)}
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5">
              Insoluto totale dei clienti
            </div>
          </div>
        </div>

        {/* 3. Sub-strip */}
        <div className="h-8 px-3 bg-white border-b border-apple-border flex items-center justify-between text-[13px] text-apple-secondary flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-apple-text">Rubrica Clienti</span>
            <span className="text-apple-subtle font-mono text-[12px]">
              ({filteredCustomers.length} anagrafiche trovate)
            </span>
          </div>
          <span className="text-[11px] text-apple-subtle font-mono">
            Ordinamento: Alfabetico (A-Z)
          </span>
        </div>

        {/* 4. Dense High-Performance Desktop Table Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-apple-border text-[12px] uppercase font-semibold text-apple-subtle tracking-wider z-10">
              <tr>
                <th className="py-2 px-3 border-r border-apple-border/70">Ragione Sociale / Nome</th>
                <th className="py-2 px-3 border-r border-apple-border/70 w-56">Email Principale</th>
                <th className="py-2 px-3 border-r border-apple-border/70 text-right w-40">Fatturato Totale</th>
                <th className="py-2 px-3 border-r border-apple-border/70 text-right w-36">Acconto Libero</th>
                <th className="py-2 px-3 border-r border-apple-border/70 text-right w-40">Saldo da Ricevere</th>
                <th className="py-2 px-3 text-center w-28">Scheda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apple-border/50 text-[13px] text-apple-text font-normal font-sans">
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-apple-subtle">
                    <span className="material-symbols-outlined text-[24px] animate-spin mb-1 block mx-auto text-apple-accent">
                      progress_activity
                    </span>
                    Caricamento anagrafiche...
                  </td>
                </tr>
              ) : filteredCustomers.map((c) => {
                const availableAcc = c.total_acconto || 0
                return (
                  <tr
                    key={c.id}
                    onClick={() => {
                      if (
                        selectedCustomer &&
                        selectedCustomer.id !== c.id &&
                        allocType === 'manual' &&
                        Object.values(manualAllocations).some((v) => parseFloat(v) > 0)
                      ) {
                        const confirmed = window.confirm(
                          'Hai inserito allocazioni manuali per il cliente corrente. Cambiando cliente perderai questi dati non salvati. Continuare?'
                        )
                        if (!confirmed) return
                      }
                      setSelectedCustomer(c)
                      loadCustomerDetail(c.id)
                    }}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="py-2 px-3 border-r border-apple-border/70">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-apple-accent/10 text-apple-accent font-bold text-[11px] flex items-center justify-center border border-apple-accent/20 flex-shrink-0">
                          {getInitials(c.name)}
                        </div>
                        <span className="font-semibold text-apple-text truncate">
                          {c.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 border-r border-apple-border/70 font-mono text-[12px] text-apple-secondary truncate">
                      {c.email || '-'}
                    </td>
                    <td className="py-2 px-3 border-r border-apple-border/70 text-right font-mono font-medium text-apple-text whitespace-nowrap">
                      {formatCurrency(c.total_invoiced)}
                    </td>
                    <td className="py-2 px-3 border-r border-apple-border/70 text-right font-mono whitespace-nowrap">
                      {availableAcc > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200/50">
                          {formatCurrency(availableAcc)}
                        </span>
                      ) : (
                        <span className="text-apple-subtle">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 border-r border-apple-border/70 text-right font-mono whitespace-nowrap">
                      {c.balance <= 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-apple-green" />
                          In regola
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-apple-red" />
                          {formatCurrency(c.balance)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        className="h-6 px-2.5 rounded bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[11px] font-medium flex items-center justify-center gap-1 mx-auto transition cursor-pointer shadow-xs"
                      >
                        <span>Apri</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </button>
                    </td>
                  </tr>
                )
              })}

              {!loading && filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-apple-subtle text-[13px]">
                    Nessun cliente trovato con i criteri di ricerca specificati.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Bottom Table Summary Bar */}
        <div className="h-8 px-3 bg-slate-50 border-t border-apple-border flex items-center justify-between text-[12px] text-apple-secondary font-mono flex-shrink-0">
          <span>{filteredCustomers.length} clienti visualizzati su {totalClients}</span>
          <span className="font-semibold text-apple-text">
            Totale Crediti da Ricevere: {formatCurrency(totalBalance)}
          </span>
        </div>

        {/* Modal: Nuovo Cliente */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Nuova Anagrafica Cliente"
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200/60 text-[12px] text-rose-600 font-medium">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-apple-secondary mb-1">
                Ragione Sociale / Nome <span className="text-rose-600">*</span>
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text"
                placeholder="es. Acme Corp S.p.A."
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-apple-secondary mb-1">
                Indirizzo Email Principale
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text font-mono"
                placeholder="amministrazione@azienda.it"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-apple-border">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-lg bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[13px] transition cursor-pointer"
                onClick={() => setModalOpen(false)}
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-apple-accent hover:bg-apple-accent-hover text-white font-medium text-[13px] shadow-xs transition cursor-pointer"
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
  const groupedClientPayments = groupPaymentsByReceipt(clientPayments)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden select-none font-sans">
      {/* 1. Desktop Workstation Toolbar */}
      <div className="h-10 bg-slate-50/70 border-b border-apple-border px-4 flex items-center justify-between text-[13px] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedCustomer(null)}
            className="h-7 px-2.5 bg-white hover:bg-slate-100 border border-apple-border text-apple-secondary hover:text-apple-text text-[12px] font-medium rounded flex items-center gap-1 transition cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            <span>Tutti i Clienti</span>
          </button>
          <div className="h-4 w-px bg-apple-border" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-apple-accent/10 text-apple-accent font-bold text-[10px] flex items-center justify-center border border-apple-accent/20 flex-shrink-0">
              {getInitials(selectedCustomer.name)}
            </div>
            <span className="font-bold text-apple-text text-[13px] truncate max-w-[200px] sm:max-w-xs">
              {selectedCustomer.name}
            </span>
          </div>
        </div>

        {/* Action Panel Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-7 px-3 bg-apple-accent hover:bg-apple-accent-hover text-white text-[12px] font-medium rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            onClick={openReceiptModal}
          >
            <span className="material-symbols-outlined text-[15px]">add_card</span>
            <span>Registra Incasso</span>
          </button>
          <button
            type="button"
            className={`h-7 px-2.5 rounded text-[12px] font-medium flex items-center gap-1.5 transition shadow-xs ${
              availableCredit > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-slate-100 text-apple-subtle border border-apple-border/50 cursor-not-allowed opacity-60'
            }`}
            onClick={() => availableCredit > 0 && setAllocateModalOpen(true)}
            disabled={availableCredit <= 0}
            title={availableCredit > 0 ? 'Alloca credito acconto esistente su fatture' : 'Nessun acconto disponibile'}
          >
            <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
            <span>Alloca Acconto</span>
          </button>
          <button
            type="button"
            className="h-7 px-2.5 bg-white hover:bg-slate-100 border border-apple-border text-apple-secondary hover:text-apple-text text-[12px] font-medium rounded flex items-center gap-1 transition cursor-pointer shadow-xs"
            onClick={() => {
              setEditName(selectedCustomer.name)
              setEditEmail(selectedCustomer.email || '')
              setEditFormError('')
              setEditCustomerModalOpen(true)
            }}
          >
            <span className="material-symbols-outlined text-[15px]">edit</span>
            <span className="hidden sm:inline">Modifica</span>
          </button>
          <button
            type="button"
            className="h-7 px-2 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 text-[12px] font-medium rounded flex items-center gap-1 transition cursor-pointer shadow-xs"
            onClick={() => {
              setDeleteError('')
              setDeleteConfirmOpen(true)
            }}
            title="Elimina anagrafica cliente"
          >
            <span className="material-symbols-outlined text-[15px]">delete</span>
            <span className="hidden sm:inline">Elimina</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-[#FAFAFA] border-b border-apple-border flex-shrink-0">
        <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle">
              Fatturato Storico
            </span>
            <span className="material-symbols-outlined text-[18px] text-apple-accent">receipt_long</span>
          </div>
          <div className="font-mono font-bold text-[18px] text-apple-text">
            {formatCurrency(selectedCustomer.total_invoiced)}
          </div>
          <div className="text-[11px] text-apple-subtle mt-0.5">
            Totale documenti emessi
          </div>
        </div>

        <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle">
              Totale Incassato
            </span>
            <span className="material-symbols-outlined text-[18px] text-emerald-600">payments</span>
          </div>
          <div className="font-mono font-bold text-[18px] text-emerald-700">
            {formatCurrency(selectedCustomer.total_paid)}
          </div>
          <div className="text-[11px] text-apple-subtle mt-0.5">
            Pagamenti ricevuti e saldati
          </div>
        </div>

        <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle">
              Saldo da Ricevere
            </span>
            <span
              className={`material-symbols-outlined text-[18px] ${
                selectedCustomer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              hourglass_bottom
            </span>
          </div>
          <div
            className={`font-mono font-bold text-[18px] ${
              selectedCustomer.balance > 0 ? 'text-rose-600' : 'text-apple-text'
            }`}
          >
            {formatCurrency(selectedCustomer.balance)}
          </div>
          <div className="text-[11px] text-apple-subtle mt-0.5">
            {selectedCustomer.balance > 0 ? 'Credito residuo da incassare' : 'Nessun debito pendente'}
          </div>
        </div>

        <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle">
              Acconto / Credito Libero
            </span>
            <span
              className={`material-symbols-outlined text-[18px] ${
                availableCredit > 0 ? 'text-emerald-600' : 'text-apple-subtle'
              }`}
            >
              account_balance_wallet
            </span>
          </div>
          <div
            className={`font-mono font-bold text-[18px] ${
              availableCredit > 0 ? 'text-emerald-700' : 'text-apple-subtle'
            }`}
          >
            {formatCurrency(availableCredit)}
          </div>
          <div className="text-[11px] text-apple-subtle mt-0.5">
            {availableCredit > 0 ? 'Disponibile per compensazioni' : 'Nessun acconto non allocato'}
          </div>
        </div>
      </div>

      {/* 3. Segmented Tabs Header Bar */}
      <div className="h-9 bg-slate-50 border-b border-apple-border px-3 flex items-center justify-between text-[12px] flex-shrink-0">
        <div className="inline-flex items-center bg-slate-200/80 p-0.5 rounded-md text-[12px] font-medium">
          <button
            type="button"
            onClick={() => setDetailTab('unpaid')}
            className={`px-3 py-0.5 rounded transition cursor-pointer ${
              detailTab === 'unpaid'
                ? 'bg-white text-apple-text shadow-xs font-semibold'
                : 'text-apple-secondary hover:text-apple-text'
            }`}
          >
            Fatture Scoperte ({unpaidInvoices.length})
          </button>
          <button
            type="button"
            onClick={() => setDetailTab('payments')}
            className={`px-3 py-0.5 rounded transition cursor-pointer ${
              detailTab === 'payments'
                ? 'bg-white text-apple-text shadow-xs font-semibold'
                : 'text-apple-secondary hover:text-apple-text'
            }`}
          >
            Storico Incassi ({groupedClientPayments.length})
          </button>
          <button
            type="button"
            onClick={() => setDetailTab('accounting')}
            className={`px-3 py-0.5 rounded transition cursor-pointer ${
              detailTab === 'accounting'
                ? 'bg-white text-apple-text shadow-xs font-semibold'
                : 'text-apple-secondary hover:text-apple-text'
            }`}
          >
            Mastrino Contabile ({clientJournal.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => loadCustomerDetail(selectedCustomer.id)}
          className="h-6 px-2 bg-white hover:bg-slate-100 border border-apple-border text-apple-secondary hover:text-apple-text rounded text-[11px] font-medium flex items-center gap-1 shadow-xs transition cursor-pointer"
          title="Ricarica dati cliente"
        >
          <span className="material-symbols-outlined text-[13px]">sync</span>
          <span className="hidden sm:inline">Aggiorna</span>
        </button>
      </div>

      {/* 4. Tab Content Container */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white flex flex-col">
        {detailLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-apple-subtle">
            <span className="material-symbols-outlined text-[28px] animate-spin mb-2 text-apple-accent">
              progress_activity
            </span>
            <p className="text-[13px]">Caricamento dati cliente in corso...</p>
          </div>
        ) : detailError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <span className="material-symbols-outlined text-[32px] text-rose-500 mb-2">
              error
            </span>
            <p className="text-rose-600 font-medium text-[13px] mb-2">{detailError}</p>
            <button
              type="button"
              onClick={() => loadCustomerDetail(selectedCustomer.id)}
              className="h-7 px-3 rounded bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[12px] font-medium shadow-xs cursor-pointer"
            >
              Riprova
            </button>
          </div>
        ) : detailTab === 'unpaid' ? (
          /* TAB: FATTURE SCOPERTE */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-apple-border text-[12px] uppercase font-semibold text-apple-subtle tracking-wider z-10">
                  <tr>
                    <th className="py-2 px-3 border-r border-apple-border/70 w-32">N° Fattura</th>
                    <th className="py-2 px-3 border-r border-apple-border/70 w-32">Data Emissione</th>
                    <th className="py-2 px-3 border-r border-apple-border/70 w-32">Scadenza</th>
                    <th className="py-2 px-3 border-r border-apple-border/70 text-right w-36">Importo Totale</th>
                    <th className="py-2 px-3 border-r border-apple-border/70 text-right w-36">Già Incassato</th>
                    <th className="py-2 px-3 border-r border-apple-border/70 text-right w-40">Saldo Residuo</th>
                    <th className="py-2 px-3 text-center w-36">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border/50 text-[13px] text-apple-text font-normal font-sans">
                  {unpaidInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-apple-subtle">
                        <span className="material-symbols-outlined text-[32px] text-emerald-500 mb-1 block mx-auto">
                          check_circle
                        </span>
                        <span className="text-[13px] font-medium text-apple-text block">
                          Tutte le fatture risultano saldate
                        </span>
                        <span className="text-[12px] text-apple-subtle">
                          Nessuna partita aperta o scaduta pendente per questo cliente.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    unpaidInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="py-1.5 px-3 border-r border-apple-border/70 font-mono text-[12px]">
                          <button
                            type="button"
                            onClick={() => handleOpenInvoiceEdit(inv)}
                            className="text-apple-accent hover:underline font-semibold cursor-pointer"
                          >
                            #{inv.id}
                          </button>
                        </td>
                        <td className="py-1.5 px-3 border-r border-apple-border/70 font-mono text-[12px] text-apple-secondary">
                          {formatDate(inv.issue_date)}
                        </td>
                        <td className="py-1.5 px-3 border-r border-apple-border/70 font-mono text-[12px] text-apple-secondary">
                          {formatDate(inv.due_date)}
                        </td>
                        <td className="py-1.5 px-3 border-r border-apple-border/70 text-right font-mono text-apple-text">
                          {formatCurrency(inv.amount)}
                        </td>
                        <td className="py-1.5 px-3 border-r border-apple-border/70 text-right font-mono text-emerald-700">
                          {formatCurrency(inv.total_paid)}
                        </td>
                        <td className="py-1.5 px-3 border-r border-apple-border/70 text-right font-mono font-semibold text-rose-600">
                          {formatCurrency(inv.remaining_amount)}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              className="h-6 px-2.5 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shadow-xs"
                              onClick={() => handleQuickPay(inv)}
                              title="Salda questa fattura"
                            >
                              <span className="material-symbols-outlined text-[13px]">payments</span>
                              <span>Salda</span>
                            </button>
                            <button
                              type="button"
                              className="h-6 w-6 rounded bg-white hover:bg-slate-100 border border-apple-border text-apple-secondary hover:text-apple-text flex items-center justify-center transition cursor-pointer shadow-xs"
                              onClick={() => handleOpenInvoiceEdit(inv)}
                              title="Dettaglio e Modifica"
                            >
                              <span className="material-symbols-outlined text-[13px]">edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Bottom bar */}
            <div className="h-8 px-3 bg-slate-50 border-t border-apple-border flex items-center justify-between text-[12px] text-apple-secondary font-mono flex-shrink-0">
              <span>{unpaidInvoices.length} fatture scoperte</span>
              <span className="font-semibold text-apple-text">
                Totale Residuo da Saldare:{' '}
                {formatCurrency(
                  unpaidInvoices.reduce((sum, i) => sum + (i.remaining_amount ?? i.amount), 0)
                )}
              </span>
            </div>
          </div>
        ) : detailTab === 'payments' ? (
          /* TAB: STORICO INCASSI */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-apple-border text-[12px] uppercase font-semibold text-apple-subtle tracking-wider z-10">
                  <tr>
                    <th className="py-2 px-3 border-r border-apple-border/70 w-36">Data Incasso</th>
                    <th className="py-2 px-3 border-r border-apple-border/70 text-right w-36">
                      Importo Incassato
                    </th>
                    <th className="py-2 px-3 border-r border-apple-border/70 w-36">Metodo</th>
                    <th className="py-2 px-3 border-r border-apple-border/70">Destinazione Contabile</th>
                    <th className="py-2 px-3 text-center w-24">Dettagli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border/50 text-[13px] text-apple-text font-normal font-sans">
                  {groupedClientPayments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-apple-subtle">
                        <span className="material-symbols-outlined text-[32px] text-apple-subtle mb-1 block mx-auto">
                          receipt_long
                        </span>
                        <span className="text-[13px] font-medium text-apple-text block">
                          Nessun incasso registrato
                        </span>
                        <span className="text-[12px] text-apple-subtle">
                          Non sono ancora presenti movimenti di cassa per questo cliente.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    groupedClientPayments.map((group) => {
                      if (group.items.length === 1) {
                        const pay = group.items[0]
                        return (
                          <tr key={group.id} className="hover:bg-slate-50 transition">
                            <td className="py-1.5 px-3 border-r border-apple-border/70 font-mono text-[12px] text-apple-secondary">
                              {formatDateTime(pay.payment_date)}
                            </td>
                            <td className="py-1.5 px-3 border-r border-apple-border/70 text-right font-mono font-semibold text-emerald-700">
                              + {formatCurrency(pay.amount)}
                            </td>
                            <td className="py-1.5 px-3 border-r border-apple-border/70 font-medium text-apple-text">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-apple-secondary text-[11px]">
                                {pay.method}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 border-r border-apple-border/70 font-medium">
                              {pay.invoice_id ? (
                                <span className="text-apple-accent font-mono text-[12px]">
                                  Fattura #{pay.invoice_id}
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[11px] font-bold rounded">
                                  Acconto / Credito Libero
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 text-center text-apple-subtle text-[12px]">
                              -
                            </td>
                          </tr>
                        )
                      }

                      const isExpanded = !!expandedReceipts[group.id]
                      return (
                        <Fragment key={group.id}>
                          <tr
                            className="hover:bg-slate-50 transition cursor-pointer"
                            onClick={() =>
                              setExpandedReceipts((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                            }
                          >
                            <td className="py-1.5 px-3 border-r border-apple-border/70 font-mono text-[12px] text-apple-secondary">
                              {formatDateTime(group.payment_date)}
                            </td>
                            <td className="py-1.5 px-3 border-r border-apple-border/70 text-right font-mono font-bold text-emerald-700">
                              + {formatCurrency(group.total)}
                            </td>
                            <td className="py-1.5 px-3 border-r border-apple-border/70 font-medium text-apple-text">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-apple-secondary text-[11px]">
                                {group.method}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 border-r border-apple-border/70 font-medium">
                              <span className="inline-flex items-center gap-1.5 text-apple-accent text-[12px]">
                                <span className="material-symbols-outlined text-[16px]">
                                  {isExpanded ? 'expand_less' : 'expand_more'}
                                </span>
                                Split su {group.items.length} operazioni
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <span className="material-symbols-outlined text-[16px] text-apple-secondary">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/70">
                              <td colSpan={5} className="py-2.5 px-6">
                                <div className="max-w-[480px] bg-white border border-apple-border rounded-lg shadow-xs overflow-hidden">
                                  <div className="h-7 px-3 bg-slate-50 border-b border-apple-border flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-apple-subtle">
                                    <span>Ripartizione Incasso</span>
                                    <span>Importo</span>
                                  </div>
                                  <table className="w-full text-left border-collapse text-[12px]">
                                    <tbody className="divide-y divide-apple-border/40 font-mono">
                                      {group.items.map((pay) => (
                                        <tr key={pay.id} className="hover:bg-slate-50/50">
                                          <td className="py-1.5 px-3 font-medium">
                                            {pay.invoice_id ? (
                                              <span className="text-apple-accent">
                                                Fattura #{pay.invoice_id}
                                              </span>
                                            ) : (
                                              <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[10px] font-bold rounded">
                                                Acconto / Credito Libero
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-1.5 px-3 text-right font-semibold text-emerald-700">
                                            + {formatCurrency(pay.amount)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Bottom bar */}
            <div className="h-8 px-3 bg-slate-50 border-t border-apple-border flex items-center justify-between text-[12px] text-apple-secondary font-mono flex-shrink-0">
              <span>{groupedClientPayments.length} operazioni registrate</span>
              <span className="font-semibold text-apple-text">
                Totale Incassi:{' '}
                {formatCurrency(groupedClientPayments.reduce((sum, g) => sum + g.total, 0))}
              </span>
            </div>
          </div>
        ) : (
          /* TAB: MASTRINO PRIMA NOTA */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-apple-border text-[12px] uppercase font-semibold text-apple-subtle tracking-wider z-10">
                  <tr>
                    <th className="py-2 px-3 border-r border-apple-border/70 w-10 text-center"></th>
                    <th className="py-2 px-3 border-r border-apple-border/70 w-32">Data</th>
                    <th className="py-2 px-3 border-r border-apple-border/70">Descrizione Movimento</th>
                    <th className="py-2 px-3 border-r border-apple-border/70 w-32">Registro</th>
                    <th className="py-2 px-3 border-r border-apple-border/70 text-right w-36">Valore (€)</th>
                    <th className="py-2 px-3 text-center w-32">Quadratura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-border/50 text-[13px] text-apple-text font-normal font-sans">
                  {clientJournal.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-apple-subtle">
                        <span className="material-symbols-outlined text-[32px] text-apple-subtle mb-1 block mx-auto">
                          account_tree
                        </span>
                        <span className="text-[13px] font-medium text-apple-text block">
                          Nessuna scrittura contabile
                        </span>
                        <span className="text-[12px] text-apple-subtle">
                          Nessun movimento in Prima Nota registrato per questo cliente.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    clientJournal.map((entry) => {
                      const isExpanded = !!expandedJournal[entry.id]
                      const totalAmount = entry.lines
                        .filter((l) => l.type === 'debit')
                        .reduce((sum, l) => sum + l.amount, 0)
                      const totalCredit = entry.lines
                        .filter((l) => l.type === 'credit')
                        .reduce((sum, l) => sum + l.amount, 0)
                      const isBalanced = Math.abs(totalAmount - totalCredit) < 0.01

                      return (
                        <Fragment key={entry.id}>
                          <tr
                            className="hover:bg-slate-50 transition cursor-pointer"
                            onClick={() =>
                              setExpandedJournal((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))
                            }
                          >
                            <td className="py-1.5 px-3 border-r border-apple-border/70 text-center">
                              <span className="material-symbols-outlined text-[16px] text-apple-secondary">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 border-r border-apple-border/70 text-apple-secondary font-mono text-[12px]">
                              {formatDate(entry.entry_date)}
                            </td>
                            <td className="py-1.5 px-3 border-r border-apple-border/70 font-medium text-apple-text">
                              {entry.description}
                            </td>
                            <td className="py-1.5 px-3 border-r border-apple-border/70 text-apple-secondary capitalize font-mono text-[12px]">
                              {entry.reference_type}
                            </td>
                            <td className="py-1.5 px-3 border-r border-apple-border/70 text-right font-mono font-medium text-apple-text">
                              {formatCurrency(totalAmount)}
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              {isBalanced ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                                  <span className="w-1.5 h-1.5 rounded-full bg-apple-green" />
                                  Bilanciato
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200/50">
                                  <span className="w-1.5 h-1.5 rounded-full bg-apple-red" />
                                  Sbilanciato
                                </span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/70">
                              <td colSpan={6} className="py-2.5 px-6">
                                <div className="max-w-[620px] bg-white border border-apple-border rounded-lg shadow-xs overflow-hidden">
                                  <table className="w-full text-left border-collapse text-[12px]">
                                    <thead className="bg-slate-50 border-b border-apple-border text-[11px] uppercase font-semibold text-apple-subtle tracking-wider">
                                      <tr>
                                        <th className="py-1.5 px-3 border-r border-apple-border/70">Conto Contabile</th>
                                        <th className="py-1.5 px-3 border-r border-apple-border/70 text-right w-28">
                                          Dare (€)
                                        </th>
                                        <th className="py-1.5 px-3 text-right w-28">Avere (€)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-apple-border/40 font-mono">
                                      {entry.lines.map((line) => (
                                        <tr key={line.id} className="hover:bg-slate-50/50">
                                          <td className="py-1.5 px-3 border-r border-apple-border/70 font-sans text-apple-text font-medium">
                                            {line.account_name}
                                          </td>
                                          <td className="py-1.5 px-3 border-r border-apple-border/70 text-right text-apple-text">
                                            {line.type === 'debit' ? formatCurrency(line.amount) : '-'}
                                          </td>
                                          <td className="py-1.5 px-3 text-right text-apple-text">
                                            {line.type === 'credit' ? formatCurrency(line.amount) : '-'}
                                          </td>
                                        </tr>
                                      ))}
                                      <tr className="bg-slate-50 border-t border-apple-border font-bold text-[12px]">
                                        <td className="py-1.5 px-3 border-r border-apple-border/70 font-sans text-apple-text">
                                          Totale Registrazione
                                        </td>
                                        <td className="py-1.5 px-3 border-r border-apple-border/70 text-right text-apple-text">
                                          {formatCurrency(totalAmount)}
                                        </td>
                                        <td className="py-1.5 px-3 text-right text-apple-text">
                                          {formatCurrency(totalCredit)}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Bottom bar */}
            <div className="h-8 px-3 bg-slate-50 border-t border-apple-border flex items-center justify-between text-[12px] text-apple-secondary font-mono flex-shrink-0">
              <span>{clientJournal.length} registrazioni in Prima Nota</span>
              <span className="font-semibold text-apple-text">
                Partita Doppia Quadrata
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: REGISTRA NUOVO INCASSO */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title="Registra Incasso"
      >
        <form onSubmit={handleRegisterReceipt} className="space-y-4">
          {receiptError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200/60 text-[12px] text-rose-600 font-medium">
              {receiptError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-apple-secondary mb-1">
                Importo Ricevuto (€) <span className="text-rose-600">*</span>
              </label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text font-mono"
                placeholder="0.00"
                type="number"
                step="0.01"
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-apple-secondary mb-1">
                Data Incasso <span className="text-rose-600">*</span>
              </label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text font-mono"
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-apple-secondary mb-1">
              Metodo di Pagamento
            </label>
            <select
              className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text"
              value={receiptMethod}
              onChange={(e) => setReceiptMethod(e.target.value)}
            >
              <option value="Contanti">Contanti</option>
              <option value="Bonifico">Bonifico Bancario</option>
              <option value="Carta">Carta di Credito</option>
              <option value="Altro">Altro</option>
            </select>
          </div>

          <div className="border-t border-apple-border pt-3">
            {unpaidInvoices.length === 0 && (
              <div className="bg-blue-50/70 border border-blue-200/60 rounded-lg p-2.5 text-[12px] mb-3 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-apple-accent mt-0.5">info</span>
                <div>
                  <p className="font-semibold text-apple-text">
                    Nessuna fattura scoperta da saldare
                  </p>
                  <p className="text-apple-secondary mt-0.5">
                    Tutte le fatture risultano pagate. L&apos;intero importo verrà registrato come credito/acconto libero del cliente.
                  </p>
                </div>
              </div>
            )}

            {unpaidInvoices.length > 0 && (
              <>
                <span className="block text-[12px] font-medium text-apple-secondary mb-1.5">
                  Modalità Distribuzione Fondi
                </span>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    className={`py-1.5 px-2 border rounded-lg text-[12px] font-medium transition cursor-pointer text-center ${
                      allocType === 'auto'
                        ? 'border-apple-accent bg-apple-accent text-white shadow-xs font-semibold'
                        : 'border-apple-border bg-white text-apple-secondary hover:text-apple-text hover:bg-slate-50'
                    }`}
                    onClick={() => setAllocType('auto')}
                  >
                    Automatica (FIFO)
                  </button>
                  <button
                    type="button"
                    className={`py-1.5 px-2 border rounded-lg text-[12px] font-medium transition cursor-pointer text-center ${
                      allocType === 'manual'
                        ? 'border-apple-accent bg-apple-accent text-white shadow-xs font-semibold'
                        : 'border-apple-border bg-white text-apple-secondary hover:text-apple-text hover:bg-slate-50'
                    }`}
                    onClick={() => setAllocType('manual')}
                  >
                    Manuale su Fatture
                  </button>
                  <button
                    type="button"
                    className={`py-1.5 px-2 border rounded-lg text-[12px] font-medium transition cursor-pointer text-center ${
                      allocType === 'acconto'
                        ? 'border-apple-accent bg-apple-accent text-white shadow-xs font-semibold'
                        : 'border-apple-border bg-white text-apple-secondary hover:text-apple-text hover:bg-slate-50'
                    }`}
                    onClick={() => setAllocType('acconto')}
                  >
                    Solo Acconto
                  </button>
                </div>
              </>
            )}

            {/* Manual allocation table */}
            {unpaidInvoices.length > 0 && allocType === 'manual' && (
              <>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto border border-apple-border rounded-lg p-2 bg-slate-50/50">
                  {unpaidInvoices.map((inv) => {
                    const remaining = inv.remaining_amount ?? inv.amount
                    const val = parseFloat(manualAllocations[inv.id])
                    const inputError = !isNaN(val) && (val > remaining || val < 0)
                    return (
                      <div
                        key={inv.id}
                        className="flex flex-col gap-0.5 py-1 border-b border-apple-border/40 last:border-b-0"
                      >
                        <div className="flex justify-between items-center text-[12px]">
                          <span
                            className={`font-medium ${inputError ? 'text-rose-600 font-bold' : 'text-apple-text'}`}
                          >
                            Fattura #{inv.id}{' '}
                            <span className="text-apple-secondary font-mono text-[11px]">
                              (Residuo: {formatCurrency(remaining)})
                            </span>
                          </span>
                          <input
                            className={`w-28 px-2 py-1 rounded border text-right font-mono text-[12px] bg-white transition focus:outline-none ${
                              inputError
                                ? 'border-rose-500 focus:border-rose-500 text-rose-600 bg-rose-50 font-bold'
                                : 'border-apple-border focus:border-apple-accent'
                            }`}
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
                        {inputError && (
                          <span className="text-[10px] text-rose-600 text-right font-medium">
                            {val < 0
                              ? "L'importo deve essere positivo"
                              : `Supera il residuo di ${formatCurrency(remaining)}`}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                {(() => {
                  const restante = getManualRemaining()
                  return (
                    <div
                      className={`mt-2 p-2 rounded-lg text-[12px] font-semibold flex justify-between items-center ${
                        restante > 0.005
                          ? 'bg-blue-50 text-apple-accent border border-blue-200/60'
                          : Math.abs(restante) <= 0.005
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-rose-50 text-rose-600 border border-rose-200/60'
                      }`}
                    >
                      <span>Restante da distribuire:</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(restante)}
                        {restante > 0.005 && ' (in acconto libero)'}
                      </span>
                    </div>
                  )
                })()}
              </>
            )}

            {unpaidInvoices.length > 0 && allocType === 'auto' && (
              <>
                <p className="text-[12px] text-apple-secondary italic mb-2">
                  I fondi verranno usati per estinguere le fatture partendo dalla più vecchia
                  (per scadenza). L&apos;eventuale surplus verrà salvato come credito acconto.
                </p>
                {(() => {
                  const total = parseFloat(receiptAmount) || 0
                  let remaining = total
                  let allocated = 0
                  for (const inv of unpaidInvoices) {
                    const needed = inv.remaining_amount ?? inv.amount
                    const toPay = Math.min(remaining, needed)
                    allocated += toPay
                    remaining -= toPay
                  }
                  return (
                    <div className="p-2.5 rounded-lg text-[12px] bg-slate-50 border border-apple-border text-apple-secondary space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span>Assegnato a fatture:</span>
                        <span className="font-semibold text-apple-text">{formatCurrency(allocated)}</span>
                      </div>
                      {remaining > 0 && (
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>Eccedenza (acconto cliente):</span>
                          <span>{formatCurrency(remaining)}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </>
            )}

            {(unpaidInvoices.length === 0 || allocType === 'acconto') && (
              <p className="text-[12px] text-apple-secondary italic">
                L&apos;intero importo verrà registrato come credito acconto disponibile nel conto del cliente.
              </p>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-apple-border">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[12px] font-medium transition cursor-pointer shadow-xs"
              onClick={() => setReceiptModalOpen(false)}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-apple-accent hover:bg-apple-accent-hover text-white font-medium text-[12px] shadow-xs transition cursor-pointer"
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
        <form onSubmit={handleAllocateCredit} className="space-y-4">
          {allocCreditError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200/60 text-[12px] text-rose-600 font-medium">
              {allocCreditError}
            </div>
          )}

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-between text-[12px]">
            <span className="text-emerald-800 font-medium">Credito Disponibile da Allocare:</span>
            <span className="font-mono font-bold text-emerald-800 text-[14px]">
              {formatCurrency(availableCredit)}
            </span>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-apple-secondary mb-1">
              Importo da Allocare (€) <span className="text-rose-600">*</span>
            </label>
            <input
              className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text font-mono"
              placeholder="0.00"
              type="number"
              step="0.01"
              max={availableCredit}
              value={allocCreditAmount}
              onChange={(e) => setAllocCreditAmount(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="border-t border-apple-border pt-3">
            <span className="block text-[12px] font-medium text-apple-secondary mb-1.5">
              Distribuzione su Fatture Scoperte
            </span>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto border border-apple-border rounded-lg p-2 bg-slate-50/50">
              {unpaidInvoices.length === 0 ? (
                <p className="text-[12px] text-apple-subtle text-center py-4">
                  Nessuna fattura scoperta da saldare.
                </p>
              ) : (
                unpaidInvoices.map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center text-[12px] py-1 border-b border-apple-border/40 last:border-b-0">
                    <span className="font-medium text-apple-text">
                      Fattura #{inv.id}{' '}
                      <span className="text-apple-secondary font-mono text-[11px]">
                        (Residuo: {formatCurrency(inv.remaining_amount)})
                      </span>
                    </span>
                    <input
                      className="w-28 px-2 py-1 rounded border border-apple-border text-right font-mono text-[12px] bg-white focus:outline-none focus:border-apple-accent"
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

          <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-apple-border">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[12px] font-medium transition cursor-pointer shadow-xs"
              onClick={() => setAllocateModalOpen(false)}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-apple-accent hover:bg-apple-accent-hover text-white font-medium text-[12px] shadow-xs transition cursor-pointer"
            >
              Alloca Credito
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: MODIFICA CLIENTE */}
      <Modal
        isOpen={editCustomerModalOpen}
        onClose={() => setEditCustomerModalOpen(false)}
        title="Modifica Anagrafica Cliente"
      >
        <form onSubmit={handleEditCustomerSubmit} className="space-y-4">
          {editFormError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200/60 text-[12px] text-rose-600 font-medium">
              {editFormError}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-apple-secondary mb-1">
              Ragione Sociale / Nome <span className="text-rose-600">*</span>
            </label>
            <input
              className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-apple-secondary mb-1">
              Indirizzo Email Principale
            </label>
            <input
              className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text font-mono"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
          </div>

          <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-apple-border">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[12px] font-medium transition cursor-pointer shadow-xs"
              onClick={() => setEditCustomerModalOpen(false)}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-apple-accent hover:bg-apple-accent-hover text-white font-medium text-[12px] shadow-xs transition cursor-pointer"
            >
              Salva Modifiche
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CONFERMA ELIMINAZIONE CLIENTE */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Elimina Cliente"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200/60 text-[12px] text-rose-600 font-medium">
              {deleteError}
            </div>
          )}
          <div className="p-3 bg-slate-50 border border-apple-border rounded-lg text-[13px] text-apple-text">
            Sei sicuro di voler eliminare definitivamente il cliente{' '}
            <strong className="text-apple-text">{selectedCustomer?.name}</strong>?
            <p className="text-[12px] text-apple-subtle mt-1">
              Questa operazione è irreversibile e cancellerà l&apos;anagrafica.
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-apple-border">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[12px] font-medium transition cursor-pointer shadow-xs"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Annulla
            </button>
            <button
              type="button"
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-[12px] shadow-xs transition cursor-pointer"
              onClick={handleDeleteCustomer}
            >
              Conferma Eliminazione
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: DETTAGLIO E MODIFICA FATTURA */}
      <Modal
        isOpen={invoiceEditModalOpen}
        onClose={() => setInvoiceEditModalOpen(false)}
        title={`Dettaglio Fattura #${selectedInvoiceToEdit?.id || ''}`}
      >
        <form onSubmit={handleUpdateInvoice} className="space-y-4">
          {invoiceEditError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200/60 text-[12px] text-rose-600 font-medium">
              {invoiceEditError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-apple-secondary mb-1">
                ID Fattura (Immutabile)
              </label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-slate-100 text-apple-subtle font-mono cursor-not-allowed"
                type="text"
                value={selectedInvoiceToEdit?.id || ''}
                disabled
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-apple-secondary mb-1">
                Cliente <span className="text-rose-600">*</span>
              </label>
              <SearchableSelect
                options={customers}
                value={invoiceEditCustomerId}
                onChange={setInvoiceEditCustomerId}
                placeholder="Seleziona cliente..."
                noResultsText="Nessun cliente trovato"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-apple-secondary mb-1">
                Data Emissione <span className="text-rose-600">*</span>
              </label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text font-mono"
                type="date"
                value={invoiceEditIssueDate}
                onChange={(e) => setInvoiceEditIssueDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-apple-secondary mb-1">
                Scadenza <span className="text-rose-600">*</span>
              </label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text font-mono"
                type="date"
                value={invoiceEditDueDate}
                onChange={(e) => setInvoiceEditDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-apple-secondary mb-1">
              Importo Fattura (€) <span className="text-rose-600">*</span>
            </label>
            <input
              className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text font-mono"
              placeholder="0.00"
              type="number"
              step="0.01"
              value={invoiceEditAmount}
              onChange={(e) => setInvoiceEditAmount(e.target.value)}
              required
            />
          </div>

          {selectedInvoiceToEdit && (
            <div className="bg-slate-50 border border-apple-border rounded-lg p-2.5 text-[12px] space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-apple-secondary font-sans">Totale Già Incassato:</span>
                <span className="font-semibold text-emerald-700">
                  {formatCurrency(selectedInvoiceToEdit.total_paid || 0)}
                </span>
              </div>
              <div className="flex justify-between border-t border-apple-border/40 pt-1">
                <span className="text-apple-secondary font-sans">Saldo Residuo:</span>
                <span className="font-semibold text-rose-600">
                  {formatCurrency(selectedInvoiceToEdit.remaining_amount || 0)}
                </span>
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-apple-border">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[12px] font-medium transition cursor-pointer shadow-xs"
              onClick={() => setInvoiceEditModalOpen(false)}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-apple-accent hover:bg-apple-accent-hover text-white font-medium text-[12px] shadow-xs transition cursor-pointer"
            >
              Salva Modifiche
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
