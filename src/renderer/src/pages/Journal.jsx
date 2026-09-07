import { useEffect, useState, Fragment } from 'react'
import { useStore } from '../store/useStore'
import SearchableSelect from '../components/SearchableSelect'

export default function Journal() {
  const {
    paginatedJournalEntries,
    journalPagination,
    fetchJournalEntriesPaginated,
    setJournalFilters,
    customers,
    loading,
    fetchCustomers
  } = useStore()

  const [selectedCustomerId, setSelectedCustomerId] = useState(journalPagination.customerId)
  const [searchTerm, setSearchTerm] = useState(journalPagination.search)
  const [dateFrom, setDateFrom] = useState(journalPagination.dateFrom)
  const [dateTo, setDateTo] = useState(journalPagination.dateTo)
  const [expandedEntries, setExpandedEntries] = useState({})

  // Sincronizza filtri e ricarica i dati su modifica
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setJournalFilters({ search: searchTerm, customerId: selectedCustomerId, dateFrom, dateTo })
      fetchJournalEntriesPaginated(true)
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [
    searchTerm,
    selectedCustomerId,
    dateFrom,
    dateTo,
    setJournalFilters,
    fetchJournalEntriesPaginated
  ])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleReset = () => {
    setSelectedCustomerId('')
    setSearchTerm('')
    setDateFrom('')
    setDateTo('')
  }

  const toggleExpand = (id) => {
    setExpandedEntries((prev) => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
  }

  const formatDate = (dateStr) => {
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

  // Con il filtraggio e la paginazione eseguiti lato database Rust,
  // usiamo direttamente la lista restituita dallo store
  const filteredEntries = paginatedJournalEntries

  // Calculate sum of Dare/Avere for checking
  const getEntryTotal = (entry) => {
    return entry.lines.filter((l) => l.type === 'debit').reduce((sum, l) => sum + l.amount, 0)
  }

  // Esporta in CSV le scritture attualmente caricate (rispettando i filtri
  // applicati). Se sono state caricate solo alcune pagine, l'export
  // riguarda solo quelle: usare "Mostra altre registrazioni" prima di
  // esportare per includere l'intero risultato filtrato.
  const handleExportCsv = () => {
    const escapeCsv = (val) => {
      const str = String(val ?? '')
      return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
    }

    const referenceTypeLabel = {
      invoice: 'Fattura',
      payment: 'Incasso',
      allocation: 'Compensazione'
    }

    const header = ['Data', 'Descrizione', 'Cliente', 'Tipo Rif.', 'Valore', 'Stato']
    const rows = filteredEntries.map((entry) => {
      const totalDebit = entry.lines
        .filter((l) => l.type === 'debit')
        .reduce((sum, l) => sum + l.amount, 0)
      const totalCredit = entry.lines
        .filter((l) => l.type === 'credit')
        .reduce((sum, l) => sum + l.amount, 0)
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

      return [
        entry.entry_date,
        entry.description,
        entry.customer_name || '',
        referenceTypeLabel[entry.reference_type] || entry.reference_type,
        getEntryTotal(entry).toFixed(2),
        isBalanced ? 'Bilanciato' : 'Sbilanciato'
      ]
    })

    const csvContent = [header, ...rows].map((r) => r.map(escapeCsv).join(';')).join('\n')
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `prima-nota_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Header Section */}
      <div className="mb-6">
        <h2 className="font-headline-xl text-headline-xl text-on-surface mb-xs">
          Prima Nota & Partita Doppia
        </h2>
        <p className="text-on-surface-variant font-body-md text-body-md">
          Giornale cronologico delle operazioni contabili e dettaglio Dare/Avere di controllo.
        </p>
      </div>

      {/* Filters bar */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md mb-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full space-y-xs">
          <label className="block font-label-sm text-label-sm text-on-surface-variant">
            Cerca per descrizione o cliente
          </label>
          <div className="flex items-center bg-surface border border-outline-variant rounded-lg px-md py-sm focus-within:border-primary">
            <span className="material-symbols-outlined text-on-surface-variant mr-sm text-[20px]">
              search
            </span>
            <input
              className="bg-transparent border-none outline-none w-full text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:ring-0 p-0"
              placeholder="es. Emissione fattura, Soylent, acconto..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full md:w-64 space-y-xs">
          <label className="block font-label-sm text-label-sm text-on-surface-variant">
            Filtra per Cliente
          </label>
          <SearchableSelect
            options={customers.map((c) => ({ id: c.id, name: c.name }))}
            value={selectedCustomerId}
            onChange={setSelectedCustomerId}
            placeholder="Tutti i clienti"
            noResultsText="Nessun cliente trovato"
          />
        </div>

        <div className="w-full md:w-auto space-y-xs">
          <label className="block font-label-sm text-label-sm text-on-surface-variant">
            Dal
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full md:w-40 border border-outline-variant rounded-lg px-md py-sm bg-surface text-on-surface font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="w-full md:w-auto space-y-xs">
          <label className="block font-label-sm text-label-sm text-on-surface-variant">Al</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full md:w-40 border border-outline-variant rounded-lg px-md py-sm bg-surface text-on-surface font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto items-center">
          <div className="text-body-sm font-label-sm text-on-surface-variant/80 bg-surface-container-high px-3 py-2 rounded-lg whitespace-nowrap self-stretch flex items-center justify-center">
            Trovate:{' '}
            <strong className="text-on-surface ml-1">{journalPagination.totalCount}</strong>
          </div>
          <button
            className={`flex-1 md:flex-initial bg-surface-container text-on-surface font-label-md text-label-md px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
              filteredEntries.length === 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-surface-container-high cursor-pointer'
            }`}
            onClick={handleExportCsv}
            disabled={filteredEntries.length === 0}
            title={
              journalPagination.hasMore
                ? "Esporta le registrazioni caricate finora. Usa 'Mostra altre registrazioni' per includerle tutte."
                : 'Esporta in CSV le registrazioni filtrate'
            }
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            Esporta CSV
          </button>
          <button
            className="flex-1 md:flex-initial bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md px-4 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
            onClick={handleReset}
          >
            <span className="material-symbols-outlined text-[20px]">restart_alt</span>
            Azzera
          </button>
        </div>
      </div>

      {/* Main Journal Table */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        {loading && filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-on-surface-variant text-body-md">Caricamento in corso...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-body-md">
            Nessuna scrittura contabile trovata.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant text-left">
                <th className="w-10"></th>
                <th className="py-sm px-sm font-label-md text-label-md text-on-surface-variant">
                  Data
                </th>
                <th className="py-sm px-sm font-label-md text-label-md text-on-surface-variant">
                  Descrizione
                </th>
                <th className="py-sm px-sm font-label-md text-label-md text-on-surface-variant">
                  Cliente
                </th>
                <th className="py-sm px-sm font-label-md text-label-md text-on-surface-variant">
                  Tipo Rif.
                </th>
                <th className="py-sm px-sm font-label-md text-label-md text-on-surface-variant text-right">
                  Valore
                </th>
                <th className="py-sm px-sm font-label-md text-label-md text-on-surface-variant text-center">
                  Stato
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => {
                const isExpanded = !!expandedEntries[entry.id]
                const totalAmount = getEntryTotal(entry)

                // Simple check if Dare == Avere
                const totalDebit = entry.lines
                  .filter((l) => l.type === 'debit')
                  .reduce((sum, l) => sum + l.amount, 0)
                const totalCredit = entry.lines
                  .filter((l) => l.type === 'credit')
                  .reduce((sum, l) => sum + l.amount, 0)
                const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

                return (
                  <Fragment key={entry.id}>
                    {/* Entry Main Row */}
                    <tr
                      className={`hover:bg-surface-container-high transition-colors cursor-pointer border-b border-outline-variant/60 ${isExpanded ? 'bg-surface-container-low' : ''}`}
                      onClick={() => toggleExpand(entry.id)}
                    >
                      <td className="py-sm px-sm text-center">
                        <span className="material-symbols-outlined text-on-surface-variant">
                          {isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                        </span>
                      </td>
                      <td className="py-sm px-sm text-on-surface-variant tabular-nums font-medium">
                        {formatDate(entry.entry_date)}
                      </td>
                      <td className="py-sm px-sm font-medium text-on-surface">
                        {entry.description}
                      </td>
                      <td className="py-sm px-sm font-medium text-on-surface">
                        {entry.customer_name || '-'}
                      </td>
                      <td className="py-sm px-sm text-on-surface-variant capitalize">
                        {entry.reference_type === 'invoice' && 'Fattura'}
                        {entry.reference_type === 'payment' && 'Incasso'}
                        {entry.reference_type === 'allocation' && 'Compensazione'}
                      </td>
                      <td className="py-sm px-sm text-right font-medium tabular-nums text-on-surface">
                        {formatCurrency(totalAmount)}
                      </td>
                      <td className="py-sm px-sm text-center">
                        {isBalanced ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container">
                            <span className="material-symbols-outlined text-[14px]">done</span>
                            Bilanciato
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-error-container text-on-error-container">
                            <span className="material-symbols-outlined text-[14px]">warning</span>
                            Sbilanciato
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Double Entry Breakdown (Journal Lines) */}
                    {isExpanded && (
                      <tr className="bg-surface-container-lowest/50 border-b border-outline-variant">
                        <td colSpan="7" className="p-md">
                          <div className="ml-8 max-w-[800px] border border-outline-variant rounded-lg overflow-hidden bg-surface-container-lowest shadow-inner">
                            <div className="px-md py-sm bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                              <h4 className="font-label-md text-label-md font-semibold text-primary flex items-center gap-1">
                                <span className="material-symbols-outlined text-[18px]">
                                  balance
                                </span>
                                Dettaglio Scritture Partita Doppia
                              </h4>
                              <span className="font-label-sm text-label-sm text-on-surface-variant/80">
                                Rif. ID: {entry.reference_id}
                              </span>
                            </div>
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="bg-surface-container-lowest border-b border-outline-variant/60 text-left">
                                  <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant">
                                    Conto Contabile
                                  </th>
                                  <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant text-right">
                                    Dare
                                  </th>
                                  <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant text-right">
                                    Avere
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {entry.lines.map((line) => (
                                  <tr
                                    key={line.id}
                                    className="border-b border-outline-variant/30 hover:bg-surface-container-low/30"
                                  >
                                    <td className="py-xs px-md text-body-md text-on-surface font-medium">
                                      {line.account_name}
                                    </td>
                                    <td className="py-xs px-md text-right text-body-md text-on-surface font-medium tabular-nums">
                                      {line.type === 'debit' ? formatCurrency(line.amount) : '-'}
                                    </td>
                                    <td className="py-xs px-md text-right text-body-md text-on-surface font-medium tabular-nums">
                                      {line.type === 'credit' ? formatCurrency(line.amount) : '-'}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-surface-container-low font-bold border-t border-outline-variant">
                                  <td className="py-sm px-md text-label-md text-on-surface">
                                    Totale Righe (Doppio Controllo)
                                  </td>
                                  <td className="py-sm px-md text-right text-label-md text-on-surface tabular-nums">
                                    {formatCurrency(totalDebit)}
                                  </td>
                                  <td className="py-sm px-md text-right text-label-md text-on-surface tabular-nums">
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
              })}
            </tbody>
          </table>
        )}
        {journalPagination.hasMore && (
          <div className="py-md flex justify-center border-t border-outline-variant bg-surface-container-low">
            <button
              onClick={() => fetchJournalEntriesPaginated(false)}
              className="px-6 py-2 rounded-md font-label-md text-label-md bg-secondary-container hover:bg-secondary-container/85 text-on-secondary-container transition-colors cursor-pointer flex items-center gap-2"
            >
              Mostra altre registrazioni
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
