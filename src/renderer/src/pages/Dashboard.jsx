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
    status: 'draft',
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
    fetchAllData,
    dashboardSearch,
    selectedInvoiceId,
    setSelectedInvoiceId,
    setSelectedInvoiceInfo,
    addPayment
  } = useStore()

  const [localStatusFilter, setLocalStatusFilter] = useState('all')
  const [toastMessage, setToastMessage] = useState(null)
  const [quickPaymentModalOpen, setQuickPaymentModalOpen] = useState(false)
  const [quickPaymentAmount, setQuickPaymentAmount] = useState('')
  const [quickPaymentMethod, setQuickPaymentMethod] = useState('Bonifico')

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Formatta valuta in Euro
  const formatCurrency = useCallback((val) => {
    if (val === undefined || val === null || isNaN(val)) return '€ 0,00'
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
  }, [])

  // Formatta numero generico con 2 decimali
  const formatDecimal = useCallback((val) => {
    if (val === undefined || val === null || isNaN(val)) return '0,00'
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val)
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

        let derivedStatus = inv.status
        let overdueDays = 0
        let dueSoonDays = 0

        if (inv.status === 'paid') {
          derivedStatus = 'paid'
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
  }, [dbInvoices, customers])

  // Filtro combinato: Ricerca + Filtro stato interno
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((inv) => {
      // 1. Filtro dropdown locale
      if (localStatusFilter === 'paid' && inv.status !== 'paid') return false
      if (
        localStatusFilter === 'unpaid' &&
        inv.status !== 'unpaid' &&
        inv.status !== 'pending' &&
        inv.status !== 'due_soon'
      )
        return false
      if (localStatusFilter === 'overdue' && inv.status !== 'overdue') return false

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

  // Aggiorna la barra di stato inferiore con la fattura selezionata
  useEffect(() => {
    if (activeInvoice) {
      setSelectedInvoiceInfo(
        `Fattura ${activeInvoice.id} selezionata (${activeInvoice.customer_name} • ${formatCurrency(activeInvoice.amount)})`
      )
    } else {
      setSelectedInvoiceInfo('Nessuna fattura selezionata')
    }
  }, [activeInvoice, formatCurrency, setSelectedInvoiceInfo])

  // Totali KPI
  const statsSummary = useMemo(() => {
    let totaleImponibile = 0
    let scadute = 0
    let inAttesa = 0
    let incassate = 0
    let totaleVisualizzato = 0

    filteredInvoices.forEach((inv) => {
      totaleVisualizzato += inv.amount
      const imp = inv.imponibile || inv.amount / 1.22
      totaleImponibile += imp

      if (inv.status === 'paid') {
        incassate += inv.amount
      } else if (inv.status === 'overdue') {
        scadute += inv.amount
      } else {
        inAttesa += inv.amount
      }
    })

    return {
      totaleImponibile,
      scadute,
      inAttesa,
      incassate,
      totaleVisualizzato
    }
  }, [filteredInvoices])

  // Calcolo Imponibile e IVA per la fattura attiva
  const activeImponibile = activeInvoice
    ? activeInvoice.imponibile || activeInvoice.amount / 1.22
    : 0
  const activeIVA = activeInvoice ? activeInvoice.iva || activeInvoice.amount - activeImponibile : 0

  // Gestione Sollecito PEC
  const handleSollecitoPec = () => {
    if (!activeInvoice) return
    const text = `Gentile ${activeInvoice.customer_name},\nVi ricordiamo che la fattura ${activeInvoice.id} emessa il ${formatDate(activeInvoice.issue_date)} per un totale di ${formatCurrency(activeInvoice.amount)} risulta scaduta.\nVi invitiamo a procedere al saldo alle seguenti coordinate: ${activeInvoice.bank_account}.\nCordiali saluti,\nAmministrazione BillKeep`
    navigator.clipboard.writeText(text)
    setToastMessage('Testo del sollecito copiato negli appunti! Bozza PEC pronta.')
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Gestione Invio Email
  const handleSendEmail = () => {
    if (!activeInvoice) return
    const subject = encodeURIComponent(`Fattura ${activeInvoice.id} - BillKeep`)
    const body = encodeURIComponent(
      `Gentile ${activeInvoice.customer_name},\nIn allegato trovate la fattura ${activeInvoice.id} di ${formatCurrency(activeInvoice.amount)} con scadenza ${formatDate(activeInvoice.due_date)}.\n\nCordiali saluti.`
    )
    window.open(`mailto:${activeInvoice.pec || ''}?subject=${subject}&body=${body}`, '_blank')
  }

  // Gestione Stampa
  const handlePrint = () => {
    window.print()
  }

  // Registra incasso rapido (F7)
  const handleOpenQuickPayment = useCallback(() => {
    if (!activeInvoice) return
    setQuickPaymentAmount(activeInvoice.amount.toString())
    setQuickPaymentModalOpen(true)
  }, [activeInvoice])

  const handleConfirmQuickPayment = async () => {
    if (!activeInvoice) return
    const parsedAmount = parseFloat(quickPaymentAmount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Inserisci un importo valido.')
      return
    }

    try {
      if (dbInvoices && dbInvoices.length > 0) {
        await addPayment({
          invoice_id: activeInvoice.id,
          customer_id: activeInvoice.customer_id,
          amount: parsedAmount,
          payment_date: new Date().toISOString().replace('T', ' ').slice(0, 19),
          method: quickPaymentMethod
        })
      }
      setQuickPaymentModalOpen(false)
      setToastMessage(
        `Incasso di ${formatCurrency(parsedAmount)} registrato per ${activeInvoice.id}!`
      )
      setTimeout(() => setToastMessage(null), 3500)
    } catch (err) {
      alert('Errore durante la registrazione dell incasso: ' + err.message)
    }
  }

  // Keyboard shortcut F7 per Incasso Rapido
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F7') {
        e.preventDefault()
        handleOpenQuickPayment()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleOpenQuickPayment])

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
            <span className="hidden sm:inline">
              — Esercizio Corrente (1 Gen {new Date().getFullYear()} – 31 Dic{' '}
              {new Date().getFullYear()})
            </span>
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
              <option value="paid">Saldate</option>
              <option value="unpaid">In attesa</option>
              <option value="overdue">Scadute</option>
            </select>

            <span className="font-medium text-apple-text ml-1 hidden lg:inline">Periodo:</span>
            <span className="hidden lg:flex bg-white px-2 py-0.5 rounded border border-apple-border text-apple-text font-medium items-center gap-1 cursor-pointer">
              Q3 {new Date().getFullYear()} (Lug - Set)
              <span className="material-symbols-outlined text-[12px]">calendar_month</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-apple-secondary font-mono bg-slate-100 px-2.5 py-0.5 rounded">
            Totale Imponibile: {formatCurrency(statsSummary.totaleImponibile)}
          </span>
          <button
            type="button"
            className="h-6 px-2.5 rounded bg-white border border-apple-border text-apple-secondary hover:text-apple-text hover:bg-slate-100 flex items-center gap-1 transition shadow-xs cursor-pointer text-[12px]"
          >
            <span className="material-symbols-outlined text-[14px]">view_week</span>
            <span>Colonne</span>
          </button>
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
                  <th className="py-2 px-3 border-r border-apple-border/70 w-32">Stato</th>
                  <th className="py-2 px-3 border-r border-apple-border/70 w-24">Data</th>
                  <th className="py-2 px-3 border-r border-apple-border/70 w-32">N. Documento</th>
                  <th className="py-2 px-3 border-r border-apple-border/70">Cliente / Fornitore</th>
                  <th className="py-2 px-3 border-r border-apple-border/70 text-right w-28">
                    Imponibile
                  </th>
                  <th className="py-2 px-3 border-r border-apple-border/70 text-right w-24">
                    IVA (22%)
                  </th>
                  <th className="py-2 px-3 text-right w-28">Totale Doc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border/50 text-[13px] text-apple-text font-normal font-sans">
                {filteredInvoices.map((inv) => {
                  const isSelected = activeInvoice?.id === inv.id
                  const imp = inv.imponibile || inv.amount / 1.22
                  const iva = inv.iva || inv.amount - imp

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
                      {/* STATO */}
                      <td className="py-1.5 px-3 border-r border-apple-border/70 whitespace-nowrap">
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
                        {inv.status === 'paid' && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-apple-green" />
                            Incassata
                          </span>
                        )}
                        {inv.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-apple-secondary border border-black/[0.05]">
                            <span className="w-1.5 h-1.5 rounded-full bg-apple-subtle" />
                            In attesa bonifico
                          </span>
                        )}
                        {inv.status === 'draft' && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-apple-accent border border-blue-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-apple-accent" />
                            Bozza SDI
                          </span>
                        )}
                      </td>

                      {/* DATA */}
                      <td className="py-1.5 px-3 border-r border-apple-border/70 text-apple-secondary font-mono text-[12px] whitespace-nowrap">
                        {formatDate(inv.issue_date)}
                      </td>

                      {/* N. DOCUMENTO */}
                      <td
                        className={`py-1.5 px-3 border-r border-apple-border/70 font-mono text-[12px] whitespace-nowrap ${
                          isSelected ? 'font-semibold text-apple-text' : 'text-apple-secondary'
                        }`}
                      >
                        {inv.id}
                      </td>

                      {/* CLIENTE / FORNITORE */}
                      <td className="py-1.5 px-3 border-r border-apple-border/70 truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`truncate ${
                              isSelected ? 'font-semibold text-apple-text' : 'text-apple-text'
                            }`}
                          >
                            {inv.customer_name}
                          </span>
                          {inv.vat_number && (
                            <span className="text-[12px] text-apple-subtle font-mono flex-shrink-0">
                              • {inv.vat_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* IMPONIBILE */}
                      <td className="py-1.5 px-3 border-r border-apple-border/70 text-right font-mono text-apple-secondary whitespace-nowrap">
                        {formatDecimal(imp)}
                      </td>

                      {/* IVA */}
                      <td className="py-1.5 px-3 border-r border-apple-border/70 text-right font-mono text-apple-subtle whitespace-nowrap">
                        {formatDecimal(iva)}
                      </td>

                      {/* TOTALE DOC. */}
                      <td
                        className={`py-1.5 px-3 text-right font-mono whitespace-nowrap ${
                          isSelected ? 'font-bold text-apple-text' : 'font-semibold text-apple-text'
                        }`}
                      >
                        {formatCurrency(inv.amount)}
                      </td>
                    </tr>
                  )
                })}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-apple-subtle text-[14px]">
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
                onClick={handleSendEmail}
                className="h-6 px-2 rounded bg-white border border-apple-border text-apple-secondary hover:text-apple-text flex items-center text-[12px] transition cursor-pointer"
                title="Invia copia cortesia via email"
              >
                <span className="material-symbols-outlined text-[14px] mr-1">mail</span>
                <span>Invia</span>
              </button>
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
                        {activeInvoice.status === 'paid' && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            Incassata
                          </span>
                        )}
                        {activeInvoice.status === 'pending' && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-apple-secondary border border-black/[0.05]">
                            In attesa
                          </span>
                        )}
                        {activeInvoice.status === 'draft' && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-apple-accent border border-blue-200/50">
                            Bozza SDI
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
                      <div className="text-[11px] text-apple-subtle font-mono">IVA 22% inclusa</div>
                    </div>
                  </div>

                  {/* Breakdown Box */}
                  <div className="mt-2.5 p-2.5 rounded bg-slate-50 border border-black/[0.04] text-[12px] font-mono space-y-1">
                    <div className="flex justify-between text-apple-secondary">
                      <span>Imponibile Prestazioni:</span>
                      <span className="text-apple-text font-medium">
                        {formatCurrency(activeImponibile)}
                      </span>
                    </div>
                    <div className="flex justify-between text-apple-secondary">
                      <span>IVA Ordinaria (22%):</span>
                      <span className="text-apple-text font-medium">
                        {formatCurrency(activeIVA)}
                      </span>
                    </div>
                    <div className="flex justify-between text-apple-secondary truncate">
                      <span>Coordinate Accredito:</span>
                      <span className="text-apple-text truncate ml-1">
                        {activeInvoice.bank_account || 'Banca Unicredit (IT29X02008...)'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-apple-border/60 flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={handleOpenQuickPayment}
                      className="h-7 px-3 bg-apple-accent hover:bg-apple-accent-hover text-white text-[12px] font-medium rounded flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span>Registra Incasso Rapido</span>
                      <kbd className="text-[10px] opacity-80 font-mono">[F7]</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={handleSollecitoPec}
                      className="h-7 px-2.5 bg-white border border-apple-border text-rose-600 hover:bg-rose-50 text-[12px] font-medium rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        notification_important
                      </span>
                      <span>Sollecito PEC</span>
                    </button>
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

                  {/* Live Client Statistics */}
                  <div className="mt-2.5 pt-2 border-t border-apple-border/50">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-apple-subtle mb-1.5">
                      Statistiche Cliente ({new Date().getFullYear()})
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className="p-2 rounded bg-slate-50 border border-black/[0.04]">
                        <div className="text-apple-subtle text-[11px]">Fatturato Anno</div>
                        <div className="font-mono font-bold text-apple-text text-[13px]">
                          {formatCurrency(activeInvoice.customer_stats?.yearly_turnover || 42800)}
                        </div>
                        <div className="text-[10px] text-apple-subtle">
                          {activeInvoice.customer_stats?.invoices_count || 8} fatture emesse
                        </div>
                      </div>

                      <div className="p-2 rounded bg-slate-50 border border-black/[0.04]">
                        <div className="text-apple-subtle text-[11px]">Tempo Medio Pag.</div>
                        <div className="font-mono font-bold text-apple-text text-[13px]">
                          {activeInvoice.customer_stats?.avg_payment_days || 34} giorni
                        </div>
                        <div className="text-[10px] text-emerald-600">
                          {activeInvoice.customer_stats?.dso_status || 'DSO regolare'}
                        </div>
                      </div>

                      <div className="p-2 rounded bg-slate-50 border border-black/[0.04]">
                        <div className="text-apple-subtle text-[11px]">Fatture Saldate</div>
                        <div className="font-mono font-bold text-emerald-700 text-[13px]">
                          {activeInvoice.customer_stats?.paid_invoices || 7} di{' '}
                          {activeInvoice.customer_stats?.total_invoices || 8} (
                          {Math.round(
                            ((activeInvoice.customer_stats?.paid_invoices || 7) /
                              (activeInvoice.customer_stats?.total_invoices || 8)) *
                              100
                          )}
                          %)
                        </div>
                        <div className="text-[10px] text-apple-subtle">Storico affidabile</div>
                      </div>

                      <div className="p-2 rounded bg-rose-50/70 border border-rose-200/50">
                        <div className="text-rose-600 text-[11px] font-medium">
                          Insoluto Attuale
                        </div>
                        <div className="font-mono font-bold text-rose-600 text-[13px]">
                          {formatCurrency(activeInvoice.customer_stats?.current_overdue || 3450)}
                        </div>
                        <div className="text-[10px] text-rose-600">
                          {activeInvoice.customer_stats?.open_invoices || 1} fattura aperta
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

          {/* Inspector Bottom Quick Summary */}
          <div className="p-2.5 bg-slate-50 border-t border-apple-border text-[12px] text-apple-secondary space-y-1 flex-shrink-0">
            <div className="flex justify-between font-mono">
              <span>Esposizione Totale Crediti:</span>
              <span className="font-semibold text-rose-600">
                {formatCurrency(
                  activeInvoice?.customer_stats?.current_overdue || statsSummary.scadute
                )}
              </span>
            </div>
            <div className="flex justify-between font-mono">
              <span>Volume d&apos;Affari Q3 Cliente:</span>
              <span className="font-semibold text-apple-text">
                {formatCurrency(
                  activeInvoice?.customer_stats?.period_turnover ||
                    activeInvoice?.customer_stats?.yearly_turnover ||
                    12600
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Payment Modal */}
      {quickPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-apple-border w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-4 py-3 bg-slate-50 border-b border-apple-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-apple-accent">
                  check_circle
                </span>
                <span className="font-semibold text-[15px] text-apple-text">
                  Registra Incasso Rapido
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuickPaymentModalOpen(false)}
                className="text-apple-subtle hover:text-apple-text cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-[14px]">
              <div>
                <span className="text-apple-secondary text-[13px]">Fattura:</span>
                <div className="font-semibold text-apple-text">
                  {activeInvoice?.id} — {activeInvoice?.customer_name}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-apple-secondary mb-1">
                  Importo da Incassare (€):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={quickPaymentAmount}
                  onChange={(e) => setQuickPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-apple-border text-[14px] font-mono focus:outline-none focus:border-apple-accent"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-apple-secondary mb-1">
                  Metodo di Pagamento:
                </label>
                <select
                  value={quickPaymentMethod}
                  onChange={(e) => setQuickPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-apple-border text-[14px] bg-white focus:outline-none focus:border-apple-accent cursor-pointer"
                >
                  <option value="Bonifico">Bonifico Bancario</option>
                  <option value="Carta di Credito">Carta di Credito / POS</option>
                  <option value="Contanti">Contanti</option>
                  <option value="Assegno">Assegno</option>
                  <option value="RiBa">RiBa</option>
                </select>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-apple-border flex justify-end gap-2 text-[13px]">
              <button
                type="button"
                onClick={() => setQuickPaymentModalOpen(false)}
                className="px-3.5 py-1.5 rounded bg-white border border-apple-border text-apple-secondary hover:text-apple-text cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmQuickPayment}
                className="px-3.5 py-1.5 rounded bg-apple-accent hover:bg-apple-accent-hover text-white font-medium shadow-xs cursor-pointer"
              >
                Conferma Incasso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
