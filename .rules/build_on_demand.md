# Regola: Esecuzione delle Build solo su Richiesta Esplicita

Non avviare o proporre mai comandi di compilazione/build (come `npm run build`, `tauri build`, `cargo build`, ecc.) in background o per validazione codice, a meno che l'utente non lo richieda esplicitamente nella chat.
Focalizzati esclusivamente sulle modifiche al codice e sulla verifica statica (es. `cargo check` o linting leggeri) durante lo sviluppo.
