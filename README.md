# BillKeep (v1.6.1)

Applicazione desktop locale per la gestione di fatture, pagamenti e contabilità in partita doppia (Prima Nota).

Sviluppata utilizzando **Tauri (Rust)** per il backend e la gestione del database SQLite nativo, e **React + Vite + Tailwind CSS** per la UI frontend (design "Apple Workstation").

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

## Release e Aggiornamenti Automatici

Le release Windows (installer NSIS e MSI) vengono compilate automaticamente da GitHub Actions (`.github/workflows/release-windows.yml`) ad ogni esecuzione manuale del workflow sul branch `main`. Il numero di versione è preso da `package.json`.

L'app installata controlla automaticamente all'avvio la presenza di nuove versioni (tramite l'updater di Tauri) e propone l'installazione con un click. Il repository deve restare **pubblico** perché l'updater possa scaricare `latest.json` dalle GitHub Releases senza autenticazione.

Per pubblicare una nuova release:

1. Aggiorna la versione in `package.json`, `src-tauri/tauri.conf.json` e `src-tauri/Cargo.toml` (oltre alle rispettive lockfile).
2. Fai commit e push su `main`.
3. Avvia il workflow "Release Windows" (manualmente da GitHub Actions, oppure con un push di tag `v*`).

Vedi `DEVELOPER_GUIDE.md` per i dettagli sulla gestione della chiave di firma degli aggiornamenti.

## Struttura del Progetto

- `src/renderer/`: Frontend in React + Vite + Tailwind CSS.
- `src-tauri/`: Backend in Rust (gestione del ciclo di vita del desktop, database SQLite nativo con `rusqlite`, logiche di partita doppia e dialoghi nativi).
- `DEVELOPER_GUIDE.md`: Manuale tecnico e linee guida di sviluppo dell'applicazione.

Tutto lo sviluppo confluisce direttamente sul branch `main`, unico branch mantenuto nel repository.
