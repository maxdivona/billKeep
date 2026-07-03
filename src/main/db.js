import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import Database from 'better-sqlite3'
import { writeLog } from './logs'

// Posizionamento sicuro del database nella cartella config dell'utente
const dbPath = path.join(app.getPath('userData'), 'billkeep.db')
let db = new Database(dbPath)

// Abilita il supporto alle chiavi esterne ad ogni connessione
db.pragma('foreign_keys = ON')

/**
 * Inizializza lo schema del database e inserisce dati mock se vuoto
 */
export function initDatabase() {
  // 1. Eseguiamo la migrazione se la tabella payments ha ancora il vincolo NOT NULL su invoice_id
  const tableCheck = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='payments'")
    .get()
  if (tableCheck) {
    const tableInfo = db.pragma('table_info(payments)')
    const invoiceIdCol = tableInfo.find((c) => c.name === 'invoice_id')
    if (invoiceIdCol && invoiceIdCol.notnull === 1) {
      console.log('[DB] Migrazione tabella payments per consentire acconti (invoice_id NULL)...')
      db.transaction(() => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS payments_new (
              id TEXT PRIMARY KEY,
              invoice_id TEXT, -- nullable
              customer_id TEXT NOT NULL,
              amount REAL NOT NULL CHECK(amount > 0),
              payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
              method TEXT,
              FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
              FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
          );
          
          INSERT INTO payments_new (id, invoice_id, customer_id, amount, payment_date, method)
          SELECT id, invoice_id, customer_id, amount, payment_date, method FROM payments;
          
          DROP TABLE payments;
          ALTER TABLE payments_new RENAME TO payments;
          
          CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
          CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
        `)
      })()
      console.log('[DB] Migrazione completata con successo.')
    }
  }

  // 2. Creazione Tabelle Core
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
        invoice_id TEXT, -- nullable per gli acconti
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        method TEXT,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        entry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT NOT NULL,
        reference_type TEXT NOT NULL, -- 'invoice', 'payment', 'allocation'
        reference_id TEXT NOT NULL,
        customer_id TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS journal_lines (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL,
        account_name TEXT NOT NULL, -- 'Crediti v/Clienti', 'Ricavi per Vendite', 'Cassa/Banca', 'Acconti da Clienti'
        type TEXT NOT NULL CHECK(type IN ('debit', 'credit')),
        amount REAL NOT NULL CHECK(amount > 0),
        FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_customer ON journal_entries(customer_id);
    CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(entry_id);
  `)
}

/**
 * Ritorna le statistiche della dashboard
 */
export function getDashboardStats() {
  // Totale Fatturato
  const totalInvoiced = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM invoices')
    .get().total

  // Totale Incassato
  const totalPaid = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments').get().total

  // Da Incassare
  const balance = totalInvoiced - totalPaid

  // Numero di fatture scadute (unpaid/partial e data di scadenza passata rispetto a oggi)
  const todayStr = new Date().toISOString().split('T')[0]
  const expiredCount = db
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM invoices 
    WHERE status != 'paid' AND due_date < ?
  `
    )
    .get(todayStr).count

  // Ultime 5 fatture con il nome del cliente
  const recentInvoices = db
    .prepare(
      `
    SELECT i.id, i.amount, i.status, i.due_date, c.name as customer_name
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    ORDER BY i.issue_date DESC, i.id DESC
    LIMIT 5
  `
    )
    .all()

  // Ultimi 5 pagamenti con il nome del cliente e ID fattura
  const recentPayments = db
    .prepare(
      `
    SELECT p.id, p.invoice_id, p.amount, p.payment_date, p.method, c.name as customer_name
    FROM payments p
    JOIN customers c ON p.customer_id = c.id
    ORDER BY p.payment_date DESC, p.id DESC
    LIMIT 5
  `
    )
    .all()

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
  // Utilizziamo subquery aggregate per evitare la distorsione del prodotto cartesiano derivante dal join multiplo
  return db
    .prepare(
      `
    SELECT 
        c.id, 
        c.name,
        c.email,
        (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE customer_id = c.id) as total_invoiced,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = c.id) as total_paid,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = c.id AND invoice_id IS NULL) as total_acconto,
        ((SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE customer_id = c.id) - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = c.id)) as balance
    FROM customers c
    ORDER BY c.name ASC
  `
    )
    .all()
}

export function addCustomer(customer) {
  const existing = db
    .prepare('SELECT id FROM customers WHERE LOWER(name) = LOWER(?)')
    .get(customer.name)
  if (existing) {
    return { success: false, error: 'Un cliente con questo nome esiste già.' }
  }

  const insert = db.prepare('INSERT INTO customers (id, name, email) VALUES (?, ?, ?)')
  insert.run(customer.id, customer.name, customer.email)
  return { success: true }
}

/**
 * Gestione Pagamenti (Lista Completa)
 */
export function getPayments() {
  return db
    .prepare(
      `
    SELECT p.id, p.invoice_id, p.amount, p.payment_date, p.method, c.name as customer_name
    FROM payments p
    JOIN customers c ON p.customer_id = c.id
    ORDER BY p.payment_date DESC, p.id DESC
  `
    )
    .all()
}

/**
 * Gestione Fatture
 */
export function getInvoices() {
  return db
    .prepare(
      `
    SELECT i.id, i.customer_id, i.issue_date, i.due_date, i.amount, i.status, c.name as customer_name
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    ORDER BY i.issue_date DESC, i.id DESC
  `
    )
    .all()
}

export function addInvoice(invoice) {
  const insert = db.prepare(`
    INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const insertEntry = db.prepare(`
    INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const insertLine = db.prepare(`
    INSERT INTO journal_lines (id, entry_id, account_name, type, amount)
    VALUES (?, ?, ?, ?, ?)
  `)

  const executeTx = db.transaction(() => {
    const status = invoice.status || 'unpaid'
    insert.run(
      invoice.id,
      invoice.customer_id,
      invoice.issue_date,
      invoice.due_date,
      invoice.amount,
      status
    )

    // Journal Entry
    const entryId = `entry-${invoice.id}`
    const entryDate = invoice.issue_date + ' 08:00:00'
    insertEntry.run(
      entryId,
      entryDate,
      `Emissione fattura ${invoice.id}`,
      'invoice',
      invoice.id,
      invoice.customer_id
    )

    // Scrittura in Partita Doppia (Dare Crediti, Avere Ricavi)
    insertLine.run(`line-${invoice.id}-1`, entryId, 'Crediti v/Clienti', 'debit', invoice.amount)
    insertLine.run(`line-${invoice.id}-2`, entryId, 'Ricavi per Vendite', 'credit', invoice.amount)

    return { success: true }
  })

  try {
    return executeTx()
  } catch (err) {
    console.error('[ADD INVOICE TRANSACTION FAILED]:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Gestione Pagamenti (Transazione Atomica con Rollback e Scrittura Prima Nota)
 */
export function addPayment(payment) {
  const insertPayment = db.prepare(`
    INSERT INTO payments (id, invoice_id, customer_id, amount, method, payment_date) 
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const updateInvoiceStatus = db.prepare(`
    UPDATE invoices SET status = ? WHERE id = ?
  `)

  const checkInvoiceBalance = db.prepare(`
    SELECT amount, 
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = ?) as total_paid 
    FROM invoices WHERE id = ?
  `)

  const insertEntry = db.prepare(`
    INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const insertLine = db.prepare(`
    INSERT INTO journal_lines (id, entry_id, account_name, type, amount)
    VALUES (?, ?, ?, ?, ?)
  `)

  const payId = payment.id || `PAY-${Date.now()}`
  const invoiceId = payment.invoiceId || payment.invoice_id
  const customerId = payment.customerId || payment.customer_id
  const amount = payment.amount
  const method = payment.method
  const paymentDate =
    payment.payment_date || new Date().toISOString().replace('T', ' ').substring(0, 19)

  const executePaymentTransaction = db.transaction(() => {
    try {
      // Inserimento del pagamento
      insertPayment.run(payId, invoiceId, customerId, amount, method, paymentDate)

      const entryId = `entry-${payId}`

      if (invoiceId) {
        // Calcolo del saldo aggiornato per la fattura
        const invoiceData = checkInvoiceBalance.get(invoiceId, invoiceId)
        if (!invoiceData) {
          throw new Error(`Fattura ${invoiceId} non trovata`)
        }

        const newTotalPaid = invoiceData.total_paid
        let newStatus = 'partial'
        if (newTotalPaid >= invoiceData.amount) {
          newStatus = 'paid'
        }

        // Aggiornamento dello stato della fattura
        updateInvoiceStatus.run(newStatus, invoiceId)

        // Prima Nota e Partita Doppia (Dare Cassa/Banca, Avere Crediti v/Clienti)
        insertEntry.run(
          entryId,
          paymentDate,
          `Incasso fattura ${invoiceId}`,
          'payment',
          payId,
          customerId
        )
        insertLine.run(`line-${payId}-1`, entryId, 'Cassa/Banca', 'debit', amount)
        insertLine.run(`line-${payId}-2`, entryId, 'Crediti v/Clienti', 'credit', amount)
      } else {
        // Incasso Acconto (Dare Cassa/Banca, Avere Acconti da Clienti)
        insertEntry.run(
          entryId,
          paymentDate,
          `Incasso acconto cliente`,
          'payment',
          payId,
          customerId
        )
        insertLine.run(`line-${payId}-1`, entryId, 'Cassa/Banca', 'debit', amount)
        insertLine.run(`line-${payId}-2`, entryId, 'Acconti da Clienti', 'credit', amount)
      }

      return { success: true }
    } catch (transactionError) {
      console.error('[TRANSACTION FAILED - ROLLBACK APPLIED]:', transactionError.message)
      throw transactionError
    }
  })

  try {
    return executePaymentTransaction()
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Ritorna le fatture insolute o parzialmente pagate per un cliente specifico
 */
export function getCustomerUnpaidInvoices(customerId) {
  return db
    .prepare(
      `
    SELECT 
        i.id, 
        i.issue_date, 
        i.due_date, 
        i.amount, 
        i.status,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) as total_paid,
        (i.amount - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id)) as remaining_amount
    FROM invoices i
    WHERE i.customer_id = ? AND i.status != 'paid'
    ORDER BY i.due_date ASC, i.id ASC
  `
    )
    .all(customerId)
}

/**
 * Ritorna tutti i pagamenti effettuati da un determinato cliente
 */
export function getCustomerPayments(customerId) {
  return db
    .prepare(
      `
    SELECT p.id, p.invoice_id, p.amount, p.payment_date, p.method
    FROM payments p
    WHERE p.customer_id = ?
    ORDER BY p.payment_date DESC, p.id DESC
  `
    )
    .all(customerId)
}

/**
 * Registra un pagamento cumulativo distribuito su più fatture, lasciando l'eventuale surplus come acconto
 */
export function addMultiPayment(paymentData) {
  const insertPayment = db.prepare(`
    INSERT INTO payments (id, invoice_id, customer_id, amount, method, payment_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const updateInvoiceStatus = db.prepare(`
    UPDATE invoices SET status = ? WHERE id = ?
  `)
  const checkInvoiceBalance = db.prepare(`
    SELECT amount,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = ?) as total_paid
    FROM invoices WHERE id = ?
  `)
  const insertEntry = db.prepare(`
    INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const insertLine = db.prepare(`
    INSERT INTO journal_lines (id, entry_id, account_name, type, amount)
    VALUES (?, ?, ?, ?, ?)
  `)

  const customerId = paymentData.customerId
  const method = paymentData.method
  const paymentDate =
    paymentData.date || new Date().toISOString().replace('T', ' ').substring(0, 19)

  const executeTx = db.transaction(() => {
    try {
      // 1. Registra le allocazioni sulle fatture specificate
      for (const alloc of paymentData.allocations) {
        const payId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        insertPayment.run(payId, alloc.invoiceId, customerId, alloc.amount, method, paymentDate)

        // Ricalcola lo stato della fattura
        const invoiceData = checkInvoiceBalance.get(alloc.invoiceId, alloc.invoiceId)
        if (!invoiceData) {
          throw new Error(`Fattura ${alloc.invoiceId} non trovata`)
        }
        let newStatus = 'partial'
        if (invoiceData.total_paid >= invoiceData.amount) {
          newStatus = 'paid'
        }
        updateInvoiceStatus.run(newStatus, alloc.invoiceId)

        // Prima Nota e Partita Doppia per singola allocazione (Dare Cassa/Banca, Avere Crediti v/Clienti)
        const entryId = `entry-${payId}`
        insertEntry.run(
          entryId,
          paymentDate,
          `Incasso fattura ${alloc.invoiceId}`,
          'payment',
          payId,
          customerId
        )
        insertLine.run(`line-${payId}-1`, entryId, 'Cassa/Banca', 'debit', alloc.amount)
        insertLine.run(`line-${payId}-2`, entryId, 'Crediti v/Clienti', 'credit', alloc.amount)
      }

      // 2. Registra l'eventuale acconto residuo
      if (paymentData.accontoAmount > 0) {
        const payId = `PAY-ACC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        insertPayment.run(payId, null, customerId, paymentData.accontoAmount, method, paymentDate)

        // Prima Nota e Partita Doppia per acconto (Dare Cassa/Banca, Avere Acconti da Clienti)
        const entryId = `entry-${payId}`
        insertEntry.run(
          entryId,
          paymentDate,
          `Incasso acconto cliente`,
          'payment',
          payId,
          customerId
        )
        insertLine.run(
          `line-${payId}-1`,
          entryId,
          'Cassa/Banca',
          'debit',
          paymentData.accontoAmount
        )
        insertLine.run(
          `line-${payId}-2`,
          entryId,
          'Acconti da Clienti',
          'credit',
          paymentData.accontoAmount
        )
      }

      return { success: true }
    } catch (err) {
      console.error('[MULTI-PAYMENT TX ERROR - ROLLBACK]:', err.message)
      throw err
    }
  })

  try {
    return executeTx()
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Alloca parte o tutto l'acconto accumulato di un cliente su una o più fatture insolute
 */
export function allocateAcconto(data) {
  const getAcconti = db.prepare(`
    SELECT id, amount FROM payments
    WHERE customer_id = ? AND invoice_id IS NULL
    ORDER BY payment_date ASC, id ASC
  `)
  const deletePayment = db.prepare('DELETE FROM payments WHERE id = ?')
  const updatePaymentAmount = db.prepare('UPDATE payments SET amount = ? WHERE id = ?')
  const insertPayment = db.prepare(`
    INSERT INTO payments (id, invoice_id, customer_id, amount, method, payment_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const updateInvoiceStatus = db.prepare(`
    UPDATE invoices SET status = ? WHERE id = ?
  `)
  const checkInvoiceBalance = db.prepare(`
    SELECT amount,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = ?) as total_paid
    FROM invoices WHERE id = ?
  `)
  const insertEntry = db.prepare(`
    INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const insertLine = db.prepare(`
    INSERT INTO journal_lines (id, entry_id, account_name, type, amount)
    VALUES (?, ?, ?, ?, ?)
  `)

  const customerId = data.customerId
  const amountToAllocate = data.amountToAllocate
  const allocations = data.allocations

  const executeTx = db.transaction(() => {
    try {
      let toConsume = amountToAllocate
      const acconti = getAcconti.all(customerId)

      // Consuma gli acconti registrati (dal più vecchio al più recente)
      for (const acc of acconti) {
        if (toConsume <= 0) break

        if (acc.amount <= toConsume) {
          toConsume -= acc.amount
          deletePayment.run(acc.id)
        } else {
          const newAmount = acc.amount - toConsume
          toConsume = 0
          updatePaymentAmount.run(newAmount, acc.id)
        }
      }

      if (toConsume > 0) {
        throw new Error("Credito acconto insufficiente per completare l'allocazione.")
      }

      // Crea pagamenti collegati alle fatture di destinazione
      const paymentDate = new Date().toISOString().replace('T', ' ').substring(0, 19)
      for (const alloc of allocations) {
        const payId = `PAY-ALLOC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        insertPayment.run(
          payId,
          alloc.invoiceId,
          customerId,
          alloc.amount,
          'Uso Credito',
          paymentDate
        )

        // Ricalcola lo stato della fattura
        const invoiceData = checkInvoiceBalance.get(alloc.invoiceId, alloc.invoiceId)
        if (!invoiceData) {
          throw new Error(`Fattura ${alloc.invoiceId} non trovata`)
        }
        let newStatus = 'partial'
        if (invoiceData.total_paid >= invoiceData.amount) {
          newStatus = 'paid'
        }
        updateInvoiceStatus.run(newStatus, alloc.invoiceId)

        // Prima Nota e Partita Doppia per storno acconto (Dare Acconti da Clienti, Avere Crediti v/Clienti)
        const entryId = `entry-${payId}`
        insertEntry.run(
          entryId,
          paymentDate,
          `Allocazione credito su fattura ${alloc.invoiceId}`,
          'allocation',
          payId,
          customerId
        )
        insertLine.run(`line-${payId}-1`, entryId, 'Acconti da Clienti', 'debit', alloc.amount)
        insertLine.run(`line-${payId}-2`, entryId, 'Crediti v/Clienti', 'credit', alloc.amount)
      }

      return { success: true }
    } catch (err) {
      console.error('[ALLOCATE ACCONTO TX ERROR - ROLLBACK]:', err.message)
      throw err
    }
  })

  try {
    return executeTx()
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Ottiene il giornale di prima nota con le righe di partita doppia, eventualmente filtrando per cliente
 */
export function getJournalEntries(filters = {}) {
  let sql = `
    SELECT je.id, je.entry_date, je.description, je.reference_type, je.reference_id, je.customer_id, c.name as customer_name
    FROM journal_entries je
    LEFT JOIN customers c ON je.customer_id = c.id
  `
  const params = []
  const conditions = []
  if (filters.customerId) {
    conditions.push('je.customer_id = ?')
    params.push(filters.customerId)
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }
  sql += ' ORDER BY je.entry_date DESC, je.id DESC'

  const entries = db.prepare(sql).all(...params)

  const getLines = db.prepare(`
    SELECT id, account_name, type, amount
    FROM journal_lines
    WHERE entry_id = ?
  `)

  return entries.map((entry) => {
    entry.lines = getLines.all(entry.id)
    return entry
  })
}

export async function backupDatabase(destinationPath) {
  try {
    await db.backup(destinationPath)
    writeLog('info', 'backup', `Backup creato con successo in: ${destinationPath}`)
    return { success: true }
  } catch (err) {
    console.error('[DB BACKUP FAILED]:', err.message)
    writeLog('error', 'backup', `Errore durante il backup: ${err.message}`)
    return { success: false, error: err.message }
  }
}

export function restoreDatabase(sourcePath) {
  try {
    // Validazione preventiva: controllo intestazione SQLite
    const buffer = Buffer.alloc(16)
    const fd = fs.openSync(sourcePath, 'r')
    fs.readSync(fd, buffer, 0, 16, 0)
    fs.closeSync(fd)
    if (buffer.toString() !== 'SQLite format 3\0') {
      throw new Error('Il file selezionato non è un database SQLite valido.')
    }

    // Chiude il database corrente
    db.close()

    // Sovrascrive il file del database
    fs.copyFileSync(sourcePath, dbPath)

    // Riapre il database
    db = new Database(dbPath)
    db.pragma('foreign_keys = ON')

    // PRECAUZIONE IMPORTANTE: Inizializza il database per migrare/allineare lo schema alla versione corrente dell'app
    initDatabase()

    writeLog('info', 'restore', `Database ripristinato con successo da: ${sourcePath}`)
    return { success: true }
  } catch (err) {
    console.error('[DB RESTORE FAILED]:', err.message)
    writeLog('error', 'restore', `Errore durante il ripristino: ${err.message}`)

    // Tenta di riaprire la connessione originale in caso di fallimento
    try {
      db = new Database(dbPath)
      db.pragma('foreign_keys = ON')
    } catch (reopenErr) {
      console.error('[DB REOPEN FAILED]:', reopenErr.message)
      writeLog(
        'error',
        'system',
        `Impossibile riaprire il database originale dopo fallimento: ${reopenErr.message}`
      )
    }

    return { success: false, error: err.message }
  }
}

export function clearDatabase() {
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM journal_lines').run()
      db.prepare('DELETE FROM journal_entries').run()
      db.prepare('DELETE FROM payments').run()
      db.prepare('DELETE FROM invoices').run()
      db.prepare('DELETE FROM customers').run()
    })()
    writeLog(
      'info',
      'system',
      'Database completamente ripulito da tutti i dati per un nuovo inizio.'
    )
    return { success: true }
  } catch (err) {
    console.error('[DB CLEAR FAILED]:', err.message)
    writeLog('error', 'system', `Fallimento pulizia database: ${err.message}`)
    return { success: false, error: err.message }
  }
}

export function seedDatabase() {
  try {
    db.transaction(() => {
      // Inserimento Clienti
      const insertCustomer = db.prepare('INSERT INTO customers (id, name, email) VALUES (?, ?, ?)')
      insertCustomer.run('cust-1', 'Acme Corp', 'billing@acme.com')
      insertCustomer.run('cust-2', 'Soylent Corp', 'finance@soylent.com')
      insertCustomer.run('cust-3', 'Globex Inc', 'accounts@globex.com')
      insertCustomer.run('cust-4', 'Initech LLC', 'invoices@initech.com')
      insertCustomer.run('cust-5', 'Massive Dynamic', 'pay@massivedynamic.com')

      // Inserimento Fatture
      const insertInvoice = db.prepare(`
        INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      insertInvoice.run('INV-001', 'cust-1', '2026-06-01', '2026-07-01', 12500.0, 'paid')
      insertInvoice.run('INV-002', 'cust-2', '2026-06-02', '2026-07-02', 25100.0, 'paid')
      insertInvoice.run('INV-003', 'cust-1', '2026-06-15', '2026-07-15', 1250.0, 'paid')
      insertInvoice.run('INV-004', 'cust-3', '2026-06-20', '2026-07-20', 50.5, 'paid')
      insertInvoice.run('INV-005', 'cust-3', '2026-06-25', '2026-07-22', 3400.0, 'unpaid')
      insertInvoice.run('INV-006', 'cust-5', '2026-06-28', '2026-07-28', 1049.0, 'unpaid')
      insertInvoice.run('INV-007', 'cust-4', '2026-05-10', '2026-06-10', 850.5, 'unpaid')
      insertInvoice.run('INV-008', 'cust-4', '2026-05-15', '2026-06-15', 380.0, 'unpaid')
      insertInvoice.run('INV-009', 'cust-3', '2026-05-20', '2026-06-20', 650.0, 'unpaid')

      // Inserimento Pagamenti Ricevuti
      const insertPayment = db.prepare(`
        INSERT INTO payments (id, invoice_id, customer_id, amount, payment_date, method)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      insertPayment.run('PAY-001', 'INV-003', 'cust-1', 1250.0, '2026-07-02 10:45:00', 'Bonifico')
      insertPayment.run(
        'PAY-002',
        'INV-002',
        'cust-2',
        25100.0,
        '2026-07-01 16:30:00',
        'Carta di Credito'
      )
      insertPayment.run('PAY-003', 'INV-001', 'cust-1', 12500.0, '2026-06-05 09:15:00', 'Bonifico')
      insertPayment.run('PAY-004', 'INV-004', 'cust-3', 50.5, '2026-06-22 14:00:00', 'Bonifico')

      // Generazione retroattiva Prima Nota
      const invoices = db.prepare('SELECT * FROM invoices').all()
      const insertEntry = db.prepare(`
        INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      const insertLine = db.prepare(`
        INSERT INTO journal_lines (id, entry_id, account_name, type, amount)
        VALUES (?, ?, ?, ?, ?)
      `)

      for (const inv of invoices) {
        const entryId = `entry-${inv.id}`
        const entryDate = inv.issue_date + ' 08:00:00'
        insertEntry.run(
          entryId,
          entryDate,
          `Emissione fattura ${inv.id}`,
          'invoice',
          inv.id,
          inv.customer_id
        )
        insertLine.run(`line-${inv.id}-1`, entryId, 'Crediti v/Clienti', 'debit', inv.amount)
        insertLine.run(`line-${inv.id}-2`, entryId, 'Ricavi per Vendite', 'credit', inv.amount)
      }

      const payments = db.prepare('SELECT * FROM payments').all()
      for (const pay of payments) {
        const entryId = `entry-${pay.id}`
        const entryDate = pay.payment_date
        if (pay.invoice_id) {
          insertEntry.run(
            entryId,
            entryDate,
            `Incasso fattura ${pay.invoice_id}`,
            'payment',
            pay.id,
            pay.customer_id
          )
          insertLine.run(`line-${pay.id}-1`, entryId, 'Cassa/Banca', 'debit', pay.amount)
          insertLine.run(`line-${pay.id}-2`, entryId, 'Crediti v/Clienti', 'credit', pay.amount)
        } else {
          insertEntry.run(
            entryId,
            entryDate,
            `Incasso acconto cliente`,
            'payment',
            pay.id,
            pay.customer_id
          )
          insertLine.run(`line-${pay.id}-1`, entryId, 'Cassa/Banca', 'debit', pay.amount)
          insertLine.run(`line-${pay.id}-2`, entryId, 'Acconti da Clienti', 'credit', pay.amount)
        }
      }
    })()
    writeLog('info', 'system', 'Dati demo caricati con successo nel database.')
    return { success: true }
  } catch (err) {
    console.error('[DB SEED FAILED]:', err.message)
    writeLog('error', 'system', `Impossibile caricare i dati demo: ${err.message}`)
    return { success: false, error: err.message }
  }
}
