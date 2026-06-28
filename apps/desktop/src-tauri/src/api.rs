use crate::capture::capture_region;
use crate::state::{AppState, OverlayItem};
use axum::{
    extract::State,
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use tower_http::cors::CorsLayer;

pub const API_PORT: u16 = 7765;

/// Offsets (logical pixels) of the capture area within the window.
/// Must match App.tsx / App.css values.
const TITLE_BAR_H_LOGICAL: f64 = 36.0;
const BORDER_W_LOGICAL: f64 = 3.0;

// ─── Axum shared state ───────────────────────────────────────────────────────

#[derive(Clone)]
struct ApiState {
    app: AppHandle,
    shared: Arc<AppState>,
}

// ─── Request / response types ────────────────────────────────────────────────

#[derive(Deserialize)]
struct SetFrameRequest {
    x: Option<i32>,
    y: Option<i32>,
    width: Option<u32>,
    height: Option<u32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShowOverlayRequest {
    items: Vec<OverlayItem>,
    /// Optional TTL in milliseconds. When omitted the value from the user
    /// config file (`overlayTtlMs`) is used as the default.
    ttl_ms: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FrameResponse {
    window: WindowInfo,
    capture_area: CaptureAreaInfo,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WindowInfo {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    scale_factor: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CaptureAreaInfo {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

// ─── Server entry-point ──────────────────────────────────────────────────────

pub async fn start_server(app_handle: AppHandle, app_state: Arc<AppState>) {
    let state = ApiState {
        app: app_handle,
        shared: app_state,
    };

    let router = Router::new()
        .route("/health", get(health_handler))
        .route("/config", get(config_handler))
        .route("/frame", get(get_frame_handler))
        .route("/frame", post(set_frame_handler))
        .route("/capture", post(capture_handler))
        .route("/overlay", post(show_overlay_handler))
        .route("/overlay", delete(clear_overlay_handler))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = format!("127.0.0.1:{}", API_PORT);
    let listener = match tokio::net::TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("API server failed to bind {addr}: {e}");
            return;
        }
    };
    println!("API server listening on http://{addr}");
    if let Err(e) = axum::serve(listener, router).await {
        eprintln!("API server error: {e}");
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn capture_area_from_window(
    pos: tauri::PhysicalPosition<i32>,
    size: tauri::PhysicalSize<u32>,
    scale: f64,
) -> (i32, i32, u32, u32) {
    let title_phys = (TITLE_BAR_H_LOGICAL * scale).round() as i32;
    let border_phys = (BORDER_W_LOGICAL * scale).round() as i32;

    let x = pos.x + border_phys;
    let y = pos.y + title_phys;
    let w = (size.width as i32 - 2 * border_phys).max(0) as u32;
    let h = (size.height as i32 - title_phys - border_phys).max(0) as u32;
    (x, y, w, h)
}

fn get_main_window(app: &AppHandle) -> Result<tauri::WebviewWindow, (StatusCode, String)> {
    app.get_webview_window("main")
        .ok_or_else(|| (StatusCode::INTERNAL_SERVER_ERROR, "Main window not found".to_string()))
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async fn health_handler() -> Json<Value> {
    Json(json!({ "status": "ok", "version": "0.1.0", "port": API_PORT }))
}

/// Returns the current runtime configuration so MCP tools (and other callers)
/// can read settings such as the default overlay TTL.
async fn config_handler(State(state): State<ApiState>) -> Json<Value> {
    Json(json!({
        "overlayTtlMs": state.shared.config.overlay_ttl_ms
    }))
}

async fn get_frame_handler(
    State(state): State<ApiState>,
) -> Result<Json<FrameResponse>, (StatusCode, String)> {
    let window = get_main_window(&state.app)?;
    let pos = window
        .outer_position()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let size = window
        .outer_size()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let scale = window
        .scale_factor()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (cx, cy, cw, ch) = capture_area_from_window(pos, size, scale);

    Ok(Json(FrameResponse {
        window: WindowInfo {
            x: pos.x,
            y: pos.y,
            width: size.width,
            height: size.height,
            scale_factor: scale,
        },
        capture_area: CaptureAreaInfo {
            x: cx,
            y: cy,
            width: cw,
            height: ch,
        },
    }))
}

async fn set_frame_handler(
    State(state): State<ApiState>,
    Json(req): Json<SetFrameRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let window = get_main_window(&state.app)?;

    if let (Some(x), Some(y)) = (req.x, req.y) {
        window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }
    if let (Some(w), Some(h)) = (req.width, req.height) {
        window
            .set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: w,
                height: h,
            }))
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    Ok(Json(json!({ "status": "ok" })))
}

async fn capture_handler(
    State(state): State<ApiState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let window = get_main_window(&state.app)?;
    let pos = window
        .outer_position()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let size = window
        .outer_size()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let scale = window
        .scale_factor()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (cx, cy, cw, ch) = capture_area_from_window(pos, size, scale);

    let image_b64 =
        capture_region(cx, cy, cw, ch).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(json!({
        "imageBase64": image_b64,
        "mimeType": "image/png",
        "width": cw,
        "height": ch
    })))
}

async fn show_overlay_handler(
    State(state): State<ApiState>,
    Json(req): Json<ShowOverlayRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    // Use caller-supplied TTL; fall back to the user config default.
    let ttl_ms = req.ttl_ms.unwrap_or(state.shared.config.overlay_ttl_ms);

    let expires_at = if ttl_ms > 0 {
        Some(Instant::now() + Duration::from_millis(ttl_ms))
    } else {
        None
    };

    {
        let mut overlay = state.shared.overlay.lock().unwrap();
        overlay.items = req.items.clone();
        overlay.expires_at = expires_at;
    }

    // Always emit the resolved ttlMs so the frontend timer is consistent.
    state
        .app
        .emit(
            "overlay-updated",
            &serde_json::json!({
                "items": req.items,
                "ttlMs": if ttl_ms > 0 { serde_json::Value::from(ttl_ms) } else { serde_json::Value::Null }
            }),
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "status": "ok" })))
}

async fn clear_overlay_handler(
    State(state): State<ApiState>,
) -> Result<Json<Value>, (StatusCode, String)> {
    {
        let mut overlay = state.shared.overlay.lock().unwrap();
        overlay.items.clear();
        overlay.expires_at = None;
    }

    state
        .app
        .emit(
            "overlay-updated",
            &serde_json::json!({ "items": [], "ttlMs": null }),
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "status": "ok" })))
}
