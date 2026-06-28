mod api;
mod capture;
mod config;
mod state;

use std::sync::Arc;

pub fn run() {
    let cfg = config::load_config();
    let shared_state = Arc::new(state::AppState::new(cfg));
    let state_for_server = shared_state.clone();

    tauri::Builder::default()
        .setup(move |app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                api::start_server(app_handle, state_for_server).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
