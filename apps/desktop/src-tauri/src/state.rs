use crate::config::AppConfig;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::Instant;

/// A 2-D point. Coordinates are in physical (screen) pixels,
/// relative to the top-left corner of the capture area.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

/// One visual hint that the agent wants to draw on screen.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverlayItem {
    #[serde(rename = "type")]
    pub item_type: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub x: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub y: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub radius: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<Point>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<Point>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
}

pub struct OverlayState {
    pub items: Vec<OverlayItem>,
    pub expires_at: Option<Instant>,
}

pub struct AppState {
    pub overlay: Mutex<OverlayState>,
    /// Loaded once at startup from the user config file.
    pub config: AppConfig,
}

impl AppState {
    pub fn new(config: AppConfig) -> Self {
        Self {
            overlay: Mutex::new(OverlayState {
                items: Vec::new(),
                expires_at: None,
            }),
            config,
        }
    }
}
