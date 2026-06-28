import { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  CallToolResult,
  ImageContent,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import * as client from "./client.js";

// ─── Tool definitions ────────────────────────────────────────────────────────

export const tools: Tool[] = [
  {
    name: "get_frame_state",
    description:
      "Returns the current position and size of the UI AI Helper frame window, " +
      "plus the exact capture area dimensions (excluding title bar and border). " +
      "Call this first to understand the coordinate space before drawing overlays.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "capture_frame",
    description:
      "Takes a screenshot of the region currently inside the UI AI Helper frame " +
      "and returns a PNG image encoded as base64. The image dimensions match the " +
      "captureArea reported by get_frame_state. Use the pixel positions in this " +
      "image as coordinates when calling show_overlay or point_out.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "show_overlay",
    description:
      "Draws visual hints (arrows, rectangles, circles, text labels, highlights) " +
      "on top of the UI AI Helper frame so the user can see your instructions. " +
      "Coordinates are in physical pixels relative to the top-left corner of the " +
      "capture area (same coordinate space as the captured screenshot).\n\n" +
      "Supported item types:\n" +
      "  • rectangle – draws a labelled box  (x, y, width, height)\n" +
      "  • highlight  – filled semi-transparent box  (x, y, width, height)\n" +
      "  • circle     – draws a circle  (x, y, radius)\n" +
      "  • arrow      – draws an arrow between two points  (from: {x,y}, to: {x,y})\n" +
      "  • text       – floating text label  (x, y, label)\n\n" +
      "All items accept an optional `label` and `color` (CSS colour string).\n" +
      "Set `ttlMs` to override the auto-clear time (default comes from app config, " +
      "normally 60 000 ms). Each drawn element shows a small × button the user " +
      "can click to dismiss it early.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "List of visual hint items to draw.",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["rectangle", "highlight", "circle", "arrow", "text"],
              },
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
              radius: { type: "number" },
              from: {
                type: "object",
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                },
                required: ["x", "y"],
              },
              to: {
                type: "object",
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                },
                required: ["x", "y"],
              },
              label: { type: "string" },
              color: {
                type: "string",
                description: "CSS colour, e.g. '#ff4444' or 'rgba(255,200,0,0.8)'",
              },
            },
            required: ["type"],
          },
        },
        ttlMs: {
          type: "number",
          description:
            "Optional. Auto-clear the overlay after this many milliseconds. " +
            "Omit to use the app config default (normally 60 000 ms).",
        },
      },
      required: ["items"],
    },
  },
  {
    name: "point_out",
    description:
      "Draws a pointing arrow that highlights a specific coordinate on screen. " +
      "The arrowhead lands exactly at (x, y). The arrow tail extends in the " +
      "opposite direction from `direction`, so the arrow visually points AT the target.\n\n" +
      "Direction defaults:\n" +
      "  • coordinate on the RIGHT half of the screen → 'right' " +
      "(arrow comes from the left, points right at the target)\n" +
      "  • coordinate on the LEFT half → 'left' " +
      "(arrow comes from the right, points left at the target)\n\n" +
      "The overlay auto-clears after the configured TTL (default 60 s). " +
      "The user can also dismiss it early via the × button that appears next to the arrow.",
    inputSchema: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "X coordinate of the point to highlight (physical pixels, capture-area origin).",
        },
        y: {
          type: "number",
          description: "Y coordinate of the point to highlight (physical pixels, capture-area origin).",
        },
        direction: {
          type: "string",
          enum: ["right", "left", "top", "bottom"],
          description:
            "Which way the arrowhead faces. Omit to auto-detect from screen position.",
        },
        size: {
          type: "number",
          description: "Arrow length in pixels. Default: 240.",
        },
        color: {
          type: "string",
          description: "CSS colour string. Default: 'red'.",
        },
        label: {
          type: "string",
          description: "Optional text label shown near the midpoint of the arrow.",
        },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "clear_overlay",
    description: "Removes all currently visible overlay hints from the screen.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "set_frame",
    description:
      "Moves or resizes the UI AI Helper frame window. " +
      "All values are in physical pixels. " +
      "Provide x+y to move, width+height to resize, or all four to do both.",
    inputSchema: {
      type: "object",
      properties: {
        x: { type: "number", description: "New left position in physical pixels." },
        y: { type: "number", description: "New top position in physical pixels." },
        width: { type: "number", description: "New window width in physical pixels." },
        height: { type: "number", description: "New window height in physical pixels." },
      },
    },
  },
];

// ─── Tool handlers ───────────────────────────────────────────────────────────

export async function handleTool(
  name: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  try {
    switch (name) {
      case "get_frame_state": {
        const state = await client.getFrameState();
        return text(JSON.stringify(state, null, 2));
      }

      case "capture_frame": {
        const result = await client.captureFrame();
        const content: ImageContent = {
          type: "image",
          data: result.imageBase64,
          mimeType: result.mimeType as "image/png",
        };
        const info: TextContent = {
          type: "text",
          text:
            `Screenshot captured: ${result.width}×${result.height} px.\n` +
            `Use these pixel coordinates when calling show_overlay or point_out.`,
        };
        return { content: [info, content] };
      }

      case "show_overlay": {
        const items = args.items as client.OverlayItem[];
        const ttlMs = typeof args.ttlMs === "number" ? args.ttlMs : undefined;
        await client.showOverlay(items, ttlMs);
        return text(`Overlay shown with ${items.length} item(s).`);
      }

      case "point_out": {
        const x = num(args.x);
        const y = num(args.y);
        if (x === undefined || y === undefined) {
          return error("point_out requires numeric x and y coordinates.");
        }

        const direction =
          typeof args.direction === "string" ? args.direction : undefined;
        const size = typeof args.size === "number" ? args.size : 240;
        const color = typeof args.color === "string" ? args.color : "red";
        const label = typeof args.label === "string" ? args.label : undefined;

        // Resolve default direction from screen position.
        let resolvedDirection = direction;
        if (!resolvedDirection) {
          const frame = await client.getFrameState();
          resolvedDirection = x >= frame.captureArea.width / 2 ? "right" : "left";
        }

        // Compute arrow endpoints.
        // Arrowhead is AT (x, y); tail extends away in the direction parameter.
        let from: { x: number; y: number };
        switch (resolvedDirection) {
          case "left":
            from = { x: x + size, y };
            break;
          case "top":
            from = { x, y: y + size };
            break;
          case "bottom":
            from = { x, y: y - size };
            break;
          case "right":
          default:
            from = { x: x - size, y };
            break;
        }

        const item: client.OverlayItem = {
          type: "arrow",
          from,
          to: { x, y },
          color,
          ...(label !== undefined ? { label } : {}),
        };

        // Omit ttlMs — the Rust server will use the app config default.
        await client.showOverlay([item]);
        return text(
          `Pointing at (${x}, ${y}) with direction "${resolvedDirection}", size ${size}px.`
        );
      }

      case "clear_overlay": {
        await client.clearOverlay();
        return text("Overlay cleared.");
      }

      case "set_frame": {
        await client.setFrame({
          x: num(args.x),
          y: num(args.y),
          width: num(args.width),
          height: num(args.height),
        });
        return text("Frame updated.");
      }

      default:
        return error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return error(
      `Tool "${name}" failed: ${msg}\n` +
        "Make sure the UI AI Helper desktop app is running."
    );
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function text(msg: string): CallToolResult {
  return { content: [{ type: "text", text: msg }] };
}

function error(msg: string): CallToolResult {
  return { content: [{ type: "text", text: msg }], isError: true };
}

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
