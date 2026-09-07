import { useEffect, useState, Fragment } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import DataTable from '../components/DataTable'
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
    addMultiPayment,
    updatePayment,
    deletePayment
  } = useStore()

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [unpaidInvoices, setUnpaidInvoices] = useState([])
  const [allocType, setAllocType] = useState('auto') // 'auto', 'manual', 'acconto'
  const [manualAllocations, setManualAllocations] = useState({})
  const [detailLoading, setDetailLoading] = useState(false)

  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState('Bonifico')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Form State for Edit Payment
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editPaymentDate, setEditPaymentDate] = useState('')
  const [editMethod, setEditMethod] = useState('Bonifico')
  const [editFormError, setEditFormError] = useState('')

  // Delete Payment State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletePaymentId, setDeletePaymentId] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const [searchTerm, setSearchTerm] = useState(paymentsPagination.search)
  // Expand state for grouped receipts in the payments list
  const [expandedReceipts, setExpandedReceipts] = useState({})

  useEffect(() => {
    if (location.state?.focusPaymentForm) {
      setTimeout(() => {
        const inputEl = document.getElementById('payment-amount-input')
        if (inputEl) {
          inputEl.focus()
        }
      }, 100)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate, location.pathname])

  // Sincronizza filtri e ricarica i dati su modifica
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPaymentsFilters({ search: searchTerm })
      fetchPaymentsPaginated(true)
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchTerm, setPaymentsFilters, fetchPaymentsPaginated])

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

  const hasUnsavedManualAllocations = () => {
    if (allocType !== 'manual') return false
    return Object.values(manualAllocations).some((v) => parseFloat(v) > 0)
  }

  const handleCustomerChange = async (customerId) => {
    if (hasUnsavedManualAllocations()) {
      const confirmed = window.confirm(
        'Hai inserito allocazioni manuali per il cliente corrente. Cambiando cliente perderai questi dati non salvati. Continuare?'
      )
      if (!confirmed) return
    }

    setSelectedCustomerId(customerId)
    setFormError('')
    setFormSuccess('')
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

      // Initialize manual allocation inputs to empty strings
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
    setFormSuccess('')

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
      // Solo Acconto
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
      setFormSuccess('Pagamento registrato con successo!')
      setAmount('')
      setSelectedCustomerId('')
      setUnpaidInvoices([])
      setManualAllocations({})
      setAllocType('auto')
    } else {
      setFormError(`Errore durante il salvataggio: ${res.error}`)
    }
  }

  const handleEdit = (pay) => {
    setSelectedPayment(pay)
    setEditAmount((Math.round(pay.amount * 100) / 100).toString())
    setEditPaymentDate(pay.payment_date ? pay.payment_date.split(' ')[0] : '')
    setEditMethod(pay.method)
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
    } else {
      setDeleteError(res.error)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-gutter">
      {/* Left Column: Payments Log Table */}
      <div className="flex-1 flex flex-col gap-gutter bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-md">
          <div>
            <h3 className="font-headline-md text-headline-md font-semibold">Registro Pagamenti</h3>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Cerca transazione o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-sm font-body-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-[16px] cursor-pointer"
                >
                  close
                </button>
              )}
            </div>

            <div className="text-body-sm font-label-sm text-on-surface-variant/80 bg-surface-container-high px-2.5 py-1.5 rounded-md whitespace-nowrap">
              Trovate: <strong className="text-on-surface">{paymentsPagination.totalCount}</strong>
            </div>
          </div>
        </div>

        <DataTable
          headers={[
            'Data',
            'Cliente',
            { text: 'Importo', align: 'right' },
            'Metodo',
            'Fattura Correlata',
            { text: 'Azioni', align: 'center' }
          ]}
          data={groupPaymentsByReceipt(paginatedPayments)}
          loading={loading}
          emptyMessage="Nessun pagamento registrato."
          renderRow={(group) => {
            const renderMethodCell = (method) => (
              <div className="flex items-center gap-xs text-on-surface-variant">
                {method === 'Bonifico' && (
                  <span className="material-symbols-outlined text-[16px]">account_balance</span>
                )}
                {method === 'Carta' && (
                  <span className="material-symbols-outlined text-[16px]">credit_card</span>
                )}
                {method === 'Contanti' && (
                  <span className="material-symbols-outlined text-[16px]">payments</span>
                )}
                {!(method === 'Bonifico' || method === 'Carta' || method === 'Contanti') && (
                  <span className="material-symbols-outlined text-[16px]">more_horiz</span>
                )}
                {method}
              </div>
            )

            const renderPaymentRow = (pay) => (
              <tr key={pay.id} className="hover:bg-surface-container-low transition-colors">
                <td className="py-sm px-sm text-on-surface-variant">
                  {formatDate(pay.payment_date)}
                </td>
                <td className="py-sm px-sm font-medium">{pay.customer_name}</td>
                <td className="py-sm px-sm text-right text-secondary font-medium tabular-nums">
                  + {formatCurrency(pay.amount)}
                </td>
                <td className="py-sm px-sm">{renderMethodCell(pay.method)}</td>
                <td className="py-sm px-sm font-medium">
                  {pay.invoice_id ? (
                    <span className="text-primary">#{pay.invoice_id}</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 bg-secondary-container text-on-secondary-container text-xs font-semibold rounded-full">
                      Acconto
                    </span>
                  )}
                </td>
                <td className="py-sm px-sm text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      className={`p-1 transition-colors flex items-center ${
                        pay.method === 'Uso Credito'
                          ? 'text-on-surface-variant/35 cursor-not-allowed'
                          : 'hover:text-primary cursor-pointer'
                      }`}
                      onClick={() => pay.method !== 'Uso Credito' && handleEdit(pay)}
                      disabled={pay.method === 'Uso Credito'}
                      title={
                        pay.method === 'Uso Credito'
                          ? 'Le allocazioni di credito non possono essere modificate direttamente'
                          : 'Modifica'
                      }
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      className="p-1 hover:text-error transition-colors cursor-pointer flex items-center"
                      onClick={() => handleDeleteClick(pay.id)}
                      title="Elimina"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            )

            if (group.items.length === 1) {
              return renderPaymentRow(group.items[0])
            }

            const isExpanded = !!expandedReceipts[group.id]
            return (
              <Fragment key={group.id}>
                <tr
                  className="hover:bg-surface-container-low transition-colors cursor-pointer"
                  onClick={() =>
                    setExpandedReceipts((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                  }
                >
                  <td className="py-sm px-sm text-on-surface-variant">
                    {formatDate(group.payment_date)}
                  </td>
                  <td className="py-sm px-sm font-medium">{group.customer_name}</td>
                  <td className="py-sm px-sm text-right text-secondary font-bold tabular-nums">
                    + {formatCurrency(group.total)}
                  </td>
                  <td className="py-sm px-sm">{renderMethodCell(group.method)}</td>
                  <td className="py-sm px-sm font-medium">
                    <span className="inline-flex items-center gap-1 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px]">
                        {isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                      </span>
                      Split su {group.items.length}
                    </span>
                  </td>
                  <td className="py-sm px-sm text-center text-on-surface-variant/50">—</td>
                </tr>
                {isExpanded && group.items.map((pay) => renderPaymentRow(pay))}
              </Fragment>
            )
          }}
        />
        {paymentsPagination.hasMore && (
          <div className="py-md flex justify-center border-t border-outline-variant bg-surface-container-low">
            <button
              onClick={() => fetchPaymentsPaginated(false)}
              className="px-6 py-2 rounded-md font-label-md text-label-md bg-secondary-container hover:bg-secondary-container/85 text-on-secondary-container transition-colors cursor-pointer flex items-center gap-2"
            >
              Mostra altri pagamenti
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Registration Panel */}
      <aside className="w-full lg:w-96 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col overflow-hidden h-fit">
        <div className="p-lg border-b border-outline-variant bg-surface-container-low">
          <h3 className="font-headline-md text-headline-md font-semibold text-primary">
            Registra Nuovo Pagamento
          </h3>
        </div>
        <div className="p-lg flex-1">
          <form onSubmit={handleRegister} className="space-y-md">
            {formError && <p className="text-error font-label-md text-label-md">{formError}</p>}
            {formSuccess && (
              <p className="text-secondary font-label-md text-label-md">{formSuccess}</p>
            )}

            {/* Customer Selection */}
            <div className="space-y-sm">
              <label className="block font-label-sm text-label-sm text-on-surface-variant">
                Cliente <span className="text-error">*</span>
              </label>
              <SearchableSelect
                options={customers.map((c) => ({
                  id: c.id,
                  name: `${c.name} (Saldo: ${formatCurrency(c.balance || 0)})`
                }))}
                value={selectedCustomerId}
                onChange={handleCustomerChange}
                placeholder="Cerca cliente..."
                required
              />
            </div>

            {/* Amount */}
            <div className="space-y-sm">
              <label className="block font-label-sm text-label-sm text-on-surface-variant">
                Importo Ricevuto (€) <span className="text-error">*</span>
              </label>
              <input
                id="payment-amount-input"
                className="w-full px-md py-sm bg-surface border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="0,00"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            {/* Date */}
            <div className="space-y-sm">
              <label className="block font-label-sm text-label-sm text-on-surface-variant">
                Data Pagamento <span className="text-error">*</span>
              </label>
              <input
                className="w-full px-md py-sm bg-surface border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            {/* Method */}
            <div className="space-y-sm">
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Metodo di Pagamento
              </label>
              <div className="grid grid-cols-2 gap-sm">
                {['Bonifico', 'Carta', 'Contanti', 'Altro'].map((m) => (
                  <label
                    key={m}
                    className={`flex items-center gap-sm p-sm border rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors ${
                      method === m
                        ? 'border-primary bg-primary-container/10'
                        : 'border-outline-variant'
                    }`}
                  >
                    <input
                      className="text-primary focus:ring-primary hidden"
                      type="radio"
                      name="payment_method"
                      value={m}
                      checked={method === m}
                      onChange={() => setMethod(m)}
                    />
                    <span className="font-body-md text-body-md flex items-center gap-xs">
                      {m === 'Bonifico' && (
                        <span className="material-symbols-outlined text-[18px]">
                          account_balance
                        </span>
                      )}
                      {m === 'Carta' && (
                        <span className="material-symbols-outlined text-[18px]">credit_card</span>
                      )}
                      {m === 'Contanti' && (
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                      )}
                      {m === 'Altro' && (
                        <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                      )}
                      {m}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Distribution section */}
            {selectedCustomerId && (
              <div className="border-t border-outline-variant pt-3 space-y-sm">
                {detailLoading ? (
                  <p className="text-xs text-on-surface-variant/80 italic">
                    Caricamento fatture scoperte...
                  </p>
                ) : unpaidInvoices.length === 0 ? (
                  <div className="bg-primary/10 border border-primary/20 rounded p-3 text-xs flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">info</span>
                    <div>
                      <p className="font-semibold text-on-surface">Nessuna fattura scoperta</p>
                      <p className="text-on-surface-variant mt-0.5">
                        {
                          "Tutte le fatture di questo cliente risultano pagate. L'intero importo verrà registrato come acconto."
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="block font-label-sm text-label-sm text-on-surface font-semibold">
                      Modalità Distribuzione Fondi
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        className={`py-2 px-1 border rounded text-xs font-semibold cursor-pointer text-center ${
                          allocType === 'auto'
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-outline-variant text-on-surface-variant'
                        }`}
                        onClick={() => setAllocType('auto')}
                      >
                        Automatica
                      </button>
                      <button
                        type="button"
                        className={`py-2 px-1 border rounded text-xs font-semibold cursor-pointer text-center ${
                          allocType === 'manual'
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-outline-variant text-on-surface-variant'
                        }`}
                        onClick={() => setAllocType('manual')}
                      >
                        Manuale
                      </button>
                      <button
                        type="button"
                        className={`py-2 px-1 border rounded text-xs font-semibold cursor-pointer text-center ${
                          allocType === 'acconto'
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-outline-variant text-on-surface-variant'
                        }`}
                        onClick={() => setAllocType('acconto')}
                      >
                        Solo Acconto
                      </button>
                    </div>

                    {allocType === 'manual' && (
                      <div className="space-y-2 mt-2">
                        <div className="space-y-2 max-h-[160px] overflow-y-auto border border-outline-variant/60 rounded p-2 bg-surface-container-lowest">
                          {unpaidInvoices.map((inv) => {
                            const remaining = inv.remaining_amount ?? inv.amount
                            const val = parseFloat(manualAllocations[inv.id])
                            const inputError = !isNaN(val) && (val > remaining || val < 0)
                            return (
                              <div
                                key={inv.id}
                                className="flex flex-col gap-1 py-1 border-b border-outline-variant/30 last:border-b-0"
                              >
                                <div className="flex justify-between items-center text-xs">
                                  <span
                                    className={`font-medium ${inputError ? 'text-error font-bold' : 'text-on-surface'}`}
                                  >
                                    #{inv.id} (Rimanente: {formatCurrency(remaining)})
                                  </span>
                                  <input
                                    className={`w-24 border rounded px-2 py-1 bg-surface text-right tabular-nums text-on-surface focus:outline-none ${
                                      inputError
                                        ? 'border-error focus:border-error text-error bg-error-container/20 font-bold'
                                        : 'border-outline-variant focus:border-primary'
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
                                  <span className="text-[10px] text-error text-right font-medium">
                                    {val < 0
                                      ? "L'importo deve essere positivo"
                                      : `Supera il saldo di ${formatCurrency(remaining)}`}
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
                              className={`p-2 rounded text-xs font-semibold flex justify-between items-center ${
                                restante > 0.005
                                  ? 'bg-primary-container/20 text-primary border border-primary/20'
                                  : Math.abs(restante) <= 0.005
                                    ? 'bg-success-container/20 text-success border border-success/20'
                                    : 'bg-error-container/20 text-error border border-error/20'
                              }`}
                            >
                              <span>Restante da attribuire:</span>
                              <span className="tabular-nums font-bold">
                                {formatCurrency(restante)}
                                {restante > 0.005 && ' (in acconto)'}
                              </span>
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    {allocType === 'auto' && (
                      <div className="space-y-2 mt-2">
                        <p className="text-[11px] text-on-surface-variant/80 italic">
                          I fondi verranno usati per pagare le fatture scoperte partendo dalla più
                          vecchia.
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
                            <div className="p-2 rounded text-xs bg-surface-container-low border border-outline-variant/30 text-on-surface-variant space-y-1">
                              <div className="flex justify-between">
                                <span>Assegnato a fatture:</span>
                                <span className="font-semibold">{formatCurrency(allocated)}</span>
                              </div>
                              {remaining > 0 && (
                                <div className="flex justify-between text-primary font-semibold">
                                  <span>Eccedenza (in acconto):</span>
                                  <span>{formatCurrency(remaining)}</span>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    {allocType === 'acconto' && (
                      <p className="text-xs text-on-surface-variant/80 italic mt-2">
                        {"L'intero importo verrà registrato come acconto sul conto del cliente."}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Conferma Pagamento
            </button>
          </form>
        </div>
      </aside>

      {/* Modal: Modifica Pagamento */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Modifica Pagamento`}
      >
        <form onSubmit={handleUpdate} className="flex flex-col gap-5">
          {editFormError && (
            <p className="text-error font-label-md text-label-md">{editFormError}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Cliente (Immutabile)
              </label>
              <input
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface-container-low text-on-surface-variant font-body-md opacity-75 cursor-not-allowed"
                type="text"
                value={selectedPayment?.customer_name || ''}
                disabled
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Riferimento (Immutabile)
              </label>
              <input
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface-container-low text-on-surface-variant font-body-md opacity-75 cursor-not-allowed"
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

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Data Pagamento <span className="text-error">*</span>
              </label>
              <input
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md text-on-surface"
                type="date"
                value={editPaymentDate}
                onChange={(e) => setEditPaymentDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1">
              Metodo di Pagamento
            </label>
            <select
              className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md text-on-surface"
              value={editMethod}
              onChange={(e) => setEditMethod(e.target.value)}
            >
              <option value="Bonifico">Bonifico</option>
              <option value="Carta">Carta</option>
              <option value="Contanti">Contanti</option>
              <option value="Altro">Altro</option>
            </select>
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

      {/* Modal: Conferma Eliminazione Pagamento */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Elimina Pagamento"
      >
        <div className="flex flex-col gap-4">
          {deleteError && <p className="text-error font-label-md text-label-md">{deleteError}</p>}
          <p className="text-body-md text-on-surface">
            Sei sicuro di voler eliminare questo pagamento?
          </p>
          <p className="text-xs text-on-surface-variant border border-outline-variant/60 bg-surface-container-lowest p-2 rounded">
            <strong>Nota bene:</strong> L&apos;eliminazione del pagamento comporterà lo storno della
            sua registrazione in Prima Nota e il ricalcolo dello stato della fattura correlata. Se
            si tratta di un&apos;allocazione (Uso Credito), l&apos;acconto originario verrà
            ripristinato automaticamente come credito libero. Questa operazione è irreversibile.
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
