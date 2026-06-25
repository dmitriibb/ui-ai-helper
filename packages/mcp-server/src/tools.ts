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
      "image as coordinates when calling show_overlay.",
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
      "Set `ttlMs` to auto-clear the overlay after the given number of milliseconds.",
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
            "Omit or set to 0 to keep it until clear_overlay is called.",
        },
      },
      required: ["items"],
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
            `Use these pixel coordinates when calling show_overlay.`,
        };
        return { content: [info, content] };
      }

      case "show_overlay": {
        const items = args.items as client.OverlayItem[];
        const ttlMs = typeof args.ttlMs === "number" ? args.ttlMs : undefined;
        await client.showOverlay(items, ttlMs);
        return text(`Overlay shown with ${items.length} item(s).`);
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
