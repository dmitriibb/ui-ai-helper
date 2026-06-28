use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// User-editable configuration for the desktop app.
///
/// File location (Windows): %APPDATA%\ui-ai-helper\config.json
/// The file is created with defaults on first run if it does not exist.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    /// How long overlay elements stay visible in milliseconds.
    /// Default: 60 000 (1 minute). Set to 0 to keep them indefinitely.
    pub overlay_ttl_ms: u64,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            overlay_ttl_ms: 60_000,
        }
    }
}

/// Returns the path to the user-editable config file.
///
/// Windows: `%APPDATA%\ui-ai-helper\config.json`
/// Fallback: `./config.json` (current working directory)
pub fn config_path() -> PathBuf {
    let dir = std::env::var("APPDATA")
        .map(|p| PathBuf::from(p).join("ui-ai-helper"))
        .unwrap_or_else(|_| {
            std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
        });
    dir.join("config.json")
}

/// Loads the config file, creating it with defaults if absent or unreadable.
pub fn load_config() -> AppConfig {
    let path = config_path();

    // Ensure parent directory exists.
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    if path.exists() {
        match std::fs::read_to_string(&path) {
            Ok(s) => match serde_json::from_str::<AppConfig>(&s) {
                Ok(cfg) => {
                    println!("[config] Loaded from: {}", path.display());
                    return cfg;
                }
                Err(e) => {
                    eprintln!(
                        "[config] Parse error in {}: {e} — using defaults",
                        path.display()
                    );
                }
            },
            Err(e) => {
                eprintln!(
                    "[config] Read error for {}: {e} — using defaults",
                    path.display()
                );
            }
        }
    } else {
        let default = AppConfig::default();
        match serde_json::to_string_pretty(&default) {
            Ok(s) => {
                if std::fs::write(&path, s).is_ok() {
                    println!("[config] Created default config at: {}", path.display());
                } else {
                    eprintln!("[config] Could not write default config to: {}", path.display());
                }
            }
            Err(e) => eprintln!("[config] Could not serialise default config: {e}"),
        }
    }

    AppConfig::default()
}
