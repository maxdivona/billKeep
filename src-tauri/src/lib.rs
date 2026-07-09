pub mod db;
pub mod logs;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Mappiamo lo stesso identico percorso usato da Electron per non perdere i dati
            let home = std::env::var("HOME").unwrap_or_else(|_| "/home/massimo".to_string());
            let db_dir = std::path::PathBuf::from(home).join(".config").join("billkeep");
            
            // Crea la cartella se non esiste
            let _ = std::fs::create_dir_all(&db_dir);
            
            let db_path = db_dir.join("billkeep.db");
            let logs_path = db_dir.join("logs.json");

            // Apriamo e inizializziamo il database
            let conn = rusqlite::Connection::open(&db_path)
                .expect("Impossibile aprire il database SQLite");
            db::init_database(&conn)
                .expect("Errore durante l'inizializzazione del database");

            app.manage(db::AppState {
                db_conn: std::sync::Mutex::new(conn),
                db_path,
                logs_path,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db::get_customers,
            db::add_customer,
            db::update_customer,
            db::delete_customer,
            db::get_invoices,
            db::get_invoices_paginated,
            db::global_search,
            db::add_invoice,
            db::update_invoice,
            db::delete_invoice,
            db::get_payments,
            db::get_payments_paginated,
            db::add_payment,
            db::update_payment,
            db::delete_payment,
            db::get_customer_unpaid_invoices,
            db::get_customer_payments,
            db::add_multi_payment,
            db::allocate_acconto,
            db::get_journal_entries,
            db::get_journal_entries_paginated,
            db::get_dashboard_stats,
            db::clear_database,
            db::seed_database,
            db::get_logs_command,
            db::backup_database,
            db::restore_database,
            db::backup_database_dialog,
            db::restore_database_dialog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
