# UI AI Helper

A desktop companion app that lets AI agents see your screen and guide you visually — without switching windows or writing descriptions.

## The problem

When you get confused navigating a website or desktop app, the typical workflow is:
1. Take a screenshot manually
2. Paste it into an AI chat
3. Read the AI's text reply
4. Try to find what it described

UI AI Helper replaces that loop. You place a resizable frame over any part of your screen, ask the AI a question, and it draws arrows, boxes, and labels directly on your screen in response.

## How it works

```
AI agent
   │  MCP tools (capture_frame, show_overlay, …)
   ▼
MCP server  ──HTTP──►  Desktop app  ──native OS API──►  Screen
                            │
                            └──Tauri event──►  Overlay canvas (drawn on your screen)
```

- The **desktop app** is a transparent, always-on-top window with a blue border. Whatever is inside that border is the capture region.
- The **MCP server** gives any MCP-compatible AI agent five tools to take screenshots and draw on screen.
- All communication between the AI agent and the desktop app goes through a local HTTP API on `http://127.0.0.1:7765`.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | |
| Rust + Cargo | 1.80+ | Install via [rustup.rs](https://rustup.rs) |
| A WebView2 runtime | — | Already present on Windows 10/11 |

---

## Running the desktop app

```bash
cd apps/desktop
npm run dev
```

The blue-bordered frame window appears on screen. Drag the title bar to reposition it. Resize from any edge. Minimize or close with the buttons in the top-right corner.

**First run only** — Cargo downloads ~300 crates. This takes a few minutes. Subsequent starts are fast.

---

## Connecting to an AI agent

Build the MCP server once before connecting any agent:

```bash
cd packages/mcp-server
npm run build
```

The server communicates over stdio — the AI agent tool spawns it as a child process.

### OpenCode

Add to your global OpenCode config (`~/.config/opencode/opencode.json`, create it if it doesn't exist):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "ui-ai-helper": {
      "type": "local",
      "command": ["node", "C:/projects/ui-ai-helper/packages/mcp-server/dist/index.js"],
      "enabled": true
    }
  }
}
```

Or add the same `"mcp"` block to an `opencode.jsonc` in any individual project where you want the tools available.

### Codex CLI

Add to `~/.codex/config.toml` (create it if it doesn't exist):

```toml
[mcp_servers.ui-ai-helper]
command = "node"
args = ["C:/projects/ui-ai-helper/packages/mcp-server/dist/index.js"]
```

You can also add this to a project-scoped `.codex/config.toml`.

---

## Using the app

1. Start the desktop app (`npm run dev` in `apps/desktop`).
2. Start or connect the MCP server.
3. Position the blue frame over the part of the screen you want help with — a browser page, a settings dialog, anything.
4. Switch to your AI chat and ask your question. The agent will:
   - Call `capture_frame` to see what is inside the frame.
   - Analyse the screenshot.
   - Call `show_overlay` to draw arrows, labels, or highlighted boxes directly on your screen.
5. Follow the visual hints. Call `clear_overlay` (or ask the agent to clear) when done.

---

## MCP tools reference

| Tool | What it does |
|------|-------------|
| `get_frame_state` | Returns frame window position, size, and capture-area dimensions |
| `capture_frame` | Takes a screenshot of the region inside the frame; returns a PNG image |
| `show_overlay` | Draws visual hints on screen (`rectangle`, `highlight`, `circle`, `arrow`, `text`) |
| `clear_overlay` | Removes all hints |
| `set_frame` | Moves or resizes the frame window programmatically |

---

## Local HTTP API

The desktop app exposes a REST API on `http://127.0.0.1:7765`. You can call it directly without the MCP server if needed.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| GET | `/frame` | Window position + capture-area info |
| POST | `/frame` | Move / resize the window (`{x, y, width, height}`) |
| POST | `/capture` | Take a screenshot; returns `{imageBase64, mimeType, width, height}` |
| POST | `/overlay` | Show overlay items (`{items, ttlMs?}`) |
| DELETE | `/overlay` | Clear all overlay items |

---

## Project structure

```
apps/
  desktop/
    src/                    React + TypeScript frontend
      components/
        TitleBar.tsx        Custom drag-region title bar with window controls
        OverlayCanvas.tsx   Canvas that renders visual hints
      App.tsx               Root component; listens for overlay-updated events
      types.ts              Shared TypeScript types
    src-tauri/
      src/
        lib.rs              App entry point; spawns HTTP server
        api.rs              Axum HTTP server + all request handlers
        capture.rs          Screen region capture via the screenshots crate
        state.rs            Shared overlay state (Mutex-protected)
      capabilities/
        default.json        Tauri v2 permission declarations
      tauri.conf.json       Window config (transparent, always-on-top, frameless)
packages/
  mcp-server/
    src/
      index.ts              MCP server entry point (stdio transport)
      tools.ts              Tool definitions and handlers
      client.ts             Typed HTTP client for the desktop app API
```
