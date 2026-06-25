# AGENTS.md — context for AI agents working on this repo

This file exists so that any AI agent starting work on this codebase can quickly understand the architecture, conventions, and where things live without needing to grep everything from scratch.

---

## What this repo is

A two-piece tool:
- **Desktop app** (`apps/desktop`) — a transparent, always-on-top Tauri window that acts as a capture frame and overlay canvas.
- **MCP server** (`packages/mcp-server`) — exposes five MCP tools so any AI agent can take screenshots and draw visual hints on screen.

They talk to each other over a local HTTP API (`http://127.0.0.1:7765`).

---

## Monorepo layout

```
apps/desktop/           Tauri v2 app (React + Rust)
packages/mcp-server/    TypeScript MCP server (stdio transport)
package.json            npm workspace root
plan.md                 Original architecture plan
```

npm workspaces are declared in the root `package.json`. Run `npm install` from the root to install all packages.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri v2 (Rust backend + React/TypeScript frontend) |
| Rust HTTP server | Axum 0.7 |
| Screen capture | `screenshots` crate 0.8 (uses GDI/BitBlt on Windows) |
| Image encoding | `image` crate 0.24 |
| Frontend build | Vite 5 + `@vitejs/plugin-react` |
| MCP SDK | `@modelcontextprotocol/sdk` |
| Frontend state | React hooks only — no external state library |

---

## Key constants — must stay in sync

The capture-area calculation in `api.rs` depends on the CSS layout defined in `App.tsx` / `App.css`. If you change either side, change both.

| Constant | Rust (`api.rs`) | Frontend (`App.tsx`) |
|----------|-----------------|----------------------|
| Title bar height | `TITLE_BAR_H_LOGICAL = 36.0` | `TITLE_BAR_HEIGHT = 36` |
| Border width | `BORDER_W_LOGICAL = 3.0` | `BORDER_WIDTH = 3` |

These are logical pixels. Rust multiplies by `window.scale_factor()` to get physical pixels before calling the capture API.

---

## Data flow

### Screenshot capture

```
POST /capture
  → api.rs: capture_handler
      → window.outer_position() + outer_size() + scale_factor()  [Tauri API]
      → capture_area_from_window()  [applies title bar + border offsets]
      → capture_region(x, y, w, h)  [capture.rs]
          → Screen::from_point() + capture_area()  [screenshots crate]
          → image::DynamicImage::write_to PNG
          → base64 encode
      → JSON { imageBase64, mimeType, width, height }
```

### Overlay display

```
POST /overlay  { items: [...], ttlMs?: number }
  → api.rs: show_overlay_handler
      → stores items in AppState.overlay (Mutex)
      → app_handle.emit("overlay-updated", { items, ttlMs })  [Tauri event]
          → App.tsx: listen("overlay-updated")
              → setOverlayItems(items)
              → if ttlMs: setTimeout(() => setOverlayItems([]), ttlMs)
              → OverlayCanvas.tsx: redraws canvas with new items
```

---

## Overlay coordinate system

- Origin `(0, 0)` = top-left corner of the **capture area** (not the full window).
- Units = physical pixels (same pixel space as the PNG returned by `capture_frame`).
- The frontend `<canvas>` is sized to fill the capture area container. Canvas `width`/`height` attributes are set by `ResizeObserver` to match the container's `offsetWidth`/`offsetHeight` in logical pixels. Because the canvas fills its container via CSS `width: 100%; height: 100%`, overlay coordinates from the captured image map naturally to canvas space on most displays. On HiDPI displays with high scale factors there may be minor coordinate drift — this is a known limitation for a future fix.

---

## Tauri-specific notes

### Window configuration (`tauri.conf.json`)
- `decorations: false` — no OS chrome; title bar is custom React.
- `transparent: true` — the capture area interior is genuinely transparent so screenshots show the underlying content.
- `alwaysOnTop: true` — the frame stays visible above browser and app windows.
- `shadow: false` — prevents the OS drop shadow from appearing over the transparent area.

### Capabilities (`capabilities/default.json`)
Tauri v2 requires explicit capability declarations for any JS API call. Currently granted:
- `core:default` — covers events, basic app/window operations
- `core:window:allow-start-dragging` — needed for `appWindow.startDragging()` in `TitleBar.tsx`
- `core:window:allow-minimize` — needed for `appWindow.minimize()`
- `core:window:allow-close` — needed for `appWindow.close()`

If you add new Tauri JS API calls and they silently fail, a missing capability permission is the first thing to check.

### Drag region
`data-tauri-drag-region` alone is not reliable in Tauri v2 frameless windows. The title bar calls `appWindow.startDragging()` explicitly from `onMouseDown`. The buttons container has `onMouseDown={e => e.stopPropagation()}` to prevent drag from firing when clicking window controls.

### Events
Rust → Frontend events use `app_handle.emit(event_name, payload)` (requires the `tauri::Emitter` trait in scope). The frontend listens with `listen(event_name, handler)` from `@tauri-apps/api/event`.

### Async runtime
Tauri v2 provides its own tokio runtime. Use `tauri::async_runtime::spawn` to start background async tasks (the HTTP server is started this way in `lib.rs`).

---

## HTTP API (`api.rs`)

Port: **7765** (`API_PORT` constant).  
All responses are JSON. CORS is permissive (any origin) — this is intentional since only localhost callers are expected.

Routes:

| Method | Path | Handler |
|--------|------|---------|
| GET | `/health` | `health_handler` |
| GET | `/frame` | `get_frame_handler` |
| POST | `/frame` | `set_frame_handler` |
| POST | `/capture` | `capture_handler` |
| POST | `/overlay` | `show_overlay_handler` |
| DELETE | `/overlay` | `clear_overlay_handler` |

The Axum state type is `ApiState { app: AppHandle, shared: Arc<AppState> }`. Both fields are `Clone`.

---

## MCP server (`packages/mcp-server`)

Transport: **stdio** — the AI agent tool (OpenCode, Codex CLI, etc.) spawns the server as a child process and communicates over stdin/stdout.

The server is stateless. Every tool call makes a fresh HTTP request to the desktop app. If the desktop app is not running, tool calls return an `isError: true` result with a clear message.

Tool list: `get_frame_state`, `capture_frame`, `show_overlay`, `clear_overlay`, `set_frame`.  
All tool definitions live in `tools.ts`. The HTTP client types live in `client.ts`.

The server exposes a top-level `instructions` string (set in `index.ts`) that tells MCP clients when and how to use the tools. Both OpenCode and Codex CLI read this field during initialization. If the guidance needs updating, edit the `INSTRUCTIONS` constant in `packages/mcp-server/src/index.ts`.

### Connecting to OpenCode

Global config at `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "ui-ai-helper": {
      "type": "local",
      "command": ["node", "/path/to/packages/mcp-server/dist/index.js"],
      "enabled": true
    }
  }
}
```

### Connecting to Codex CLI

Global config at `~/.codex/config.toml`:

```toml
[mcp_servers.ui-ai-helper]
command = "node"
args = ["/path/to/packages/mcp-server/dist/index.js"]
```

---

## Development commands

```bash
# Install all npm dependencies (run from repo root)
npm install

# Start desktop app in dev mode (hot-reload frontend, Rust rebuilds on change)
cd apps/desktop && npm run dev

# Type-check desktop frontend only (no emit)
cd apps/desktop && npx tsc --noEmit

# Check Rust backend compiles (fast, no linking)
cd apps/desktop/src-tauri && cargo check

# Start MCP server in watch mode (tsx)
cd packages/mcp-server && npm run dev

# Build MCP server to dist/ (required before connecting to an AI agent)
cd packages/mcp-server && npm run build

# Type-check MCP server only
cd packages/mcp-server && npx tsc --noEmit
```

---

## Known limitations (Windows MVP)

- **HiDPI coordinate drift** — on displays with scale factors above 1.0, overlay coordinates may be slightly off relative to the screenshot. The screenshot is captured in physical pixels; the canvas renders in logical pixels. Proper fix: scale overlay coordinates by `1 / scaleFactor` before drawing on canvas.
- **Single monitor only** — multi-monitor capture is untested. `Screen::from_point` should handle it, but coordinate math in `capture_area_from_window` has not been validated across monitors.
- **Capture includes the frame border** if the capture region calculation is off. If the agent reports seeing a blue border in screenshots, recheck the `TITLE_BAR_H_LOGICAL` / `BORDER_W_LOGICAL` constants.
- **Port conflict** — if port 7765 is already in use, the HTTP server silently fails (logged to stderr). The app window still opens but all API calls fail.
- **Ubuntu / macOS not yet supported** — the `screenshots` crate supports both, but the transparent window and overlay behaviour on those platforms has not been tested.
