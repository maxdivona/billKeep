Ecco il file di istruzioni completo in un unico blocco di codice per facilitarne la copia. Puoi salvarlo direttamente come `DEVELOPER_GUIDE.md` nella root del tuo progetto.

Markdown

```
# 📘 Manuale Tecnico e Linee Guida di Sviluppo: BillKeep

Questo documento stabilisce l'architettura tecnica, le best practices e gli standard di codifica per lo sviluppo dell'applicazione desktop locale di gestione fatture e pagamenti.

---

## 🛠️ 1. Stack Tecnico di Riferimento

* **Shell/Runtime:** Electron (gestione del ciclo di vita desktop su Linux/Cross-platform).
* **Frontend:** React + Vite + Tailwind CSS.
* **Database:** SQLite tramite la libreria `better-sqlite3` (scelta per stabilità, performance sincrone sul processo Main e pieno supporto alle transazioni).
* **Stato Globale Frontend:** Zustand (leggero, reattivo e disaccoppiato dal ciclo di render di React).

---

## 🏗️ 2. Architettura e Sicurezza (IPC & Context Isolation)

L'applicazione deve rispettare rigorosamente il principio di separazione dei privileges di Electron. Il processo di Rendering (la UI) non ha accesso diretto a Node.js o al File System.

### Flusso dei Dati
Tutte le operazioni sul database avvengono nel **Processo Main**. Il **Processo Renderer** invoca i metodi esposti dal file `preload.js`.
```

[ React UI (Renderer) ] <--- (IPC Invoke) ---> [ Preload (Context Bridge) ] <--- (IPC Handle) ---> [ Node.js + SQLite (Main) ]

```
### Configurazione `src/main/preload.js`
Nel file di preload, esponiamo solo le funzioni strettamente necessarie tramite canali IPC sicuri e tipizzati:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Clienti
  getCustomers: () => ipcRenderer.invoke('db:get-customers'),
  addCustomer: (customer) => ipcRenderer.invoke('db:add-customer', customer),

  // Fatture e Pagamenti
  getInvoices: () => ipcRenderer.invoke('db:get-invoices'),
  addInvoice: (invoice) => ipcRenderer.invoke('db:add-invoice', invoice),
  addPayment: (payment) => ipcRenderer.invoke('db:add-payment', payment),

  // Reportistica
  getDashboardStats: () => ipcRenderer.invoke('db:get-stats')
});
```

## 🗄️ 3. Schema del Database (SQLite)

Il database è relazionale e locale. Sfrutta le chiavi esterne (`FOREIGN KEY`) per garantire l'integrità dei dati. I calcoli di saldi e report vengono eseguiti a livello di query (senza duplicazione o denormalizzazione dei dati).

SQL

```
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
    invoice_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    method TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

-- Indici per ottimizzazione performance sulle ricerche e join frequenti
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
```

## 🛡️ 4. Gestione Errori & Transazioni Atomiche

### Politica dei Blocchi Try-Catch (Processo Main)

La registrazione di un pagamento richiede un'operazione atomica: l'inserimento del pagamento e il contestuale cambio di stato della fattura correlata. Se una delle due operazioni fallisce, la transazione deve fare un *rollback* automatico.

Ecco lo standard di implementazione nel processo Main utilizzando `better-sqlite3`:

JavaScript

```
const path = require('path');
const { app, ipcMain } = require('electron');
const Database = require('better-sqlite3');

// Posizionamento sicuro del database nella cartella config dell'utente su Linux
const dbPath = path.join(app.getPath('userData'), 'billkeep.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

ipcMain.handle('db:add-payment', async (event, payment) => {
  // 1. Prepariamo gli statement SQL
  const insertPayment = db.prepare(`    INSERT INTO payments (id, invoice_id, customer_id, amount, method)     VALUES (?, ?, ?, ?, ?)  `);

  const updateInvoiceStatus = db.prepare(`    UPDATE invoices SET status = ? WHERE id = ?  `);

  const checkInvoiceBalance = db.prepare(`    SELECT amount,     (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = ?) as total_paid     FROM invoices WHERE id = ?  `);

  // 2. Definiamo la transazione atomica
  const executePaymentTransaction = db.transaction((pay) => {
    try {
      // Inserimento record pagamento
      insertPayment.run(pay.id, pay.invoiceId, pay.customerId, pay.amount, pay.method);

      // Calcolo del nuovo stato basato sul totale pagato aggiornato
      const invoiceData = checkInvoiceBalance.get(pay.invoiceId, pay.invoiceId);
      const newTotalPaid = invoiceData.total_paid + pay.amount;

      let newStatus = 'partial';
      if (newTotalPaid >= invoiceData.amount) {
        newStatus = 'paid';
      }

      // Aggiornamento stato fattura
      updateInvoiceStatus.run(newStatus, pay.invoiceId);

      return { success: true };
    } catch (transactionError) {
      // better-sqlite3 intercetta l'errore ed esegue il ROLLBACK in automatico
      console.error("[TRANSACTION FAILED - ROLLBACK APPLIED]:", transactionError.message);
      throw transactionError; 
    }
  });

  // 3. Esecuzione del blocco con gestione errore dell'operazione
  try {
    return executePaymentTransaction(payment);
  } catch (err) {
    return { success: false, error: err.message };
  }
});
```

## ⚡ 5. Performance, Lazy Loading & UI Boundaries

### Lazy Loading dei Componenti (Frontend)

Per mantenere l'applicazione snella e ridurre i tempi di reazione al cambio rotta, implementare il Code Splitting nativo di React:

JavaScript

```
import React, { Suspense } from 'react';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Customers = React.lazy(() => import('./pages/Customers'));
const Invoices = React.lazy(() => import('./pages/Invoices'));

function App() {
  return (
    <Suspense className="skeleton-loader-fullscreen" fallback="{<div"/>}>      <Routes>
        <Route element="{<Dashboard" path="/"/>} />        <Route element="{<Customers" path="/customers"/>} />        <Route element="{<Invoices" path="/invoices"/>} />      </Routes>
    </Suspense>
  );
}
```

### Calcolo Saldi e Performance SQL

Non calcolare mai il saldo filtrando o iterando gli array di dati nel frontend via JavaScript. Sfrutta il motore relazionale di SQLite per estrarre la situazione contabile in un'unica query aggregata:

SQL

```
SELECT 
    c.id, 
    c.name,
    COALESCE(SUM(DISTINCT i.amount), 0) as total_invoiced,
    COALESCE(SUM(p.amount), 0) as total_paid,
    (COALESCE(SUM(DISTINCT i.amount), 0) - COALESCE(SUM(p.amount), 0)) as balance
FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id
LEFT JOIN payments p ON c.id = p.customer_id
GROUP BY c.id;
```

## 🧱 6. Componenti Riutilizzabili (UI Design Tokens)

Tutti i componenti UI generati o sviluppati devono essere atomici e flessibili, accettando props per configurare lo stato visivo.

- `StatCard`: Componente KPI per la dashboard (Visualizza Totali, Saldo Attuale). Varia lo stile cromatico (verde/rosso text) in base al valore del trend.

- `DataTable`: Wrapper per le tabelle dati che integra nativamente gli *Skeleton Loader* (stati di caricamento grigi animati) durante la risoluzione delle promesse IPC.

- `Modal` / `Drawer`: Contenitori standard per formati di input (Nuovo Cliente, Inserisci Fattura, Registra Pagamento) dotati di gestione dell'overlay e chiusura tramite tasto `Esc`.

## 🚀 7. Regole d'oro dello Sviluppatore

1. **Immutabilità del Calcolo Contabile:** Il saldo cliente o fattura non viene mai salvato como colonna statica modificabile arbitrariamente. È rigorosamente derivato dalla formula: `Saldo = Totale Emesso - Totale Ricevuto`.

2. **Validazione Preventiva:** Prima di invocare i canali IPC, valida i dati nel frontend (es. impedisci l'invio di importi negativi o ID cliente vuoti). Replica la validazione nel processo Main tramite i vincoli `CHECK` nativi di SQLite.

3. **Disaccoppiamento della Logica:** Le viste di React devono occuparsi solo della presentazione. La logica di fetch dei dati deve essere isolata all'interno di Custom Hooks (es. `useFetchCustomers`) o azioni dedicate nello store Zustand.
