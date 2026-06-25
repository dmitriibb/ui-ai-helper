mod api;
mod capture;
mod state;

use std::sync::Arc;

pub fn run() {
    let shared_state = Arc::new(state::AppState::new());
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
