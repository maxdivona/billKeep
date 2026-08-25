# 📘 Manuale Tecnico e Linee Guida di Sviluppo: BillKeep (v1.3.2)

Questo documento stabilisce l'architettura tecnica, le best practices e gli standard di codifica per lo sviluppo dell'applicazione desktop locale di gestione fatture, pagamenti e contabilità in partita doppia (Prima Nota).

---

## 🛠️ 1. Stack Tecnico di Riferimento

- **Shell/Runtime:** Tauri (gestione del ciclo di vita desktop cross-platform, con backend in Rust).
- **Frontend:** React + Vite + Tailwind CSS.
- **Database:** SQLite tramite la libreria `rusqlite` in Rust (scelta per stabilità, performance native sincrone e supporto completo alle transazioni a livello backend).
- **Stato Globale Frontend:** Zustand (leggero, reattivo e disaccoppiato dal ciclo di render di React).

---

## 🏗️ 2. Architettura e Sicurezza (IPC & Rust Commands)

L'applicazione rispetta rigorosamente il modello di sicurezza di Tauri. Il frontend (Renderer) non ha accesso diretto al File System o al sistema operativo se non tramite i comandi sicuri definiti nel backend Rust.

### Flusso dei Dati

Tutte le operazioni sul database avvengono nel **Processo Core Rust**. Il **Processo Renderer** invoca i metodi esposti dal backend utilizzando le chiamate IPC di Tauri (`invoke`) mappate su un bridge `window.api`.

```
[ React UI (Renderer) ] <--- (Tauri IPC Invoke) ---> [ Tauri Core API (Rust) ] <--- (rusqlite) ---> [ SQLite Database ]
```

---

## 🗄️ 3. Schema del Database (SQLite)

Il database è relazionale e locale. Sfrutta le chiavi esterne (`FOREIGN KEY`) per garantire l'integrità dei dati. I calcoli di saldi e report vengono eseguiti a livello di query (senza duplicazione o denormalizzazione dei dati).

```sql
-- Abilita il supporto alle chiavi esterne ad ogni connessione
PRAGMA foreign_keys = ON;

-- Tabella Clienti Anagrafica
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Fatture
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    issue_date TEXT NOT NULL, -- Formato standard YYYY-MM-DD
    due_date TEXT NOT NULL,   -- Formato standard YYYY-MM-DD
    amount REAL NOT NULL CHECK(amount >= 0),
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('paid', 'partial', 'unpaid')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

-- Tabella Pagamenti Ricevuti
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT, -- NULLABLE: se NULL, il pagamento è considerato un acconto generico
    customer_id TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    method TEXT,
    receipt_id TEXT, -- NULLABLE: accomuna le righe generate da un unico incasso multi-fattura (vedi add_multi_payment)
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

-- Tabella Testate Prima Nota (Giornale Contabile)
CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    entry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    reference_type TEXT NOT NULL, -- 'invoice', 'payment', 'allocation'
    reference_id TEXT NOT NULL,
    customer_id TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Tabella Righe Partita Doppia (Dettagli Dare/Avere)
CREATE TABLE IF NOT EXISTS journal_lines (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    account_name TEXT NOT NULL, -- es. 'Crediti v/Clienti', 'Ricavi per Vendite', 'Cassa/Banca', 'Acconti da Clienti'
    type TEXT NOT NULL CHECK(type IN ('debit', 'credit')),
    amount REAL NOT NULL CHECK(amount > 0),
    FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
);

-- Indici per ottimizzazione performance sulle ricerche e join frequenti
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_receipt ON payments(receipt_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_customer ON journal_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(entry_id);
```

> [!NOTE]
> **Serializzazione dei Dati (Rust -> JSON)**:
> Nella struct `JournalLine` in Rust, il campo `type` della tabella SQL è mappato come `type_` nel backend Rust per evitare conflitti con la parola chiave riservata del linguaggio. Durante la serializzazione JSON viene però rinominato in `"type"` mediante l'attributo `#[serde(rename = "type")]` per allinearsi perfettamente con le condizioni e le logiche di visualizzazione del frontend React (es. `line.type === 'debit'` / `'credit'`).

> [!NOTE]
> **Raggruppamento incassi multi-fattura (`receipt_id`)**:
> Quando un incasso viene spalmato automaticamente su più fatture (+ eventuale acconto residuo), `add_multi_payment` genera un `receipt_id` (`RCPT-{timestamp}`) condiviso da tutte le righe `payments` create in quella chiamata. Il frontend (Storico Pagamenti in `Customers.jsx`, elenco in `Payments.jsx`) raggruppa le righe con lo stesso `receipt_id` mostrando il totale realmente incassato, espandibile per vedere lo split fattura per fattura. Le righe generate da altri percorsi (`add_payment`, `allocate_acconto`, ripristino acconto su delete) restano con `receipt_id = NULL` e vengono mostrate singolarmente, usando il proprio `id` come chiave di raggruppamento (fallback `COALESCE(receipt_id, id)`): questo evita che i pagamenti pre-esistenti alla migrazione vengano accorpati fra loro solo perché condividono un `NULL`.
>
> **Migrazione**: la colonna è aggiunta con `ALTER TABLE payments ADD COLUMN receipt_id TEXT` in `init_database` all'avvio, solo se assente — compatibile sia con database recenti sia con quelli molto vecchi (che passano anche dalla precedente migrazione `invoice_id NOT NULL → NULL`). Nessun dato pre-esistente viene toccato.

---

## 🛡️ 4. Gestione Errori & Transazioni Atomiche

### Politica delle Transazioni Contabili (Processo Rust)

La registrazione di un pagamento o l'allocazione di un acconto richiede un'operazione atomica: l'inserimento o modifica dei record dei pagamenti, l'aggiornamento dello stato delle fatture e l'inserimento delle relative righe contabili in partita doppia. Se una sola operazione fallisce, la transazione deve eseguire il _rollback_ automatico.

> [!NOTE]
> **Arrotondamento degli importi (`round_cents`)**:
> Tutti gli importi sono `f64` (SQLite `REAL`), quindi somme e sottrazioni in virgola mobile possono produrre residui binari (es. `0.1 + 0.2 = 0.30000000000000004`). L'helper `round_cents(value: f64) -> f64` in `db.rs` (`(value * 100.0).round() / 100.0`) va applicato ad ogni importo prima di scriverlo su DB e prima di ogni confronto che determina lo stato `paid`/`partial` di una fattura, per evitare sia decimali "sporchi" in UI sia fatture bloccate in `partial` per un centesimo di errore binario mai realmente dovuto.

Ecco lo standard di implementazione nel backend Rust utilizzando `rusqlite`:

```rust
pub fn add_multi_payment(state: tauri::State<AppState>, payment_data: MultiPaymentData) -> Result<ActionResult, String> {
    let mut conn = state.db_conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let now_str = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let payment_date = match payment_data.date {
        Some(ref d) if !d.is_empty() => d,
        _ => &now_str,
    };

    // ID di ricevuta condiviso da tutte le righe generate da questo incasso,
    // per poterle raggruppare in UI (vedi nota sopra sullo schema payments).
    let receipt_id = format!("RCPT-{}", chrono::Utc::now().timestamp_millis());

    // 1. Registra le allocazioni sulle fatture specificate
    for (idx, alloc) in payment_data.allocations.iter().enumerate() {
        let pay_id = format!("PAY-{}-{}", chrono::Utc::now().timestamp_millis(), idx);
        let alloc_amount = round_cents(alloc.amount); // arrotonda a 2 decimali, evita residui binari

        tx.execute(
            "INSERT INTO payments (id, invoice_id, customer_id, amount, method, payment_date, receipt_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![pay_id, alloc.invoiceId, payment_data.customerId, alloc_amount, payment_data.method, payment_date, receipt_id],
        ).map_err(|e| e.to_string())?;

        // Ricalcola stato fattura (confronto sempre su importi arrotondati)
        let (inv_amount, total_paid): (f64, f64) = tx.query_row(
            "SELECT amount, (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = ?) FROM invoices WHERE id = ?",
            params![alloc.invoiceId, alloc.invoiceId],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ).map_err(|e| e.to_string())?;

        let new_status = if round_cents(total_paid) >= round_cents(inv_amount) {
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
            params![format!("line-{}-1", pay_id), entry_id, "Cassa/Banca", "debit", alloc_amount],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-2", pay_id), entry_id, "Crediti v/Clienti", "credit", alloc_amount],
        ).map_err(|e| e.to_string())?;
    }

    // 2. Registra eventuale acconto residuo
    let acconto_amount = round_cents(payment_data.accontoAmount);
    if acconto_amount > 0.0 {
        let pay_id = format!("PAY-ACC-{}-99", chrono::Utc::now().timestamp_millis());
        tx.execute(
            "INSERT INTO payments (id, invoice_id, customer_id, amount, method, payment_date, receipt_id) VALUES (?, NULL, ?, ?, ?, ?, ?)",
            params![pay_id, payment_data.customerId, acconto_amount, payment_data.method, payment_date, receipt_id],
        ).map_err(|e| e.to_string())?;

        // Scrittura Prima Nota (Dare Cassa/Banca, Avere Acconti da Clienti)
        let entry_id = format!("entry-{}", pay_id);
        tx.execute(
            "INSERT INTO journal_entries (id, entry_date, description, reference_type, reference_id, customer_id) VALUES (?, ?, ?, ?, ?, ?)",
            params![entry_id, payment_date, "Incasso acconto cliente", "payment", pay_id, payment_data.customerId],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-1", pay_id), entry_id, "Cassa/Banca", "debit", acconto_amount],
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO journal_lines (id, entry_id, account_name, type, amount) VALUES (?, ?, ?, ?, ?)",
            params![format!("line-{}-2", pay_id), entry_id, "Acconti da Clienti", "credit", acconto_amount],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(ActionResult { success: true, error: None })
}
```

---

## ⚡ 5. Performance, Lazy Loading & UI Boundaries

### Lazy Loading dei Componenti (Frontend)

Per ridurre i tempi di caricamento del pacchetto JavaScript iniziale, i componenti di pagina devono essere caricati in modo asincrono (Lazy Loading) tramite React:

```javascript
import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Customers = React.lazy(() => import('./pages/Customers'))
const Journal = React.lazy(() => import('./pages/Journal'))

function App() {
  return (
    <Suspense fallback={<div>Caricamento...</div>}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Customers />} />
        <Route path="/journal" element={<Journal />} />
      </Routes>
    </Suspense>
  )
}
```

### Calcolo Saldi ed Evitamento del Prodotto Cartesiano

Non calcolare mai i saldi filtrando o aggregando arrays nel frontend via JavaScript. Sfrutta il motore relazionale di SQLite.
**IMPORTANTE:** Evitare i double join diretti su tabelle di relazioni differenti (es. join simultaneo su `invoices` e `payments`) per non moltiplicare i record (effetto prodotto cartesiano). Utilizzare sempre subquery aggregate:

```sql
SELECT
    c.id,
    c.name,
    c.email,
    (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE customer_id = c.id) as total_invoiced,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = c.id) as total_paid,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = c.id AND invoice_id IS NULL) as total_acconto,
    ((SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE customer_id = c.id) - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = c.id)) as balance
FROM customers c
ORDER BY c.name ASC;
```

---

## 🧱 6. Componenti Riutilizzabili (UI Design Tokens)

- **`StatCard`** (`src/renderer/src/components/StatCard.jsx`): Componente KPI per visualizzazione totali e saldi.
- **`DataTable`** (`src/renderer/src/components/DataTable.jsx`): Wrapper per tabelle dati che integra nativamente gli _Skeleton Loader_ animati (`animate-pulse`).
- **`Modal`** (`src/renderer/src/components/Modal.jsx`): Contenitore modale per form di input. Gestisce lo sfondo scuro sfocato (`backdrop-blur`) e intercetta il tasto `Esc` per la chiusura automatica.
- **`Settings`** (`src/renderer/src/pages/Settings.jsx`): Pagina delle impostazioni con il pannello informativo dell'applicazione (sviluppatore, diritti d'autore, versione e tech stack).

---

## ⚖️ 7. Regole di Partita Doppia (Doppio Controllo Contabile)

Ogni evento amministrativo dell'applicazione scrive automaticamente sul giornale di Prima Nota cronologico generando righe Dare/Avere bilanciate.

| Evento                  | Conto Addebitato (Dare) | Conto Accreditato (Avere) | Significato                                            |
| :---------------------- | :---------------------- | :------------------------ | :----------------------------------------------------- |
| **Emissione Fattura**   | `Crediti v/Clienti`     | `Ricavi per Vendite`      | Rilevazione del credito e del ricavo                   |
| **Incasso Fattura**     | `Cassa/Banca`           | `Crediti v/Clienti`       | Rilevazione dell'entrata monetaria e storno credito    |
| **Incasso Acconto**     | `Cassa/Banca`           | `Acconti da Clienti`      | Entrata monetaria e insorgenza debito futuro (acconto) |
| **Allocazione Acconto** | `Acconti da Clienti`    | `Crediti v/Clienti`       | Compensazione debito acconto con credito fattura       |

---

## 🚀 8. Regole d'oro dello Sviluppatore

1. **Immutabilità del Calcolo Contabile:** Il saldo cliente o fattura non viene mai salvato come colonna statica modificabile arbitrariamente. È rigorosamente derivato dalla formula: `Saldo = Totale Emesso - Totale Ricevuto`.
2. **Validazione Preventiva e Controllo Duplicati:** Prima di invocare i canali IPC di Tauri, valida i dati nel frontend. Controlla preventivamente la presenza di nomi di clienti duplicati sia sul frontend sia nel backend Rust con query _case-insensitive_.
3. **Disaccoppiamento della Logica:** Le viste di React devono occuparsi solo della presentazione. La logica di fetch dei dati deve essere isolata all'interno di Custom Hooks o azioni dedicate nello store Zustand.
4. **Ottimizzazione del Layout per Risoluzioni Standard (1600x900):** Per evitare lo scroll verticale non necessario e tagli orizzontali delle tabelle, utilizzare paddings compatti. Nello specifico, il contenitore principale deve utilizzare al massimo `p-md` (24px) anziché `p-xl` (64px), e le tabelle dati devono limitare il padding delle celle a `py-sm px-sm` (12px) per assicurare che tutte le colonne siano visibili senza scorrimento.
5. **Localizzazione della UI:** Tutte le etichette, placeholder, messaggi di errore e diciture mostrate all'utente finale nel Renderer process devono essere rigorosamente scritte in lingua italiana.
6. **Gestione del Layout e Dimensionamento con Tailwind CSS v4:** A causa degli override definiti sul tema, evitare l'uso delle classi di larghezza massima predefinite come `max-w-md` o `max-w-lg` per elementi di layout generali. Utilizzare invece valori arbitrari espliciti, ad esempio `max-w-[500px]` o `max-w-[400px]`.
7. **Struttura delle Tabelle e Allineamento con Fragment:** Per evitare problemi di allineamento delle tabelle con i relativi header, non avvolgere mai righe `<tr>` multiple all'interno di tag non standard come `<caption>` all'interno di `<tbody>`. Utilizzare sempre `<Fragment key={...}>` come contenitore logico.
8. **Sicurezza e Versionabilità del Database (Backup/Ripristino):** Durante le operazioni di ripristino di un database da un file esterno, applicare sempre due livelli di protezione:
   - **Verifica dell'Integrità:** Validare preventivamente la firma del file (i primi 16 byte devono corrispondere a `SQLite format 3\0`) prima di procedere alla sovrascrittura.
   - **Versionabilità e Allineamento Schema:** Subito dopo il ripristino del file fisico, eseguire immediatamente la procedura di inizializzazione dello schema (`init_database()`). Questo assicura che eventuali tabelle mancanti vengano create e che le migrazioni pendenti (es. vincoli di colonna o nuove tabelle) siano applicate in modo che i dati siano sempre compatibili con l'ultima versione dell'applicazione.
9. **Automazione del Processo di Build (Copia Post-Build):** Il comando `npm run build` esegue in coda uno script di copia (`scripts/post-build.js`) che estrae i pacchetti di installazione nativi compilati (es. formato `.deb` su Linux) e li posiziona direttamente all'interno della cartella `release/` alla radice del progetto. Questo assicura l'accessibilità immediata delle release stabili senza dover navigare nelle sottocartelle del compilatore Rust.

---

## ✏️ 9. Gestione CRUD Completa e Allineamento Contabile

Tutte le modifiche (UPDATE) e le cancellazioni (DELETE) su clienti, fatture e pagamenti devono rispettare rigorosamente le transazioni contabili e l'integrità del database per evitare disallineamenti di saldi o scritture orfane:

1. **Clienti (Customers)**:
   - **Modifica**: Consentito l'aggiornamento di nome ed email con validazione case-insensitive di univocità del nome.
   - **Cancellazione**: Bloccata dal vincolo database `ON DELETE RESTRICT` se esistono fatture o pagamenti associati.

2. **Fatture (Invoices)**:
   - **Modifica**: La modifica dell'importo richiede il ricalcolo automatico dello stato della fattura (`paid`, `partial`, `unpaid`) in base ai pagamenti esistenti e l'aggiornamento dell'importo sulle righe di prima nota associate (`Crediti v/Clienti` e `Ricavi per Vendite`). Lo spostamento di cliente aggiorna automaticamente tutti i relativi pagamenti e scritture di prima nota del cliente per preservare la coerenza logica.
   - **Cancellazione**: Elimina a cascata i pagamenti associati ed elimina le scritture di prima nota sia della fattura che dei pagamenti.

3. **Pagamenti (Payments)**:
   - **Modifica**: L'aggiornamento di importo, data o metodo ricalcola lo stato della fattura collegata e aggiorna la prima nota. Le righe generate tramite compensazione (metodo `Uso Credito`) non possono essere modificate direttamente.
   - **Cancellazione**: Cancella il pagamento e la prima nota correlata, ricalcola lo stato della fattura e, se si tratta di un'allocazione (metodo `Uso Credito`), ripristina automaticamente l'acconto di origine come credito libero per il cliente.
