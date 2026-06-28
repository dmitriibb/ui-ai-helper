---
name: use-ui-helper
description: Use the ui-ai-helper MCP tools to capture the user's screen and draw visual overlay hints. Load this skill when the user says "use ui helper" or "use-ui-helper".
license: MIT
compatibility: opencode
---

## When to use

Load this skill when the user says **"use ui helper"** or **"use-ui-helper"**.

## What to do

Use the **ui-ai-helper** MCP tools. They handle everything — screen capture, analysis, and overlay drawing.

---

## Available tools

| Tool | Purpose |
|------|---------|
| `capture_frame` | Take a screenshot of the frame region. Use pixel coords from this image for all other tools. |
| `get_frame_state` | Get window position + capture-area dimensions (needed for `point_out` direction auto-detect). |
| `point_out` | **Draw a pointing arrow at a specific coordinate.** Use this when the user says "point out", "point to", "show me", "highlight this", etc. |
| `show_overlay` | Draw arbitrary shapes (rectangles, circles, arrows, text, highlights). |
| `clear_overlay` | Remove all overlay elements. |
| `set_frame` | Move or resize the frame window. |

---

## point_out — when and how to use it

Use `point_out` whenever the user asks you to **visually indicate** a specific location on screen.

### Parameters

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `x` | yes | — | X coordinate of the target (physical px, capture-area origin) |
| `y` | yes | — | Y coordinate of the target (physical px, capture-area origin) |
| `direction` | no | auto | `"right"` \| `"left"` \| `"top"` \| `"bottom"` — which way the arrowhead faces |
| `size` | no | `240` | Arrow length in pixels |
| `color` | no | `"red"` | Any CSS colour string |
| `label` | no | — | Text shown near the arrow midpoint |

### Direction auto-detection (when `direction` is omitted)

- Target on the **right half** of the capture area → `"right"` (arrow comes from the left, points right at the target)
- Target on the **left half** → `"left"` (arrow comes from the right, points left at the target)

### Workflow for "point out X"

1. Call `capture_frame` to get the screenshot.
2. Identify the pixel coordinates of the element the user is asking about.
3. Call `point_out` with those coordinates (optionally add a `label`).
4. The arrow auto-clears after the configured TTL (default 60 s). The user can also click the **×** button next to the arrow to dismiss it early.

### Example

```json
{
  "tool": "point_out",
  "arguments": {
    "x": 1230,
    "y": 360,
    "label": "Click here"
  }
}
```
