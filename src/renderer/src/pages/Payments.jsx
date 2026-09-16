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

export default function Payments() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    paginatedPayments,
    paymentsPagination,
    fetchPaymentsPaginated,
    setPaymentsFilters,
    customers,
    loading,
    fetchCustomers,
    fetchPayments,
    payments,
    addMultiPayment,
    updatePayment,
    deletePayment
  } = useStore()

  // Form State for Register Payment Modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [unpaidInvoices, setUnpaidInvoices] = useState([])
  const [allocType, setAllocType] = useState('auto') // 'auto', 'manual', 'acconto'
  const [manualAllocations, setManualAllocations] = useState({})
  const [detailLoading, setDetailLoading] = useState(false)

  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState('Contanti')
  const [formError, setFormError] = useState('')

  // Form State for Edit Payment
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editPaymentDate, setEditPaymentDate] = useState('')
  const [editMethod, setEditMethod] = useState('Contanti')
  const [editFormError, setEditFormError] = useState('')

  // Delete Payment State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletePaymentId, setDeletePaymentId] = useState('')
  const [deleteError, setDeleteError] = useState('')

  // Filter and Selection States
  const [searchTerm, setSearchTerm] = useState(paymentsPagination.search)
  const [methodFilter, setMethodFilter] = useState('all') // 'all', 'Contanti', 'Bonifico', 'Carta', 'Uso Credito'
  const [selectedReceiptId, setSelectedReceiptId] = useState(null)
  const [expandedReceipts, setExpandedReceipts] = useState({})

  const resetRegistrationForm = useCallback(() => {
    setSelectedCustomerId('')
    setAmount('')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setMethod('Contanti')
    setUnpaidInvoices([])
    setManualAllocations({})
    setAllocType('auto')
    setFormError('')
  }, [])

  // Listener for external navigation (e.g., Spotlight or shortcuts)
  useEffect(() => {
    if (location.state?.focusPaymentForm) {
      const timer = setTimeout(() => {
        resetRegistrationForm()
        setRegisterModalOpen(true)
        navigate(location.pathname, { replace: true, state: {} })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [location.state, navigate, location.pathname, resetRegistrationForm])

  // Debounced search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPaymentsFilters({ search: searchTerm })
      fetchPaymentsPaginated(true)
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchTerm, setPaymentsFilters, fetchPaymentsPaginated])

  // Fetch initial customers and payments
  useEffect(() => {
    fetchCustomers()
    fetchPayments()
  }, [fetchCustomers, fetchPayments])

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0)
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

  const getInitials = (fullName) => {
    if (!fullName) return 'CL'
    const parts = fullName.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return fullName.substring(0, 2).toUpperCase()
  }

  const handleCustomerChange = async (customerId) => {
    setSelectedCustomerId(customerId)
    setFormError('')
    if (!customerId) {
      setUnpaidInvoices([])
      setManualAllocations({})
      return
    }

    setDetailLoading(true)
    try {
      const invoicesList = await window.api.getCustomerUnpaidInvoices(customerId)
      setUnpaidInvoices(invoicesList)

      if (invoicesList.length === 0) {
        setAllocType('acconto')
      } else {
        setAllocType('auto')
      }

      const initialManual = {}
      invoicesList.forEach((inv) => {
        initialManual[inv.id] = ''
      })
      setManualAllocations(initialManual)
    } catch (err) {
      console.error('Errore caricamento fatture scoperte:', err)
      setFormError('Errore nel caricamento delle fatture scoperte.')
    } finally {
      setDetailLoading(false)
    }
  }

  const getManualRemaining = () => {
    const total = parseFloat(amount) || 0
    let allocTotal = 0
    for (const invId in manualAllocations) {
      const amt = parseFloat(manualAllocations[invId])
      if (!isNaN(amt) && amt > 0) {
        allocTotal += amt
      }
    }
    return total - allocTotal
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!selectedCustomerId) {
      setFormError('Seleziona un cliente.')
      return
    }

    const total = parseFloat(amount)
    if (isNaN(total) || total <= 0) {
      setFormError("L'importo deve essere maggiore di zero.")
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
        setFormError(result.error)
        return
      }
      allocations = result.allocations
      accontoAmount = result.accontoAmount
    } else {
      accontoAmount = total
    }

    const paymentData = {
      customerId: selectedCustomerId,
      totalAmount: total,
      method: method,
      date: paymentDate,
      allocations,
      accontoAmount
    }

    const res = await addMultiPayment(paymentData)
    if (res.success) {
      resetRegistrationForm()
      setRegisterModalOpen(false)
      fetchPayments()
      fetchPaymentsPaginated(true)
    } else {
      setFormError(`Errore durante il salvataggio: ${res.error}`)
    }
  }

  const handleEdit = (pay) => {
    setSelectedPayment(pay)
    setEditAmount((Math.round(pay.amount * 100) / 100).toString())
    setEditPaymentDate(pay.payment_date ? pay.payment_date.split(' ')[0] : '')
    setEditMethod(pay.method || 'Contanti')
    setEditFormError('')
    setEditModalOpen(true)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setEditFormError('')

    const numAmount = parseFloat(editAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setEditFormError("L'importo deve essere maggiore di zero.")
      return
    }
    if (!editPaymentDate) {
      setEditFormError('La data del pagamento è richiesta.')
      return
    }

    const updatedData = {
      amount: numAmount,
      payment_date: editPaymentDate,
      method: editMethod
    }

    const res = await updatePayment(selectedPayment.id, updatedData)
    if (res.success) {
      setEditModalOpen(false)
      fetchPayments()
      fetchPaymentsPaginated(true)
    } else {
      setEditFormError(`Errore durante il salvataggio: ${res.error}`)
    }
  }

  const handleDeleteClick = (payId) => {
    setDeletePaymentId(payId)
    setDeleteError('')
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setDeleteError('')
    const res = await deletePayment(deletePaymentId)
    if (res.success) {
      setDeleteConfirmOpen(false)
      setSelectedReceiptId(null)
      fetchPayments()
      fetchPaymentsPaginated(true)
    } else {
      setDeleteError(res.error)
    }
  }

  // Global KPI Calculations from complete payments array
  const allPayments = payments || []
  const totalCollected = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const cashPayments = allPayments.filter((p) => p.method === 'Contanti')
  const cashCollected = cashPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const electronicPayments = allPayments.filter(
    (p) => p.method === 'Bonifico' || p.method === 'Carta'
  )
  const electronicCollected = electronicPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const creditAllocations = allPayments.filter((p) => p.method === 'Uso Credito')
  const creditAllocated = creditAllocations.reduce((sum, p) => sum + (p.amount || 0), 0)

  // Grouped paginated payments
  const groupedPayments = groupPaymentsByReceipt(paginatedPayments)
  const filteredGroups = groupedPayments.filter((group) => {
    if (methodFilter !== 'all' && group.method !== methodFilter) return false
    return true
  })

  // Currently active selected group for side inspector
  const activeReceipt =
    filteredGroups.find((g) => g.id === selectedReceiptId) ||
    groupedPayments.find((g) => g.id === selectedReceiptId) ||
    null

  const renderMethodBadge = (m) => {
    switch (m) {
      case 'Contanti':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 whitespace-nowrap">
            <span className="material-symbols-outlined text-[13px]">payments</span>
            Contanti
          </span>
        )
      case 'Bonifico':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 whitespace-nowrap">
            <span className="material-symbols-outlined text-[13px]">account_balance</span>
            Bonifico
          </span>
        )
      case 'Carta':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 whitespace-nowrap">
            <span className="material-symbols-outlined text-[13px]">credit_card</span>
            Carta
          </span>
        )
      case 'Uso Credito':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 whitespace-nowrap">
            <span className="material-symbols-outlined text-[13px]">swap_horiz</span>
            Uso Credito
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60 whitespace-nowrap">
            <span className="material-symbols-outlined text-[13px]">more_horiz</span>
            {m || 'Altro'}
          </span>
        )
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden select-none font-sans">
      {/* 1. Desktop Workstation Toolbar */}
      <div className="h-10 bg-slate-50/70 border-b border-apple-border px-4 flex items-center justify-between text-[13px] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-apple-secondary font-medium">
            <span className="material-symbols-outlined text-[16px] text-apple-accent">payments</span>
            <span className="text-apple-text font-semibold">Registro Pagamenti</span>
          </div>
          <div className="h-3.5 w-px bg-apple-border hidden md:block" />

          {/* Live Search */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded border border-apple-border text-[12px] text-apple-text focus-within:border-apple-accent">
            <span className="material-symbols-outlined text-[14px] text-apple-secondary">search</span>
            <input
              type="text"
              placeholder="Cerca cliente o transazione..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-[12px] text-apple-text placeholder:text-apple-subtle w-44 lg:w-56 focus:ring-0 p-0"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-apple-subtle hover:text-apple-text cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">close</span>
              </button>
            )}
          </div>

          {/* Method Filter Segmented Buttons */}
          <div className="hidden xl:flex items-center gap-0.5 bg-slate-200/70 p-0.5 rounded text-[11px] font-medium">
            {['all', 'Contanti', 'Bonifico', 'Carta', 'Uso Credito'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethodFilter(m)}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  methodFilter === m
                    ? 'bg-white text-apple-text shadow-xs font-semibold'
                    : 'text-apple-secondary hover:text-apple-text'
                }`}
              >
                {m === 'all' ? 'Tutti i Metodi' : m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              resetRegistrationForm()
              setRegisterModalOpen(true)
            }}
            className="h-7 px-3 bg-apple-accent hover:bg-apple-accent-hover text-white text-[12px] font-medium rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[15px]">add_card</span>
            <span>Registra Incasso</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-[#FAFAFA] border-b border-apple-border flex-shrink-0">
        <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle">
              Totale Incassato
            </span>
            <span className="material-symbols-outlined text-[18px] text-emerald-600">payments</span>
          </div>
          <div className="font-mono font-bold text-[18px] text-emerald-700">
            {formatCurrency(totalCollected)}
          </div>
          <div className="text-[11px] text-apple-subtle mt-0.5">
            {allPayments.length} registrazioni totali
          </div>
        </div>

        <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle">
              Incassi in Contanti
            </span>
            <span className="material-symbols-outlined text-[18px] text-amber-600">
              point_of_sale
            </span>
          </div>
          <div className="font-mono font-bold text-[18px] text-apple-text">
            {formatCurrency(cashCollected)}
          </div>
          <div className="text-[11px] text-apple-subtle mt-0.5">
            {cashPayments.length} incassi in contanti
          </div>
        </div>

        <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle">
              Bonifici &amp; POS
            </span>
            <span className="material-symbols-outlined text-[18px] text-blue-600">
              account_balance
            </span>
          </div>
          <div className="font-mono font-bold text-[18px] text-apple-text">
            {formatCurrency(electronicCollected)}
          </div>
          <div className="text-[11px] text-apple-subtle mt-0.5">
            {electronicPayments.length} accrediti elettronici
          </div>
        </div>

        <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle">
              Uso Credito / Acconti
            </span>
            <span className="material-symbols-outlined text-[18px] text-purple-600">
              swap_horiz
            </span>
          </div>
          <div className="font-mono font-bold text-[18px] text-purple-700">
            {formatCurrency(creditAllocated)}
          </div>
          <div className="text-[11px] text-apple-subtle mt-0.5">
            {creditAllocations.length} compensazioni su fatture
          </div>
        </div>
      </div>

      {/* 3. Sub-strip */}
      <div className="h-8 px-3 bg-white border-b border-apple-border flex items-center justify-between text-[13px] text-apple-secondary flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-apple-text">Registro Ricevute</span>
          <span className="text-apple-subtle font-mono text-[12px]">
            ({filteredGroups.length} operazioni visualizzate)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[12px] font-mono">
          {methodFilter !== 'all' && (
            <span className="text-apple-accent font-medium">
              Filtro attivo: {methodFilter}
            </span>
          )}
          <span className="text-apple-subtle">
            Ordinamento: Cronologico Recente
          </span>
        </div>
      </div>

      {/* 4. Split Workstation Area: Dense Table on Left + Inspector on Right */}
      <div className="flex-1 flex overflow-hidden min-h-0 divide-x divide-apple-border">
        {/* Left Table Panel */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white flex flex-col">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-apple-border text-[12px] uppercase font-semibold text-apple-subtle tracking-wider z-10">
              <tr>
                <th className="py-2 px-3 border-r border-apple-border/70 w-28">Data</th>
                <th className="py-2 px-3 border-r border-apple-border/70">Cliente</th>
                <th className="py-2 px-3 border-r border-apple-border/70 w-36">Metodo</th>
                <th className="py-2 px-3 border-r border-apple-border/70 text-right w-36">
                  Importo
                </th>
                <th className="py-2 px-3 border-r border-apple-border/70">Destinazione</th>
                <th className="py-2 px-3 text-center w-24">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apple-border/50 text-[13px] text-apple-text font-normal font-sans">
              {loading && filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-apple-subtle">
                    <span className="material-symbols-outlined text-[24px] animate-spin mb-1 block mx-auto text-apple-accent">
                      progress_activity
                    </span>
                    Caricamento pagamenti...
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-apple-subtle">
                    <span className="material-symbols-outlined text-[32px] text-apple-subtle mb-1 block mx-auto">
                      payments
                    </span>
                    <span className="text-[13px] font-medium text-apple-text block">
                      Nessun pagamento trovato
                    </span>
                    <span className="text-[12px] text-apple-subtle">
                      Non ci sono pagamenti corrispondenti ai criteri di ricerca o filtro selezionati.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => {
                  const isSelected = activeReceipt?.id === group.id
                  const isMulti = group.items.length > 1
                  const isExpanded = !!expandedReceipts[group.id]

                  return (
                    <Fragment key={group.id}>
                      <tr
                        onClick={() => setSelectedReceiptId(group.id)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-50/70 border-l-2 border-l-apple-accent'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Data */}
                        <td className="py-1.5 px-3 border-r border-apple-border/70 font-mono text-[12px] text-apple-secondary whitespace-nowrap">
                          {formatDate(group.payment_date)}
                        </td>

                        {/* Cliente */}
                        <td className="py-1.5 px-3 border-r border-apple-border/70 truncate">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-apple-accent/10 text-apple-accent font-bold text-[10px] flex items-center justify-center border border-apple-accent/20 flex-shrink-0">
                              {getInitials(group.customer_name)}
                            </div>
                            <span className="font-semibold text-apple-text truncate">
                              {group.customer_name || 'Cliente sconosciuto'}
                            </span>
                          </div>
                        </td>

                        {/* Metodo */}
                        <td className="py-1.5 px-3 border-r border-apple-border/70">
                          {renderMethodBadge(group.method)}
                        </td>

                        {/* Importo */}
                        <td className="py-1.5 px-3 border-r border-apple-border/70 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          + {formatCurrency(group.total)}
                        </td>

                        {/* Destinazione */}
                        <td className="py-1.5 px-3 border-r border-apple-border/70">
                          {isMulti ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedReceipts((prev) => ({
                                  ...prev,
                                  [group.id]: !prev[group.id]
                                }))
                              }}
                              className="inline-flex items-center gap-1 font-medium text-apple-accent hover:underline cursor-pointer text-[12px]"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                              <span>Split su {group.items.length} operazioni</span>
                            </button>
                          ) : group.items[0]?.invoice_id ? (
                            <span className="font-mono text-apple-accent font-medium text-[12px]">
                              Fattura #{group.items[0].invoice_id}
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[11px] font-bold rounded">
                              Acconto Libero
                            </span>
                          )}
                        </td>

                        {/* Azioni */}
                        <td className="py-1.5 px-3 text-center whitespace-nowrap">
                          {!isMulti ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEdit(group.items[0])
                                }}
                                disabled={group.method === 'Uso Credito'}
                                className={`h-6 w-6 rounded flex items-center justify-center transition ${
                                  group.method === 'Uso Credito'
                                    ? 'text-apple-subtle/50 cursor-not-allowed'
                                    : 'bg-white hover:bg-slate-100 border border-apple-border text-apple-secondary hover:text-apple-text shadow-xs cursor-pointer'
                                }`}
                                title={
                                  group.method === 'Uso Credito'
                                    ? 'Le allocazioni di credito non possono essere modificate direttamente'
                                    : 'Modifica'
                                }
                              >
                                <span className="material-symbols-outlined text-[13px]">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteClick(group.items[0].id)
                                }}
                                className="h-6 w-6 rounded bg-white hover:bg-rose-50 border border-apple-border hover:border-rose-200 text-apple-secondary hover:text-rose-600 flex items-center justify-center shadow-xs transition cursor-pointer"
                                title="Elimina"
                              >
                                <span className="material-symbols-outlined text-[13px]">delete</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedReceiptId(group.id)
                              }}
                              className="h-6 px-2 rounded bg-white hover:bg-slate-100 border border-apple-border text-apple-secondary hover:text-apple-text text-[11px] font-medium shadow-xs transition cursor-pointer"
                            >
                              Dettagli
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Sub-table for Multi Split Payments */}
                      {isMulti && isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={6} className="py-2.5 px-8">
                            <div className="max-w-[540px] bg-white border border-apple-border rounded-lg shadow-xs overflow-hidden">
                              <div className="h-7 px-3 bg-slate-50 border-b border-apple-border flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-apple-subtle">
                                <span>Ripartizione Incasso su Partite</span>
                                <span>Importo / Azioni</span>
                              </div>
                              <table className="w-full text-left border-collapse text-[12px]">
                                <tbody className="divide-y divide-apple-border/40 font-mono">
                                  {group.items.map((pay) => (
                                    <tr key={pay.id} className="hover:bg-slate-50/50">
                                      <td className="py-1.5 px-3">
                                        {pay.invoice_id ? (
                                          <span className="text-apple-accent font-medium">
                                            Fattura #{pay.invoice_id}
                                          </span>
                                        ) : (
                                          <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[10px] font-bold rounded">
                                            Acconto / Credito Libero
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-1.5 px-3 text-right">
                                        <span className="font-semibold text-emerald-700 mr-2">
                                          + {formatCurrency(pay.amount)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteClick(pay.id)
                                          }}
                                          className="text-apple-subtle hover:text-rose-600 transition cursor-pointer align-middle"
                                          title="Elimina solo questa quota"
                                        >
                                          <span className="material-symbols-outlined text-[14px]">
                                            delete
                                          </span>
                                        </button>
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

          {/* Pagination: Mostra altri pagamenti */}
          {paymentsPagination.hasMore && (
            <div className="p-3 flex justify-center border-t border-apple-border bg-slate-50/50">
              <button
                type="button"
                onClick={() => fetchPaymentsPaginated(false)}
                className="h-7 px-4 rounded bg-white hover:bg-slate-100 border border-apple-border text-apple-secondary hover:text-apple-text text-[12px] font-medium flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <span>Carica altre transazioni</span>
                <span className="material-symbols-outlined text-[15px]">expand_more</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Inspector Panel */}
        <aside className="w-80 lg:w-96 flex-shrink-0 bg-slate-50/50 flex flex-col min-h-0 overflow-y-auto">
          {activeReceipt ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Inspector Header */}
              <div className="h-10 px-3.5 bg-white border-b border-apple-border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-apple-accent">
                    receipt
                  </span>
                  <span className="font-semibold text-apple-text text-[13px]">
                    Dettaglio Ricevuta #{activeReceipt.id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptId(null)}
                  className="p-1 rounded text-apple-subtle hover:text-apple-text hover:bg-slate-100 transition cursor-pointer"
                  title="Chiudi ispettore"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              {/* Inspector Content */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
                {/* Amount Hero Card */}
                <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle block mb-1">
                    Importo Totale Ricevuto
                  </span>
                  <div className="font-mono font-bold text-[22px] text-emerald-700">
                    + {formatCurrency(activeReceipt.total)}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-apple-border/50 text-[12px]">
                    <span className="text-apple-secondary">Metodo applicato:</span>
                    {renderMethodBadge(activeReceipt.method)}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[12px]">
                    <span className="text-apple-secondary">Data e Ora:</span>
                    <span className="font-mono text-apple-text">
                      {formatDateTime(activeReceipt.payment_date || activeReceipt.items[0]?.payment_date)}
                    </span>
                  </div>
                </div>

                {/* Customer Info Card */}
                <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle block">
                    Cliente Ordinante
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-apple-accent/10 text-apple-accent font-bold text-[12px] flex items-center justify-center border border-apple-accent/20 flex-shrink-0">
                      {getInitials(activeReceipt.customer_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-apple-text text-[13px] truncate">
                        {activeReceipt.customer_name || 'Cliente sconosciuto'}
                      </div>
                      <div className="text-[11px] text-apple-subtle font-mono truncate">
                        Ricevuta n° {activeReceipt.id}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-apple-border/50">
                    <button
                      type="button"
                      onClick={() => navigate('/clients')}
                      className="w-full h-6.5 rounded bg-slate-50 hover:bg-slate-100 border border-apple-border text-apple-secondary hover:text-apple-text text-[11px] font-medium flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">person</span>
                      <span>Apri Scheda in Rubrica Clienti</span>
                    </button>
                  </div>
                </div>

                {/* Allocation Lines Card */}
                <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle block">
                    Ripartizione Contabile ({activeReceipt.items.length} voci)
                  </span>

                  <div className="space-y-1.5 font-mono text-[12px]">
                    {activeReceipt.items.map((pay) => (
                      <div
                        key={pay.id}
                        className="p-2 rounded bg-slate-50 border border-apple-border/60 flex items-center justify-between"
                      >
                        <div>
                          {pay.invoice_id ? (
                            <span className="font-medium text-apple-accent">
                              Fattura #{pay.invoice_id}
                            </span>
                          ) : (
                            <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/50">
                              Acconto Libero
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-700">
                            + {formatCurrency(pay.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(pay.id)}
                            className="text-apple-subtle hover:text-rose-600 transition cursor-pointer"
                            title="Elimina voce"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions Card */}
                {activeReceipt.items.length === 1 && (
                  <div className="bg-white border border-apple-border rounded-lg p-3 shadow-xs space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle block">
                      Azioni Rapide
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(activeReceipt.items[0])}
                        disabled={activeReceipt.method === 'Uso Credito'}
                        className={`h-7 rounded text-[12px] font-medium flex items-center justify-center gap-1 transition ${
                          activeReceipt.method === 'Uso Credito'
                            ? 'bg-slate-100 text-apple-subtle cursor-not-allowed border border-apple-border/50'
                            : 'bg-white hover:bg-slate-100 border border-apple-border text-apple-secondary hover:text-apple-text shadow-xs cursor-pointer'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        <span>Modifica</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(activeReceipt.items[0].id)}
                        className="h-7 rounded bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 text-[12px] font-medium flex items-center justify-center gap-1 shadow-xs transition cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        <span>Elimina</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-apple-subtle">
              <span className="material-symbols-outlined text-[36px] text-apple-subtle/70 mb-2">
                receipt_long
              </span>
              <p className="text-[13px] font-medium text-apple-text mb-1">
                Nessun Pagamento Selezionato
              </p>
              <p className="text-[12px] text-apple-subtle max-w-[220px] mb-4">
                Fai clic su una riga della tabella per visualizzarne i dettagli, la ripartizione e le azioni rapide.
              </p>
              <button
                type="button"
                onClick={() => {
                  resetRegistrationForm()
                  setRegisterModalOpen(true)
                }}
                className="h-7 px-3 bg-apple-accent hover:bg-apple-accent-hover text-white text-[12px] font-medium rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[14px]">add_card</span>
                <span>Registra Incasso</span>
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* 5. Bottom Table Summary Bar */}
      <div className="h-8 px-3 bg-slate-50 border-t border-apple-border flex items-center justify-between text-[12px] text-apple-secondary font-mono flex-shrink-0">
        <span>
          {filteredGroups.length} ricevute visualizzate su {paymentsPagination.totalCount} transazioni
        </span>
        <span className="font-semibold text-apple-text">
          Totale Incassi nel Database: {formatCurrency(totalCollected)}
        </span>
      </div>

      {/* MODAL: REGISTRA NUOVO INCASSO */}
      <Modal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        title="Registra Incasso"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200/60 text-[12px] text-rose-600 font-medium">
              {formError}
            </div>
          )}

          {/* Customer Selection */}
          <div>
            <label className="block text-[12px] font-medium text-apple-secondary mb-1">
              Cliente <span className="text-rose-600">*</span>
            </label>
            <SearchableSelect
              options={customers.map((c) => ({
                id: c.id,
                name: `${c.name} (Saldo: ${formatCurrency(c.balance || 0)})`
              }))}
              value={selectedCustomerId}
              onChange={handleCustomerChange}
              placeholder="Cerca o seleziona cliente..."
              noResultsText="Nessun cliente trovato"
              required
            />
          </div>

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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-apple-secondary mb-1">
                Data Incasso <span className="text-rose-600">*</span>
              </label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text font-mono"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
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
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="Contanti">Contanti</option>
              <option value="Bonifico">Bonifico Bancario</option>
              <option value="Carta">Carta di Credito</option>
              <option value="Altro">Altro</option>
            </select>
          </div>

          {/* Allocation mode section */}
          {selectedCustomerId && (
            <div className="border-t border-apple-border pt-3">
              {detailLoading ? (
                <p className="text-[12px] text-apple-subtle italic">
                  Caricamento fatture scoperte...
                </p>
              ) : unpaidInvoices.length === 0 ? (
                <div className="bg-blue-50/70 border border-blue-200/60 rounded-lg p-2.5 text-[12px] flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-apple-accent mt-0.5">
                    info
                  </span>
                  <div>
                    <p className="font-semibold text-apple-text">
                      Nessuna fattura scoperta da saldare
                    </p>
                    <p className="text-apple-secondary mt-0.5">
                      Tutte le fatture risultano pagate. L&apos;intero importo verrà registrato come credito acconto libero sul conto del cliente.
                    </p>
                  </div>
                </div>
              ) : (
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

                  {/* Manual table */}
                  {allocType === 'manual' && (
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

                  {/* Auto mode preview */}
                  {allocType === 'auto' && (
                    <>
                      <p className="text-[12px] text-apple-secondary italic mb-2">
                        I fondi verranno usati per estinguere le fatture partendo dalla più vecchia
                        (per scadenza). L&apos;eventuale surplus verrà registrato come acconto.
                      </p>
                      {(() => {
                        const total = parseFloat(amount) || 0
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
                              <span className="font-semibold text-apple-text">
                                {formatCurrency(allocated)}
                              </span>
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

                  {allocType === 'acconto' && (
                    <p className="text-[12px] text-apple-secondary italic">
                      L&apos;intero importo verrà registrato come credito acconto disponibile nel conto del cliente.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-apple-border">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[12px] font-medium transition cursor-pointer shadow-xs"
              onClick={() => setRegisterModalOpen(false)}
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

      {/* MODAL: MODIFICA PAGAMENTO */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Modifica Pagamento"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {editFormError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200/60 text-[12px] text-rose-600 font-medium">
              {editFormError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-apple-secondary mb-1">
                Cliente (Immutabile)
              </label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-slate-100 text-apple-subtle font-sans cursor-not-allowed"
                type="text"
                value={selectedPayment?.customer_name || ''}
                disabled
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-apple-secondary mb-1">
                Riferimento (Immutabile)
              </label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-slate-100 text-apple-subtle font-mono cursor-not-allowed"
                type="text"
                value={
                  selectedPayment?.invoice_id
                    ? `Fattura #${selectedPayment.invoice_id}`
                    : 'Acconto Libero'
                }
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-apple-secondary mb-1">
                Importo (€) <span className="text-rose-600">*</span>
              </label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text font-mono"
                placeholder="0.00"
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-apple-secondary mb-1">
                Data Pagamento <span className="text-rose-600">*</span>
              </label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition text-apple-text font-mono"
                type="date"
                value={editPaymentDate}
                onChange={(e) => setEditPaymentDate(e.target.value)}
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
              value={editMethod}
              onChange={(e) => setEditMethod(e.target.value)}
            >
              <option value="Contanti">Contanti</option>
              <option value="Bonifico">Bonifico Bancario</option>
              <option value="Carta">Carta di Credito</option>
              <option value="Altro">Altro</option>
            </select>
          </div>

          <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-apple-border">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[12px] font-medium transition cursor-pointer shadow-xs"
              onClick={() => setEditModalOpen(false)}
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

      {/* MODAL: CONFERMA ELIMINAZIONE PAGAMENTO */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Elimina Pagamento"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200/60 text-[12px] text-rose-600 font-medium">
              {deleteError}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-apple-border rounded-lg text-[13px] text-apple-text space-y-2">
            <p>Sei sicuro di voler eliminare definitivamente questo pagamento?</p>
            <p className="text-[12px] text-apple-subtle">
              <strong>Nota bene:</strong> L&apos;eliminazione comporterà lo storno della relativa scrittura in Prima Nota e il ricalcolo del saldo delle partite collegate. Se si tratta di un Uso Credito, l&apos;acconto originario verrà ripristinato automaticamente come credito libero del cliente.
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
