# BillKeep (v1.3.2)

Applicazione desktop locale per la gestione di fatture, pagamenti e contabilità in partita doppia (Prima Nota).

Sviluppata utilizzando **Tauri (Rust)** per il backend e la gestione del database SQLite nativo, e **React + Vite + Tailwind CSS** per la UI frontend.

## Setup del Progetto

### Prerequisiti

Assicurati di avere installato le dipendenze di sistema richieste da Tauri per Linux (Gtk, Webkit2Gtk, Rust, ecc.). Vedi la [Guida Ufficiale di Tauri](https://tauri.app/v2/start/prerequisites/) per i dettagli.

### Installazione delle Dipendenze

```bash
npm install
```

### Avvio in Sviluppo (Hot-reload)

```bash
npm run dev
```

### Compilazione di Produzione (Release)

Questo comando compila l'applicazione Rust con ottimizzazioni complete e genera il pacchetto di distribuzione nativo (es. `.deb` su Linux). Al termine della compilazione, il pacchetto finale viene automaticamente copiato nella cartella `release/` nella radice del progetto per un facile accesso:

```bash
npm run build
```

## Struttura del Progetto

- `src/renderer/`: Frontend in React + Vite + Tailwind CSS.
- `src-tauri/`: Backend in Rust (gestione del ciclo di vita del desktop, database SQLite nativo con `rusqlite`, logiche di partita doppia e dialoghi nativi).
- `DEVELOPER_GUIDE.md`: Manuale tecnico e linee guida di sviluppo dell'applicazione.
