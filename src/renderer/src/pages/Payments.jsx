import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'

export default function Payments() {
  const {
    payments,
    invoices,
    loading,
    fetchPayments,
    fetchInvoices,
    addPayment,
    updatePayment,
    deletePayment
  } = useStore()

  // Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
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

  useEffect(() => {
    fetchPayments()
    fetchInvoices()
  }, [fetchPayments, fetchInvoices])

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    if (isNaN(d)) return dateStr
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!selectedInvoiceId) {
      setFormError('Seleziona una fattura.')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("L'importo deve essere maggiore di zero.")
      return
    }

    // Find the selected invoice to get its customer_id
    const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId)
    if (!selectedInvoice) {
      setFormError('Fattura non trovata.')
      return
    }

    const newPayment = {
      id: `PAY-${Date.now()}`,
      invoiceId: selectedInvoice.id,
      customerId: selectedInvoice.customer_id,
      amount: numAmount,
      method: method,
      payment_date: paymentDate
    }

    const res = await addPayment(newPayment)
    if (res.success) {
      setFormSuccess('Pagamento registrato con successo!')
      setAmount('')
      setSelectedInvoiceId('')
    } else {
      setFormError(`Errore durante il salvataggio: ${res.error}`)
    }
  }

  const handleEdit = (pay) => {
    setSelectedPayment(pay)
    setEditAmount(pay.amount.toString())
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

  // Filter invoices that are not fully paid to show in the dropdown selector
  const outstandingInvoices = invoices.filter((inv) => inv.status !== 'paid')

  return (
    <div className="flex flex-col lg:flex-row gap-gutter">
      {/* Left Column: Payments Log Table */}
      <div className="flex-1 flex flex-col gap-gutter bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
        <div className="flex justify-between items-center mb-md">
          <h3 className="font-headline-md text-headline-md font-semibold">Registro Pagamenti</h3>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {payments.length} transazioni registrate
          </span>
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
          data={payments}
          loading={loading}
          emptyMessage="Nessun pagamento registrato."
          renderRow={(pay) => (
            <tr key={pay.id} className="hover:bg-surface-container-low transition-colors">
              <td className="py-sm px-sm text-on-surface-variant">
                {formatDate(pay.payment_date)}
              </td>
              <td className="py-sm px-sm font-medium">{pay.customer_name}</td>
              <td className="py-sm px-sm text-right text-secondary font-medium tabular-nums">
                + {formatCurrency(pay.amount)}
              </td>
              <td className="py-sm px-sm">
                <div className="flex items-center gap-xs text-on-surface-variant">
                  {pay.method === 'Bonifico' && (
                    <span className="material-symbols-outlined text-[16px]">account_balance</span>
                  )}
                  {pay.method === 'Carta' && (
                    <span className="material-symbols-outlined text-[16px]">credit_card</span>
                  )}
                  {pay.method === 'Contanti' && (
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                  )}
                  {!(
                    pay.method === 'Bonifico' ||
                    pay.method === 'Carta' ||
                    pay.method === 'Contanti'
                  ) && <span className="material-symbols-outlined text-[16px]">more_horiz</span>}
                  {pay.method}
                </div>
              </td>
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
          )}
        />
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

            {/* Invoice Selection */}
            <div className="space-y-sm">
              <label className="block font-label-sm text-label-sm text-on-surface-variant">
                Fattura Correlata <span className="text-error">*</span>
              </label>
              <select
                className="w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
                value={selectedInvoiceId}
                onChange={(e) => {
                  setSelectedInvoiceId(e.target.value)
                  // Set payment amount automatically to the remaining amount of the invoice
                  const inv = invoices.find((i) => i.id === e.target.value)
                  if (inv) {
                    setAmount(inv.amount.toString())
                  }
                }}
                required
              >
                <option value="">Seleziona una fattura da saldare...</option>
                {outstandingInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    #{inv.id} - {inv.customer_name} ({formatCurrency(inv.amount)})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="space-y-sm">
              <label className="block font-label-sm text-label-sm text-on-surface-variant">
                Importo Ricevuto (€) <span className="text-error">*</span>
              </label>
              <input
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
