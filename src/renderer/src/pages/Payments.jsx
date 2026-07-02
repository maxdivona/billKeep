import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import DataTable from '../components/DataTable'

export default function Payments() {
  const { payments, invoices, loading, fetchPayments, fetchInvoices, addPayment } = useStore()

  // Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState('Bonifico')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  useEffect(() => {
    fetchPayments()
    fetchInvoices()
  }, [])

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
            'Fattura Correlata'
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
              <td className="py-sm px-sm font-medium text-primary">#{pay.invoice_id}</td>
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
    </div>
  )
}
