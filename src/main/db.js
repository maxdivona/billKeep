import path from 'path'
import { app } from 'electron'
import Database from 'better-sqlite3'

// Posizionamento sicuro del database nella cartella config dell'utente
const dbPath = path.join(app.getPath('userData'), 'billkeep.db')
const db = new Database(dbPath)

// Abilita il supporto alle chiavi esterne ad ogni connessione
db.pragma('foreign_keys = ON')

/**
 * Inizializza lo schema del database e inserisce dati mock se vuoto
 */
export function initDatabase() {
  // 1. Creazione Tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        issue_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount >= 0),
        status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('paid', 'partial', 'unpaid')),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        method TEXT,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
  `)

  // 2. Popolamento Dati Mock se il DB è vuoto
  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count
  if (customerCount === 0) {
    console.log('[DB] Database vuoto. Inserimento dati mock in corso...')

    // Inserimento Clienti
    const insertCustomer = db.prepare('INSERT INTO customers (id, name, email) VALUES (?, ?, ?)')
    insertCustomer.run('cust-1', 'Acme Corp', 'billing@acme.com')
    insertCustomer.run('cust-2', 'Soylent Corp', 'finance@soylent.com')
    insertCustomer.run('cust-3', 'Globex Inc', 'accounts@globex.com')
    insertCustomer.run('cust-4', 'Initech LLC', 'invoices@initech.com')
    insertCustomer.run('cust-5', 'Massive Dynamic', 'pay@massivedynamic.com')

    // Inserimento Fatture (Fatturato Totale = € 45.230,00)
    const insertInvoice = db.prepare(`
      INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    // Pagate (€ 38.900,50 totali)
    insertInvoice.run('INV-001', 'cust-1', '2026-06-01', '2026-07-01', 12500.00, 'paid')
    insertInvoice.run('INV-002', 'cust-2', '2026-06-02', '2026-07-02', 25100.00, 'paid')
    insertInvoice.run('INV-003', 'cust-1', '2026-06-15', '2026-07-15', 1250.00, 'paid')
    insertInvoice.run('INV-004', 'cust-3', '2026-06-20', '2026-07-20', 50.50, 'paid')

    // Da Incassare (€ 6.329,50 totali)
    // Future (2 in attesa = € 4.449,00)
    insertInvoice.run('INV-005', 'cust-3', '2026-06-25', '2026-07-22', 3400.00, 'unpaid')
    insertInvoice.run('INV-006', 'cust-5', '2026-06-28', '2026-07-28', 1049.00, 'unpaid')
    // Scadute (3 fatture scadute = € 1.880,50)
    insertInvoice.run('INV-007', 'cust-4', '2026-05-10', '2026-06-10', 850.50, 'unpaid')
    insertInvoice.run('INV-008', 'cust-4', '2026-05-15', '2026-06-15', 380.00, 'unpaid')
    insertInvoice.run('INV-009', 'cust-3', '2026-05-20', '2026-06-20', 650.00, 'unpaid')

    // Inserimento Pagamenti Ricevuti
    const insertPayment = db.prepare(`
      INSERT INTO payments (id, invoice_id, customer_id, amount, payment_date, method)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insertPayment.run('PAY-001', 'INV-003', 'cust-1', 1250.00, '2026-07-02 10:45:00', 'Bonifico')
    insertPayment.run('PAY-002', 'INV-002', 'cust-2', 25100.00, '2026-07-01 16:30:00', 'Carta di Credito')
    insertPayment.run('PAY-003', 'INV-001', 'cust-1', 12500.00, '2026-06-05 09:15:00', 'Bonifico')
    insertPayment.run('PAY-004', 'INV-004', 'cust-3', 50.50, '2026-06-22 14:00:00', 'Bonifico')

    console.log('[DB] Popolamento dati mock completato con successo.')
  }
}

/**
 * Ritorna le statistiche della dashboard
 */
export function getDashboardStats() {
  // Totale Fatturato
  const totalInvoiced = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM invoices').get().total

  // Totale Incassato
  const totalPaid = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments').get().total

  // Da Incassare
  const balance = totalInvoiced - totalPaid

  // Numero di fatture scadute (unpaid/partial e data di scadenza passata rispetto a oggi)
  const todayStr = new Date().toISOString().split('T')[0]
  const expiredCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM invoices 
    WHERE status != 'paid' AND due_date < ?
  `).get(todayStr).count

  // Ultime 5 fatture con il nome del cliente
  const recentInvoices = db.prepare(`
    SELECT i.id, i.amount, i.status, i.due_date, c.name as customer_name
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    ORDER BY i.issue_date DESC, i.id DESC
    LIMIT 5
  `).all()

  // Ultimi 5 pagamenti con il nome del cliente e ID fattura
  const recentPayments = db.prepare(`
    SELECT p.id, p.invoice_id, p.amount, p.payment_date, p.method, c.name as customer_name
    FROM payments p
    JOIN customers c ON p.customer_id = c.id
    ORDER BY p.payment_date DESC, p.id DESC
    LIMIT 5
  `).all()

  return {
    totalInvoiced,
    totalPaid,
    balance,
    expiredCount,
    recentInvoices,
    recentPayments
  }
}

/**
 * Gestione Clienti
 */
export function getCustomers() {
  // Ritorna la lista dei clienti con i saldi aggregati come da linee guida
  return db.prepare(`
    SELECT 
        c.id, 
        c.name,
        c.email,
        COALESCE(SUM(DISTINCT i.amount), 0) as total_invoiced,
        COALESCE(SUM(p.amount), 0) as total_paid,
        (COALESCE(SUM(DISTINCT i.amount), 0) - COALESCE(SUM(p.amount), 0)) as balance
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customer_id
    LEFT JOIN payments p ON c.id = p.customer_id
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all()
}

export function addCustomer(customer) {
  const insert = db.prepare('INSERT INTO customers (id, name, email) VALUES (?, ?, ?)')
  insert.run(customer.id, customer.name, customer.email)
  return { success: true }
}

/**
 * Gestione Pagamenti (Lista Completa)
 */
export function getPayments() {
  return db.prepare(`
    SELECT p.id, p.invoice_id, p.amount, p.payment_date, p.method, c.name as customer_name
    FROM payments p
    JOIN customers c ON p.customer_id = c.id
    ORDER BY p.payment_date DESC, p.id DESC
  `).all()
}

/**
 * Gestione Fatture
 */
export function getInvoices() {
  return db.prepare(`
    SELECT i.id, i.customer_id, i.issue_date, i.due_date, i.amount, i.status, c.name as customer_name
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    ORDER BY i.issue_date DESC, i.id DESC
  `).all()
}

export function addInvoice(invoice) {
  const insert = db.prepare(`
    INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  insert.run(
    invoice.id,
    invoice.customer_id,
    invoice.issue_date,
    invoice.due_date,
    invoice.amount,
    invoice.status || 'unpaid'
  )
  return { success: true }
}

/**
 * Gestione Pagamenti (Transazione Atomica con Rollback)
 */
export function addPayment(payment) {
  const insertPayment = db.prepare(`
    INSERT INTO payments (id, invoice_id, customer_id, amount, method) 
    VALUES (?, ?, ?, ?, ?)
  `)

  const updateInvoiceStatus = db.prepare(`
    UPDATE invoices SET status = ? WHERE id = ?
  `)

  const checkInvoiceBalance = db.prepare(`
    SELECT amount, 
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = ?) as total_paid 
    FROM invoices WHERE id = ?
  `)

  const payId = payment.id
  const invoiceId = payment.invoiceId || payment.invoice_id
  const customerId = payment.customerId || payment.customer_id
  const amount = payment.amount
  const method = payment.method

  // Transazione eseguita atomicamente
  const executePaymentTransaction = db.transaction(() => {
    try {
      // Inserimento del pagamento
      insertPayment.run(payId, invoiceId, customerId, amount, method)

      // Calcolo del saldo aggiornato per la fattura
      const invoiceData = checkInvoiceBalance.get(invoiceId, invoiceId)
      if (!invoiceData) {
        throw new Error(`Fattura ${invoiceId} non trovata`)
      }

      const newTotalPaid = invoiceData.total_paid + amount
      let newStatus = 'partial'
      if (newTotalPaid >= invoiceData.amount) {
        newStatus = 'paid'
      }

      // Aggiornamento dello stato della fattura
      updateInvoiceStatus.run(newStatus, invoiceId)

      return { success: true }
    } catch (transactionError) {
      console.error("[TRANSACTION FAILED - ROLLBACK APPLIED]:", transactionError.message)
      throw transactionError
    }
  })

  try {
    return executePaymentTransaction()
  } catch (err) {
    return { success: false, error: err.message }
  }
}
