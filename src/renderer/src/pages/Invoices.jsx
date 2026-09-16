import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
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
    payments,
    fetchPayments,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addMultiPayment,
    addCustomer
  } = useStore()

  // Mode of the right pane: 'new' (Registration Form) or 'detail' (Inspector/Editor of selected invoice)
  const [rightPaneMode, setRightPaneMode] = useState('new')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState(invoicesPagination.search || '')
  const [statusFilter, setStatusFilter] = useState(invoicesPagination.status || '')

  // Toast / notification
  const [toastMessage, setToastMessage] = useState(null)

  // Ref for auto-focusing on invoice ID input
  const invoiceIdInputRef = useRef(null)

  // Form State for New Invoice Registration
  const [invoiceId, setInvoiceId] = useState(() => {
    const year = new Date().getFullYear()
    const randomNum = Math.floor(100 + Math.random() * 900)
    return `FT-${year}/${randomNum}`
  })
  const [customerId, setCustomerId] = useState('')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(() => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    return futureDate.toISOString().split('T')[0]
  })
  const [amount, setAmount] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmittingNew, setIsSubmittingNew] = useState(false)

  // Inline Edit State for Selected Invoice
  const [isEditingSelected, setIsEditingSelected] = useState(false)
  const [editCustomerId, setEditCustomerId] = useState('')
  const [editIssueDate, setEditIssueDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editError, setEditError] = useState('')
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  // Quick Payment Modal State
  const [quickPayOpen, setQuickPayOpen] = useState(false)
  const [quickPayAmount, setQuickPayAmount] = useState('')
  const [quickPayDate, setQuickPayDate] = useState(() => new Date().toISOString().split('T')[0])
  const [quickPayMethod, setQuickPayMethod] = useState('Contanti')
  const [quickPayError, setQuickPayError] = useState('')
  const [isSubmittingQuickPay, setIsSubmittingQuickPay] = useState(false)

  // Quick New Customer Modal State
  const [quickCustOpen, setQuickCustOpen] = useState(false)
  const [quickCustName, setQuickCustName] = useState('')
  const [quickCustEmail, setQuickCustEmail] = useState('')
  const [quickCustError, setQuickCustError] = useState('')
  const [isSubmittingQuickCust, setIsSubmittingQuickCust] = useState(false)

  // Delete Invoice Modal State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteInvoiceId, setDeleteInvoiceId] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false)

  // Helper: Genera un suggerimento ID fattura coerente (es: FT-2026/0145)
  const generateSuggestedInvoiceId = useCallback(() => {
    const year = new Date().getFullYear()
    const randomNum = Math.floor(100 + Math.random() * 900)
    return `FT-${year}/${randomNum}`
  }, [])

  // Helper formattazione valuta Euro
  const formatCurrency = useCallback((val) => {
    if (val === undefined || val === null || isNaN(val)) return '€ 0,00'
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
  }, [])

  // Helper formattazione data
  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }, [])

  // Sincronizza filtri e ricarica i dati
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setInvoicesFilters({ search: searchTerm, status: statusFilter })
      fetchInvoicesPaginated(true)
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchTerm, statusFilter, setInvoicesFilters, fetchInvoicesPaginated])

  // Inizializza clienti e pagamenti
  useEffect(() => {
    fetchCustomers()
    fetchPayments()
  }, [fetchCustomers, fetchPayments])

  // Gestione focus sul campo ID fattura quando si passa a modalità 'new'
  const triggerInputFocus = useCallback(() => {
    setTimeout(() => {
      if (invoiceIdInputRef.current) {
        invoiceIdInputRef.current.focus()
        invoiceIdInputRef.current.select?.()
      }
    }, 80)
  }, [])

  // Switch to New Invoice Form
  const switchToNewInvoice = useCallback(
    (suggestId = true) => {
      setRightPaneMode('new')
      if (suggestId && !invoiceId) {
        setInvoiceId(generateSuggestedInvoiceId())
      }
      setFormError('')
      triggerInputFocus()
    },
    [generateSuggestedInvoiceId, invoiceId, triggerInputFocus]
  )

  // Listener per navigazione esterna (ad es. da Dashboard "Nuova Fattura" o Spotlight)
  useEffect(() => {
    if (location.state?.focusNewInvoice || location.state?.openNewInvoiceModal) {
      setTimeout(() => {
        setRightPaneMode('new')
        setInvoiceId(generateSuggestedInvoiceId())
        setCustomerId('')
        setIssueDate(new Date().toISOString().split('T')[0])
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 30)
        setDueDate(futureDate.toISOString().split('T')[0])
        setAmount('')
        setFormNotes('')
        setFormError('')
        triggerInputFocus()
      }, 50)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate, location.pathname, generateSuggestedInvoiceId, triggerInputFocus])

  // Focus sul campo identificativo alla prima apertura
  useEffect(() => {
    triggerInputFocus()
  }, [triggerInputFocus])

  // Arricchisce l'elenco paginato con le informazioni sui pagamenti e scadenze calcolate
  const enrichedInvoices = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (paginatedInvoices || []).map((inv) => {
      const invPayments = (payments || []).filter((p) => p.invoice_id === inv.id)
      const paidAmount =
        Math.round(invPayments.reduce((sum, p) => sum + (p.amount || 0), 0) * 100) / 100
      const remainingAmount = Math.max(0, Math.round((inv.amount - paidAmount) * 100) / 100)

      const isPaid = inv.status === 'paid' || remainingAmount <= 0.001
      const isPartial = !isPaid && paidAmount > 0.001

      const dueDateObj = new Date(inv.due_date)
      dueDateObj.setHours(0, 0, 0, 0)
      const diffDays = Math.round((today - dueDateObj) / (1000 * 60 * 60 * 24))

      let statusKey = inv.status
      let overdueDays = 0
      let dueSoonDays = 0

      if (isPaid) {
        statusKey = 'paid'
      } else if (isPartial) {
        statusKey = 'partial'
        if (diffDays > 0) {
          overdueDays = diffDays
        }
      } else {
        if (diffDays > 0) {
          statusKey = 'overdue'
          overdueDays = diffDays
        } else if (diffDays >= -7 && diffDays <= 0) {
          statusKey = 'due_soon'
          dueSoonDays = Math.abs(diffDays)
        } else {
          statusKey = 'unpaid'
        }
      }

      return {
        ...inv,
        paidAmount,
        remainingAmount,
        statusKey,
        overdueDays,
        dueSoonDays,
        paymentsList: invPayments
      }
    })
  }, [paginatedInvoices, payments])

  // Fattura attiva selezionata nel pannello di destra
  const selectedInvoice = useMemo(() => {
    if (!selectedInvoiceId) return enrichedInvoices[0] || null
    return enrichedInvoices.find((i) => i.id === selectedInvoiceId) || enrichedInvoices[0] || null
  }, [selectedInvoiceId, enrichedInvoices])

  // Seleziona una riga e apre i dettagli nel pannello di destra
  const handleSelectInvoiceRow = (inv) => {
    setSelectedInvoiceId(inv.id)
    setRightPaneMode('detail')
    setIsEditingSelected(false)
    setEditError('')
  }

  // Pre-popola i campi di modifica per la fattura selezionata
  const handleStartEditSelected = () => {
    if (!selectedInvoice) return
    setEditCustomerId(selectedInvoice.customer_id)
    setEditIssueDate(selectedInvoice.issue_date ? selectedInvoice.issue_date.split(' ')[0] : '')
    setEditDueDate(selectedInvoice.due_date ? selectedInvoice.due_date.split(' ')[0] : '')
    setEditAmount((Math.round(selectedInvoice.amount * 100) / 100).toString())
    setEditError('')
    setIsEditingSelected(true)
  }

  // Scorciatoie per data scadenza (+30, +60, Fine mese)
  const applyDueDateShortcut = (type) => {
    const base = issueDate ? new Date(issueDate) : new Date()
    if (isNaN(base.getTime())) return

    const target = new Date(base)
    if (type === '+30') {
      target.setDate(target.getDate() + 30)
    } else if (type === '+60') {
      target.setDate(target.getDate() + 60)
    } else if (type === '+90') {
      target.setDate(target.getDate() + 90)
    } else if (type === 'endOfMonth') {
      target.setMonth(target.getMonth() + 1, 0)
    } else if (type === 'immediate') {
      // Stessa data di emissione (vista fattura)
    }
    setDueDate(target.toISOString().split('T')[0])
  }

  // Invio registrazione Nuova Fattura
  const handleRegisterInvoice = async (e) => {
    e.preventDefault()
    setFormError('')

    const trimmedId = invoiceId.trim()
    if (!trimmedId) {
      setFormError('Inserisci il numero o identificativo del documento.')
      invoiceIdInputRef.current?.focus()
      return
    }

    if (!customerId) {
      setFormError('Seleziona il cliente intestatario del documento.')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("L'importo del documento deve essere superiore a zero.")
      return
    }

    if (!issueDate || !dueDate) {
      setFormError('Le date di emissione e scadenza sono obbligatorie.')
      return
    }

    if (new Date(dueDate) < new Date(issueDate)) {
      setFormError('La data di scadenza non può precedere la data del documento.')
      return
    }

    setIsSubmittingNew(true)
    try {
      const newDoc = {
        id: trimmedId,
        customer_id: customerId,
        issue_date: issueDate,
        due_date: dueDate,
        amount: numAmount,
        status: 'unpaid'
      }

      const res = await addInvoice(newDoc)
      if (res.success) {
        setToastMessage(`Fattura ${trimmedId} registrata con successo!`)
        setTimeout(() => setToastMessage(null), 3500)

        // Reset form e predisponi per la registrazione successiva
        setInvoiceId(generateSuggestedInvoiceId())
        setCustomerId('')
        setAmount('')
        setFormNotes('')
        setSelectedInvoiceId(trimmedId)
        triggerInputFocus()
      } else {
        setFormError(res.error || 'Errore durante la registrazione del documento.')
      }
    } catch (err) {
      setFormError(err.message || 'Errore imprevisto di salvataggio.')
    } finally {
      setIsSubmittingNew(false)
    }
  }

  // Invio aggiornamento Modifica Fattura Selezionata
  const handleSaveEditSelected = async (e) => {
    e.preventDefault()
    setEditError('')

    if (!selectedInvoice) return

    if (!editCustomerId) {
      setEditError('Seleziona il cliente.')
      return
    }

    const numAmount = parseFloat(editAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setEditError("L'importo deve essere maggiore di zero.")
      return
    }

    if (!editIssueDate || !editDueDate) {
      setEditError('Le date di emissione e scadenza sono obbligatorie.')
      return
    }

    if (new Date(editDueDate) < new Date(editIssueDate)) {
      setEditError('La data di scadenza non può essere precedente alla data di emissione.')
      return
    }

    setIsSubmittingEdit(true)
    try {
      const updatedData = {
        customer_id: editCustomerId,
        issue_date: editIssueDate,
        due_date: editDueDate,
        amount: numAmount
      }

      const res = await updateInvoice(selectedInvoice.id, updatedData)
      if (res.success) {
        setIsEditingSelected(false)
        setToastMessage(`Fattura ${selectedInvoice.id} aggiornata!`)
        setTimeout(() => setToastMessage(null), 3000)
      } else {
        setEditError(res.error || 'Impossibile aggiornare la fattura.')
      }
    } catch (err) {
      setEditError(err.message || "Errore imprevisto durante l'aggiornamento.")
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  // Eliminazione Fattura
  const handleDeleteInvoice = async () => {
    setDeleteError('')
    setIsSubmittingDelete(true)
    try {
      const res = await deleteInvoice(deleteInvoiceId)
      if (res.success) {
        setDeleteConfirmOpen(false)
        setDeleteInvoiceId('')
        if (selectedInvoiceId === deleteInvoiceId) {
          setSelectedInvoiceId(null)
          switchToNewInvoice(true)
        }
        setToastMessage(`Fattura eliminata con successo dal registro.`)
        setTimeout(() => setToastMessage(null), 3000)
      } else {
        setDeleteError(res.error || "Errore durante l'eliminazione.")
      }
    } catch (err) {
      setDeleteError(err.message || "Errore durante l'eliminazione.")
    } finally {
      setIsSubmittingDelete(false)
    }
  }

  // Incasso Rapido per la fattura attiva
  const handleOpenQuickPay = (inv) => {
    const target = inv || selectedInvoice
    if (!target) return
    const defaultAmt = target.remainingAmount > 0 ? target.remainingAmount : target.amount
    setQuickPayAmount(defaultAmt.toFixed(2))
    setQuickPayDate(new Date().toISOString().split('T')[0])
    setQuickPayMethod('Contanti')
    setQuickPayError('')
    setQuickPayOpen(true)
  }

  const handleRegisterQuickPayment = async (e) => {
    e.preventDefault()
    setQuickPayError('')

    if (!selectedInvoice) return
    const numAmt = parseFloat(quickPayAmount)
    if (isNaN(numAmt) || numAmt <= 0) {
      setQuickPayError("L'importo dell'incasso deve essere maggiore di zero.")
      return
    }

    setIsSubmittingQuickPay(true)
    try {
      const paymentData = {
        customerId: selectedInvoice.customer_id,
        totalAmount: numAmt,
        method: quickPayMethod,
        date: quickPayDate,
        allocations: [{ invoiceId: selectedInvoice.id, amount: numAmt }],
        accontoAmount: 0
      }

      const res = await addMultiPayment(paymentData)
      if (res.success) {
        setQuickPayOpen(false)
        setToastMessage(`Incasso di ${formatCurrency(numAmt)} registrato per ${selectedInvoice.id}!`)
        setTimeout(() => setToastMessage(null), 3500)
      } else {
        setQuickPayError(res.error || "Errore nella registrazione dell'incasso.")
      }
    } catch (err) {
      setQuickPayError(err.message || "Errore durante la registrazione dell'incasso.")
    } finally {
      setIsSubmittingQuickPay(false)
    }
  }

  // Registrazione rapida nuovo cliente dal form fattura
  const handleQuickAddCustomer = async (e) => {
    e.preventDefault()
    setQuickCustError('')
    if (!quickCustName.trim()) {
      setQuickCustError('Il nome o ragione sociale è richiesto.')
      return
    }

    setIsSubmittingQuickCust(true)
    try {
      const newCustomerId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `cust-${crypto.randomUUID()}`
          : `cust-${Date.now()}-${Math.floor(Math.random() * 100000)}`

      const newCustomer = {
        id: newCustomerId,
        name: quickCustName.trim(),
        email: quickCustEmail.trim() || null
      }

      const res = await addCustomer(newCustomer)
      if (res.success) {
        setCustomerId(newCustomerId)
        setQuickCustName('')
        setQuickCustEmail('')
        setQuickCustOpen(false)
        setToastMessage(`Cliente ${newCustomer.name} creato e selezionato!`)
        setTimeout(() => setToastMessage(null), 3000)
      } else {
        setQuickCustError(res.error || 'Errore salvataggio cliente.')
      }
    } catch (err) {
      setQuickCustError(err.message || 'Errore imprevisto salvataggio cliente.')
    } finally {
      setIsSubmittingQuickCust(false)
    }
  }

  // Totali statistici calcolati
  const statsSummary = useMemo(() => {
    let totalInvoiced = 0
    let totalRemaining = 0
    let totalOverdue = 0
    let totalPaid = 0

    enrichedInvoices.forEach((inv) => {
      totalInvoiced += inv.amount || 0
      totalPaid += inv.paidAmount || 0
      totalRemaining += inv.remainingAmount || 0
      if (inv.statusKey === 'overdue') {
        totalOverdue += inv.remainingAmount || 0
      }
    })

    return {
      totalInvoiced,
      totalRemaining,
      totalOverdue,
      totalPaid,
      count: enrichedInvoices.length
    }
  }, [enrichedInvoices])

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden select-none font-sans">
      {/* 1. Workstation Top Toolbar */}
      <div className="h-10 bg-slate-50/70 border-b border-apple-border px-4 flex items-center justify-between text-[13px] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-apple-secondary font-medium">
            <span className="material-symbols-outlined text-[16px] text-apple-accent">
              receipt_long
            </span>
            <span className="text-apple-text font-semibold">Registro Fatture</span>
          </div>

          <div className="h-3.5 w-px bg-apple-border hidden md:block" />

          {/* Live Search Input */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded border border-apple-border text-[12px] text-apple-text focus-within:border-apple-accent">
            <span className="material-symbols-outlined text-[14px] text-apple-secondary">search</span>
            <input
              type="text"
              placeholder="Cerca numero o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-[12px] text-apple-text placeholder:text-apple-subtle w-40 md:w-56 focus:ring-0 p-0"
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

          {/* Status Filter Segmented Buttons */}
          <div className="hidden lg:flex items-center gap-0.5 bg-slate-200/70 p-0.5 rounded text-[11px] font-medium">
            {[
              { id: '', label: 'Tutte' },
              { id: 'unpaid', label: 'Da Saldare' },
              { id: 'partial', label: 'Parziali' },
              { id: 'paid', label: 'Saldate' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-white text-apple-text shadow-xs font-semibold'
                    : 'text-apple-secondary hover:text-apple-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Toolbar Actions & KPIs */}
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] text-apple-secondary font-mono bg-slate-100 px-2.5 py-0.5 rounded hidden xl:inline">
            Totale: {formatCurrency(statsSummary.totalInvoiced)}
          </span>

          <span className="text-[12px] font-mono px-2 py-0.5 rounded font-medium bg-rose-50 text-rose-600 border border-rose-200/50 hidden md:inline">
            Scadute: {formatCurrency(statsSummary.totalOverdue)}
          </span>

          <span className="text-[12px] font-mono px-2 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50 hidden sm:inline">
            Incassate: {formatCurrency(statsSummary.totalPaid)}
          </span>

          <button
            type="button"
            onClick={() => switchToNewInvoice(true)}
            className="h-7 px-3 bg-apple-accent hover:bg-apple-accent-hover text-white text-[12px] font-medium rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="Registra un nuovo documento contabile"
          >
            <span className="material-symbols-outlined text-[15px]">post_add</span>
            <span>Nuova Registrazione</span>
          </button>
        </div>
      </div>

      {/* Toast Banner Feedback */}
      {toastMessage && (
        <div className="h-7 bg-emerald-50 border-b border-emerald-200/60 px-4 flex items-center justify-between text-[12px] text-emerald-800 flex-shrink-0 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-emerald-600">
              check_circle
            </span>
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer text-[12px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Main Native Split Desktop Layout (Table 7 Cols, Form/Inspector 5 Cols) */}
      <div className="flex-1 grid grid-cols-12 min-h-0 divide-x divide-apple-border bg-[#FAFAFA]">
        {/* Left Pane: Invoices Data Grid */}
        <div className="col-span-12 md:col-span-7 xl:col-span-7 flex flex-col min-h-0 bg-white">
          {/* Subheader Strip */}
          <div className="h-8 px-3 bg-white border-b border-apple-border flex items-center justify-between text-[12px] text-apple-secondary flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-apple-text">Elenco Documenti</span>
              <span className="text-apple-subtle font-mono">
                ({enrichedInvoices.length}
                {invoicesPagination.totalCount ? ` di ${invoicesPagination.totalCount}` : ''})
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-apple-subtle">
              <span>Clicca una riga per ispezionare o incassare</span>
            </div>
          </div>

          {/* Dense Invoices Table */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-apple-border text-[11px] uppercase font-semibold text-apple-subtle tracking-wider z-10">
                <tr>
                  <th className="py-2 px-3 border-r border-apple-border/70 w-24">Data</th>
                  <th className="py-2 px-3 border-r border-apple-border/70 w-32">Documento</th>
                  <th className="py-2 px-3 border-r border-apple-border/70">Cliente</th>
                  <th className="py-2 px-3 border-r border-apple-border/70 text-right w-28">
                    Totale
                  </th>
                  <th className="py-2 px-3 border-r border-apple-border/70 w-24">Scadenza</th>
                  <th className="py-2 px-3 border-r border-apple-border/70 w-32">Stato</th>
                  <th className="py-2 px-2 text-center w-16">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border/50 text-[13px] text-apple-text font-normal">
                {enrichedInvoices.map((inv) => {
                  const isSelected = selectedInvoice?.id === inv.id

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => handleSelectInvoiceRow(inv)}
                      className={`cursor-pointer transition group ${
                        isSelected
                          ? 'bg-blue-50/70 text-apple-text font-medium border-l-2 border-l-apple-accent'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* DATA */}
                      <td className="py-1.5 px-3 border-r border-apple-border/70 text-apple-secondary font-mono text-[12px] whitespace-nowrap">
                        {formatDate(inv.issue_date)}
                      </td>

                      {/* NUMERO DOCUMENTO */}
                      <td
                        className={`py-1.5 px-3 border-r border-apple-border/70 font-mono text-[12px] whitespace-nowrap ${
                          isSelected ? 'font-semibold text-apple-accent' : 'text-apple-text'
                        }`}
                      >
                        #{inv.id}
                      </td>

                      {/* CLIENTE */}
                      <td className="py-1.5 px-3 border-r border-apple-border/70 truncate">
                        <span
                          className={`truncate block ${
                            isSelected ? 'font-semibold text-apple-text' : 'text-apple-text'
                          }`}
                          title={inv.customer_name}
                        >
                          {inv.customer_name}
                        </span>
                      </td>

                      {/* TOTALE DOCUMENTO */}
                      <td className="py-1.5 px-3 border-r border-apple-border/70 text-right font-mono whitespace-nowrap font-medium text-apple-text">
                        {formatCurrency(inv.amount)}
                      </td>

                      {/* SCADENZA */}
                      <td
                        className={`py-1.5 px-3 border-r border-apple-border/70 font-mono text-[12px] whitespace-nowrap ${
                          inv.statusKey === 'overdue'
                            ? 'text-rose-600 font-semibold'
                            : 'text-apple-secondary'
                        }`}
                      >
                        {formatDate(inv.due_date)}
                      </td>

                      {/* STATO */}
                      <td className="py-1.5 px-3 border-r border-apple-border/70 whitespace-nowrap">
                        {inv.statusKey === 'paid' && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-apple-green" />
                            Saldata
                          </span>
                        )}
                        {inv.statusKey === 'partial' && (
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/60"
                            title={`Incassati ${formatCurrency(inv.paidAmount)}, residuo ${formatCurrency(inv.remainingAmount)}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            Parz. ({formatCurrency(inv.remainingAmount)})
                          </span>
                        )}
                        {inv.statusKey === 'overdue' && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5F56]" />
                            Scaduta {inv.overdueDays}gg
                          </span>
                        )}
                        {inv.statusKey === 'due_soon' && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFBD2E]" />
                            Scade a {inv.dueSoonDays}gg
                          </span>
                        )}
                        {inv.statusKey === 'unpaid' && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-apple-secondary border border-black/[0.05]">
                            <span className="w-1.5 h-1.5 rounded-full bg-apple-subtle" />
                            In attesa
                          </span>
                        )}
                      </td>

                      {/* AZIONI RAPIDE IN RIGA */}
                      <td className="py-1 px-1 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-0.5 opacity-80 group-hover:opacity-100">
                          {inv.remainingAmount > 0.001 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedInvoiceId(inv.id)
                                handleOpenQuickPay(inv)
                              }}
                              className="p-1 hover:bg-emerald-50 hover:text-emerald-700 rounded text-apple-secondary transition cursor-pointer"
                              title="Registra incasso rapido"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                add_card
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteInvoiceId(inv.id)
                              setDeleteError('')
                              setDeleteConfirmOpen(true)
                            }}
                            className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded text-apple-secondary transition cursor-pointer"
                            title="Elimina registrazione"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {enrichedInvoices.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-apple-subtle">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[36px] text-apple-subtle">
                          find_in_page
                        </span>
                        <p className="text-[13px] font-medium text-apple-text">
                          Nessun documento trovato con i filtri attuali
                        </p>
                        <p className="text-[12px] text-apple-secondary max-w-[360px]">
                          Utilizza il modulo sulla destra per registrare la prima fattura da tracciare.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar if more items */}
          {invoicesPagination.hasMore && (
            <div className="h-9 px-3 border-t border-apple-border bg-slate-50 flex items-center justify-center flex-shrink-0">
              <button
                type="button"
                onClick={() => fetchInvoicesPaginated(false)}
                className="text-[12px] text-apple-accent hover:underline font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Mostra altre fatture</span>
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Pane: SIDE FORM & INSPECTOR ALWAYS OPEN */}
        <div className="col-span-12 md:col-span-5 xl:col-span-5 flex flex-col min-h-0 bg-white">
          {/* Header Switcher: Registra vs Ispezione Selezionata */}
          <div className="h-10 px-3.5 bg-slate-50/90 border-b border-apple-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-200/70 p-0.5 rounded text-[11px] font-medium">
              <button
                type="button"
                onClick={() => switchToNewInvoice(false)}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer ${
                  rightPaneMode === 'new'
                    ? 'bg-white text-apple-text shadow-xs font-semibold'
                    : 'text-apple-secondary hover:text-apple-text'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">post_add</span>
                <span>Registra Fattura</span>
              </button>

              <button
                type="button"
                disabled={!selectedInvoice}
                onClick={() => {
                  if (selectedInvoice) {
                    setRightPaneMode('detail')
                    setIsEditingSelected(false)
                  }
                }}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                  !selectedInvoice
                    ? 'opacity-40 cursor-not-allowed text-apple-subtle'
                    : rightPaneMode === 'detail'
                      ? 'bg-white text-apple-text shadow-xs font-semibold cursor-pointer'
                      : 'text-apple-secondary hover:text-apple-text cursor-pointer'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">info</span>
                <span>Dettaglio {selectedInvoice ? `#${selectedInvoice.id}` : ''}</span>
              </button>
            </div>

            {rightPaneMode === 'detail' && (
              <button
                type="button"
                onClick={() => switchToNewInvoice(true)}
                className="h-6 px-2 bg-white border border-apple-border text-apple-accent hover:bg-slate-50 text-[11px] font-medium rounded flex items-center gap-1 transition cursor-pointer shadow-2xs"
                title="Passa a nuova registrazione"
              >
                <span className="material-symbols-outlined text-[13px]">add</span>
                <span>Nuova</span>
              </button>
            )}
          </div>

          {/* Right Pane Body */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4">
            {/* VIEW A: REGISTRA NUOVA FATTURA (Form sempre pronto con auto-focus) */}
            {rightPaneMode === 'new' && (
              <form onSubmit={handleRegisterInvoice} className="space-y-4">
                {/* Notice Badge (App non emette fattura, registra e traccia) */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-apple-border/70 flex items-start gap-2 text-[12px] text-apple-secondary">
                  <span className="material-symbols-outlined text-[17px] text-apple-accent shrink-0 mt-0.5">
                    track_changes
                  </span>
                  <div className="leading-snug">
                    <span className="font-semibold text-apple-text">Tracciamento Documentale:</span>{' '}
                    L&apos;app non trasmette fatture verso lo SDI. Registra i documenti contabili per
                    monitorare scadenze, insoluti e incassi.
                  </div>
                </div>

                {formError && (
                  <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[12px] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                    <span>{formError}</span>
                  </div>
                )}

                {/* Grid 1: Numero Documento e Cliente */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[12px] font-semibold text-apple-text">
                        Numero / Identificativo Fattura <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setInvoiceId(generateSuggestedInvoiceId())}
                        className="text-[11px] text-apple-accent hover:underline cursor-pointer"
                      >
                        Genera suggerito
                      </button>
                    </div>
                    <input
                      ref={invoiceIdInputRef}
                      type="text"
                      value={invoiceId}
                      onChange={(e) => setInvoiceId(e.target.value)}
                      placeholder="es. FT-2026/0142 oppure 12/A"
                      className="w-full h-8 px-2.5 bg-white border border-apple-border rounded-md text-[13px] font-mono text-apple-text focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[12px] font-semibold text-apple-text">
                        Cliente Intestatario <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickCustError('')
                          setQuickCustOpen(true)
                        }}
                        className="text-[11px] text-apple-accent hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[13px]">person_add</span>
                        <span>Nuovo Cliente</span>
                      </button>
                    </div>
                    <SearchableSelect
                      options={customers}
                      value={customerId}
                      onChange={setCustomerId}
                      placeholder="Seleziona o digita nome cliente..."
                      noResultsText="Nessun cliente trovato"
                      required
                    />
                  </div>
                </div>

                {/* Grid 2: Date Emissione e Scadenza */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[12px] font-semibold text-apple-text mb-1">
                      Data Documento <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-apple-border rounded-md text-[12px] font-mono text-apple-text focus:outline-none focus:border-apple-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-apple-text mb-1">
                      Data Scadenza <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full h-8 px-2 bg-white border border-apple-border rounded-md text-[12px] font-mono text-apple-text focus:outline-none focus:border-apple-accent"
                      required
                    />
                  </div>
                </div>

                {/* Scorciatoie Data Scadenza */}
                <div className="flex items-center gap-1.5 text-[11px] text-apple-secondary">
                  <span className="text-[10px] uppercase font-semibold text-apple-subtle">
                    Scadenza:
                  </span>
                  <button
                    type="button"
                    onClick={() => applyDueDateShortcut('+30')}
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-apple-border/60 cursor-pointer"
                  >
                    +30 gg
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDueDateShortcut('+60')}
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-apple-border/60 cursor-pointer"
                  >
                    +60 gg
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDueDateShortcut('endOfMonth')}
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-apple-border/60 cursor-pointer"
                  >
                    Fine Mese
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDueDateShortcut('immediate')}
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-apple-border/60 cursor-pointer"
                  >
                    Vista
                  </button>
                </div>

                {/* Importo Totale */}
                <div className="pt-1">
                  <label className="block text-[12px] font-semibold text-apple-text mb-1">
                    Importo Totale Fattura (€) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-subtle font-mono text-[14px]">
                      €
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-9 pl-8 pr-3 bg-white border border-apple-border rounded-md text-[14px] font-mono font-semibold text-apple-text focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent"
                      required
                    />
                  </div>
                </div>

                {/* Note / Riferimenti Opzionali */}
                <div>
                  <label className="block text-[12px] font-semibold text-apple-text mb-1">
                    Note / Descrizione Prestazione{' '}
                    <span className="text-apple-subtle font-normal text-[11px]">(opzionale)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="es. Consulenza software settembre, Fornitura hardware..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-apple-border rounded-md text-[12px] text-apple-text focus:outline-none focus:border-apple-accent"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-apple-border flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceId(generateSuggestedInvoiceId())
                      setCustomerId('')
                      setAmount('')
                      setFormNotes('')
                      setFormError('')
                      triggerInputFocus()
                    }}
                    className="h-8 px-3 rounded-md bg-white border border-apple-border hover:bg-slate-50 text-[12px] font-medium text-apple-secondary transition cursor-pointer"
                  >
                    Pulisci
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingNew}
                    className="h-8 px-4 rounded-md bg-apple-accent hover:bg-apple-accent-hover text-white text-[12px] font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSubmittingNew ? (
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        progress_activity
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">save</span>
                    )}
                    <span>Registra</span>
                  </button>
                </div>
              </form>
            )}

            {/* VIEW B: DETTAGLIO ED EDIT FATTURA SELEZIONATA */}
            {rightPaneMode === 'detail' && selectedInvoice && (
              <div className="space-y-4">
                {/* Header Dettaglio */}
                <div className="flex items-start justify-between pb-3 border-b border-apple-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[16px] font-bold font-mono text-apple-text">
                        #{selectedInvoice.id}
                      </h3>
                      {selectedInvoice.statusKey === 'paid' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                          Saldata
                        </span>
                      )}
                      {selectedInvoice.statusKey === 'partial' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                          Parziale
                        </span>
                      )}
                      {selectedInvoice.statusKey === 'overdue' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200/50">
                          Scaduta ({selectedInvoice.overdueDays}gg)
                        </span>
                      )}
                      {selectedInvoice.statusKey === 'unpaid' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-apple-secondary">
                          In attesa
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-apple-secondary mt-0.5">
                      Intestata a:{' '}
                      <button
                        type="button"
                        onClick={() =>
                          navigate('/clients', {
                            state: { selectedCustomerId: selectedInvoice.customer_id }
                          })
                        }
                        className="font-medium text-apple-text hover:text-apple-accent hover:underline cursor-pointer"
                      >
                        {selectedInvoice.customer_name}
                      </button>
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isEditingSelected ? (
                      <button
                        type="button"
                        onClick={handleStartEditSelected}
                        className="h-7 px-2.5 bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[11px] font-medium rounded flex items-center gap-1 transition cursor-pointer"
                        title="Modifica dati documento"
                      >
                        <span className="material-symbols-outlined text-[13px]">edit</span>
                        <span>Modifica</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingSelected(false)}
                        className="h-7 px-2.5 bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[11px] font-medium rounded flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>Annulla</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteInvoiceId(selectedInvoice.id)
                        setDeleteError('')
                        setDeleteConfirmOpen(true)
                      }}
                      className="h-7 w-7 bg-white border border-apple-border text-apple-secondary hover:text-rose-600 rounded flex items-center justify-center transition cursor-pointer"
                      title="Elimina documento"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Form Modifica Inline (se attivo) */}
                {isEditingSelected ? (
                  <form onSubmit={handleSaveEditSelected} className="space-y-3 bg-slate-50 p-3 rounded-lg border border-apple-border">
                    <div className="text-[12px] font-semibold text-apple-text flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-apple-accent">
                        edit_document
                      </span>
                      <span>Modifica Dati Fattura</span>
                    </div>

                    {editError && (
                      <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded">
                        {editError}
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-apple-secondary mb-1">
                        Cliente
                      </label>
                      <SearchableSelect
                        options={customers}
                        value={editCustomerId}
                        onChange={setEditCustomerId}
                        placeholder="Seleziona cliente..."
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-apple-secondary mb-1">
                          Data Emissione
                        </label>
                        <input
                          type="date"
                          value={editIssueDate}
                          onChange={(e) => setEditIssueDate(e.target.value)}
                          className="w-full h-8 px-2 bg-white border border-apple-border rounded text-[12px] font-mono text-apple-text"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-apple-secondary mb-1">
                          Data Scadenza
                        </label>
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="w-full h-8 px-2 bg-white border border-apple-border rounded text-[12px] font-mono text-apple-text"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-apple-secondary mb-1">
                        Importo Documento (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full h-8 px-2.5 bg-white border border-apple-border rounded text-[13px] font-mono text-apple-text"
                        required
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingSelected(false)}
                        className="h-7 px-3 bg-white border border-apple-border text-apple-secondary text-[12px] rounded hover:bg-slate-100 cursor-pointer"
                      >
                        Annulla
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingEdit}
                        className="h-7 px-3 bg-apple-accent hover:bg-apple-accent-hover text-white text-[12px] font-semibold rounded cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingEdit ? 'Salvataggio...' : 'Salva Modifiche'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 bg-slate-50 border border-apple-border rounded-lg">
                        <div className="text-[10px] uppercase font-semibold text-apple-subtle">
                          Totale
                        </div>
                        <div className="text-[15px] font-mono font-bold text-apple-text mt-0.5">
                          {formatCurrency(selectedInvoice.amount)}
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-apple-border rounded-lg">
                        <div className="text-[10px] uppercase font-semibold text-apple-subtle">
                          Incassato
                        </div>
                        <div className="text-[15px] font-mono font-bold text-emerald-700 mt-0.5">
                          {formatCurrency(selectedInvoice.paidAmount)}
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-apple-border rounded-lg">
                        <div className="text-[10px] uppercase font-semibold text-apple-subtle">
                          Residuo
                        </div>
                        <div
                          className={`text-[15px] font-mono font-bold mt-0.5 ${
                            selectedInvoice.remainingAmount > 0.001
                              ? 'text-rose-600'
                              : 'text-apple-subtle'
                          }`}
                        >
                          {formatCurrency(selectedInvoice.remainingAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Dettagli Date e Scadenza */}
                    <div className="p-3 bg-white border border-apple-border rounded-lg space-y-2 text-[12px]">
                      <div className="flex justify-between">
                        <span className="text-apple-secondary">Data Emissione:</span>
                        <span className="font-mono text-apple-text font-medium">
                          {formatDate(selectedInvoice.issue_date)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-apple-secondary">Data Scadenza:</span>
                        <span
                          className={`font-mono font-medium ${
                            selectedInvoice.statusKey === 'overdue'
                              ? 'text-rose-600'
                              : 'text-apple-text'
                          }`}
                        >
                          {formatDate(selectedInvoice.due_date)}
                          {selectedInvoice.overdueDays > 0 &&
                            ` (scaduta da ${selectedInvoice.overdueDays} giorni)`}
                        </span>
                      </div>
                    </div>

                    {/* Quick Payment Button if balance remaining */}
                    {selectedInvoice.remainingAmount > 0.001 && (
                      <button
                        type="button"
                        onClick={() => handleOpenQuickPay(selectedInvoice)}
                        className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[17px]">add_card</span>
                        <span>
                          Registra Incasso ({formatCurrency(selectedInvoice.remainingAmount)})
                        </span>
                      </button>
                    )}

                    {/* Storico Pagamenti Ricevuti */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-apple-text">
                          Incassi Registrati per questo Documento
                        </span>
                        <span className="text-apple-subtle font-mono text-[11px]">
                          {selectedInvoice.paymentsList?.length || 0} versamenti
                        </span>
                      </div>

                      {selectedInvoice.paymentsList && selectedInvoice.paymentsList.length > 0 ? (
                        <div className="border border-apple-border rounded-lg overflow-hidden divide-y divide-apple-border/50 text-[12px]">
                          {selectedInvoice.paymentsList.map((pay) => (
                            <div
                              key={pay.id}
                              className="p-2.5 bg-slate-50/50 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[15px] text-emerald-600">
                                  check
                                </span>
                                <div>
                                  <span className="font-mono text-[11px] text-apple-secondary">
                                    {formatDate(pay.date)}
                                  </span>
                                  <div className="font-medium text-apple-text text-[12px]">
                                    {pay.method || 'Pagamento'}
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono font-bold text-emerald-700">
                                +{formatCurrency(pay.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-slate-50 border border-apple-border/70 text-center text-apple-subtle text-[12px]">
                          Nessun incasso registrato finora per questa fattura.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: INCASSO RAPIDO FATTURA */}
      <Modal
        isOpen={quickPayOpen}
        onClose={() => setQuickPayOpen(false)}
        title={`Registra Incasso per Fattura ${selectedInvoice?.id}`}
      >
        <form onSubmit={handleRegisterQuickPayment} className="space-y-4">
          {quickPayError && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[12px]">
              {quickPayError}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-apple-border rounded-lg text-[12px] space-y-1">
            <div className="flex justify-between">
              <span className="text-apple-secondary">Cliente:</span>
              <span className="font-medium text-apple-text">{selectedInvoice?.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-apple-secondary">Totale Documento:</span>
              <span className="font-mono font-medium text-apple-text">
                {formatCurrency(selectedInvoice?.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-apple-secondary">Residuo da Saldare:</span>
              <span className="font-mono font-bold text-rose-600">
                {formatCurrency(selectedInvoice?.remainingAmount)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-apple-text mb-1">
              Importo Incassato (€) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={quickPayAmount}
              onChange={(e) => setQuickPayAmount(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-apple-border rounded-md text-[14px] font-mono font-bold text-apple-text focus:outline-none focus:border-apple-accent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-apple-text mb-1">
                Data Incasso
              </label>
              <input
                type="date"
                value={quickPayDate}
                onChange={(e) => setQuickPayDate(e.target.value)}
                className="w-full h-8 px-2 bg-white border border-apple-border rounded-md text-[12px] font-mono text-apple-text focus:outline-none focus:border-apple-accent"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-apple-text mb-1">
                Metodo di Pagamento
              </label>
              <select
                value={quickPayMethod}
                onChange={(e) => setQuickPayMethod(e.target.value)}
                className="w-full h-8 px-2 bg-white border border-apple-border rounded-md text-[12px] text-apple-text focus:outline-none focus:border-apple-accent"
              >
                <option value="Contanti">Contanti</option>
                <option value="Bonifico">Bonifico Bancario</option>
                <option value="Carta">Carta di Credito/POS</option>
                <option value="Assegno">Assegno</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-apple-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setQuickPayOpen(false)}
              className="h-8 px-3 rounded-md bg-white border border-apple-border text-apple-secondary text-[12px] hover:bg-slate-50 cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmittingQuickPay}
              className="h-8 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmittingQuickPay ? 'Salvataggio...' : 'Conferma Incasso'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: NUOVO CLIENTE RAPIDO */}
      <Modal
        isOpen={quickCustOpen}
        onClose={() => setQuickCustOpen(false)}
        title="Nuovo Cliente Rapido"
      >
        <form onSubmit={handleQuickAddCustomer} className="space-y-4">
          {quickCustError && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[12px]">
              {quickCustError}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-apple-text mb-1">
              Nome o Ragione Sociale <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="es. Acme S.r.l."
              value={quickCustName}
              onChange={(e) => setQuickCustName(e.target.value)}
              className="w-full h-8 px-2.5 bg-white border border-apple-border rounded-md text-[13px] text-apple-text focus:outline-none focus:border-apple-accent"
              required
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-apple-text mb-1">
              Email / PEC <span className="text-apple-subtle font-normal text-[11px]">(opzionale)</span>
            </label>
            <input
              type="email"
              placeholder="amministrazione@acme.it"
              value={quickCustEmail}
              onChange={(e) => setQuickCustEmail(e.target.value)}
              className="w-full h-8 px-2.5 bg-white border border-apple-border rounded-md text-[13px] text-apple-text focus:outline-none focus:border-apple-accent"
            />
          </div>

          <div className="pt-3 border-t border-apple-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setQuickCustOpen(false)}
              className="h-8 px-3 rounded-md bg-white border border-apple-border text-apple-secondary text-[12px] hover:bg-slate-50 cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmittingQuickCust}
              className="h-8 px-4 rounded-md bg-apple-accent hover:bg-apple-accent-hover text-white text-[12px] font-semibold cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmittingQuickCust ? 'Salvataggio...' : 'Crea e Seleziona'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CONFERMA ELIMINAZIONE FATTURA */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Elimina Registrazione Fattura"
      >
        <div className="space-y-3">
          {deleteError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[12px] rounded">
              {deleteError}
            </div>
          )}

          <p className="text-[13px] text-apple-text">
            Sei sicuro di voler eliminare dal registro la fattura{' '}
            <strong className="font-mono font-bold text-apple-text">#{deleteInvoiceId}</strong>?
          </p>

          <div className="p-2.5 rounded bg-slate-50 border border-apple-border text-[11px] text-apple-secondary space-y-1">
            <div className="font-semibold text-apple-text flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-amber-600">warning</span>
              <span>Attenzione alla contabilità correlata:</span>
            </div>
            <p>
              L&apos;eliminazione cancellerà le registrazioni in Prima Nota relative a questo
              documento e scollegherà eventuali incassi già registrati. L&apos;operazione è
              irreversibile.
            </p>
          </div>

          <div className="pt-3 border-t border-apple-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              className="h-8 px-3 rounded-md bg-white border border-apple-border text-apple-secondary text-[12px] hover:bg-slate-50 cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={isSubmittingDelete}
              onClick={handleDeleteInvoice}
              className="h-8 px-4 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-semibold cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmittingDelete ? 'Eliminazione...' : 'Conferma Eliminazione'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
