// Raggruppa le righe di pagamento generate da un unico "Registra Incasso"
// (stesso receipt_id) in un'unica voce, per mostrare quanto è stato
// effettivamente incassato quel giorno prima dello split sulle fatture.
// I pagamenti senza receipt_id (acconti usati come credito, o precedenti
// alla migrazione) restano singoli, usando il proprio id come chiave.
export function groupPaymentsByReceipt(payments) {
  const groups = []
  const indexByKey = new Map()
  for (const p of payments) {
    const key = p.receipt_id || p.id
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length)
      groups.push({
        id: key,
        payment_date: p.payment_date,
        method: p.method,
        customer_name: p.customer_name,
        items: [],
        total: 0
      })
    }
    const g = groups[indexByKey.get(key)]
    g.items.push(p)
    g.total += p.amount
  }
  for (const g of groups) {
    g.total = Math.round(g.total * 100) / 100
  }
  return groups
}

// Allocazione automatica di un importo tra le fatture scoperte, dalla più
// vecchia (per scadenza) alla più recente. Ritorna le allocazioni per
// fattura e l'eventuale eccedenza da registrare come acconto.
export function computeAutoAllocation(total, unpaidInvoices) {
  let remaining = total
  const allocations = []
  const sortedInvoices = [...unpaidInvoices].sort(
    (a, b) => new Date(a.due_date) - new Date(b.due_date)
  )

  for (const inv of sortedInvoices) {
    if (remaining <= 0) break
    const needed = inv.remaining_amount ?? inv.amount
    const toPay = Math.round(Math.min(remaining, needed) * 100) / 100
    allocations.push({ invoiceId: inv.id, amount: toPay })
    remaining = Math.round((remaining - toPay) * 100) / 100
  }

  return { allocations, accontoAmount: remaining > 0 ? remaining : 0 }
}

// Valida e normalizza un set di allocazioni manuali (mappa invoiceId ->
// importo inserito) rispetto alle fatture scoperte e all'importo totale
// disponibile. Ritorna { error } se non valido, altrimenti
// { allocations, accontoAmount }.
export function computeManualAllocation(manualAllocations, unpaidInvoices, total) {
  let allocations = []
  let allocTotal = 0

  for (const invId in manualAllocations) {
    const rawVal = manualAllocations[invId]
    if (rawVal === '' || rawVal === undefined || rawVal === null) continue

    const amt = parseFloat(rawVal)
    if (isNaN(amt) || amt < 0) {
      return { error: 'Gli importi di allocazione inseriti devono essere positivi.' }
    }
    if (amt <= 0) continue

    const inv = unpaidInvoices.find((i) => i.id === invId)
    if (!inv) continue

    const remaining = inv.remaining_amount ?? inv.amount
    if (amt > remaining + 0.001) {
      return {
        error: `L'importo inserito per la fattura #${invId} (€ ${amt.toFixed(2)}) supera il saldo residuo di € ${remaining.toFixed(2)}.`
      }
    }

    allocations.push({ invoiceId: invId, amount: amt })
    allocTotal += amt
  }

  if (allocTotal === 0) {
    return {
      error:
        "Hai selezionato l'allocazione manuale ma non hai inserito alcun importo. Se desideri registrare l'intero importo come acconto, seleziona 'Solo Acconto'."
    }
  }

  if (allocTotal > total + 0.001) {
    return {
      error: `L'importo inserito (€ ${total.toFixed(2)}) è minore della somma delle allocazioni (€ ${allocTotal.toFixed(2)}).`
    }
  }

  let accontoAmount = Math.round((total - allocTotal) * 100) / 100
  if (accontoAmount < 0.001) {
    accontoAmount = 0
  }

  return { allocations, accontoAmount }
}
