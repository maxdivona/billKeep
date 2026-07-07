use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use std::fs;
use crate::logs::write_log;

// --- Structs ---

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Customer {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub total_invoiced: f64,
    pub total_paid: f64,
    pub total_acconto: f64,
    pub balance: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Invoice {
    pub id: String,
    pub customer_id: String,
    pub issue_date: String,
    pub due_date: String,
    pub amount: f64,
    pub status: String, // "paid" | "partial" | "unpaid"
    pub customer_name: Option<String>,
    pub total_paid: Option<f64>,
    pub remaining_amount: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Payment {
    pub id: String,
    pub invoice_id: Option<String>,
    pub customer_id: String,
    pub amount: f64,
    pub payment_date: String,
    pub method: String,
    pub customer_name: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct JournalLine {
    pub id: String,
    pub entry_id: String,
    pub account_name: String,
    pub type_: String, // "debit" | "credit"
    pub amount: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct JournalEntry {
    pub id: String,
    pub entry_date: String,
    pub description: String,
    pub reference_type: String,
    pub reference_id: String,
    pub customer_id: Option<String>,
    pub customer_name: Option<String>,
    pub lines: Vec<JournalLine>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DashboardStats {
    pub total_invoiced: f64,
    pub total_paid: f64,
    pub balance: f64,
    pub expired_count: i64,
    pub recent_invoices: Vec<Invoice>,
    pub recent_payments: Vec<Payment>,
}

#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct MultiPaymentAllocation {
    pub invoiceId: String,
    pub amount: f64,
}

#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct MultiPaymentData {
    pub customerId: String,
    pub method: String,
    pub date: Option<String>,
    pub allocations: Vec<MultiPaymentAllocation>,
    pub accontoAmount: f64,
}

#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct AllocateAccontoData {
    pub customerId: String,
    pub amountToAllocate: f64,
    pub allocations: Vec<MultiPaymentAllocation>,
}

#[derive(Serialize, Debug)]
pub struct ActionResult {
    pub success: bool,
    pub error: Option<String>,
}

pub struct AppState {
    pub db_conn: Mutex<Connection>,
    pub db_path: PathBuf,
    pub logs_path: PathBuf,
}

// --- Initialization ---

pub fn init_database(conn: &Connection) -> rusqlite::Result<()> {
    conn.pragma_update(None, "foreign_keys", "ON")?;

    // 1. Migrazione tabella payments
    let table_check: Option<String> = conn
        .query_row(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='payments'",
            [],
            |row| row.get(0),
        )
        .optional()?;

    if table_check.is_some() {
        let mut stmt = conn.prepare("PRAGMA table_info(payments)")?;
        let mut rows = stmt.query([])?;
        let mut invoice_id_not_null = false;
        while let Some(row) = rows.next()? {
            let name: String = row.get(1)?;
            let notnull: i32 = row.get(3)?;
            if name == "invoice_id" && notnull == 1 {
                invoice_id_not_null = true;
            }
        }
        if invoice_id_not_null {
            println!("[DB] Migrazione tabella payments per consentire acconti (invoice_id NULL)...");
            conn.execute_batch("
                BEGIN TRANSACTION;
                CREATE TABLE IF NOT EXISTS payments_new (
                    id TEXT PRIMARY KEY,
                    invoice_id TEXT,
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
                COMMIT;
            ")?;
            println!("[DB] Migrazione completata con successo.");
        }
    }

    // 2. Creazione tabelle core
    conn.execute_batch("
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
            invoice_id TEXT,
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
            reference_type TEXT NOT NULL,
            reference_id TEXT NOT NULL,
            customer_id TEXT,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS journal_lines (
            id TEXT PRIMARY KEY,
            entry_id TEXT NOT NULL,
            account_name TEXT NOT NULL,
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
    ")?;

    Ok(())
}

// --- Tauri Commands ---

#[tauri::command]
pub fn get_customers(state: tauri::State<AppState>) -> Result<Vec<Customer>, String> {
    let conn = state.db_conn.lock().unwrap();
    let mut stmt = conn
        .prepare("
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
        ")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Customer {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                total_invoiced: row.get(3)?,
                total_paid: row.get(4)?,
                total_acconto: row.get(5)?,
                balance: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[tauri::command]
pub fn add_customer(state: tauri::State<AppState>, id: String, name: String, email: Option<String>) -> Result<ActionResult, String> {
    let conn = state.db_conn.lock().unwrap();
    
    // Univocità case-insensitive
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM customers WHERE LOWER(name) = LOWER(?)",
            [&name],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if existing.is_some() {
        return Ok(ActionResult {
            success: false,
            error: Some("Un cliente con questo nome esiste già.".to_string()),
        });
    }

    conn.execute(
        "INSERT INTO customers (id, name, email) VALUES (?, ?, ?)",
        params![id, name, email],
    )
    .map_err(|e| e.to_string())?;

    write_log(&state.logs_path, "info", "system", &format!("Creato cliente: {} (id: {})", name, id));

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn update_customer(state: tauri::State<AppState>, id: String, name: String, email: Option<String>) -> Result<ActionResult, String> {
    let conn = state.db_conn.lock().unwrap();

    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM customers WHERE LOWER(name) = LOWER(?) AND id != ?",
            params![name, id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if existing.is_some() {
        return Ok(ActionResult {
            success: false,
            error: Some("Un cliente con questo nome esiste già.".to_string()),
        });
    }

    conn.execute(
        "UPDATE customers SET name = ?, email = ? WHERE id = ?",
        params![name, email, id],
    )
    .map_err(|e| e.to_string())?;

    write_log(&state.logs_path, "info", "system", &format!("Cliente {} aggiornato: nome=\"{}\", email=\"{:?}\"", id, name, email));

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn delete_customer(state: tauri::State<AppState>, id: String) -> Result<ActionResult, String> {
    let conn = state.db_conn.lock().unwrap();
    match conn.execute("DELETE FROM customers WHERE id = ?", [&id]) {
        Ok(_) => {
            write_log(&state.logs_path, "info", "system", &format!("Cliente {} eliminato con successo.", id));
            Ok(ActionResult {
                success: true,
                error: None,
            })
        }
        Err(err) => {
            let msg = err.to_string();
            if msg.contains("FOREIGN KEY") {
                Ok(ActionResult {
                    success: false,
                    error: Some("Impossibile eliminare il cliente: ha fatture o pagamenti associati.".to_string()),
                })
            } else {
                Err(msg)
            }
        }
    }
}

#[tauri::command]
pub fn get_invoices(state: tauri::State<AppState>) -> Result<Vec<Invoice>, String> {
    let conn = state.db_conn.lock().unwrap();
    let mut stmt = conn
        .prepare("
            SELECT i.id, i.customer_id, i.issue_date, i.due_date, i.amount, i.status, c.name as customer_name
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            ORDER BY i.issue_date DESC, i.id DESC
        ")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Invoice {
                id: row.get(0)?,
                customer_id: row.get(1)?,
                issue_date: row.get(2)?,
                due_date: row.get(3)?,
                amount: row.get(4)?,
                status: row.get(5)?,
                customer_name: Some(row.get(6)?),
                total_paid: None,
                remaining_amount: None,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[tauri::command]
pub fn add_invoice(state: tauri::State<AppState>, invoice: Invoice) -> Result<ActionResult, String> {
    let mut conn = state.db_conn.lock().unwrap();
    
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    let status = if invoice.status.is_empty() { "unpaid" } else { &invoice.status };

    // 1. Inserisci fattura
    tx.execute(
        "INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)",
        params![invoice.id, invoice.customer_id, invoice.issue_date, invoice.due_date, invoice.amount, status],
    ).map_err(|e| e.to_string())?;

    // 2. Scrittura Prima Nota
    let entry_id = format!("entry-{}", invoice.id);
    let entry_date = format!("{} 08:00:00", invoice.issue_date);
    tx.execute(
        "INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id) VALUES (?, ?, ?, ?, ?, ?)",
        params![entry_id, entry_date, format!("Emissione fattura {}", invoice.id), "invoice", invoice.id, invoice.customer_id],
    ).map_err(|e| e.to_string())?;

    // Dare Crediti v/Clienti
    tx.execute(
        "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
        params![format!("line-{}-1", invoice.id), entry_id, "Crediti v/Clienti", "debit", invoice.amount],
    ).map_err(|e| e.to_string())?;

    // Avere Ricavi per Vendite
    tx.execute(
        "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
        params![format!("line-{}-2", invoice.id), entry_id, "Ricavi per Vendite", "credit", invoice.amount],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    write_log(&state.logs_path, "info", "system", &format!("Emessa fattura {} per importo {}", invoice.id, invoice.amount));

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn update_invoice(state: tauri::State<AppState>, id: String, data: Invoice) -> Result<ActionResult, String> {
    let mut conn = state.db_conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Aggiorna fattura
    tx.execute(
        "UPDATE invoices SET customer_id = ?, issue_date = ?, due_date = ?, amount = ? WHERE id = ?",
        params![data.customer_id, data.issue_date, data.due_date, data.amount, id],
    ).map_err(|e| e.to_string())?;

    // 2. Ricalcola stato in base a pagamenti ricevuti
    let payments_sum: f64 = tx.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = ?",
        [&id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let new_status = if payments_sum >= data.amount {
        "paid"
    } else if payments_sum > 0.0 {
        "partial"
    } else {
        "unpaid"
    };

    tx.execute(
        "UPDATE invoices SET status = ? WHERE id = ?",
        params![new_status, id],
    ).map_err(|e| e.to_string())?;

    // 3. Aggiorna prima nota
    let entry_id = format!("entry-{}", id);
    let entry_date = format!("{} 08:00:00", data.issue_date);
    tx.execute(
        "UPDATE journal_entries SET entry_date = ?, customer_id = ?, description = ? WHERE id = ?",
        params![entry_date, data.customer_id, format!("Emissione fattura {}", id), entry_id],
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE journal_lines SET amount = ? WHERE id = ?",
        params![data.amount, format!("line-{}-1", id)],
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE journal_lines SET amount = ? WHERE id = ?",
        params![data.amount, format!("line-{}-2", id)],
    ).map_err(|e| e.to_string())?;

    // 4. Aggiorna anagrafiche su pagamenti e prima nota correlata
    tx.execute(
        "UPDATE payments SET customer_id = ? WHERE invoice_id = ?",
        params![data.customer_id, id],
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE journal_entries 
         SET customer_id = ? 
         WHERE reference_type IN ('payment', 'allocation') 
           AND reference_id IN (SELECT id FROM payments WHERE invoice_id = ?)",
        params![data.customer_id, id],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    write_log(&state.logs_path, "info", "system", &format!("Modificata fattura {}: cliente={}, importo={}", id, data.customer_id, data.amount));

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn delete_invoice(state: tauri::State<AppState>, id: String) -> Result<ActionResult, String> {
    let mut conn = state.db_conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Ottieni pagamenti della fattura
    let mut stmt = tx.prepare("SELECT id FROM payments WHERE invoice_id = ?").map_err(|e| e.to_string())?;
    let pay_ids_iter = stmt.query_map([&id], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())?;
    
    let mut pay_ids = Vec::new();
    for p_id in pay_ids_iter {
        pay_ids.push(p_id.map_err(|e| e.to_string())?);
    }
    drop(stmt);

    // Elimina registrazioni prima nota per i pagamenti
    for p_id in pay_ids {
        tx.execute("DELETE FROM journal_entries WHERE id = ?", [format!("entry-{}", p_id)]).map_err(|e| e.to_string())?;
    }

    // Elimina prima nota fattura
    tx.execute("DELETE FROM journal_entries WHERE reference_type = 'invoice' AND reference_id = ?", [&id]).map_err(|e| e.to_string())?;

    // Elimina fattura (ON DELETE CASCADE pulirà payments)
    tx.execute("DELETE FROM invoices WHERE id = ?", [&id]).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    write_log(&state.logs_path, "info", "system", &format!("Eliminata fattura {} e relative registrazioni contabili.", id));

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn get_payments(state: tauri::State<AppState>) -> Result<Vec<Payment>, String> {
    let conn = state.db_conn.lock().unwrap();
    let mut stmt = conn
        .prepare("
            SELECT p.id, p.invoice_id, p.amount, p.payment_date, p.method, c.name as customer_name
            FROM payments p
            JOIN customers c ON p.customer_id = c.id
            ORDER BY p.payment_date DESC, p.id DESC
        ")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Payment {
                id: row.get(0)?,
                invoice_id: row.get(1)?,
                customer_id: row.get(2)?,
                amount: row.get(3)?,
                payment_date: row.get(4)?,
                method: row.get(5)?,
                customer_name: Some(row.get(6)?),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[tauri::command]
pub fn add_payment(state: tauri::State<AppState>, payment: Payment) -> Result<ActionResult, String> {
    let mut conn = state.db_conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let pay_id = if payment.id.is_empty() {
        format!("PAY-{}", chrono::Utc::now().timestamp_millis())
    } else {
        payment.id.clone()
    };
    
    let now_str = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let payment_date = if payment.payment_date.is_empty() {
        &now_str
    } else {
        &payment.payment_date
    };

    // Inserisci pagamento
    tx.execute(
        "INSERT INTO payments (id, invoice_id, customer_id, amount, method, payment_date) VALUES (?, ?, ?, ?, ?, ?)",
        params![pay_id, payment.invoice_id, payment.customer_id, payment.amount, payment.method, payment_date],
    ).map_err(|e| e.to_string())?;

    let entry_id = format!("entry-{}", pay_id);

    if let Some(ref inv_id) = payment.invoice_id {
        // Cerca totale dovuto ed emesso della fattura
        let (invoice_amount, total_paid): (f64, f64) = tx.query_row(
            "SELECT amount, (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = ?) FROM invoices WHERE id = ?",
            params![inv_id, inv_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).map_err(|e| e.to_string())?;

        let new_status = if total_paid >= invoice_amount {
            "paid"
        } else {
            "partial"
        };

        // Aggiorna stato fattura
        tx.execute("UPDATE invoices SET status = ? WHERE id = ?", params![new_status, inv_id]).map_err(|e| e.to_string())?;

        // Prima Nota (Dare Cassa/Banca, Avere Crediti)
        tx.execute(
            "INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id) VALUES (?, ?, ?, ?, ?, ?)",
            params![entry_id, payment_date, format!("Incasso fattura {}", inv_id), "payment", pay_id, payment.customer_id],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-1", pay_id), entry_id, "Cassa/Banca", "debit", payment.amount],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-2", pay_id), entry_id, "Crediti v/Clienti", "credit", payment.amount],
        ).map_err(|e| e.to_string())?;
    } else {
        // Incasso Acconto (Dare Cassa/Banca, Avere Acconti da Clienti)
        tx.execute(
            "INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id) VALUES (?, ?, ?, ?, ?, ?)",
            params![entry_id, payment_date, "Incasso acconto cliente", "payment", pay_id, payment.customer_id],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-1", pay_id), entry_id, "Cassa/Banca", "debit", payment.amount],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-2", pay_id), entry_id, "Acconti da Clienti", "credit", payment.amount],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    write_log(&state.logs_path, "info", "system", &format!("Registrato pagamento {} di {}", pay_id, payment.amount));

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn update_payment(state: tauri::State<AppState>, id: String, data: Payment) -> Result<ActionResult, String> {
    let mut conn = state.db_conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let (invoice_id, _customer_id): (Option<String>, String) = tx.query_row(
        "SELECT invoice_id, customer_id FROM payments WHERE id = ?",
        [&id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    // 1. Aggiorna dati in payments
    tx.execute(
        "UPDATE payments SET amount = ?, payment_date = ?, method = ? WHERE id = ?",
        params![data.amount, data.payment_date, data.method, id],
    ).map_err(|e| e.to_string())?;

    // 2. Aggiorna prima nota
    let entry_id = format!("entry-{}", id);
    let desc = if invoice_id.is_some() {
        format!("Incasso fattura {}", invoice_id.as_ref().unwrap())
    } else {
        "Incasso acconto cliente".to_string()
    };
    
    tx.execute(
        "UPDATE journal_entries SET entry_date = ?, description = ? WHERE id = ?",
        params![data.payment_date, desc, entry_id],
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE journal_lines SET amount = ? WHERE id = ?",
        params![data.amount, format!("line-{}-1", id)],
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE journal_lines SET amount = ? WHERE id = ?",
        params![data.amount, format!("line-{}-2", id)],
    ).map_err(|e| e.to_string())?;

    // 3. Ricalcola stato fattura
    if let Some(ref inv_id) = invoice_id {
        let payments_sum: f64 = tx.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = ?",
            [inv_id],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        let inv_amount: f64 = tx.query_row(
            "SELECT amount FROM invoices WHERE id = ?",
            [inv_id],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        let new_status = if payments_sum >= inv_amount {
            "paid"
        } else if payments_sum > 0.0 {
            "partial"
        } else {
            "unpaid"
        };

        tx.execute("UPDATE invoices SET status = ? WHERE id = ?", params![new_status, inv_id]).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    write_log(&state.logs_path, "info", "system", &format!("Modificato pagamento {}: importo={}, metodo={}", id, data.amount, data.method));

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn delete_payment(state: tauri::State<AppState>, id: String) -> Result<ActionResult, String> {
    let mut conn = state.db_conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let current_opt: Option<(Option<String>, String, f64, String, String)> = tx.query_row(
        "SELECT invoice_id, customer_id, amount, method, payment_date FROM payments WHERE id = ?",
        [&id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
    ).optional().map_err(|e| e.to_string())?;

    let (invoice_id, customer_id, amount, method, payment_date) = match current_opt {
        Some(v) => v,
        None => return Ok(ActionResult { success: false, error: Some(format!("Pagamento {} non trovato.", id)) }),
    };

    // 1. Elimina pagamento
    tx.execute("DELETE FROM payments WHERE id = ?", [&id]).map_err(|e| e.to_string())?;

    // 2. Elimina prima nota
    tx.execute("DELETE FROM journal_entries WHERE id = ?", [format!("entry-{}", id)]).map_err(|e| e.to_string())?;

    // 3. Ricalcola stato fattura
    if let Some(ref inv_id) = invoice_id {
        let payments_sum: f64 = tx.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = ?",
            [inv_id],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        let inv_amount: f64 = tx.query_row(
            "SELECT amount FROM invoices WHERE id = ?",
            [inv_id],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        let new_status = if payments_sum >= inv_amount {
            "paid"
        } else if payments_sum > 0.0 {
            "partial"
        } else {
            "unpaid"
        };

        tx.execute("UPDATE invoices SET status = ? WHERE id = ?", params![new_status, inv_id]).map_err(|e| e.to_string())?;
    }

    // 4. Ripristina acconto se era "Uso Credito"
    if method == "Uso Credito" {
        let restored_id = format!("PAY-ACC-REST-{}-{}", chrono::Utc::now().timestamp_millis(), 1);
        tx.execute(
            "INSERT INTO payments (id, invoice_id, customer_id, amount, method, payment_date) VALUES (?, NULL, ?, ?, ?, ?)",
            params![restored_id, customer_id, amount, "Ripristino Acconto", payment_date],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    write_log(&state.logs_path, "info", "system", &format!("Eliminato pagamento {}", id));

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn get_customer_unpaid_invoices(state: tauri::State<AppState>, customer_id: String) -> Result<Vec<Invoice>, String> {
    let conn = state.db_conn.lock().unwrap();
    let mut stmt = conn.prepare("
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
    ").map_err(|e| e.to_string())?;

    let rows = stmt.query_map([customer_id], |row| {
        Ok(Invoice {
            id: row.get(0)?,
            customer_id: "".to_string(), // non strettamente richiesto nel frontend
            issue_date: row.get(1)?,
            due_date: row.get(2)?,
            amount: row.get(3)?, // original amount
            status: row.get(4)?,
            customer_name: None,
            total_paid: Some(row.get(5)?),
            remaining_amount: Some(row.get(6)?),
        })
    }).map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[tauri::command]
pub fn get_customer_payments(state: tauri::State<AppState>, customer_id: String) -> Result<Vec<Payment>, String> {
    let conn = state.db_conn.lock().unwrap();
    let mut stmt = conn.prepare("
        SELECT p.id, p.invoice_id, p.amount, p.payment_date, p.method
        FROM payments p
        WHERE p.customer_id = ?
        ORDER BY p.payment_date DESC, p.id DESC
    ").map_err(|e| e.to_string())?;

    let rows = stmt.query_map([customer_id], |row| {
        Ok(Payment {
            id: row.get(0)?,
            invoice_id: row.get(1)?,
            customer_id: "".to_string(),
            amount: row.get(2)?,
            payment_date: row.get(3)?,
            method: row.get(4)?,
            customer_name: None,
        })
    }).map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

#[tauri::command]
pub fn add_multi_payment(state: tauri::State<AppState>, payment_data: MultiPaymentData) -> Result<ActionResult, String> {
    let mut conn = state.db_conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let now_str = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let payment_date = match payment_data.date {
        Some(ref d) if !d.is_empty() => d,
        _ => &now_str,
    };

    // 1. Registra le allocazioni sulle fatture specificate
    for (idx, alloc) in payment_data.allocations.iter().enumerate() {
        let pay_id = format!("PAY-{}-{}", chrono::Utc::now().timestamp_millis(), idx);
        
        tx.execute(
            "INSERT INTO payments (id, invoice_id, customer_id, amount, method, payment_date) VALUES (?, ?, ?, ?, ?, ?)",
            params![pay_id, alloc.invoiceId, payment_data.customerId, alloc.amount, payment_data.method, payment_date],
        ).map_err(|e| e.to_string())?;

        // Ricalcola stato fattura
        let (inv_amount, total_paid): (f64, f64) = tx.query_row(
            "SELECT amount, (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = ?) FROM invoices WHERE id = ?",
            params![alloc.invoiceId, alloc.invoiceId],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).map_err(|e| e.to_string())?;

        let new_status = if total_paid >= inv_amount {
            "paid"
        } else {
            "partial"
        };

        tx.execute("UPDATE invoices SET status = ? WHERE id = ?", params![new_status, alloc.invoiceId]).map_err(|e| e.to_string())?;

        // Scrittura Prima Nota (Dare Cassa/Banca, Avere Crediti)
        let entry_id = format!("entry-{}", pay_id);
        tx.execute(
            "INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id) VALUES (?, ?, ?, ?, ?, ?)",
            params![entry_id, payment_date, format!("Incasso fattura {}", alloc.invoiceId), "payment", pay_id, payment_data.customerId],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-1", pay_id), entry_id, "Cassa/Banca", "debit", alloc.amount],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-2", pay_id), entry_id, "Crediti v/Clienti", "credit", alloc.amount],
        ).map_err(|e| e.to_string())?;
    }

    // 2. Registra eventuale acconto residuo
    if payment_data.accontoAmount > 0.0 {
        let pay_id = format!("PAY-ACC-{}-99", chrono::Utc::now().timestamp_millis());
        tx.execute(
            "INSERT INTO payments (id, invoice_id, customer_id, amount, method, payment_date) VALUES (?, NULL, ?, ?, ?, ?)",
            params![pay_id, payment_data.customerId, payment_data.accontoAmount, payment_data.method, payment_date],
        ).map_err(|e| e.to_string())?;

        // Scrittura Prima Nota (Dare Cassa/Banca, Avere Acconti da Clienti)
        let entry_id = format!("entry-{}", pay_id);
        tx.execute(
            "INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id) VALUES (?, ?, ?, ?, ?, ?)",
            params![entry_id, payment_date, "Incasso acconto cliente", "payment", pay_id, payment_data.customerId],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-1", pay_id), entry_id, "Cassa/Banca", "debit", payment_data.accontoAmount],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-2", pay_id), entry_id, "Acconti da Clienti", "credit", payment_data.accontoAmount],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    write_log(&state.logs_path, "info", "system", &format!("Registrato pagamento cumulativo per cliente {}", payment_data.customerId));

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn allocate_acconto(state: tauri::State<AppState>, data: AllocateAccontoData) -> Result<ActionResult, String> {
    let mut conn = state.db_conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Ottieni gli acconti
    let mut stmt = tx.prepare("
        SELECT id, amount FROM payments
        WHERE customer_id = ? AND invoice_id IS NULL
        ORDER BY payment_date ASC, id ASC
    ").map_err(|e| e.to_string())?;
    
    let acconti_rows = stmt.query_map([&data.customerId], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
    }).map_err(|e| e.to_string())?;

    let mut acconti = Vec::new();
    for a in acconti_rows {
        acconti.push(a.map_err(|e| e.to_string())?);
    }
    drop(stmt);

    let mut to_consume = data.amountToAllocate;
    for (acc_id, acc_amount) in acconti {
        if to_consume <= 0.0 { break; }
        if acc_amount <= to_consume {
            to_consume -= acc_amount;
            tx.execute("DELETE FROM payments WHERE id = ?", [&acc_id]).map_err(|e| e.to_string())?;
        } else {
            let new_amount = acc_amount - to_consume;
            to_consume = 0.0;
            tx.execute("UPDATE payments SET amount = ? WHERE id = ?", params![new_amount, acc_id]).map_err(|e| e.to_string())?;
        }
    }

    if to_consume > 0.001 { // tolleranza per float
        return Ok(ActionResult {
            success: false,
            error: Some("Credito acconto insufficiente per completare l'allocazione.".to_string()),
        });
    }

    // Crea pagamenti collegati
    let payment_date = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    for (idx, alloc) in data.allocations.iter().enumerate() {
        let pay_id = format!("PAY-ALLOC-{}-{}", chrono::Utc::now().timestamp_millis(), idx);
        
        tx.execute(
            "INSERT INTO payments (id, invoice_id, customer_id, amount, method, payment_date) VALUES (?, ?, ?, ?, ?, ?)",
            params![pay_id, alloc.invoiceId, data.customerId, alloc.amount, "Uso Credito", payment_date],
        ).map_err(|e| e.to_string())?;

        // Ricalcola stato fattura
        let (inv_amount, total_paid): (f64, f64) = tx.query_row(
            "SELECT amount, (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = ?) FROM invoices WHERE id = ?",
            params![alloc.invoiceId, alloc.invoiceId],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).map_err(|e| e.to_string())?;

        let new_status = if total_paid >= inv_amount {
            "paid"
        } else {
            "partial"
        };

        tx.execute("UPDATE invoices SET status = ? WHERE id = ?", params![new_status, alloc.invoiceId]).map_err(|e| e.to_string())?;

        // Prima Nota storno acconto (Dare Acconti da Clienti, Avere Crediti v/Clienti)
        let entry_id = format!("entry-{}", pay_id);
        tx.execute(
            "INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id) VALUES (?, ?, ?, ?, ?, ?)",
            params![entry_id, payment_date, format!("Allocazione credito su fattura {}", alloc.invoiceId), "allocation", pay_id, data.customerId],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-1", pay_id), entry_id, "Acconti da Clienti", "debit", alloc.amount],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-2", pay_id), entry_id, "Crediti v/Clienti", "credit", alloc.amount],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    write_log(&state.logs_path, "info", "system", &format!("Allocato credito di {} per cliente {}", data.amountToAllocate, data.customerId));

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn get_journal_entries(state: tauri::State<AppState>, customer_id: Option<String>) -> Result<Vec<JournalEntry>, String> {
    let conn = state.db_conn.lock().unwrap();
    
    let mut sql = "
        SELECT je.id, je.entry_date, je.description, je.reference_type, je.reference_id, je.customer_id, c.name as customer_name
        FROM journal_entries je
        LEFT JOIN customers c ON je.customer_id = c.id
    ".to_string();

    let mut params_vec: Vec<String> = Vec::new();
    if let Some(ref c_id) = customer_id {
        sql.push_str(" WHERE je.customer_id = ? ");
        params_vec.push(c_id.clone());
    }
    sql.push_str(" ORDER BY je.entry_date DESC, je.id DESC ");

    let mut entries = Vec::new();
    if let Some(ref c_id) = customer_id {
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([c_id], |row| {
            Ok(JournalEntry {
                id: row.get(0)?,
                entry_date: row.get(1)?,
                description: row.get(2)?,
                reference_type: row.get(3)?,
                reference_id: row.get(4)?,
                customer_id: row.get(5)?,
                customer_name: row.get(6)?,
                lines: Vec::new(),
            })
        }).map_err(|e| e.to_string())?;
        for r in rows {
            entries.push(r.map_err(|e| e.to_string())?);
        }
    } else {
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok(JournalEntry {
                id: row.get(0)?,
                entry_date: row.get(1)?,
                description: row.get(2)?,
                reference_type: row.get(3)?,
                reference_id: row.get(4)?,
                customer_id: row.get(5)?,
                customer_name: row.get(6)?,
                lines: Vec::new(),
            })
        }).map_err(|e| e.to_string())?;
        for r in rows {
            entries.push(r.map_err(|e| e.to_string())?);
        }
    }

    let mut line_stmt = conn.prepare("
        SELECT id, entry_id, account_name, type, amount
        FROM journal_lines
        WHERE entry_id = ?
    ").map_err(|e| e.to_string())?;

    for entry in &mut entries {
        let line_rows = line_stmt.query_map([&entry.id], |row| {
            Ok(JournalLine {
                id: row.get(0)?,
                entry_id: row.get(1)?,
                account_name: row.get(2)?,
                type_: row.get(3)?,
                amount: row.get(4)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut lines = Vec::new();
        for l in line_rows {
            lines.push(l.map_err(|e| e.to_string())?);
        }
        entry.lines = lines;
    }

    Ok(entries)
}

#[tauri::command]
pub fn get_dashboard_stats(state: tauri::State<AppState>) -> Result<DashboardStats, String> {
    let conn = state.db_conn.lock().unwrap();

    let total_invoiced: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM invoices",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    let total_paid: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM payments",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    let balance = total_invoiced - total_paid;

    let today_str = chrono::Local::now().format("%Y-%m-%d").to_string();
    let expired_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM invoices WHERE status != 'paid' AND due_date < ?",
        [&today_str],
        |row| row.get(0),
    ).unwrap_or(0);

    // Ultime 5 fatture
    let mut stmt = conn.prepare("
        SELECT i.id, i.customer_id, i.issue_date, i.due_date, i.amount, i.status, c.name as customer_name
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        ORDER BY i.issue_date DESC, i.id DESC
        LIMIT 5
    ").map_err(|e| e.to_string())?;
    
    let inv_rows = stmt.query_map([], |row| {
        Ok(Invoice {
            id: row.get(0)?,
            customer_id: row.get(1)?,
            issue_date: row.get(2)?,
            due_date: row.get(3)?,
            amount: row.get(4)?,
            status: row.get(5)?,
            customer_name: Some(row.get(6)?),
            total_paid: None,
            remaining_amount: None,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut recent_invoices = Vec::new();
    for r in inv_rows {
        recent_invoices.push(r.map_err(|e| e.to_string())?);
    }
    drop(stmt);

    // Ultimi 5 pagamenti
    let mut stmt = conn.prepare("
        SELECT p.id, p.invoice_id, p.amount, p.payment_date, p.method, c.name as customer_name
        FROM payments p
        JOIN customers c ON p.customer_id = c.id
        ORDER BY p.payment_date DESC, p.id DESC
        LIMIT 5
    ").map_err(|e| e.to_string())?;

    let pay_rows = stmt.query_map([], |row| {
        Ok(Payment {
            id: row.get(0)?,
            invoice_id: row.get(1)?,
            customer_id: "".to_string(),
            amount: row.get(2)?,
            payment_date: row.get(3)?,
            method: row.get(4)?,
            customer_name: Some(row.get(5)?),
        })
    }).map_err(|e| e.to_string())?;

    let mut recent_payments = Vec::new();
    for r in pay_rows {
        recent_payments.push(r.map_err(|e| e.to_string())?);
    }

    Ok(DashboardStats {
        total_invoiced,
        total_paid,
        balance,
        expired_count,
        recent_invoices,
        recent_payments,
    })
}

#[tauri::command]
pub fn clear_database(state: tauri::State<AppState>) -> Result<ActionResult, String> {
    let mut conn = state.db_conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM journal_lines", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM journal_entries", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM payments", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM invoices", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM customers", []).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    write_log(&state.logs_path, "info", "system", "Database completamente ripulito da tutti i dati per un nuovo inizio.");

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn seed_database(state: tauri::State<AppState>) -> Result<ActionResult, String> {
    let mut conn = state.db_conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Inserisci clienti
    tx.execute("INSERT INTO customers (id, name, email) VALUES (?, ?, ?)", params!["cust-1", "Acme Corp", "billing@acme.com"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO customers (id, name, email) VALUES (?, ?, ?)", params!["cust-2", "Soylent Corp", "finance@soylent.com"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO customers (id, name, email) VALUES (?, ?, ?)", params!["cust-3", "Globex Inc", "accounts@globex.com"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO customers (id, name, email) VALUES (?, ?, ?)", params!["cust-4", "Initech LLC", "invoices@initech.com"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO customers (id, name, email) VALUES (?, ?, ?)", params!["cust-5", "Massive Dynamic", "pay@massivedynamic.com"]).map_err(|e| e.to_string())?;

    // Inserisci fatture
    tx.execute("INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)", params!["INV-001", "cust-1", "2026-06-01", "2026-07-01", 12500.0, "paid"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)", params!["INV-002", "cust-2", "2026-06-02", "2026-07-02", 25100.0, "paid"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)", params!["INV-003", "cust-1", "2026-06-15", "2026-07-15", 1250.0, "paid"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)", params!["INV-004", "cust-3", "2026-06-20", "2026-07-20", 50.5, "paid"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)", params!["INV-005", "cust-3", "2026-06-25", "2026-07-22", 3400.0, "unpaid"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)", params!["INV-006", "cust-5", "2026-06-28", "2026-07-28", 1049.0, "unpaid"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)", params!["INV-007", "cust-4", "2026-05-10", "2026-06-10", 850.5, "unpaid"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)", params!["INV-008", "cust-4", "2026-05-15", "2026-06-15", 380.0, "unpaid"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO invoices (id, customer_id, issue_date, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)", params!["INV-009", "cust-3", "2026-05-20", "2026-06-20", 650.0, "unpaid"]).map_err(|e| e.to_string())?;

    // Inserisci pagamenti
    tx.execute("INSERT INTO payments (id, invoice_id, customer_id, amount, payment_date, method) VALUES (?, ?, ?, ?, ?, ?)", params!["PAY-001", "INV-003", "cust-1", 1250.0, "2026-07-02 10:45:00", "Bonifico"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO payments (id, invoice_id, customer_id, amount, payment_date, method) VALUES (?, ?, ?, ?, ?, ?)", params!["PAY-002", "INV-002", "cust-2", 25100.0, "2026-07-01 16:30:00", "Carta di Credito"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO payments (id, invoice_id, customer_id, amount, payment_date, method) VALUES (?, ?, ?, ?, ?, ?)", params!["PAY-003", "INV-001", "cust-1", 12500.0, "2026-06-05 09:15:00", "Bonifico"]).map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO payments (id, invoice_id, customer_id, amount, payment_date, method) VALUES (?, ?, ?, ?, ?, ?)", params!["PAY-004", "INV-004", "cust-3", 50.5, "2026-06-22 14:00:00", "Bonifico"]).map_err(|e| e.to_string())?;

    // Retroactive prima nota per invoices
    let mut stmt = tx.prepare("SELECT id, customer_id, amount, issue_date FROM invoices").map_err(|e| e.to_string())?;
    let inv_iter = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, f64>(2)?, row.get::<_, String>(3)?))
    }).map_err(|e| e.to_string())?;

    for item in inv_iter {
        let (id, cust_id, amount, issue_date) = item.map_err(|e| e.to_string())?;
        let entry_id = format!("entry-{}", id);
        let entry_date = format!("{} 08:00:00", issue_date);
        
        tx.execute(
            "INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id) VALUES (?, ?, ?, ?, ?, ?)",
            params![entry_id, entry_date, format!("Emissione fattura {}", id), "invoice", id, cust_id],
        ).map_err(|e| e.to_string())?;
        
        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-1", id), entry_id, "Crediti v/Clienti", "debit", amount],
        ).map_err(|e| e.to_string())?;
        
        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-2", id), entry_id, "Ricavi per Vendite", "credit", amount],
        ).map_err(|e| e.to_string())?;
    }
    drop(stmt);

    // Retroactive prima nota per payments
    let mut stmt = tx.prepare("SELECT id, invoice_id, customer_id, amount, payment_date FROM payments").map_err(|e| e.to_string())?;
    let pay_iter = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?, row.get::<_, String>(2)?, row.get::<_, f64>(3)?, row.get::<_, String>(4)?))
    }).map_err(|e| e.to_string())?;

    for item in pay_iter {
        let (id, inv_id, cust_id, amount, payment_date) = item.map_err(|e| e.to_string())?;
        let entry_id = format!("entry-{}", id);
        
        if let Some(ref invoice_id) = inv_id {
            tx.execute(
                "INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id) VALUES (?, ?, ?, ?, ?, ?)",
                params![entry_id, payment_date, format!("Incasso fattura {}", invoice_id), "payment", id, cust_id],
            ).map_err(|e| e.to_string())?;
            
            tx.execute(
                "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
                params![format!("line-{}-1", id), entry_id, "Cassa/Banca", "debit", amount],
            ).map_err(|e| e.to_string())?;
            
            tx.execute(
                "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
                params![format!("line-{}-2", id), entry_id, "Crediti v/Clienti", "credit", amount],
            ).map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id) VALUES (?, ?, ?, ?, ?, ?)",
                params![entry_id, payment_date, "Incasso acconto cliente", "payment", id, cust_id],
            ).map_err(|e| e.to_string())?;
            
            tx.execute(
                "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
                params![format!("line-{}-1", id), entry_id, "Cassa/Banca", "debit", amount],
            ).map_err(|e| e.to_string())?;
            
            tx.execute(
                "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
                params![format!("line-{}-2", id), entry_id, "Acconti da Clienti", "credit", amount],
            ).map_err(|e| e.to_string())?;
        }
    }
    drop(stmt);

    tx.commit().map_err(|e| e.to_string())?;

    write_log(&state.logs_path, "info", "system", "Dati demo caricati con successo nel database.");

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn get_logs_command(state: tauri::State<AppState>) -> Result<Vec<crate::logs::LogEntry>, String> {
    Ok(crate::logs::get_logs(&state.logs_path))
}

// --- Backup & Restore ---

fn execute_backup(state: &AppState, destination_path: &str) -> Result<ActionResult, String> {
    let conn = state.db_conn.lock().unwrap();

    let mut dest_conn = Connection::open(destination_path).map_err(|e| e.to_string())?;
    
    let backup = rusqlite::backup::Backup::new(&conn, &mut dest_conn).map_err(|e| e.to_string())?;
    backup.run_to_completion(100, std::time::Duration::from_millis(250), None).map_err(|e| e.to_string())?;

    write_log(&state.logs_path, "info", "backup", &format!("Backup creato con successo in: {}", destination_path));

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn backup_database(state: tauri::State<AppState>, destination_path: String) -> Result<ActionResult, String> {
    execute_backup(&state, &destination_path)
}

fn execute_restore(state: &AppState, source_path: &str) -> Result<ActionResult, String> {
    // 1. Validazione preventiva SQLite
    let buffer = match fs::read(source_path) {
        Ok(bytes) => bytes,
        Err(e) => return Ok(ActionResult { success: false, error: Some(format!("Impossibile leggere il file: {}", e)) }),
    };

    if buffer.len() < 16 || &buffer[0..15] != b"SQLite format 3" {
        return Ok(ActionResult {
            success: false,
            error: Some("Il file selezionato non è un database SQLite valido.".to_string()),
        });
    }

    // 2. Acquisiamo la lock sul db ed eliminiamo il db corrente per riaprirlo
    let mut conn = state.db_conn.lock().unwrap();

    // Per poter copiare in sicurezza sul file, chiudiamo la connessione ripristinandola in memoria temporaneamente
    let mem_conn = Connection::open_in_memory().map_err(|e| e.to_string())?;
    let old_conn = std::mem::replace(&mut *conn, mem_conn);
    drop(old_conn); // chiude effettivamente la connessione al file originale

    // 3. Copia file
    if let Err(e) = fs::copy(source_path, &state.db_path) {
        // Ripristiniamo la connessione precedente in caso di errore
        if let Ok(restored_conn) = Connection::open(&state.db_path) {
            let _ = std::mem::replace(&mut *conn, restored_conn);
        }
        return Ok(ActionResult {
            success: false,
            error: Some(format!("Errore nella copia del file: {}", e)),
        });
    }

    // 4. Riapriamo la connessione al file ripristinato
    let restored_conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(e) => {
            return Ok(ActionResult {
                success: false,
                error: Some(format!("Impossibile riaprire il database ripristinato: {}", e)),
            });
        }
    };

    let _ = std::mem::replace(&mut *conn, restored_conn);
    
    // Inizializza/Allinea lo schema
    if let Err(e) = init_database(&conn) {
        return Ok(ActionResult {
            success: false,
            error: Some(format!("Errore inizializzazione schema dopo ripristino: {}", e)),
        });
    }

    write_log(&state.logs_path, "info", "restore", &format!("Database ripristinato con successo da: {}", source_path));

    Ok(ActionResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub fn restore_database(state: tauri::State<AppState>, source_path: String) -> Result<ActionResult, String> {
    execute_restore(&state, &source_path)
}

#[tauri::command]
pub async fn backup_database_dialog(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<ActionResult, String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = tokio::sync::oneshot::channel();
    let default_filename = format!("billkeep_backup_{}.db", chrono::Local::now().format("%Y-%m-%d"));

    app.dialog()
        .file()
        .set_title("Esporta Backup Database")
        .set_file_name(&default_filename)
        .add_filter("SQLite Database", &["db"])
        .save_file(move |file_path| {
            let _ = tx.send(file_path);
        });

    let file_path = rx.await.map_err(|e| e.to_string())?;

    if let Some(path) = file_path {
        let path_buf = path.into_path().map_err(|e| e.to_string())?;
        let path_str = path_buf.to_string_lossy().to_string();
        execute_backup(&state, &path_str)
    } else {
        Ok(ActionResult {
            success: false,
            error: Some("Operazione annullata".to_string()),
        })
    }
}

#[tauri::command]
pub async fn restore_database_dialog(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<ActionResult, String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog()
        .file()
        .set_title("Seleziona Database di Ripristino")
        .add_filter("SQLite Database", &["db"])
        .pick_file(move |file_path| {
            let _ = tx.send(file_path);
        });

    let file_path = rx.await.map_err(|e| e.to_string())?;

    if let Some(path) = file_path {
        let path_buf = path.into_path().map_err(|e| e.to_string())?;
        let path_str = path_buf.to_string_lossy().to_string();
        execute_restore(&state, &path_str)
    } else {
        Ok(ActionResult {
            success: false,
            error: Some("Operazione annullata".to_string()),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_backup() {
        let conn = Connection::open_in_memory().unwrap();
        // Create schema
        init_database(&conn).unwrap();
        // Insert some data
        conn.execute("INSERT INTO customers (id, name, email) VALUES ('1', 'Test', 'test@test.com')", []).unwrap();
        
        let state = AppState {
            db_conn: Mutex::new(conn),
            db_path: PathBuf::from("test.db"),
            logs_path: PathBuf::from("test_logs.json"),
        };
        
        let temp_dir = std::env::temp_dir();
        let backup_path = temp_dir.join("test_backup.db");
        if backup_path.exists() {
            let _ = std::fs::remove_file(&backup_path);
        }
        
        let backup_path_str = backup_path.to_string_lossy().to_string();
        let result = execute_backup(&state, &backup_path_str).unwrap();
        assert!(result.success);
        
        // check if file exists and has sqlite header
        assert!(backup_path.exists());
        let bytes = std::fs::read(&backup_path).unwrap();
        assert!(bytes.len() >= 16);
        assert_eq!(&bytes[0..15], b"SQLite format 3");
        
        let _ = std::fs::remove_file(backup_path);
        let _ = std::fs::remove_file("test_logs.json");
    }
}
