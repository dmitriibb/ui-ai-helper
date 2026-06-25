# Plan

## Feasibility

The idea is doable, especially as a desktop companion app plus an MCP server.

The core features are technically realistic:

- Capture what is visible inside a user-controlled screen region.
- Let an AI agent request screenshots without the user manually creating them.
- Let an AI agent draw visual guidance on top of the screen, such as arrows, boxes, labels, and highlights.
- Work with browsers and normal desktop applications because the app observes the screen rather than the DOM.

The main constraints are OS permissions and platform differences:

- macOS requires Screen Recording and Accessibility permissions.
- Windows screen capture is feasible, but drawing an always-on-top transparent overlay must be implemented carefully.
- Linux support depends on X11 vs Wayland and may need separate handling.
- The app can visually guide users, but it should not automatically click/type unless a later version adds explicit user-approved automation.

Recommended first target: Windows MVP, then macOS, then Linux.

## Recommended Approach

Build two pieces:

- Desktop app: owns the resizable capture frame, screenshots, and visual overlay.
- MCP server: exposes tools that AI agents can call.

The desktop app should expose a local API over `localhost`, and the MCP server should call that API. This keeps the app reusable outside MCP and makes the MCP layer small.

Recommended stack for the MVP:

- Tauri for the desktop app.
- Rust for native screen capture and window/overlay control.
- TypeScript/React for the frame and overlay UI.
- TypeScript MCP server for AI-agent integration.

Electron is also viable and may be faster for prototyping, but Tauri is a better default for a lightweight desktop utility.

## Product Requirements

MVP requirements:

- Show a movable, resizable frame on the desktop.
- Capture a screenshot of the region inside the frame.
- Return the screenshot to an AI agent through an MCP tool.
- Draw temporary overlays over the framed region.
- Support overlay primitives: rectangle, arrow, circle, text label, and dim background.
- Provide a clear way to clear all overlays.
- Keep the app visible above normal windows without blocking interaction unnecessarily.

## Architecture

```text
AI Agent
  |
  | MCP tools
  v
MCP Server
  |
  | localhost HTTP/WebSocket API
  v
Desktop App
  |
  | native OS APIs
  v
Screen Capture + Overlay Window
```

Desktop app responsibilities:

- Manage the frame position and size.
- Capture screenshots from the selected screen region.
- Render visual hints as an always-on-top transparent overlay.
- Maintain current overlay state.
- Expose local API endpoints.

MCP server responsibilities:

- Register tools for AI agents.
- Validate tool inputs.
- Call the desktop app local API.
- Return screenshot images and operation results to the agent.

## MCP Tools

Initial tools:

- `get_frame_state`: returns frame position, size, monitor info, and visibility.
- `capture_frame`: captures the current frame region and returns an image.
- `show_overlay`: draws one or more visual hints.
- `clear_overlay`: removes all current hints.
- `set_frame`: moves/resizes the frame.

Example `show_overlay` input:

```json
{
  "items": [
    {
      "type": "rectangle",
      "x": 120,
      "y": 80,
      "width": 240,
      "height": 60,
      "label": "Click this button"
    },
    {
      "type": "arrow",
      "from": { "x": 80, "y": 180 },
      "to": { "x": 180, "y": 110 },
      "label": "Open settings"
    }
  ],
  "ttlMs": 15000
}
```

Coordinates should be relative to the frame, not the whole screen. This makes agent instructions simpler and avoids multi-monitor confusion.

## Local API

Initial endpoints:

- `GET /health`
- `GET /frame`
- `POST /frame`
- `POST /capture`
- `POST /overlay`
- `DELETE /overlay`

For the MVP, HTTP is enough. Add WebSocket later if live streaming or real-time overlay updates are needed.

## Implementation Phases

### Phase 1: Prototype Desktop Frame

- Create a Tauri desktop app.
- Render a transparent or semi-transparent resizable frame.
- Store frame geometry in app state.
- Add basic controls: show frame, hide frame, reset position.
- Verify the frame can stay above normal desktop windows.

### Phase 2: Region Screenshot Capture

- Implement native screenshot capture for the selected region.
- Return PNG images from the desktop app local API.
- Handle DPI scaling correctly.
- Test capture with browser windows and at least one non-browser app.
- Add basic error messages for missing permissions or unavailable capture APIs.

### Phase 3: Overlay Rendering

- Add an always-on-top transparent overlay window.
- Render rectangles, arrows, circles, labels, and dimming.
- Ensure overlays line up with screenshot coordinates.
- Add `ttlMs` support so hints can disappear automatically.
- Add `clear_overlay` behavior.

### Phase 4: MCP Server

- Create a TypeScript MCP server package.
- Add MCP tools that call the desktop app API.
- Return captured images in a format supported by MCP clients.
- Add input validation for coordinates, sizes, labels, and TTL.
- Document how to connect the MCP server to an AI agent.

### Phase 5: End-to-End Demo

- Start the desktop app.
- Start the MCP server.
- Ask an AI agent to inspect the framed area.
- Have the agent capture the frame and draw guidance on screen.
- Test the flow on a real website and a desktop settings window.

### Phase 6: Hardening

- Add permission diagnostics.
- Add multi-monitor handling.
- Add better DPI/scaling tests.
- Add app packaging and installer scripts.
- Add user-facing onboarding instructions.
- Add optional privacy controls, such as capture confirmation or visible recording indicator.

## Suggested Repository Structure

```text
apps/
  desktop/
    src/
    src-tauri/
packages/
  mcp-server/
    src/
docs/
  setup.md
  mcp.md
idea.md
plan.md
```

## Risks

- Screen capture APIs and permissions differ by OS.
- DPI scaling can make overlay coordinates inaccurate if not handled from the beginning.
- Transparent click-through windows behave differently across platforms.
- Some apps may block capture for security reasons.
- AI agents may give poor coordinates unless screenshots and coordinate rules are clearly documented.
- Continuous screen recording would raise privacy and performance concerns, so the MVP should use explicit capture requests.

## Open Questions

- Which OS should be supported first?
- Should the overlay window allow clicks to pass through to the underlying app?
- Should the agent only provide visual guidance, or should future versions also automate clicks and typing?
- Should screenshots require user confirmation, or is the visible frame enough consent?
- Should the app support one frame only, or multiple named frames later?

## MVP Definition

The MVP is complete when an AI agent can:

1. Ask the app for a screenshot of the selected frame.
2. Analyze that screenshot.
3. Draw a visible arrow, rectangle, and text label over the same region.
4. Clear the visual hints.
5. Do all of this on at least one real website and one normal desktop application.
