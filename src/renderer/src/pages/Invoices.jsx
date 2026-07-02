import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'

export default function Invoices() {
  const { invoices, customers, loading, fetchInvoices, fetchCustomers, addInvoice } = useStore()
  const [modalOpen, setModalOpen] = useState(false)

  // Form State
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

  useEffect(() => {
    fetchInvoices()
    fetchCustomers()
  }, [])

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
          onClick={() => {
            setInvoiceId(
              `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
            )
            setModalOpen(true)
          }}
        >
          <span className="material-symbols-outlined">add</span>
          Emetti Fattura
        </button>
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
            { text: 'Stato', align: 'center' }
          ]}
          data={invoices}
          loading={loading}
          emptyMessage="Nessuna fattura emessa."
          renderRow={(inv) => (
            <tr key={inv.id} className="hover:bg-surface-container-high transition-colors">
              <td className="py-sm px-sm font-medium">{inv.id}</td>
              <td className="py-sm px-sm">{inv.customer_name}</td>
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
            </tr>
          )}
        />
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
              <select
                className="w-full border border-outline-variant rounded-md px-3 py-2 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md font-body-md"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
              >
                <option value="">Seleziona...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
    </div>
  )
}
