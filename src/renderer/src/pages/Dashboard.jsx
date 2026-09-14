import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'

// Dati dimostrativi fedeli al prototipo nel caso il DB locale sia ancora vuoto
const PROTOTYPE_INVOICES = [
  {
    id: 'FT-2026/0142',
    customer_id: 'cust-padana',
    customer_name: 'Logistica Padana S.r.l.',
    vat_number: '03849180291',
    sdi_code: 'M5UXCR1',
    pec: 'logistica.padana@pec.it',
    address: 'Verona (VR), Viale del Lavoro 42',
    issue_date: '2026-09-29',
    due_date: '2026-10-15',
    amount: 3450.0,
    paid_amount: 0.0,
    remaining_amount: 3450.0,
    status: 'overdue',
    type: 'emessa',
    bank_account: 'Banca Unicredit (IT29X02008...)',
    overdue_days: 14,
    customer_stats: {
      yearly_turnover: 42800.0,
      invoices_count: 8,
      avg_payment_days: 34,
      dso_status: 'DSO regolare',
      paid_invoices: 7,
      total_invoices: 8,
      current_overdue: 3450.0,
      open_invoices: 1,
      period_turnover: 12600.0
    }
  },
  {
    id: 'FT-2026/0141',
    customer_id: 'cust-bernasconi',
    customer_name: 'Studio Bernasconi Architettura',
    vat_number: '01928374652',
    sdi_code: 'K3L89M2',
    pec: 'architettura.bernasconi@pec.it',
    address: 'Milano (MI), Via Dante 12',
    issue_date: '2026-09-26',
    due_date: '2026-10-01',
    amount: 7800.0,
    paid_amount: 0.0,
    remaining_amount: 7800.0,
    status: 'due_soon',
    type: 'emessa',
    bank_account: 'Banca Intesa Sanpaolo (IT44Y03069...)',
    due_soon_days: 4,
    customer_stats: {
      yearly_turnover: 28500.0,
      invoices_count: 5,
      avg_payment_days: 28,
      dso_status: 'DSO regolare',
      paid_invoices: 4,
      total_invoices: 5,
      current_overdue: 7800.0,
      open_invoices: 1,
      period_turnover: 7800.0
    }
  },
  {
    id: 'FT-2026/0140',
    customer_id: 'cust-nextgen',
    customer_name: 'NextGen Retail Group S.p.A.',
    vat_number: '09923840193',
    sdi_code: 'A9B2C4D',
    pec: 'amministrazione@pec.nextgenretail.it',
    address: 'Bologna (BO), Via dell’Indipendenza 5',
    issue_date: '2026-09-24',
    due_date: '2026-10-24',
    amount: 5200.0,
    paid_amount: 5200.0,
    remaining_amount: 0.0,
    status: 'paid',
    type: 'emessa',
    bank_account: 'Banca Nazionale del Lavoro (IT02O01005...)',
    customer_stats: {
      yearly_turnover: 65400.0,
      invoices_count: 12,
      avg_payment_days: 22,
      dso_status: 'Ottimo',
      paid_invoices: 12,
      total_invoices: 12,
      current_overdue: 0.0,
      open_invoices: 0,
      period_turnover: 18400.0
    }
  },
  {
    id: 'FT-2026/0139',
    customer_id: 'cust-techflow',
    customer_name: 'TechFlow Solutions S.r.l.',
    vat_number: '08273645192',
    sdi_code: 'Z8Y7X6W',
    pec: 'techflow@legalmail.it',
    address: 'Torino (TO), Corso Francia 108',
    issue_date: '2026-09-21',
    due_date: '2026-10-21',
    amount: 10540.0,
    paid_amount: 0.0,
    remaining_amount: 10540.0,
    status: 'pending',
    type: 'emessa',
    bank_account: 'Crédit Agricole (IT88I06230...)',
    customer_stats: {
      yearly_turnover: 84000.0,
      invoices_count: 9,
      avg_payment_days: 30,
      dso_status: 'DSO regolare',
      paid_invoices: 8,
      total_invoices: 9,
      current_overdue: 10540.0,
      open_invoices: 1,
      period_turnover: 22100.0
    }
  },
  {
    id: 'FT-2026/0138',
    customer_id: 'cust-edilnord',
    customer_name: 'Edilnord S.r.l. Costruzioni',
    vat_number: '04492817364',
    sdi_code: 'Q1W2E3R',
    pec: 'edilnord.costruzioni@pec.it',
    address: 'Brescia (BS), Via Lamarmora 89',
    issue_date: '2026-09-18',
    due_date: '2026-09-30',
    amount: 1850.0,
    paid_amount: 1850.0,
    remaining_amount: 0.0,
    status: 'paid',
    type: 'emessa',
    bank_account: 'Banca Popolare di Sondrio (IT56A05696...)',
    customer_stats: {
      yearly_turnover: 22100.0,
      invoices_count: 6,
      avg_payment_days: 15,
      dso_status: 'Puntuale',
      paid_invoices: 6,
      total_invoices: 6,
      current_overdue: 0.0,
      open_invoices: 0,
      period_turnover: 6500.0
    }
  },
  {
    id: 'FT-2026/0137',
    customer_id: 'cust-beta',
    customer_name: 'Beta Consulting Sas',
    vat_number: '07182936451',
    sdi_code: 'T9Y8U7I',
    pec: 'beta.consulting@pec.it',
    address: 'Padova (PD), Riviera Tito Livio 14',
    issue_date: '2026-09-15',
    due_date: '2026-10-15',
    amount: 980.0,
    paid_amount: 400.0,
    remaining_amount: 580.0,
    status: 'partial',
    type: 'emessa',
    bank_account: 'Monte dei Paschi di Siena (IT77P01030...)',
    customer_stats: {
      yearly_turnover: 14200.0,
      invoices_count: 4,
      avg_payment_days: 31,
      dso_status: 'DSO regolare',
      paid_invoices: 3,
      total_invoices: 4,
      current_overdue: 0.0,
      open_invoices: 1,
      period_turnover: 3920.0
    }
  }
]

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    invoices: dbInvoices,
    customers,
    payments,
    fetchAllData,
    dashboardSearch,
    selectedInvoiceId,
    setSelectedInvoiceId,
    addMultiPayment,
    allocateAcconto
  } = useStore()

  const [localStatusFilter, setLocalStatusFilter] = useState('all')
  const [toastMessage, setToastMessage] = useState(null)
  const [quickPaymentModalOpen, setQuickPaymentModalOpen] = useState(false)
  const [quickPaymentAmount, setQuickPaymentAmount] = useState('')
  const [quickPaymentDate, setQuickPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [quickPaymentMethod, setQuickPaymentMethod] = useState('Contanti')
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Formatta valuta in Euro
  const formatCurrency = useCallback((val) => {
    if (val === undefined || val === null || isNaN(val)) return '€ 0,00'
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
  }, [])

  // Formatta data (DD/MM/YYYY)
  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }, [])

  // Mappiamo le fatture reali o usiamo i dati dimostrativi
  const allInvoices = useMemo(() => {
    if (dbInvoices && dbInvoices.length > 0) {
      const today = new Date()
      return dbInvoices.map((inv) => {
        const customer = customers.find((c) => c.id === inv.customer_id)
        const dueDate = new Date(inv.due_date)
        const diffDays = Math.round((today - dueDate) / (1000 * 60 * 60 * 24))

        const invPayments = (payments || []).filter((p) => p.invoice_id === inv.id)
        const paidAmount = Math.round(invPayments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100
        const remainingAmount = Math.max(0, Math.round((inv.amount - paidAmount) * 100) / 100)

        const isPaid = inv.status === 'paid' || remainingAmount <= 0.001
        const isPartial = !isPaid && paidAmount > 0.001

        let derivedStatus = inv.status
        let overdueDays = 0
        let dueSoonDays = 0

        if (isPaid) {
          derivedStatus = 'paid'
        } else if (isPartial) {
          derivedStatus = 'partial'
          if (diffDays > 0) {
            overdueDays = diffDays
          } else if (diffDays >= -7 && diffDays <= 0) {
            dueSoonDays = Math.abs(diffDays)
          }
        } else if (diffDays > 0) {
          derivedStatus = 'overdue'
          overdueDays = diffDays
        } else if (diffDays >= -7 && diffDays <= 0) {
          derivedStatus = 'due_soon'
          dueSoonDays = Math.abs(diffDays)
        } else {
          derivedStatus = 'pending'
        }

        const imponibile = inv.amount / 1.22
        const iva = inv.amount - imponibile

        return {
          id: inv.id,
          customer_id: inv.customer_id,
          customer_name: inv.customer_name || customer?.name || 'Cliente sconosciuto',
          vat_number: customer?.email?.includes('@')
            ? customer.email
            : `P.IVA IT${inv.customer_id?.slice(0, 11) || '00000000000'}`,
          sdi_code: 'M5UXCR1',
          pec: customer?.email || 'amministrazione@pec.it',
          address: 'Sede Legale registrata',
          issue_date: inv.issue_date,
          due_date: inv.due_date,
          amount: inv.amount,
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          imponibile,
          iva,
          status: derivedStatus,
          type: 'emessa',
          overdue_days: overdueDays,
          due_soon_days: dueSoonDays,
          bank_account: 'Banca Unicredit (IT29X02008...)',
          customer_stats: {
            yearly_turnover: customer?.total_invoiced || inv.amount,
            invoices_count: 1,
            avg_payment_days: 30,
            dso_status: 'DSO regolare',
            paid_invoices: customer?.total_paid > 0 ? 1 : 0,
            total_invoices: 1,
            current_overdue: customer?.balance || (inv.status !== 'paid' ? inv.amount : 0),
            open_invoices: inv.status !== 'paid' ? 1 : 0,
            period_turnover: customer?.total_invoiced || inv.amount
          }
        }
      })
    }
    return PROTOTYPE_INVOICES
  }, [dbInvoices, customers, payments])

  // Filtro combinato: Ricerca + Filtro stato interno
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((inv) => {
      // 1. Filtro dropdown locale
      if (localStatusFilter === 'paid' && inv.status !== 'paid') return false
      if (localStatusFilter === 'partial' && inv.status !== 'partial') return false
      if (
        localStatusFilter === 'unpaid' &&
        inv.status !== 'unpaid' &&
        inv.status !== 'pending' &&
        inv.status !== 'due_soon' &&
        inv.status !== 'partial'
      )
        return false
      if (
        localStatusFilter === 'overdue' &&
        inv.status !== 'overdue' &&
        !(inv.status === 'partial' && inv.overdue_days > 0)
      )
        return false

      // 2. Ricerca full-text
      if (dashboardSearch && dashboardSearch.trim() !== '') {
        const q = dashboardSearch.toLowerCase().trim()
        const matchId = inv.id.toLowerCase().includes(q)
        const matchCustomer = inv.customer_name.toLowerCase().includes(q)
        const matchVat = (inv.vat_number || '').toLowerCase().includes(q)
        if (!matchId && !matchCustomer && !matchVat) return false
      }

      return true
    })
  }, [allInvoices, localStatusFilter, dashboardSearch])

  // Selezione della fattura attiva (predefinita la prima trovata)
  const activeInvoice = useMemo(() => {
    if (selectedInvoiceId) {
      const found = filteredInvoices.find((i) => i.id === selectedInvoiceId)
      if (found) return found
    }
    return filteredInvoices[0] || null
  }, [filteredInvoices, selectedInvoiceId])

  // Aggiorna la selezione se cambia la lista o non è impostata
  useEffect(() => {
    if (!selectedInvoiceId && filteredInvoices.length > 0) {
      setSelectedInvoiceId(filteredInvoices[0].id)
    }
  }, [selectedInvoiceId, filteredInvoices, setSelectedInvoiceId])

  // Totali KPI
  const statsSummary = useMemo(() => {
    let scadute = 0
    let inAttesa = 0
    let incassate = 0
    let totaleVisualizzato = 0

    filteredInvoices.forEach((inv) => {
      totaleVisualizzato += inv.amount

      const rem =
        inv.remaining_amount !== undefined
          ? inv.remaining_amount
          : inv.status === 'paid'
            ? 0
            : inv.amount
      const paid =
        inv.paid_amount !== undefined
          ? inv.paid_amount
          : inv.status === 'paid'
            ? inv.amount
            : 0

      incassate += paid

      if (inv.status === 'paid') {
        // Già contato in incassate
      } else if (inv.status === 'overdue' || (inv.status === 'partial' && inv.overdue_days > 0)) {
        scadute += rem
      } else {
        inAttesa += rem
      }
    })

    return {
      scadute,
      inAttesa,
      incassate,
      totaleVisualizzato
    }
  }, [filteredInvoices])

  // Calcolo incassi e saldo residuo per la fattura attiva
  const activeInvoicePaid = useMemo(() => {
    if (!activeInvoice) return 0
    if (activeInvoice.paid_amount !== undefined) return activeInvoice.paid_amount
    if (dbInvoices && dbInvoices.length > 0) {
      const invPayments = (payments || []).filter((p) => p.invoice_id === activeInvoice.id)
      return invPayments.reduce((sum, p) => sum + p.amount, 0)
    }
    return activeInvoice.status === 'paid' ? activeInvoice.amount : 0
  }, [activeInvoice, payments, dbInvoices])

  const activeInvoiceRemaining = useMemo(() => {
    if (!activeInvoice) return 0
    if (activeInvoice.remaining_amount !== undefined) return activeInvoice.remaining_amount
    return Math.max(0, activeInvoice.amount - activeInvoicePaid)
  }, [activeInvoice, activeInvoicePaid])

  // Cliente attivo e credito acconto residuo (Punto 2)
  const activeCustomer = useMemo(() => {
    if (!activeInvoice || !customers) return null
    return customers.find((c) => c.id === activeInvoice.customer_id) || null
  }, [activeInvoice, customers])

  const activeCustomerAcconto = useMemo(() => {
    return activeCustomer?.total_acconto || 0
  }, [activeCustomer])

  // Gestione Stampa
  const handlePrint = () => {
    window.print()
  }

  // Registra incasso rapido (F7)
  const handleOpenQuickPayment = useCallback(() => {
    if (!activeInvoice) return
    const defaultAmount =
      activeInvoiceRemaining > 0 ? activeInvoiceRemaining : activeInvoice.amount
    setQuickPaymentAmount(defaultAmount.toFixed(2))
    setQuickPaymentDate(new Date().toISOString().split('T')[0])
    setQuickPaymentMethod('Contanti')
    setQuickPaymentModalOpen(true)
  }, [activeInvoice, activeInvoiceRemaining])

  // Compensazione con Credito / Acconto del Cliente (Punto 2)
  const handleCompensateWithCredit = async () => {
    if (!activeInvoice || isSubmittingPayment || activeCustomerAcconto <= 0) return

    const amountToAllocate = Math.min(activeCustomerAcconto, activeInvoiceRemaining)
    if (amountToAllocate <= 0) return

    setIsSubmittingPayment(true)
    try {
      if (!dbInvoices || dbInvoices.length === 0) {
        setQuickPaymentModalOpen(false)
        setToastMessage(
          `[Demo] Compensati ${formatCurrency(amountToAllocate)} con credito cliente per ${activeInvoice.id}!`
        )
        setTimeout(() => setToastMessage(null), 3500)
        return
      }

      const res = await allocateAcconto({
        customerId: activeInvoice.customer_id,
        amountToAllocate,
        allocations: [{ invoiceId: activeInvoice.id, amount: amountToAllocate }]
      })

      if (res && res.success) {
        setQuickPaymentModalOpen(false)
        setToastMessage(
          `Compensati ${formatCurrency(amountToAllocate)} con credito per ${activeInvoice.id}!`
        )
        setTimeout(() => setToastMessage(null), 3500)
      } else {
        alert('Errore durante la compensazione: ' + (res?.error || 'Operazione non riuscita'))
      }
    } catch (err) {
      alert('Errore durante la compensazione: ' + err.message)
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  // Conferma Incasso Rapido (con gestione Overpayment - Punto 3)
  const handleConfirmQuickPayment = async (e) => {
    if (e) e.preventDefault()
    if (!activeInvoice || isSubmittingPayment) return

    const parsedAmount = parseFloat(quickPaymentAmount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Inserisci un importo valido maggiore di zero.')
      return
    }

    const allocAmount = Math.min(parsedAmount, activeInvoiceRemaining)
    const accontoAmount = Math.max(0, Math.round((parsedAmount - allocAmount) * 100) / 100)

    setIsSubmittingPayment(true)
    try {
      if (!dbInvoices || dbInvoices.length === 0) {
        // Modalità dimostrativa
        setQuickPaymentModalOpen(false)
        setToastMessage(
          accontoAmount > 0
            ? `[Demo] Incasso: ${formatCurrency(allocAmount)} a saldo e ${formatCurrency(accontoAmount)} acconto!`
            : `[Demo] Incasso di ${formatCurrency(parsedAmount)} registrato per ${activeInvoice.id}!`
        )
        setTimeout(() => setToastMessage(null), 3500)
        return
      }

      const res = await addMultiPayment({
        customerId: activeInvoice.customer_id,
        totalAmount: parsedAmount,
        method: quickPaymentMethod,
        date: quickPaymentDate || new Date().toISOString().split('T')[0],
        allocations: [{ invoiceId: activeInvoice.id, amount: allocAmount }],
        accontoAmount
      })

      if (res && res.success) {
        setQuickPaymentModalOpen(false)
        setToastMessage(
          accontoAmount > 0
            ? `Incasso registrato: ${formatCurrency(allocAmount)} a saldo e ${formatCurrency(accontoAmount)} come acconto cliente!`
            : `Incasso di ${formatCurrency(parsedAmount)} registrato per ${activeInvoice.id}!`
        )
        setTimeout(() => setToastMessage(null), 3500)
      } else {
        alert('Errore durante la registrazione dell incasso: ' + (res?.error || 'Operazione non riuscita'))
      }
    } catch (err) {
      alert('Errore durante la registrazione dell incasso: ' + err.message)
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  // Keyboard shortcut (F7 per aprire incasso rapido, Escape per chiudere modale)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && quickPaymentModalOpen) {
        setQuickPaymentModalOpen(false)
      } else if (e.key === 'F7' && !quickPaymentModalOpen) {
        e.preventDefault()
        handleOpenQuickPayment()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [quickPaymentModalOpen, handleOpenQuickPayment])

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden select-none font-sans">
      {/* Toast Notifiche */}
      {toastMessage && (
        <div className="absolute top-3 right-3 z-50 bg-apple-text text-white text-[13px] font-medium px-3.5 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[16px] text-apple-green">
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Desktop Workstation Toolbar / Invoice Filter Bar Header */}
      <div className="h-10 bg-slate-50/70 border-b border-apple-border px-4 flex items-center justify-between text-[13px] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-apple-secondary font-medium">
            <span className="material-symbols-outlined text-[16px] text-apple-accent">
              receipt_long
            </span>
            <span className="text-apple-text font-semibold">Elenco Fatture</span>
          </div>
          <div className="h-3.5 w-px bg-apple-border hidden md:block" />
          <div className="flex items-center gap-1.5 text-[12px] text-apple-secondary">
            <span className="font-medium text-apple-text">Stato:</span>
            <select
              value={localStatusFilter}
              onChange={(e) => setLocalStatusFilter(e.target.value)}
              className="bg-white px-2 py-0.5 rounded border border-apple-border text-apple-text font-medium cursor-pointer focus:outline-none"
            >
              <option value="all">Tutti gli stati</option>
              <option value="unpaid">In attesa</option>
              <option value="partial">Parziali</option>
              <option value="overdue">Scadute</option>
              <option value="paid">Saldate</option>
            </select>

            <span className="font-medium text-apple-text ml-1 hidden lg:inline">Periodo:</span>
            <span className="hidden lg:flex bg-white px-2 py-0.5 rounded border border-apple-border text-apple-text font-medium items-center gap-1 cursor-pointer">
              Q3 {new Date().getFullYear()} (Lug - Set)
              <span className="material-symbols-outlined text-[12px]">calendar_month</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Two-Pane Native Split Desktop Layout */}
      <div className="flex-1 grid grid-cols-12 min-h-0 divide-x divide-apple-border bg-[#FAFAFA]">
        {/* Left Pane: Native Invoice Data Grid (8 Cols) */}
        <div className="col-span-8 flex flex-col min-h-0 bg-white">
          {/* Table Filter & Search Sub-strip */}
          <div className="h-8 px-3 bg-white border-b border-apple-border flex items-center justify-between text-[13px] text-apple-secondary flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-apple-text">Fatture Emesse &amp; Ricevute</span>
              <span className="text-apple-subtle font-mono text-[12px]">
                ({filteredInvoices.length} documenti trovati)
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[12px]">
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 font-medium border border-rose-200/50">
                Scadute: {formatCurrency(statsSummary.scadute)}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium border border-amber-200/50">
                In attesa: {formatCurrency(statsSummary.inAttesa)}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                Incassate: {formatCurrency(statsSummary.incassate)}
              </span>
            </div>
          </div>

          {/* Dense Desktop Invoices Table */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-apple-border text-[12px] uppercase font-semibold text-apple-subtle tracking-wider z-10">
                <tr>
                  <th className="py-2 px-3 border-r border-apple-border/70 w-28">Data</th>
                  <th className="py-2 px-3 border-r border-apple-border/70 w-36">Numero Documento</th>
                  <th className="py-2 px-3 border-r border-apple-border/70">Cliente</th>
                  <th className="py-2 px-3 border-r border-apple-border/70 text-right w-36">Totale Documento</th>
                  <th className="py-2 px-3 border-r border-apple-border/70 w-28">Scadenza</th>
                  <th className="py-2 px-3 text-left w-36">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border/50 text-[13px] text-apple-text font-normal font-sans">
                {filteredInvoices.map((inv) => {
                  const isSelected = activeInvoice?.id === inv.id

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      className={`cursor-pointer transition ${
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
                          isSelected ? 'font-semibold text-apple-text' : 'text-apple-secondary'
                        }`}
                      >
                        {inv.id}
                      </td>

                      {/* CLIENTE */}
                      <td className="py-1.5 px-3 border-r border-apple-border/70 truncate">
                        <span
                          className={`truncate block ${
                            isSelected ? 'font-semibold text-apple-text' : 'text-apple-text'
                          }`}
                        >
                          {inv.customer_name}
                        </span>
                      </td>

                      {/* TOTALE DOCUMENTO */}
                      <td
                        className={`py-1.5 px-3 border-r border-apple-border/70 text-right font-mono whitespace-nowrap ${
                          isSelected ? 'font-bold text-apple-text' : 'font-semibold text-apple-text'
                        }`}
                      >
                        {formatCurrency(inv.amount)}
                      </td>

                      {/* SCADENZA */}
                      <td className="py-1.5 px-3 border-r border-apple-border/70 text-apple-secondary font-mono text-[12px] whitespace-nowrap">
                        {formatDate(inv.due_date)}
                      </td>

                      {/* STATO */}
                      <td className="py-1.5 px-3 whitespace-nowrap">
                        {inv.status === 'paid' && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-apple-green" />
                            Incassata
                          </span>
                        )}
                        {inv.status === 'partial' && (
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/60"
                            title={`Incassati ${formatCurrency(inv.paid_amount)}, residuo ${formatCurrency(inv.remaining_amount)}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            Parziale ({formatCurrency(inv.remaining_amount)})
                          </span>
                        )}
                        {inv.status === 'overdue' && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5F56]" />
                            Scaduta {inv.overdue_days || 14}gg
                          </span>
                        )}
                        {inv.status === 'due_soon' && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFBD2E]" />
                            Scade a {inv.due_soon_days || 4}gg
                          </span>
                        )}
                        {inv.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-apple-secondary border border-black/[0.05]">
                            <span className="w-1.5 h-1.5 rounded-full bg-apple-subtle" />
                            In attesa
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-apple-subtle text-[14px]">
                      Nessuna fattura trovata con i filtri selezionati.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Summary Bar */}
          <div className="h-8 px-3 bg-slate-50 border-t border-apple-border flex items-center justify-between text-[12px] text-apple-secondary font-mono flex-shrink-0">
            <div className="flex items-center gap-3">
              <span>
                {filteredInvoices.length} fatture visibili di {allInvoices.length}
              </span>
              <span className="text-apple-subtle">|</span>
              <span>Ordinamento: Data Decrescente</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-apple-text font-sans font-medium text-[13px]">
                Totale Periodo Visualizzato:
              </span>
              <span className="text-apple-text font-bold bg-white border border-apple-border px-1.5 py-0.5 rounded text-[12px]">
                {formatCurrency(statsSummary.totaleVisualizzato)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Pane: Native macOS Inspector / Dettaglio Documento & Scheda Cliente (4 Cols) */}
        <div className="col-span-4 flex flex-col min-h-0 bg-[#FBFBFC]">
          {/* Inspector Header & Native Actions */}
          <div className="h-9 px-3 bg-slate-50/80 border-b border-apple-border flex items-center justify-between text-[13px] flex-shrink-0">
            <div className="flex items-center gap-1.5 font-semibold text-apple-text">
              <span className="material-symbols-outlined text-[16px] text-apple-secondary">
                receipt
              </span>
              <span>Dettaglio Documento &amp; Anagrafica</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrint}
                className="h-6 px-2 rounded bg-white border border-apple-border text-apple-secondary hover:text-apple-text flex items-center text-[12px] transition cursor-pointer"
                title="Stampa PDF"
              >
                <span className="material-symbols-outlined text-[14px]">print</span>
              </button>
            </div>
          </div>

          {/* Inspector Content Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {activeInvoice ? (
              <>
                {/* Section 1: Selected Invoice Card */}
                <div className="p-3 rounded-lg bg-white border border-apple-border shadow-xs">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[14px] text-apple-text">
                          {activeInvoice.id}
                        </span>
                        {activeInvoice.status === 'paid' && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            Incassata
                          </span>
                        )}
                        {activeInvoice.status === 'partial' && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/60">
                            Parziale ({formatCurrency(activeInvoiceRemaining)} residui)
                          </span>
                        )}
                        {activeInvoice.status === 'overdue' && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200/50">
                            Scaduta {activeInvoice.overdue_days || 14} gg
                          </span>
                        )}
                        {activeInvoice.status === 'due_soon' && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/50">
                            Scade a {activeInvoice.due_soon_days || 4} gg
                          </span>
                        )}
                        {activeInvoice.status === 'pending' && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-apple-secondary border border-black/[0.05]">
                            In attesa
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-apple-secondary font-mono mt-0.5">
                        Emessa il {formatDate(activeInvoice.issue_date)} • Scad.{' '}
                        {formatDate(activeInvoice.due_date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[16px] font-bold font-mono text-apple-text">
                        {formatCurrency(activeInvoice.amount)}
                      </div>
                      <div className="text-[11px] text-apple-subtle font-mono">Totale Fattura</div>
                    </div>
                  </div>

                  {/* Riepilogo Saldo & Incassi */}
                  <div className="mt-2.5 p-2.5 rounded bg-slate-50 border border-black/[0.04] text-[12px] font-mono space-y-1.5">
                    <div className="flex justify-between text-apple-secondary">
                      <span>Già Incassato:</span>
                      <span
                        className={`font-medium ${
                          activeInvoicePaid > 0 ? 'text-emerald-700' : 'text-apple-text'
                        }`}
                      >
                        {formatCurrency(activeInvoicePaid)}
                      </span>
                    </div>
                    <div className="flex justify-between text-apple-secondary pt-1.5 border-t border-black/[0.04]">
                      <span className="font-semibold text-apple-text">Residuo da Saldare:</span>
                      <span
                        className={`font-bold ${
                          activeInvoiceRemaining > 0
                            ? activeInvoice.status === 'overdue'
                              ? 'text-rose-600'
                              : 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(activeInvoiceRemaining)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-apple-border/60 flex items-center justify-between">
                    {activeInvoice.status === 'paid' || activeInvoiceRemaining <= 0 ? (
                      <div className="h-7 px-2.5 bg-emerald-50 text-emerald-700 text-[12px] font-medium rounded flex items-center gap-1.5 border border-emerald-200/60">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        <span>Fattura già saldata</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenQuickPayment}
                        className="h-7 px-3 bg-apple-accent hover:bg-apple-accent-hover text-white text-[12px] font-medium rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        <span>Registra Incasso Rapido</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Section 2: Customer Registry & Live Metrics Card */}
                <div className="p-3 rounded-lg bg-white border border-apple-border shadow-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-apple-border/50">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-apple-accent">
                        business
                      </span>
                      <span className="font-semibold text-[13px] text-apple-text">
                        {activeInvoice.customer_name}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-black/[0.04] text-apple-secondary">
                      Cliente Attivo
                    </span>
                  </div>

                  {/* Registry Data */}
                  <div className="mt-2 space-y-1 text-[12px] text-apple-secondary">
                    <div className="flex justify-between">
                      <span className="text-apple-subtle">P.IVA / C.F.:</span>
                      <span className="font-mono font-medium text-apple-text">
                        {activeInvoice.vat_number || '03849180291'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-apple-subtle">Codice SDI:</span>
                      <span className="font-mono font-medium text-apple-text">
                        {activeInvoice.sdi_code || 'M5UXCR1'}
                      </span>
                    </div>
                    <div className="flex justify-between truncate">
                      <span className="text-apple-subtle">PEC Ufficiale:</span>
                      <span className="font-mono text-apple-text truncate ml-1">
                        {activeInvoice.pec || 'logistica.padana@pec.it'}
                      </span>
                    </div>
                    <div className="flex justify-between truncate">
                      <span className="text-apple-subtle">Sede Legale:</span>
                      <span className="text-apple-text truncate ml-1">
                        {activeInvoice.address || 'Verona (VR), Viale del Lavoro 42'}
                      </span>
                    </div>
                  </div>

                  {/* Live Client Statistics in Rows */}
                  <div className="mt-2.5 pt-2 border-t border-apple-border/50">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle mb-1.5">
                      Statistiche Cliente ({new Date().getFullYear()})
                    </div>
                    <div className="space-y-1.5 text-[12px]">
                      <div className="flex justify-between items-center py-1 px-2 rounded bg-rose-50/60 border border-rose-200/40">
                        <span className="text-rose-600 font-medium">Insoluto Attuale</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-rose-600">
                            {formatCurrency(activeInvoice.customer_stats?.current_overdue || 3450)}
                          </span>
                          <span className="text-[10px] text-rose-500">
                            ({activeInvoice.customer_stats?.open_invoices || 1} aperta)
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-1 px-2 rounded bg-slate-50 border border-black/[0.03]">
                        <span className="text-apple-secondary">Fatturato Anno</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-apple-text">
                            {formatCurrency(activeInvoice.customer_stats?.yearly_turnover || 42800)}
                          </span>
                          <span className="text-[10px] text-apple-subtle">
                            ({activeInvoice.customer_stats?.invoices_count || 8} fatture)
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-1 px-2 rounded bg-slate-50 border border-black/[0.03]">
                        <span className="text-apple-secondary">Tempo Medio Pag.</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-apple-text">
                            {activeInvoice.customer_stats?.avg_payment_days || 34} gg
                          </span>
                          <span className="text-[10px] text-emerald-600 font-medium">
                            ({activeInvoice.customer_stats?.dso_status || 'DSO regolare'})
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-1 px-2 rounded bg-slate-50 border border-black/[0.03]">
                        <span className="text-apple-secondary">Fatture Saldate</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-emerald-700">
                            {activeInvoice.customer_stats?.paid_invoices || 7} / {activeInvoice.customer_stats?.total_invoices || 8}
                          </span>
                          <span className="text-[10px] text-apple-subtle">
                            ({Math.round(
                              ((activeInvoice.customer_stats?.paid_invoices || 7) /
                                (activeInvoice.customer_stats?.total_invoices || 8)) *
                                100
                            )}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-apple-border/50 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => navigate('/invoices')}
                      className="h-6 px-2.5 bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[12px] font-medium rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">history</span>
                      <span>Vedi Storico Fatture</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/clients')}
                      className="h-6 px-2.5 bg-white border border-apple-border text-apple-secondary hover:text-apple-text text-[12px] font-medium rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">badge</span>
                      <span>Anagrafica</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 text-center text-apple-subtle text-[13px]">
                Nessuna fattura selezionata. Clicca su una riga per visualizzare i dettagli.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Payment Modal */}
      {quickPaymentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => !isSubmittingPayment && setQuickPaymentModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-apple-border w-full max-w-[485px] overflow-hidden animate-scale-in flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-50/90 border-b border-apple-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-apple-accent">
                  payments
                </span>
                <span className="font-semibold text-[15px] text-apple-text">
                  Registra Incasso Rapido
                </span>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingPayment && setQuickPaymentModalOpen(false)}
                className="text-apple-subtle hover:text-apple-text cursor-pointer p-1 rounded-md hover:bg-slate-200/60 transition"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmQuickPayment}>
              <div className="p-4 space-y-3.5 text-[14px]">
                {/* Document & Client Info Card */}
                <div className="p-3 rounded-lg bg-slate-50 border border-black/[0.04] space-y-1.5">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-apple-secondary font-medium">Documento:</span>
                    <span className="font-bold font-mono text-apple-text">
                      {activeInvoice?.id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-apple-secondary font-medium">Cliente:</span>
                    <span className="font-semibold text-apple-text truncate ml-2">
                      {activeInvoice?.customer_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-apple-secondary font-medium">Totale Fattura:</span>
                    <span className="font-mono font-medium text-apple-text">
                      {formatCurrency(activeInvoice?.amount)}
                    </span>
                  </div>
                  {activeInvoicePaid > 0 && (
                    <div className="flex justify-between items-center text-[13px] text-emerald-700">
                      <span>Già Incassato:</span>
                      <span className="font-mono font-semibold">
                        {formatCurrency(activeInvoicePaid)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-[13px] pt-1.5 border-t border-black/[0.06]">
                    <span className="font-semibold text-apple-text">Residuo da Saldare:</span>
                    <span className="font-mono font-bold text-amber-700 text-[14px]">
                      {formatCurrency(activeInvoiceRemaining)}
                    </span>
                  </div>
                </div>

                {/* Banner Credito Acconto Cliente (Punto 2) */}
                {activeCustomerAcconto > 0 && (
                  <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200/70 flex items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-emerald-600 text-[22px] flex-shrink-0">
                        account_balance_wallet
                      </span>
                      <div className="min-w-0">
                        <div className="text-[12px] font-bold text-emerald-900 truncate">
                          Credito Acconto Disponibile
                        </div>
                        <div className="text-[11px] text-emerald-700 font-mono">
                          Saldo libero: {formatCurrency(activeCustomerAcconto)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isSubmittingPayment}
                      onClick={handleCompensateWithCredit}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition flex-shrink-0 disabled:opacity-50 flex items-center gap-1"
                      title="Compensa la fattura utilizzando il credito acconto del cliente"
                    >
                      <span className="material-symbols-outlined text-[13px]">sync_alt</span>
                      <span>Compensa ({formatCurrency(Math.min(activeCustomerAcconto, activeInvoiceRemaining))})</span>
                    </button>
                  </div>
                )}

                {/* Input Data Incasso */}
                <div>
                  <label className="block text-[13px] font-medium text-apple-secondary mb-1">
                    Data Incasso:
                  </label>
                  <input
                    type="date"
                    value={quickPaymentDate}
                    onChange={(e) => setQuickPaymentDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition"
                  />
                </div>

                {/* Input Importo da Incassare con scorciatoia Saldo intero */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[13px] font-medium text-apple-secondary">
                      Importo da Incassare (€):
                    </label>
                    {activeInvoiceRemaining > 0 && (
                      <button
                        type="button"
                        onClick={() => setQuickPaymentAmount(activeInvoiceRemaining.toFixed(2))}
                        className="text-[11px] text-apple-accent hover:underline cursor-pointer font-medium"
                      >
                        Saldo intero ({formatCurrency(activeInvoiceRemaining)})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quickPaymentAmount}
                    onChange={(e) => setQuickPaymentAmount(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg border border-apple-border text-[14px] font-mono focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent transition"
                  />

                  {/* Avviso Overpayment in tempo reale (Punto 3) */}
                  {parseFloat(quickPaymentAmount) > activeInvoiceRemaining && (
                    <div className="mt-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200/70 text-[12px] text-sky-900 flex items-start gap-2 animate-fade-in">
                      <span className="material-symbols-outlined text-[16px] text-sky-600 mt-0.5 flex-shrink-0">
                        info
                      </span>
                      <div className="leading-snug">
                        L&apos;importo inserito supera il dovuto: <strong>{formatCurrency(activeInvoiceRemaining)}</strong> salderanno la fattura e l&apos;eccedenza di <strong>{formatCurrency(parseFloat(quickPaymentAmount) - activeInvoiceRemaining)}</strong> verrà registrata come <strong>acconto cliente</strong>.
                      </div>
                    </div>
                  )}
                </div>

                {/* Metodo di Pagamento */}
                <div>
                  <label className="block text-[13px] font-medium text-apple-secondary mb-1">
                    Metodo di Pagamento:
                  </label>
                  <select
                    value={quickPaymentMethod}
                    onChange={(e) => setQuickPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-apple-border text-[13px] bg-white focus:outline-none focus:border-apple-accent focus:ring-1 focus:ring-apple-accent cursor-pointer transition"
                  >
                    <option value="Contanti">Contanti</option>
                    <option value="Bonifico">Bonifico Bancario</option>
                    <option value="Carta di Credito">Carta di Credito / POS</option>
                    <option value="Assegno">Assegno</option>
                    <option value="RiBa">RiBa</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-4 py-3 bg-slate-50 border-t border-apple-border flex justify-end gap-2 text-[13px]">
                <button
                  type="button"
                  onClick={() => setQuickPaymentModalOpen(false)}
                  disabled={isSubmittingPayment}
                  className="px-3.5 py-1.5 rounded-lg bg-white border border-apple-border text-apple-secondary hover:text-apple-text cursor-pointer transition disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-4 py-1.5 rounded-lg bg-apple-accent hover:bg-apple-accent-hover text-white font-medium shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition"
                >
                  {isSubmittingPayment ? (
                    <>
                      <span className="material-symbols-outlined text-[15px] animate-spin">
                        progress_activity
                      </span>
                      <span>Registrazione...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[15px]">check</span>
                      <span>Conferma Incasso</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
