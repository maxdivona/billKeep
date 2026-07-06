use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,   // "info" | "error" | "warning"
    pub context: String, // "backup" | "restore" | "system"
    pub message: String,
}

pub fn get_logs(logs_path: &Path) -> Vec<LogEntry> {
    if !logs_path.exists() {
        return Vec::new();
    }
    match fs::read_to_string(logs_path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| Vec::new()),
        Err(_) => Vec::new(),
    }
}

pub fn write_log(logs_path: &Path, level: &str, context: &str, message: &str) {
    let mut logs = get_logs(logs_path);
    
    let now = chrono::Local::now().to_rfc3339();
    let new_entry = LogEntry {
        timestamp: now,
        level: level.to_string(),
        context: context.to_string(),
        message: message.to_string(),
    };
    
    logs.push(new_entry);
    if logs.len() > 300 {
        logs.remove(0);
    }
    
    if let Ok(serialized) = serde_json::to_string_pretty(&logs) {
        let _ = fs::write(logs_path, serialized);
    }
}
